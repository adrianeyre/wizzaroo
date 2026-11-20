import { CylinderGeometry } from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const soilPurple = "#4a2f6a";
const soilDark = "#36224f";
const rockBlue = "#5a6a9a";
const stemTeal = "#2f8a8a";
const glowTeal = "#7fffe0";
const glowPink = "#ff8ad8";
const glowLime = "#c8ff6a";
const glowViolet = "#c79bff";
const puffOrange = "#ff9a4a";
const puffBlue = "#6ab8ff";
const frondGreen = "#3fbf8a";
const boardNavy = "#25306a";
const signColour = "#4a2f8a";

/* A round bed of purple soil, with the classification key in front. */
const bed = { x: 0, z: -0.5, radius: 2.9 };
const soilTop = 0.1;
const frondAt: Triple = [-1.35, soilTop, -1.15];
const spiralAt: Triple = [1.3, soilTop, -1.35];
const bulbsAt: Triple = [0.3, soilTop, 0.75];
const podAt = { x: -0.1, z: -2.3 };
const podOrb: Triple = [podAt.x + 0.55, 1.75, podAt.z + 0.1];
const keyAt = { x: 2.45, z: 2.0 };

interface Puffball {
  x: number;
  z: number;
  size: number;
  colour: string;
}

const puffballs: readonly Puffball[] = [
  { x: -2.0, z: 0.4, size: 0.42, colour: puffOrange },
  { x: 2.15, z: 0.1, size: 0.36, colour: puffBlue },
  { x: -0.9, z: 0.9, size: 0.26, colour: glowPink },
];

const crystalsAt = { x: 2.1, z: -1.9 };
const lampPlantsAt = { x: -2.3, z: -1.5 };

/** A point along a curling tentacle, from its root up to its tip. */
const tentaclePoint = (
  heading: number,
  share: number,
  height: number,
): Triple => {
  const out = 0.05 + share * 0.55 - Math.max(0, share - 0.7) * 1.2;
  const lift = height * Math.sin(share * Math.PI * 0.62);
  return [Math.sin(heading) * out, lift, Math.cos(heading) * out];
};

const buildBed = (builder: AttractionBuilder) => {
  const segments = builder.isFar ? 14 : 36;
  builder.cylinder("matte", soilPurple, {
    radius: bed.radius,
    radiusEnd: bed.radius - 0.1,
    length: soilTop,
    at: [bed.x, soilTop / 2, bed.z],
    segments,
  });
  if (builder.isFar) {
    return;
  }
  /* Darker patches and a ring of blue stones round the bed */
  [
    [-0.6, -0.2, 0.7],
    [1.0, 0.4, 0.5],
    [0.4, -1.6, 0.6],
  ].forEach(([dx, dz, size]) => {
    builder.cylinder("matte", soilDark, {
      radius: size,
      length: 0.01,
      at: [bed.x + dx, soilTop + 0.005, bed.z + dz],
      segments: 12,
    });
  });
  for (let rock = 0; rock < 16; rock++) {
    const angle = (rock / 16) * Math.PI * 2 + 0.1;
    const size = 0.16 + (rock % 3) * 0.05;
    builder.sphere(
      "matte",
      rock % 2 === 0 ? rockBlue : shade(rockBlue, 0.8),
      size,
      [
        bed.x + Math.sin(angle) * (bed.radius + 0.05),
        size * 0.4,
        bed.z + Math.cos(angle) * (bed.radius + 0.05),
      ],
      [1.3, 0.75, 1],
      7,
    );
  }
  /* Glowing pebbles scattered on the soil */
  for (let pebble = 0; pebble < 10; pebble++) {
    const angle = pebble * 2.4;
    const distance = 0.6 + (pebble % 4) * 0.55;
    builder.sphere(
      "glow",
      pebble % 2 === 0 ? glowTeal : glowViolet,
      0.04,
      [
        bed.x + Math.sin(angle) * distance,
        soilTop + 0.01,
        bed.z + Math.cos(angle) * distance,
      ],
      [1, 0.6, 1],
      5,
    );
  }
};

const buildPuffballs = (builder: AttractionBuilder) => {
  puffballs.forEach(({ x, z, size, colour }, index) => {
    builder.sphere(
      "paint",
      colour,
      size,
      [x, soilTop + size * 0.9, z],
      [1, 0.9, 1],
      builder.isFar ? 8 : 14,
    );
    if (builder.isFar) {
      return;
    }
    builder.cylinder("paint", shade(colour, 0.7), {
      radius: size * 0.35,
      radiusEnd: size * 0.45,
      length: size * 0.4,
      at: [x, soilTop + size * 0.2, z],
      segments: 10,
    });
    /* Glowing freckles on the puffball */
    for (let spot = 0; spot < 6; spot++) {
      const heading = spot * 1.9 + index;
      const tilt = 0.2 + (spot % 3) * 0.35;
      builder.sphere(
        "glow",
        index === 2 ? glowLime : glowPink,
        size * 0.12,
        [
          x + Math.sin(heading) * Math.cos(tilt) * size,
          soilTop + size * 0.9 + Math.sin(tilt) * size * 0.9,
          z + Math.cos(heading) * Math.cos(tilt) * size,
        ],
        [1, 1, 1],
        5,
      );
    }
  });
};

