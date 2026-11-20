import { ExtrudeGeometry, Shape } from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const ashGround = "#5b4a42";
const nestRock = "#4a403b";
const nestRockLight = "#6a5c54";
const twig = "#7a5634";
const twigDark = "#5a3d24";
const scales = "#3f9a6b";
const scalesDark = "#2f7a54";
const belly = "#ecd27e";
const spikes = "#ee7a45";
const wingSkin = "#7fc8a2";
const horn = "#f1e6cc";
const gold = "#e8b93a";
const goldDark = "#c9952a";
const eyeGold = "#ffd23f";
const chestWood = "#7a4a2a";
const signColour = "#2f7a54";

const nestAt = { x: 0, z: -0.5 };
const nestRadius = 2.0;
const bodyAt: Triple = [0.1, 0.78, -0.95];
const bodyRadius = 0.85;
const bodyScale: Triple = [1.5, 0.75, 0.9];
/* Where the head rests on its paws, asleep */
const headAt: Triple = [-1.05, 0.62, 0.3];
const headLift = 0.48;
const eyesAt: Triple = [
  headAt[0],
  headAt[1] + headLift + 0.18,
  headAt[2] + 0.3,
];
const wobblyEgg: Triple = [0.62, 0.22, 0.3];

/* The tail's spine, curling round the front of the nest */
const tailSpine: readonly (readonly [number, number, number, number])[] = [
  [1.25, 0.5, -0.85, 0.36],
  [1.6, 0.42, -0.45, 0.31],
  [1.72, 0.36, 0.0, 0.27],
  [1.6, 0.31, 0.42, 0.23],
  [1.3, 0.27, 0.75, 0.2],
  [0.92, 0.24, 0.95, 0.17],
  [0.52, 0.22, 1.02, 0.14],
  [0.15, 0.2, 0.98, 0.12],
];

const findBackHeight = (x: number): number => {
  const share = (x - bodyAt[0]) / (bodyRadius * bodyScale[0]);
  return (
    bodyAt[1] +
    bodyRadius * bodyScale[1] * Math.sqrt(Math.max(0, 1 - share * share))
  );
};

const buildNest = (builder: AttractionBuilder) => {
  const segments = builder.isFar ? 12 : 30;
  builder.lathe(
    "matte",
    nestRock,
    [
      [0, 0],
      [nestRadius + 0.45, 0],
      [nestRadius + 0.3, 0.22],
      [nestRadius - 0.2, 0.32],
      [0, 0.3],
    ],
    [nestAt.x, 0, nestAt.z],
    "y",
    segments,
  );
  builder.torus(
    "matte",
    twig,
    nestRadius,
    0.22,
    [nestAt.x, 0.36, nestAt.z],
    "y",
    builder.isFar ? 10 : 30,
  );
  if (builder.isFar) {
    return;
  }
  /* Twigs and sticks woven round the rim */
  for (let stick = 0; stick < 18; stick++) {
    const angle = (stick / 18) * Math.PI * 2;
    const across = angle + 1.2;
    const reach = nestRadius + (stick % 2 === 0 ? 0.08 : -0.08);
    const x = nestAt.x + Math.sin(angle) * reach;
    const z = nestAt.z + Math.cos(angle) * reach;
    builder.bar(
      "matte",
      stick % 3 === 0 ? twigDark : shade(twig, 1.12),
      [
        x - Math.sin(across) * 0.4,
        0.4 + (stick % 3) * 0.06,
        z - Math.cos(across) * 0.4,
      ],
      [
        x + Math.sin(across) * 0.4,
        0.5 - (stick % 2) * 0.1,
        z + Math.cos(across) * 0.4,
      ],
      0.05,
      4,
    );
  }
  /* Boulders round the nest's rocky base */
  for (let stone = 0; stone < 10; stone++) {
    const angle = (stone / 10) * Math.PI * 2 + 0.3;
    const reach = nestRadius + 0.55;
    builder.sphere(
      "matte",
      stone % 2 === 0 ? nestRockLight : nestRock,
      0.28 + (stone % 3) * 0.06,
      [
        nestAt.x + Math.sin(angle) * reach,
        0.12,
        nestAt.z + Math.cos(angle) * reach,
      ],
      [1.3, 0.8, 1],
      8,
    );
  }
};

