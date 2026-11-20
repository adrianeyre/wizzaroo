import { SphereGeometry } from "three";
import {
  addSignBoard,
  findMotionPose,
  moveWithPose,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Motion,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const bark = "#6b5038";
const barkDark = "#4f3a26";
const canopy = "#2f7d32";
const canopyLight = "#4caf50";
const rope = "#d8c08a";
const stripes: readonly string[] = ["#e8742f", "#f2c94c", "#3fa0b8", "#d84a5a"];
const fur = "#8a7a5a";
const algaeFur = "#7d8a56";
const faceCream = "#eadfc4";
const eyeStripe = "#3a2a1a";
const claw = "#3a3026";
const signColour = "#5a6b2a";

const treeX = 2.15;
const treeZ = -0.8;
const tieHeight = 1.55;
const hammockPivot: Triple = [0, tieHeight, treeZ];
const bedHalf = 1.5;
const bedSag = 0.85;
const branchFrom: Triple = [treeX - 0.1, 2.7, treeZ];
const branchTo: Triple = [0.7, 2.95, treeZ + 0.35];
const slothGrip: Triple = [1.25, 2.84, treeZ + 0.22];
const neckAt: Triple = [
  slothGrip[0] - 0.64,
  slothGrip[1] - 0.4,
  slothGrip[2] + 0.12,
];

const hammockMotion: Motion = {
  kind: "swing",
  axis: "x",
  amplitude: 0.16,
  period: 4.5,
};

/** How far the hammock's bed hangs below its ties, along its length. */
const bedDrop = (x: number): number => bedSag * (1 - (x / bedHalf) ** 2) + 0.25;

const addTree = (builder: AttractionBuilder, x: number, lean: number) => {
  builder.cylinder("matte", bark, {
    radius: 0.32,
    radiusEnd: 0.24,
    length: 3.4,
    at: [x, 1.7, treeZ],
    segments: 14,
  });
  const clumps: [number, number, number, number][] = builder.isFar
    ? [
        [0, 3.9, 0, 1.25],
        [lean * 0.9, 3.5, 0.3, 0.9],
        [-lean * 0.5, 4.3, -0.4, 0.8],
      ]
    : [
        [0, 3.9, 0, 1.15],
        [lean * 0.9, 3.6, 0.3, 0.85],
        [-lean * 0.5, 4.3, -0.4, 0.8],
        [lean * 0.2, 3.5, -0.8, 0.75],
        [-lean * 0.9, 3.4, 0.2, 0.7],
      ];
  clumps.forEach(([dx, y, dz, size], index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? canopy : canopyLight,
      size,
      [x + dx, y, treeZ + dz],
      [1.15, 0.75, 1.1],
      12,
    );
  });
  if (builder.isFar) {
    return;
  }
  /* Roots spreading at the foot, and plants growing on the bark */
  [0.5, 1.8, 3.1, 4.4, 5.6].forEach((turn) => {
    builder.bar(
      "matte",
      barkDark,
      [x, 0.4, treeZ],
      [x + Math.sin(turn) * 0.7, 0.02, treeZ + Math.cos(turn) * 0.7],
      0.16,
      6,
    );
  });
  [1.2, 2.3].forEach((height, index) => {
    const turn = lean + index * 2;
    const at: Triple = [
      x + Math.sin(turn) * 0.28,
      height,
      treeZ + Math.cos(turn) * 0.28,
    ];
    for (let leaf = 0; leaf < 5; leaf++) {
      const spread = (leaf / 5) * Math.PI * 2;
      builder.add(
        "matte",
        leaf % 2 === 0 ? "#c84a3a" : "#5fa040",
        new SphereGeometry(1, 6, 3),
        {
          at: [
            at[0] + Math.sin(spread) * 0.1,
            at[1] + 0.1,
            at[2] + Math.cos(spread) * 0.1,
          ],
          rotation: [0.7, spread, 0],
          scale: [0.04, 0.015, 0.16],
        },
      );
    }
  });
  /* The rope tied round the trunk */
  builder.torus("matte", rope, 0.3, 0.03, [x, tieHeight, treeZ], "y", 16);
};