const buildPod = (builder: AttractionBuilder) => {
  const { x, z } = podAt;
  /* A tall curving stalk with a caged pod hanging from its tip */
  const points: Triple[] = [
    [x, soilTop, z],
    [x + 0.05, 0.9, z],
    [x + 0.2, 1.7, z + 0.05],
    [x + 0.45, 2.3, z + 0.1],
    [podOrb[0], 2.35, podOrb[2]],
  ];
  points.slice(1).forEach((point, index) => {
    builder.bar(
      "paint",
      shade(stemTeal, 0.85),
      points[index],
      point,
      0.13 - index * 0.02,
      builder.isFar ? 4 : 8,
    );
  });
  if (builder.isFar) {
    builder.sphere("glow", glowLime, 0.3, podOrb, [1, 1.2, 1], 8);
    return;
  }
  builder.bar(
    "paint",
    stemTeal,
    [podOrb[0], 2.35, podOrb[2]],
    [podOrb[0], podOrb[1] + 0.35, podOrb[2]],
    0.04,
    6,
  );
  /* Ribs of the pod's cage */
  for (let rib = 0; rib < 7; rib++) {
    const heading = (rib / 7) * Math.PI * 2;
    const ribPoint = (share: number): Triple => [
      podOrb[0] + Math.sin(heading) * Math.sin(share * Math.PI) * 0.32,
      podOrb[1] + 0.38 - share * 0.76,
      podOrb[2] + Math.cos(heading) * Math.sin(share * Math.PI) * 0.32,
    ];
    for (let step = 0; step < 4; step++) {
      builder.bar(
        "paint",
        frondGreen,
        ribPoint(step / 4),
        ribPoint((step + 1) / 4),
        0.03,
        4,
      );
    }
  }
  /* Big leaves at the foot of the stalk */
  [0.3, 2.4, 4.4].forEach((heading) => {
    builder.sphere(
      "matte",
      frondGreen,
      0.4,
      [
        x + Math.sin(heading) * 0.35,
        soilTop + 0.08,
        z + Math.cos(heading) * 0.35,
      ],
      [0.5, 0.12, 1],
      10,
    );
  });
};

const buildCrystalsAndLamps = (builder: AttractionBuilder) => {
  /* A clump of glowing crystal plants */
  [
    [0, 0, 0.7, 0],
    [0.2, 0.12, 0.5, 0.3],
    [-0.18, 0.1, 0.45, -0.35],
    [0.05, -0.2, 0.38, 0.2],
  ].forEach(([dx, dz, height, lean], index) => {
    builder.add(
      "glow",
      index % 2 === 0 ? glowViolet : glowTeal,
      new CylinderGeometry(0, 0.11, height, 6),
      {
        at: [crystalsAt.x + dx, soilTop + height / 2, crystalsAt.z + dz],
        rotation: [lean * 0.5, index, lean],
      },
    );
  });
  /* Lamp plants: stalks with glowing bulbs that droop */
  if (builder.isFar) {
    return;
  }
  [
    [0, 0, 1.1, 0.4],
    [0.3, 0.2, 0.85, -0.5],
    [-0.25, 0.25, 0.7, 1.6],
  ].forEach(([dx, dz, height, heading]) => {
    const foot: Triple = [lampPlantsAt.x + dx, soilTop, lampPlantsAt.z + dz];
    const top: Triple = [
      foot[0] + Math.sin(heading) * 0.25,
      height,
      foot[2] + Math.cos(heading) * 0.25,
    ];
    builder.bar("paint", stemTeal, foot, top, 0.05, 6);
    builder.sphere(
      "glow",
      glowPink,
      0.12,
      [top[0], top[1] - 0.06, top[2]],
      [1, 1.2, 1],
      10,
    );
    builder.cylinder("paint", frondGreen, {
      radius: 0.14,
      radiusEnd: 0.03,
      length: 0.12,
      at: [top[0], top[1] + 0.05, top[2]],
      segments: 10,
    });
  });
  /* Little mushrooms dotted about */
  [
    [0.9, 1.6],
    [-1.6, 1.7],
    [0.6, -2.7],
    [-2.6, -0.4],
    [2.6, -0.9],
  ].forEach(([dx, dz], index) => {
    const x = bed.x + dx;
    const z = bed.z + dz;
    builder.cylinder("paint", palette.cream, {
      radius: 0.03,
      length: 0.16,
      at: [x, soilTop + 0.08, z],
      segments: 6,
    });
    builder.sphere(
      "glow",
      index % 2 === 0 ? glowTeal : glowLime,
      0.09,
      [x, soilTop + 0.17, z],
      [1, 0.55, 1],
      8,
    );
  });
};