/** Legs and paws tucked under, the neck, and the curled tail. */
const buildDragonStill = (builder: AttractionBuilder) => {
  /* The neck, curving from the shoulders down to the paws */
  builder.bar(
    "matte",
    scales,
    [bodyAt[0] - 0.9, 0.95, bodyAt[2] + 0.25],
    [headAt[0] + 0.05, headAt[1] + 0.05, headAt[2] - 0.45],
    0.46,
    builder.isFar ? 6 : 12,
  );
  tailSpine.forEach(([x, y, z, radius], index) => {
    if (builder.isFar && index % 2 === 1) {
      return;
    }
    builder.sphere(
      "matte",
      index % 2 === 0 ? scales : scalesDark,
      radius,
      [x, y, z],
      [1, 0.85, 1],
      builder.isFar ? 6 : 11,
    );
  });
  if (builder.isFar) {
    return;
  }
  /* Joints between the tail's beads, so it reads as one smooth tail */
  for (let index = 0; index < tailSpine.length - 1; index++) {
    const [x, y, z, radius] = tailSpine[index];
    const [nextX, nextY, nextZ] = tailSpine[index + 1];
    builder.bar(
      "matte",
      scales,
      [x, y, z],
      [nextX, nextY, nextZ],
      radius * 1.6,
      8,
    );
    /* Little coral spikes along the top of the tail */
    builder.cylinder("paint", spikes, {
      radius: 0.07,
      radiusEnd: 0.0,
      length: 0.16,
      at: [x, y + radius * 0.85 + 0.06, z],
      segments: 6,
    });
  }
  /* The spade on the tail's tip */
  const [tipX, tipY, tipZ] = tailSpine[tailSpine.length - 1];
  builder.cylinder("paint", spikes, {
    radius: 0.2,
    radiusEnd: 0.0,
    length: 0.34,
    at: [tipX - 0.2, tipY, tipZ - 0.02],
    axis: "x",
    segments: 4,
  });
  /* Front paws, crossed under the chin, with pale claws */
  [
    [headAt[0] - 0.2, headAt[2] + 0.05],
    [headAt[0] + 0.25, headAt[2] + 0.15],
  ].forEach(([x, z]) => {
    builder.sphere("matte", scalesDark, 0.2, [x, 0.38, z], [1, 0.65, 1.3], 10);
    [-0.09, 0, 0.09].forEach((across) => {
      builder.cylinder("paint", horn, {
        radius: 0.03,
        radiusEnd: 0.0,
        length: 0.08,
        at: [x + across, 0.34, z + 0.27],
        axis: "z",
        segments: 5,
      });
    });
  });
  /* A back leg tucked against the flank */
  builder.sphere(
    "matte",
    scalesDark,
    0.38,
    [0.85, 0.55, -0.35],
    [1.2, 0.8, 1],
    12,
  );
  builder.sphere(
    "matte",
    scalesDark,
    0.18,
    [1.05, 0.36, -0.05],
    [1.2, 0.6, 1.3],
    9,
  );
};

/** The body: the part that rises and falls as the dragon breathes. */
const buildBody = (builder: AttractionBuilder) => {
  builder.sphere("matte", scales, bodyRadius, [0, 0, 0], bodyScale, 16);
  /* Pale belly scales in bands along the front */
  for (let band = 0; band < 5; band++) {
    const x = -0.75 + band * 0.32;
    builder.sphere(
      "matte",
      band % 2 === 0 ? belly : shade(belly, 0.92),
      0.32,
      [x, -0.18, 0.5],
      [0.55, 0.9, 0.5],
      10,
    );
  }
  /* Spikes down the spine */
  for (let spike = 0; spike < 7; spike++) {
    const x = bodyAt[0] - 1.0 + spike * 0.33;
    builder.cylinder("paint", spike % 2 === 0 ? spikes : shade(spikes, 0.88), {
      radius: 0.12 - Math.abs(spike - 3) * 0.012,
      radiusEnd: 0.0,
      length: 0.3 - Math.abs(spike - 3) * 0.03,
      at: [x - bodyAt[0], findBackHeight(x) - bodyAt[1] + 0.1, 0],
      segments: 7,
    });
  }
  /* Folded wings on each flank, with their bony leading edge */
  const wing = new Shape();
  wing.moveTo(0, 0);
  wing.lineTo(1.5, 0.18);
  wing.quadraticCurveTo(1.25, -0.05, 1.15, -0.3);
  wing.quadraticCurveTo(0.95, -0.15, 0.75, -0.4);
  wing.quadraticCurveTo(0.5, -0.22, 0.32, -0.48);
  wing.quadraticCurveTo(0.15, -0.25, 0, -0.3);
  wing.lineTo(0, 0);
  [-1, 1].forEach((side) => {
    builder.add(
      "matte",
      side > 0 ? wingSkin : shade(wingSkin, 0.9),
      new ExtrudeGeometry(wing, {
        depth: 0.04,
        bevelEnabled: false,
        curveSegments: builder.segments(6, 3),
      }),
      {
        at: [-0.65, 0.42, side * 0.42],
        rotation: [-side * 0.95, 0, 0],
      },
    );
    /* The wing's tip, where its leading edge ends, turned with the wing */
    const tip: Triple = [
      0.85,
      0.42 + 0.18 * Math.cos(0.95),
      side * (0.42 - 0.18 * Math.sin(0.95)),
    ];
    builder.bar("matte", scalesDark, [-0.65, 0.42, side * 0.42], tip, 0.07, 6);
    builder.sphere("paint", horn, 0.05, tip, [1, 1, 1], 6);
  });
};