const buildTrees = (builder: AttractionBuilder) => {
  addTree(builder, -treeX, -1);
  addTree(builder, treeX, 1);
  /* The branch the sloth hangs from */
  builder.bar("matte", bark, branchFrom, branchTo, 0.18, 8);
  if (builder.isFar) {
    return;
  }
  builder.sphere("matte", bark, 0.09, branchTo, [1, 1, 1], 6);
  [0.3, 0.6].forEach((share, index) => {
    builder.sphere(
      "matte",
      index === 0 ? canopy : canopyLight,
      0.3,
      [
        branchFrom[0] + (branchTo[0] - branchFrom[0]) * share,
        branchFrom[1] + (branchTo[1] - branchFrom[1]) * share + 0.18,
        branchFrom[2] + (branchTo[2] - branchFrom[2]) * share,
      ],
      [1.3, 0.6, 1],
      8,
    );
  });
};

/** The hammock, hanging from the ties and swinging gently between the trees. */
const buildHammock = (builder: AttractionBuilder) => {
  const slats = 12;
  for (let slat = 0; slat < slats; slat++) {
    const fromX = -bedHalf + (slat / slats) * bedHalf * 2;
    const toX = -bedHalf + ((slat + 1) / slats) * bedHalf * 2;
    const fromY = -bedDrop(fromX);
    const toY = -bedDrop(toX);
    const width = 0.85 - Math.abs((fromX + toX) / 2 / bedHalf) * 0.25;
    builder.box(
      "matte",
      stripes[slat % stripes.length],
      [Math.hypot(toX - fromX, toY - fromY) + 0.02, 0.03, width],
      [(fromX + toX) / 2, (fromY + toY) / 2, 0],
      [0, 0, Math.atan2(toY - fromY, toX - fromX)],
    );
  }
  /* Fringed edges, spreader bars and the ropes up to the trees */
  [-1, 1].forEach((side) => {
    const endY = -bedDrop(side * bedHalf);
    builder.cylinder("matte", palette.paleTimber, {
      radius: 0.035,
      length: 0.8,
      at: [side * bedHalf, endY, 0],
      axis: "z",
      segments: 8,
    });
    [-0.38, -0.13, 0.13, 0.38].forEach((across) => {
      builder.bar(
        "matte",
        rope,
        [side * bedHalf, endY, across],
        [side * (treeX - 0.32), 0, 0],
        0.025,
        4,
      );
    });
    for (let tassel = 0; tassel < 6; tassel++) {
      const x = -bedHalf * 0.8 + tassel * ((bedHalf * 1.6) / 5);
      builder.box(
        "matte",
        rope,
        [0.03, 0.14, 0.02],
        [x, -bedDrop(x) - 0.08, side * 0.42],
      );
    }
  });
  /* A cushion at one end */
  builder.sphere(
    "matte",
    palette.cream,
    0.2,
    [-bedHalf + 0.4, -bedDrop(-bedHalf + 0.4) + 0.08, 0],
    [1, 0.45, 1.3],
    10,
  );
};

const buildStillHammock = (builder: AttractionBuilder) => {
  builder.box(
    "matte",
    stripes[0],
    [bedHalf * 2, 0.05, 0.8],
    [0, tieHeight - bedDrop(0) + 0.3, treeZ],
  );
};

/** The sloth's body and limbs, hanging upside down by its claws. */
const buildSloth = (builder: AttractionBuilder) => {
  const body: Triple = [-0.2, -0.45, 0.04];
  builder.sphere("matte", fur, 0.3, body, [1.35, 0.85, 0.95], 14);
  builder.sphere(
    "matte",
    algaeFur,
    0.24,
    [body[0] + 0.05, body[1] - 0.12, body[2]],
    [1.3, 0.6, 0.9],
    10,
  );
  /* Long arms and legs reaching up to the branch, with hooked claws */
  [
    [-0.55, -0.12],
    [-0.42, 0.14],
    [0.18, -0.13],
    [0.3, 0.13],
  ].forEach(([gripX, gripZ], index) => {
    const shoulder: Triple = [
      body[0] + (index < 2 ? -0.25 : 0.25),
      body[1] + 0.1,
      body[2] + gripZ * 0.8,
    ];
    const hand: Triple = [gripX, -0.06, gripZ];
    builder.bar(
      "matte",
      index % 2 === 0 ? fur : algaeFur,
      shoulder,
      hand,
      0.13,
      8,
    );
    builder.sphere("matte", fur, 0.07, hand, [1, 1, 1], 8);
    [-0.03, 0.03].forEach((spread) => {
      builder.bar(
        "paint",
        claw,
        [hand[0] + spread, hand[1] + 0.02, hand[2] - 0.04],
        [hand[0] + spread, 0.1, hand[2] + 0.02],
        0.025,
        4,
      );
    });
  });
  /* A stubby tail */
  builder.sphere(
    "matte",
    fur,
    0.07,
    [body[0] + 0.4, body[1] + 0.05, body[2]],
    [1, 0.8, 0.8],
    6,
  );
};