/** The classification key: a branching board that sorts the plants by what you can see. */
const buildKey = (builder: AttractionBuilder) => {
  const { x, z } = keyAt;
  builder.box("paint", boardNavy, [1.4, 0.95, 0.06], [x, 1.2, z]);
  if (builder.isFar) {
    return;
  }
  [-0.62, 0.62].forEach((dx) => {
    builder.box(
      "metal",
      palette.steel,
      [0.06, 1.7, 0.06],
      [x + dx, 0.85, z - 0.05],
    );
  });
  builder.box("paint", glowViolet, [1.46, 0.05, 0.08], [x, 1.69, z]);
  const face = z + 0.035;
  /* The top question, two branches, and four answers */
  builder.sphere(
    "glow",
    palette.warmLight,
    0.06,
    [x, 1.55, face],
    [1, 1, 0.4],
    8,
  );
  [-0.35, 0.35].forEach((dx) => {
    builder.bar(
      "paint",
      palette.cream,
      [x, 1.53, face],
      [x + dx, 1.3, face],
      0.018,
      3,
    );
    builder.sphere(
      "glow",
      palette.warmLight,
      0.05,
      [x + dx, 1.3, face],
      [1, 1, 0.4],
      8,
    );
    [-0.17, 0.17].forEach((twig) => {
      builder.bar(
        "paint",
        palette.cream,
        [x + dx, 1.28, face],
        [x + dx + twig, 1.05, face],
        0.015,
        3,
      );
    });
  });
  [glowLime, puffOrange, glowPink, glowTeal].forEach((colour, index) => {
    const answerX = x - 0.52 + index * 0.347;
    builder.cylinder("paint", palette.cream, {
      radius: 0.11,
      length: 0.02,
      at: [answerX, 0.93, face],
      axis: "z",
      segments: 12,
    });
    builder.sphere(
      "glow",
      colour,
      0.06,
      [answerX, 0.93, face + 0.015],
      [1, 1, 0.5],
      8,
    );
  });
};

/** Curling fronds that wave when someone comes near. */
const buildFronds = (builder: AttractionBuilder) => {
  const tentacles = 5;
  for (let tentacle = 0; tentacle < tentacles; tentacle++) {
    const heading = (tentacle / tentacles) * Math.PI * 2;
    const height = 1.0 + (tentacle % 2) * 0.35;
    const steps = 6;
    for (let step = 0; step < steps; step++) {
      builder.bar(
        "paint",
        step > 3 ? shade(frondGreen, 1.2) : frondGreen,
        tentaclePoint(heading, step / steps, height),
        tentaclePoint(heading, (step + 1) / steps, height),
        0.11 - step * 0.015,
        6,
      );
    }
    builder.sphere(
      "glow",
      glowTeal,
      0.06,
      tentaclePoint(heading, 1, height),
      [1, 1, 1],
      8,
    );
  }
  builder.sphere(
    "paint",
    shade(frondGreen, 0.7),
    0.2,
    [0, 0.02, 0],
    [1, 0.5, 1],
    10,
  );
};

/** A spiral plant that twirls, faster when someone is near. */
const buildSpiral = (builder: AttractionBuilder) => {
  builder.cylinder("paint", stemTeal, {
    radius: 0.05,
    radiusEnd: 0.02,
    length: 1.5,
    at: [0, 0.75, 0],
    segments: 8,
  });
  const turns = 28;
  for (let step = 0; step < turns; step++) {
    const point = (index: number): Triple => {
      const angle = index * 0.55;
      const radius = 0.38 * (1 - index / (turns + 4));
      return [
        Math.sin(angle) * radius,
        0.1 + index * 0.05,
        Math.cos(angle) * radius,
      ];
    };
    builder.bar(
      "paint",
      step % 4 < 2 ? glowViolet : shade(glowViolet, 0.75),
      point(step),
      point(step + 1),
      0.06 - step * 0.0012,
      4,
    );
  }
  builder.sphere("glow", glowViolet, 0.1, [0, 1.55, 0], [1, 1, 1], 10);
};