/** The head, which lifts off the paws as the Character comes near. */
const buildHead = (builder: AttractionBuilder) => {
  /* A neck that slides up out of the still neck as the head lifts */
  builder.bar(
    "matte",
    scales,
    [0.05, 0.0, -0.1],
    [0.12, -0.55, -0.55],
    0.36,
    10,
  );
  builder.sphere("matte", scales, 0.34, [0, 0.1, 0], [1, 0.9, 1.05], 16);
  /* The long, rounded snout and its nostrils */
  builder.sphere("matte", scales, 0.26, [0, 0.0, 0.32], [0.95, 0.75, 1.15], 14);
  builder.sphere("matte", belly, 0.2, [0, -0.1, 0.3], [0.95, 0.5, 1.1], 12);
  [-0.09, 0.09].forEach((across) => {
    builder.sphere(
      "matte",
      palette.black,
      0.035,
      [across, 0.07, 0.6],
      [1, 0.7, 1],
      6,
    );
  });
  /* A sleepy smile along the jaw */
  builder.bar(
    "matte",
    scalesDark,
    [-0.18, -0.08, 0.38],
    [0.18, -0.08, 0.38],
    0.025,
    4,
  );
  [-1, 1].forEach((side) => {
    /* Closed eyelids, little curved lines */
    builder.bar(
      "matte",
      scalesDark,
      [side * 0.06, 0.2, 0.28],
      [side * 0.2, 0.22, 0.22],
      0.035,
      5,
    );
    /* Horns sweeping back, and frilly ears */
    builder.bar(
      "paint",
      horn,
      [side * 0.14, 0.32, -0.08],
      [side * 0.24, 0.55, -0.35],
      0.08,
      7,
    );
    builder.cylinder("paint", horn, {
      radius: 0.04,
      radiusEnd: 0.0,
      length: 0.12,
      at: [side * 0.25, 0.6, -0.39],
      segments: 6,
    });
    builder.cylinder("paint", spikes, {
      radius: 0.08,
      radiusEnd: 0.0,
      length: 0.24,
      at: [side * 0.33, 0.12, -0.08],
      axis: "x",
      segments: 6,
    });
    /* Rosy cheeks */
    builder.sphere(
      "matte",
      "#f08a7a",
      0.06,
      [side * 0.22, 0.02, 0.26],
      [1, 0.6, 0.6],
      6,
    );
  });
  builder.cylinder("paint", spikes, {
    radius: 0.07,
    radiusEnd: 0.0,
    length: 0.18,
    at: [0, 0.45, -0.1],
    segments: 6,
  });
};

/** Its golden eyes, which blink open once the head is up. */
const buildEyes = (builder: AttractionBuilder) => {
  [-1, 1].forEach((side) => {
    builder.sphere(
      "glow",
      eyeGold,
      0.075,
      [side * 0.13, 0, 0],
      [1, 1, 0.6],
      10,
    );
    builder.box(
      "paint",
      palette.black,
      [0.025, 0.1, 0.02],
      [side * 0.13, 0, 0.045],
    );
    builder.sphere(
      "paint",
      palette.white,
      0.016,
      [side * 0.13 + 0.025, 0.03, 0.05],
      [1, 1, 1],
      4,
    );
  });
};