/** The sloth's smiling face, which slowly turns to look at visitors. */
const buildSlothHead = (builder: AttractionBuilder) => {
  builder.sphere("matte", fur, 0.19, [0, -0.04, 0.04], [1, 0.95, 0.95], 14);
  builder.sphere(
    "matte",
    faceCream,
    0.15,
    [0, -0.05, 0.12],
    [1.05, 0.9, 0.7],
    12,
  );
  [-1, 1].forEach((side) => {
    builder.add("matte", eyeStripe, new SphereGeometry(1, 8, 5), {
      at: [side * 0.065, -0.03, 0.22],
      rotation: [0, 0, side * 0.5],
      scale: [0.06, 0.03, 0.02],
    });
    builder.sphere(
      "paint",
      palette.black,
      0.02,
      [side * 0.06, -0.03, 0.235],
      [1, 1, 1],
      6,
    );
  });
  builder.sphere(
    "paint",
    "#3a2a1a",
    0.03,
    [0, -0.09, 0.24],
    [1.3, 0.9, 0.8],
    8,
  );
  builder.box(
    "paint",
    "#3a2a1a",
    [0.08, 0.01, 0.01],
    [0, -0.14, 0.23],
    [0, 0, 0],
  );
  builder.sphere(
    "matte",
    shade(fur, 1.2),
    0.08,
    [0, 0.12, 0.02],
    [1.6, 0.5, 1.2],
    8,
  );
};

const buildMoth = (builder: AttractionBuilder) => {
  builder.sphere("matte", "#a89a7a", 0.02, [0, 0, 0], [1, 1, 2], 5);
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      "#c9b994",
      [0.07, 0.004, 0.05],
      [side * 0.04, 0.005, 0],
      [0, 0, side * 0.3],
    );
  });
};

const buildGround = (builder: AttractionBuilder) => {
  builder.box("matte", "#6b5434", [5.2, 0.03, 1.8], [0, 0.015, treeZ]);
  builder.box("matte", palette.path, [1.1, 0.03, 3.0], [0.4, 0.015, 2.6]);
  if (builder.isFar) {
    return;
  }
  /* Fallen leaves on the forest floor */
  for (let leaf = 0; leaf < 12; leaf++) {
    const x = -2.4 + leaf * 0.43;
    builder.box(
      "matte",
      leaf % 3 === 0 ? "#b8863a" : leaf % 3 === 1 ? "#8a6a2a" : "#5f8a3a",
      [0.18, 0.01, 0.1],
      [x, 0.04, treeZ + ((leaf * 37) % 7) * 0.22 - 0.6],
      [0, leaf * 1.1, 0],
    );
  }
  /* Ferns and a bowl of leaves, the sloth's favourite food */
  [
    [-3.2, 1.0, 1.0],
    [3.3, 0.6, 0.9],
    [-1.0, -2.8, 1.1],
    [1.4, -2.9, 0.9],
  ].forEach(([x, z, size]) => {
    for (let frond = 0; frond < 6; frond++) {
      const turn = (frond / 6) * Math.PI * 2 + size;
      builder.add(
        "matte",
        frond % 2 === 0 ? canopyLight : canopy,
        new SphereGeometry(1, 6, 3),
        {
          at: [
            x + Math.sin(turn) * 0.35 * size,
            0.25 * size,
            z + Math.cos(turn) * 0.35 * size,
          ],
          rotation: [-0.5, turn, 0],
          scale: [0.12 * size, 0.03, 0.45 * size],
        },
      );
    }
  });
  builder.cylinder("matte", "#a77b45", {
    radius: 0.25,
    radiusEnd: 0.18,
    length: 0.16,
    at: [-1.2, 0.08, 0.9],
    segments: 12,
  });
  [0, 2.1, 4.2].forEach((turn) => {
    builder.add("matte", canopyLight, new SphereGeometry(1, 6, 3), {
      at: [-1.2 + Math.sin(turn) * 0.1, 0.18, 0.9 + Math.cos(turn) * 0.1],
      rotation: [0.3, turn, 0],
      scale: [0.07, 0.02, 0.14],
    });
  });
  /* A signpost: "Slow zone", with a snail painted on */
  builder.box("matte", palette.darkTimber, [0.07, 1.1, 0.07], [3.0, 0.55, 1.5]);
  builder.box(
    "paint",
    "#f2c94c",
    [0.6, 0.3, 0.04],
    [3.0, 1.0, 1.53],
    [0, -0.4, 0],
  );
  builder.sphere("paint", "#8a5a2a", 0.07, [3.0, 1.0, 1.56], [1, 1, 0.3], 8);
  builder.box(
    "paint",
    "#8a5a2a",
    [0.2, 0.04, 0.02],
    [2.95, 0.92, 1.57],
    [0, -0.4, 0],
  );
};