/** Glowing bulbs that pop up out of the soil when someone comes near. */
const buildBulbs = (builder: AttractionBuilder) => {
  (
    [
      [0, 0, 0.7, glowLime],
      [0.28, 0.12, 0.55, glowPink],
      [-0.24, 0.1, 0.5, glowTeal],
    ] satisfies [number, number, number, string][]
  ).forEach(([dx, dz, height, colour]) => {
    const base = -0.95;
    builder.bar(
      "paint",
      stemTeal,
      [dx, base, dz],
      [dx, base + height, dz],
      0.05,
      6,
    );
    builder.sphere(
      "glow",
      colour,
      0.13,
      [dx, base + height + 0.08, dz],
      [1, 1.15, 1],
      12,
    );
    [-1, 1].forEach((side) => {
      builder.sphere(
        "matte",
        frondGreen,
        0.1,
        [dx + side * 0.08, base + height * 0.5, dz],
        [1, 0.25, 0.5],
        6,
      );
    });
  });
};

const buildOrb = (builder: AttractionBuilder) => {
  builder.sphere("glow", glowLime, 0.22, [0, 0, 0], [1, 1.15, 1], 14);
};

const buildSpore = (builder: AttractionBuilder) => {
  builder.sphere("glow", glowTeal, 0.05, [0, 0, 0], [1, 1, 1], 6);
  builder.sphere("glow", glowViolet, 0.025, [0.06, 0.04, 0], [1, 1, 1], 4);
};

export const alienGardenModel: CuriosityModel = {
  kind: "alien-garden",
  islandId: "starfall-isle",
  name: "Alien Garden",
  fact: "Scientists sort living things into groups by looking closely at what they can see, such as their shape, colour, how they grow and how they spread their seeds or spores. A classification key asks yes-or-no questions, one at a time, to work out which group something belongs to. Could you use a key to sort these strange alien plants?",
  curriculumLink:
    "Science, Year 6: living things and their habitats. Give reasons for classifying plants and animals based on specific characteristics.",
  footprint: 4.4,
  setting: "inland",
  signSpot: { x: -1.6, z: 3.5 },
  build: (builder) => {
    buildBed(builder);
    buildPuffballs(builder);
    buildPod(builder);
    buildCrystalsAndLamps(builder);
    buildKey(builder);
    if (builder.isFar) {
      builder.sphere(
        "paint",
        frondGreen,
        0.55,
        [frondAt[0], 0.6, frondAt[2]],
        [1, 1.2, 1],
        8,
      );
      builder.cylinder("paint", glowViolet, {
        radius: 0.36,
        radiusEnd: 0.05,
        length: 1.5,
        at: [spiralAt[0], 0.85, spiralAt[2]],
        segments: 8,
      });
    } else {
      builder.box(
        "matte",
        palette.paving,
        [1.0, 0.03, 1.4],
        [-0.6, 0.015, 3.2],
      );
    }
    addSignBoard(builder, [-1.6, 0, 3.5], signColour);
  },
  moving: [
    {
      name: "tentacle fronds",
      pivot: frondAt,
      build: buildFronds,
      motion: { kind: "nod", axis: "z", reach: 6, amplitude: 0.3, period: 2.2 },
    },
    {
      name: "spiral plant",
      pivot: spiralAt,
      build: buildSpiral,
      motion: { kind: "whirl", axis: "y", idle: 0.4, speed: 2.6, reach: 6 },
    },
    {
      name: "pop-up bulbs",
      pivot: bulbsAt,
      build: buildBulbs,
      motion: { kind: "rise", reach: 5, height: 0.85, period: 1.8 },
    },
    {
      name: "glowing pod",
      pivot: podOrb,
      build: buildOrb,
      motion: { kind: "wake", reach: 7 },
    },
  ],
  wanderers: [
    {
      name: "glowing spores",
      build: buildSpore,
      count: 8,
      centre: bed,
      radius: 2.0,
      speed: 0.25,
      height: 1.3,
      bob: 0.45,
    },
  ],
  blockers: [
    { x: frondAt[0], z: frondAt[2], radius: 0.45 },
    { x: spiralAt[0], z: spiralAt[2], radius: 0.4 },
    { x: podAt.x, z: podAt.z, radius: 0.45 },
    ...puffballs.map(({ x, z, size }) => ({ x, z, radius: size + 0.1 })),
    { x: crystalsAt.x, z: crystalsAt.z, radius: 0.35 },
    { x: lampPlantsAt.x, z: lampPlantsAt.z, radius: 0.4 },
    { x: keyAt.x - 0.62, z: keyAt.z, radius: 0.2 },
    { x: keyAt.x + 0.62, z: keyAt.z, radius: 0.2 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Classify a plant",
    news: "Does it glow? Yes! Does it have spores? Yes! The key says it's a Starfall Puffball, and it puffed a cloud of sparkly spores at you.",
    tune: [72, 79, 75, 82, 87],
  },
};