const buildEgg = (
  builder: AttractionBuilder,
  colour: string,
  spots: string,
) => {
  builder.sphere("paint", colour, 0.2, [0, 0.2, 0], [0.82, 1.12, 0.82], 14);
  [
    [0.12, 0.28, 0.06],
    [-0.1, 0.16, 0.09],
    [0.02, 0.36, -0.12],
    [-0.06, 0.08, -0.13],
  ].forEach(([x, y, z]) => {
    builder.sphere("paint", spots, 0.035, [x, y, z], [1, 1, 0.4], 5);
  });
};

const buildEggs = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  const eggs: { at: Triple; colour: string; spots: string }[] = [
    { at: [0.18, 0.22, 0.22], colour: "#7b6fd0", spots: "#f1d36a" },
    { at: [0.35, 0.22, -0.05], colour: "#ee8a4a", spots: "#fff1d2" },
  ];
  eggs.forEach(({ at, colour, spots }) => {
    builder.sphere(
      "paint",
      colour,
      0.2,
      [at[0], at[1] + 0.2, at[2]],
      [0.82, 1.12, 0.82],
      14,
    );
    builder.sphere(
      "paint",
      spots,
      0.04,
      [at[0] + 0.13, at[1] + 0.26, at[2] + 0.08],
      [1, 1, 0.4],
      5,
    );
    builder.sphere(
      "paint",
      spots,
      0.035,
      [at[0] - 0.1, at[1] + 0.33, at[2] + 0.1],
      [1, 1, 0.4],
      5,
    );
  });
};

const buildWobblyEgg = (builder: AttractionBuilder) => {
  buildEgg(builder, "#4fb3c9", "#fff1d2");
};

const buildCoinPile = (
  builder: AttractionBuilder,
  at: Triple,
  size: number,
) => {
  builder.cylinder("metal", gold, {
    radius: size,
    radiusEnd: size * 0.3,
    length: size * 0.7,
    at: [at[0], size * 0.35, at[2]],
    segments: builder.isFar ? 6 : 14,
  });
  if (builder.isFar) {
    return;
  }
  for (let coin = 0; coin < 7; coin++) {
    const angle = coin * 2.1;
    const reach = size * (0.9 + (coin % 3) * 0.2);
    builder.cylinder("metal", coin % 2 === 0 ? gold : goldDark, {
      radius: 0.07,
      length: 0.02,
      at: [
        at[0] + Math.sin(angle) * reach,
        0.012 + (coin % 2) * 0.02,
        at[2] + Math.cos(angle) * reach,
      ],
      segments: 10,
    });
  }
  builder.cylinder("metal", gold, {
    radius: 0.07,
    length: 0.02,
    at: [at[0] + size * 0.2, size * 0.55, at[2] + size * 0.3],
    axis: "z",
    segments: 10,
  });
};

const chestAt: Triple = [2.75, 0, -1.6];

const buildTreasure = (builder: AttractionBuilder) => {
  buildCoinPile(builder, [-2.4, 0, 1.55], 0.42);
  buildCoinPile(builder, [2.55, 0, 0.95], 0.32);
  /* An open treasure chest, spilling gold */
  const [x, , z] = chestAt;
  const turn = -0.5;
  builder.box(
    "matte",
    chestWood,
    [0.8, 0.45, 0.5],
    [x, 0.225, z],
    [0, turn, 0],
  );
  if (builder.isFar) {
    return;
  }
  builder.box(
    "metal",
    goldDark,
    [0.84, 0.06, 0.54],
    [x, 0.38, z],
    [0, turn, 0],
  );
  builder.box(
    "metal",
    goldDark,
    [0.06, 0.47, 0.54],
    [x, 0.235, z],
    [0, turn, 0],
  );
  builder.box("metal", gold, [0.74, 0.04, 0.44], [x, 0.46, z], [0, turn, 0]);
  /* Its lid, flung open */
  builder.box(
    "matte",
    chestWood,
    [0.8, 0.06, 0.5],
    [x - Math.sin(turn) * 0.28, 0.66, z - Math.cos(turn) * 0.28],
    [-1.25, turn, 0],
  );
  builder.sphere("metal", gold, 0.2, [x, 0.46, z], [1.4, 0.45, 0.9], 10);
  /* A jewelled goblet beside it */
  builder.lathe(
    "metal",
    gold,
    [
      [0, 0],
      [0.1, 0],
      [0.03, 0.04],
      [0.02, 0.16],
      [0.1, 0.22],
      [0.11, 0.34],
      [0, 0.3],
    ],
    [x - 0.75, 0, z + 0.35],
    "y",
    10,
  );
  builder.sphere(
    "glow",
    "#e0405a",
    0.03,
    [x - 0.75, 0.27, z + 0.45],
    [1, 1, 1],
    5,
  );
  /* Gems scattered in the ash */
  [
    { gemX: -2.0, gemZ: 2.2, colour: "#3fb4e0" },
    { gemX: 2.1, gemZ: 1.6, colour: "#e0405a" },
    { gemX: -2.9, gemZ: 0.9, colour: "#9a5ae0" },
  ].forEach(({ gemX, gemZ, colour }) => {
    builder.sphere("glow", colour, 0.06, [gemX, 0.05, gemZ], [1, 0.8, 1], 4);
  });
};