const seat: Triple = [0.2, tieHeight - bedDrop(0.2) + 0.05, treeZ];
const hammockSide = { x: 0.2, z: treeZ + 0.9 };

export const slothHammockModel: CuriosityModel = {
  kind: "sloth-hammock",
  islandId: "jungle-reach",
  name: "Sloth Hammock",
  fact: "Sloths are mammals that live high in the rainforest trees and hang upside down by their long, hooked claws. They move so slowly that tiny green algae grow on their fur, which helps them hide among the leaves. Sloths eat leaves, sleep up to 15 hours a day, and only climb down about once a week.",
  curriculumLink:
    "Science, Year 4: living things and their habitats. Recognise that living things can be grouped in a variety of ways, such as mammals that live in the trees.",
  footprint: 4.6,
  setting: "inland",
  signSpot: { x: -1.4, z: 3.6 },
  build: (builder) => {
    buildGround(builder);
    buildTrees(builder);
    if (builder.isFar) {
      buildStillHammock(builder);
      builder.sphere(
        "matte",
        fur,
        0.3,
        [slothGrip[0] - 0.2, slothGrip[1] - 0.45, slothGrip[2]],
        [1.35, 0.85, 0.95],
        8,
      );
    }
    addSignBoard(builder, [-1.4, 0, 3.6], signColour);
  },
  moving: [
    {
      name: "hammock",
      pivot: hammockPivot,
      build: buildHammock,
      motion: hammockMotion,
    },
    {
      name: "sloth",
      pivot: slothGrip,
      build: buildSloth,
      motion: { kind: "swing", axis: "x", amplitude: 0.06, period: 7 },
    },
    {
      name: "sloth head",
      pivot: neckAt,
      build: buildSlothHead,
      motion: { kind: "nod", axis: "y", reach: 6, amplitude: 0.6, period: 5 },
    },
  ],
  wanderers: [
    {
      name: "sloth moths",
      build: buildMoth,
      count: 4,
      centre: { x: slothGrip[0], z: slothGrip[2] },
      radius: 0.7,
      speed: 0.6,
      height: 2.3,
      bob: 0.1,
    },
  ],
  blockers: [
    { x: -treeX, z: treeZ, radius: 0.45 },
    { x: treeX, z: treeZ, radius: 0.45 },
    { x: 3.0, z: 1.5, radius: 0.15 },
    { x: -1.2, z: 0.9, radius: 0.3 },
  ] satisfies LocalBlocker[],
  rides: [
    {
      id: "hammock",
      name: "the hammock",
      start: hammockSide,
      reach: 0.5,
      seconds: 12,
      finish: { x: 1.1, z: treeZ + 1.9 },
      follow: (progress, seconds) => {
        const [x, y, z] = moveWithPose(
          hammockPivot,
          seat,
          findMotionPose(hammockMotion, seconds),
        );
        const share = Math.min(1, progress * 10, (1 - progress) * 10);
        return {
          x: hammockSide.x + (x - hammockSide.x) * share,
          y: y * share,
          z: hammockSide.z + (z - hammockSide.z) * share,
          heading: 0,
        };
      },
    },
  ],
  play: {
    label: "Relax in the hammock",
    news: "Aaah… you swung slowly in the hammock, as slow as a sloth. The sloth gave you a sleepy smile.",
  },
};