/** Tiptoe stones across the front, for creeping past. */
const buildTiptoeStones = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  for (let stone = 0; stone < 7; stone++) {
    const x = -3.0 + stone * 1.0;
    const z = 2.75 + Math.sin(stone * 1.3) * 0.25;
    builder.cylinder(
      "matte",
      stone % 2 === 0 ? nestRockLight : shade(nestRockLight, 0.88),
      {
        radius: 0.32,
        radiusEnd: 0.28,
        length: 0.06,
        at: [x, 0.03, z],
        segments: 10,
      },
    );
  }
};

export const sleepingDragonModel: CuriosityModel = {
  kind: "sleeping-dragon",
  islandId: "ember-isle",
  name: "Sleeping Dragon",
  fact: "Dragons are not real, but they appear in myths and legends from all over the world. In the Anglo-Saxon poem Beowulf, a dragon guards a hoard of gold and wakes up angry when a cup is stolen. Viking stories tell of the dragon Fafnir sleeping on his treasure. Storytellers used dragons to make listeners gasp!",
  curriculumLink:
    "English, Year 5: increase familiarity with a wide range of books, including myths, legends and traditional stories.",
  footprint: 5.4,
  setting: "inland",
  padColour: ashGround,
  signSpot: { x: 1.9, z: 4.3 },
  build: (builder) => {
    buildNest(builder);
    buildDragonStill(builder);
    buildEggs(builder);
    buildTreasure(builder);
    buildTiptoeStones(builder);
    if (builder.isFar) {
      builder.sphere("matte", scales, bodyRadius, bodyAt, bodyScale, 10);
      builder.sphere("matte", scales, 0.34, headAt, [1, 0.9, 1.4], 8);
    }
    addSignBoard(builder, [1.9, 0, 4.3], signColour);
  },
  moving: [
    {
      name: "breathing body",
      pivot: bodyAt,
      build: buildBody,
      motion: { kind: "bob", height: 0.045, period: 3.4 },
    },
    {
      name: "head",
      pivot: headAt,
      build: buildHead,
      motion: { kind: "rise", reach: 9, height: headLift, period: 3.4 },
    },
    {
      name: "eyes",
      pivot: eyesAt,
      build: buildEyes,
      motion: { kind: "wake", reach: 5 },
    },
    {
      name: "wobbly egg",
      pivot: wobblyEgg,
      build: buildWobblyEgg,
      motion: {
        kind: "nod",
        axis: "z",
        reach: 6,
        amplitude: 0.25,
        period: 0.7,
      },
    },
  ],
  smoke: [
    {
      at: [headAt[0], headAt[1] + 0.15, headAt[2] + 0.62],
      colour: "#cfcac4",
      puffs: 4,
      size: 0.08,
      rise: 0.9,
      spread: 0.15,
    },
  ],
  blockers: [
    { x: nestAt.x, z: nestAt.z, radius: nestRadius + 0.5 },
    { x: chestAt[0], z: chestAt[2], radius: 0.5 },
    { x: -2.4, z: 1.55, radius: 0.45 },
    { x: 2.55, z: 0.95, radius: 0.35 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Tiptoe past",
    news: "Shhh... you crept past on tiptoe. The dragon gave a sleepy snort, puffed a smoke ring and went back to dreaming of gold.",
  },
};
