import { ExtrudeGeometry, Shape } from "three";
import {
  addBush,
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const bark = "#6b4f3a";
const barkDark = "#4e3828";
const moss = "#5f8f3a";
const leafDeep = "#256b2a";
const leafMid = "#2f8a35";
const leafBright = "#4fa83c";
const plank = "#a9784a";
const rope = "#cdb68a";
const net = "#e2d3ae";
const morphoBlue = "#2e8fe0";
const slothFur = "#8a7560";
const signColour = "#2f6b3a";

/* Two giant trees, a platform round each, and a rope bridge between them */
const trees = [
  { x: -3.4, z: -0.8 },
  { x: 3.4, z: -0.8 },
];
const deckTop = 1.2;
const platformRadius = 1.25;
const trunkRadius = 0.55;
const bridgeZ = -0.8;
const bridgeHalf = 2.2;
const bridgeWidth = 0.8;
const bridgeSag = 0.24;
const bridgePivot: Triple = [0, 2.3, bridgeZ];
const rampFoot = 3.2;
const rampTop = trees[0].z + platformRadius - 0.1;
const rampWidth = 0.8;

/** How high the bridge's planks are at a point along it, as it sags. */
const bridgeHeightAt = (x: number): number =>
  deckTop - bridgeSag * (1 - (x / bridgeHalf) ** 2);

/** How high a ramp is at a point along it, rising to the platform. */
const rampHeightAt = (z: number): number =>
  deckTop * Math.min(1, Math.max(0, (rampFoot - z) / (rampFoot - rampTop)));

/** A curved buttress root, a thin fin flaring out from the trunk. */
const addButtress = (
  builder: AttractionBuilder,
  base: Triple,
  angle: number,
  reach: number,
  height: number,
) => {
  const shape = new Shape();
  shape.moveTo(0, 0);
  shape.lineTo(reach, 0);
  shape.quadraticCurveTo(reach * 0.22, height * 0.18, 0, height);
  shape.lineTo(0, 0);
  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.16,
    bevelEnabled: false,
    curveSegments: builder.segments(8, 3),
  });
  geometry.translate(0, 0, -0.08);
  builder.add("matte", bark, geometry, { at: base, rotation: [0, angle, 0] });
};

const addLeafClump = (
  builder: AttractionBuilder,
  at: Triple,
  radius: number,
  colour: string,
) => {
  builder.sphere("matte", colour, radius, at, [1, 0.72, 1], 12);
};

const buildGiantTree = (
  builder: AttractionBuilder,
  { x, z }: { x: number; z: number },
  side: number,
) => {
  builder.lathe(
    "matte",
    bark,
    [
      [0.85, 0],
      [0.66, 0.5],
      [trunkRadius, 1.4],
      [0.47, 3.6],
      [0.38, 5.6],
      [0.2, 6.4],
      [0, 6.5],
    ],
    [x, 0, z],
    "y",
    builder.isFar ? 8 : 16,
  );
  if (builder.isFar) {
    addLeafClump(builder, [x, 6.6, z], 2.0, leafMid);
    return;
  }
  for (let index = 0; index < 5; index++) {
    const angle = index * 1.26 + side * 0.4;
    addButtress(builder, [x, 0, z], angle, 1.25, 1.7 + (index % 2) * 0.4);
  }
  /* A collar of moss round the trunk */
  builder.cylinder("matte", moss, {
    radius: 0.53,
    radiusEnd: 0.5,
    length: 0.7,
    at: [x, 2.7, z],
    segments: 14,
    isOpen: true,
  });
  /* Boughs reaching out, each holding a clump of the canopy */
  const boughs: [number, number, number][] = [
    [0.4, 5.0, 1.8],
    [2.4, 5.4, 1.6],
    [4.3, 4.8, 1.7],
  ];
  boughs.forEach(([angle, height, reach]) => {
    const tipX = x + Math.sin(angle + side) * reach;
    const tipZ = z + Math.cos(angle + side) * reach;
    builder.bar(
      "matte",
      bark,
      [x, height - 0.6, z],
      [tipX, height + 0.4, tipZ],
      0.2,
      8,
    );
    addLeafClump(builder, [tipX, height + 0.9, tipZ], 1.15, leafDeep);
    /* A liana hanging from the bough, with a few leaves */
    const dangle = 2.2 + (angle % 1) * 0.8;
    builder.bar(
      "matte",
      moss,
      [tipX * 0.9 + x * 0.1, height + 0.3, tipZ * 0.9 + z * 0.1],
      [tipX * 0.85 + x * 0.15, height - dangle, tipZ * 0.85 + z * 0.15],
      0.04,
      5,
    );
    builder.sphere(
      "matte",
      leafBright,
      0.12,
      [tipX * 0.87 + x * 0.13, height - dangle * 0.6, tipZ * 0.87 + z * 0.13],
      [1, 0.35, 0.7],
      6,
    );
  });
  addLeafClump(builder, [x, 6.8, z], 1.7, leafMid);
  addLeafClump(builder, [x + 0.6 * side, 7.6, z - 0.3], 1.1, leafBright);
  /* A bromeliad perched on the trunk, with a red heart */
  const perch: Triple = [x - side * 0.48, 3.3, z + 0.1];
  for (let leaf = 0; leaf < 5; leaf++) {
    const turn = (leaf / 5) * Math.PI * 2;
    builder.box(
      "matte",
      leafBright,
      [0.06, 0.4, 0.12],
      [
        perch[0] + Math.sin(turn) * 0.1,
        perch[1] + 0.15,
        perch[2] + Math.cos(turn) * 0.1,
      ],
      [Math.cos(turn) * 0.5, 0, -Math.sin(turn) * 0.5],
    );
  }
  builder.sphere(
    "paint",
    "#d6342c",
    0.08,
    [perch[0], perch[1] + 0.12, perch[2]],
    [1, 1, 1],
    8,
  );
};

const buildPlatform = (
  builder: AttractionBuilder,
  { x, z }: { x: number; z: number },
  side: number,
) => {
  builder.cylinder("matte", plank, {
    radius: platformRadius,
    length: 0.14,
    at: [x, deckTop - 0.07, z],
    segments: 8,
  });
  if (builder.isFar) {
    return;
  }
  builder.torus(
    "matte",
    shade(plank, 0.75),
    platformRadius - 0.02,
    0.06,
    [x, deckTop - 0.1, z],
    "y",
    8,
  );
  /* Posts under the platform, braced back to the trunk */
  for (let post = 0; post < 4; post++) {
    const angle = Math.PI / 4 + (post * Math.PI) / 2;
    const px = x + Math.sin(angle) * (platformRadius - 0.2);
    const pz = z + Math.cos(angle) * (platformRadius - 0.2);
    builder.cylinder("matte", barkDark, {
      radius: 0.07,
      length: deckTop,
      at: [px, deckTop / 2, pz],
      segments: 6,
    });
    builder.bar(
      "matte",
      barkDark,
      [px, deckTop - 0.15, pz],
      [x + Math.sin(angle) * 0.55, deckTop - 0.75, z + Math.cos(angle) * 0.55],
      0.07,
      5,
    );
  }
  /* A rope rail round the edge, open towards the ramp and the bridge */
  const openings = [0, side < 0 ? Math.PI / 2 : -Math.PI / 2];
  const posts = 12;
  for (let post = 0; post < posts; post++) {
    const angle = (post / posts) * Math.PI * 2;
    const isOpen = openings.some((gap) => {
      const difference = Math.atan2(
        Math.sin(angle - gap),
        Math.cos(angle - gap),
      );
      return Math.abs(difference) < 0.4;
    });
    if (isOpen) {
      continue;
    }
    const px = x + Math.sin(angle) * (platformRadius - 0.08);
    const pz = z + Math.cos(angle) * (platformRadius - 0.08);
    builder.box("matte", barkDark, [0.07, 0.8, 0.07], [px, deckTop + 0.4, pz]);
    const next = angle + (Math.PI * 2) / posts;
    const nextIsOpen = openings.some((gap) => {
      const difference = Math.atan2(Math.sin(next - gap), Math.cos(next - gap));
      return Math.abs(difference) < 0.4;
    });
    if (!nextIsOpen) {
      [0.4, 0.78].forEach((up) => {
        builder.bar(
          "matte",
          rope,
          [px, deckTop + up, pz],
          [
            x + Math.sin(next) * (platformRadius - 0.08),
            deckTop + up,
            z + Math.cos(next) * (platformRadius - 0.08),
          ],
          0.035,
          4,
        );
      });
    }
  }
  /* Tall posts at the bridge end hold the hand ropes */
  const endX = x - side * (platformRadius - 0.1);
  [-1, 1].forEach((across) => {
    builder.cylinder("matte", barkDark, {
      radius: 0.07,
      length: 1.25,
      at: [endX, deckTop + 0.62, bridgeZ + across * (bridgeWidth / 2 + 0.06)],
      segments: 6,
    });
    builder.sphere(
      "matte",
      barkDark,
      0.09,
      [endX, deckTop + 1.27, bridgeZ + across * (bridgeWidth / 2 + 0.06)],
      [1, 1, 1],
      6,
    );
  });
};

const buildRamp = (builder: AttractionBuilder, x: number) => {
  const length = rampFoot - rampTop;
  const slope = Math.atan2(deckTop, length);
  const middle = (rampFoot + rampTop) / 2;
  builder.box(
    "matte",
    plank,
    [rampWidth, 0.1, Math.hypot(length, deckTop)],
    [x, deckTop / 2 - 0.04, middle],
    [slope, 0, 0],
  );
  if (builder.isFar) {
    return;
  }
  /* Cleats to grip, and posts and rails up both sides */
  for (let cleat = 1; cleat < 9; cleat++) {
    const z = rampFoot - (cleat / 9) * length;
    builder.box(
      "matte",
      shade(plank, 0.8),
      [rampWidth - 0.06, 0.04, 0.06],
      [x, rampHeightAt(z) + 0.02, z],
    );
  }
  [-1, 1].forEach((across) => {
    const railX = x + across * (rampWidth / 2 + 0.04);
    [0.15, 0.5, 0.85].forEach((share) => {
      const z = rampFoot - share * length;
      builder.box(
        "matte",
        barkDark,
        [0.06, 0.8, 0.06],
        [railX, rampHeightAt(z) + 0.36, z],
      );
    });
    builder.bar(
      "matte",
      rope,
      [railX, 0.75, rampFoot - 0.1],
      [railX, deckTop + 0.75, rampTop + 0.1],
      0.04,
      5,
    );
  });
};

/** The rainforest's four layers, marked on a post for visitors. */
const buildLayerPost = (builder: AttractionBuilder) => {
  const at = { x: 1.55, z: 3.5 };
  builder.cylinder("matte", barkDark, {
    radius: 0.06,
    length: 2.4,
    at: [at.x, 1.2, at.z],
    segments: 8,
  });
  if (builder.isFar) {
    return;
  }
  [
    { height: 2.2, colour: "#7cc24a" },
    { height: 1.65, colour: "#2f8a35" },
    { height: 1.1, colour: "#c9a24a" },
    { height: 0.55, colour: "#7a5236" },
  ].forEach(({ height, colour }, index) => {
    builder.box(
      "paint",
      colour,
      [0.46, 0.2, 0.04],
      [at.x + (index % 2 === 0 ? 0.22 : -0.22), height, at.z + 0.04],
    );
  });
};

const buildForestFloor = (builder: AttractionBuilder) => {
  builder.cylinder("matte", "#4d3a28", {
    radius: 4.9,
    length: 0.03,
    at: [0, 0.015, -0.6],
    segments: builder.segments(32, 12),
  });
  if (builder.isFar) {
    return;
  }
  /* Ferns, fallen leaves and a mossy log on the forest floor */
  [
    [-1.2, -2.6],
    [1.4, -2.9],
    [-5, 1.6],
    [4.9, 1.8],
    [0.2, -3.4],
  ].forEach(([x, z], index) => {
    for (let frond = 0; frond < 6; frond++) {
      const turn = (frond / 6) * Math.PI * 2 + index;
      builder.box(
        "matte",
        index % 2 === 0 ? leafBright : leafMid,
        [0.1, 0.03, 0.7],
        [x + Math.sin(turn) * 0.3, 0.22, z + Math.cos(turn) * 0.3],
        [-0.5, turn, 0],
      );
    }
  });
  builder.cylinder("matte", barkDark, {
    radius: 0.24,
    length: 1.8,
    at: [-0.6, 0.24, -2.1],
    axis: "x",
    segments: 12,
  });
  builder.sphere("matte", moss, 0.26, [-0.5, 0.42, -2.1], [3, 0.4, 1], 10);
  /* Fallen fruit by the log */
  [
    { x: -0.9, colour: "#e2a23a" },
    { x: -0.4, colour: "#c84a32" },
  ].forEach(({ x, colour }) => {
    builder.sphere("paint", colour, 0.07, [x, 0.07, -1.75], [1, 0.8, 1], 8);
  });
  addBush(builder, [-1.9, 0, 2.6], 0.45, leafDeep);
  addBush(builder, [2.4, 0, 2.9], 0.4, leafMid);
};

const buildBridge = (builder: AttractionBuilder) => {
  const [px, py] = bridgePivot;
  const planks = 18;
  const step = (bridgeHalf * 2) / planks;
  for (let index = 0; index <= planks; index++) {
    const x = -bridgeHalf + index * step;
    const slope = Math.atan((2 * bridgeSag * x) / bridgeHalf ** 2);
    builder.box(
      "matte",
      shade(plank, index % 3 === 0 ? 0.9 : 1.05),
      [step * 0.78, 0.06, bridgeWidth],
      [x - px, bridgeHeightAt(x) - 0.03 - py, 0],
      [0, 0, slope],
    );
  }
  /* Foot ropes, hand ropes and netting along both sides */
  const bays = 7;
  [-1, 1].forEach((across) => {
    const ropeZ = across * (bridgeWidth / 2 + 0.04);
    for (let bay = 0; bay < bays; bay++) {
      const from = -bridgeHalf + (bay / bays) * bridgeHalf * 2;
      const to = -bridgeHalf + ((bay + 1) / bays) * bridgeHalf * 2;
      const footFrom: Triple = [from - px, bridgeHeightAt(from) - py, ropeZ];
      const footTo: Triple = [to - px, bridgeHeightAt(to) - py, ropeZ];
      const handFrom: Triple = [
        from - px,
        bridgeHeightAt(from) * 0.4 + deckTop * 0.6 + 1.0 - py,
        ropeZ,
      ];
      const handTo: Triple = [
        to - px,
        bridgeHeightAt(to) * 0.4 + deckTop * 0.6 + 1.0 - py,
        ropeZ,
      ];
      builder.bar("matte", rope, footFrom, footTo, 0.05, 4);
      builder.bar("matte", rope, handFrom, handTo, 0.05, 4);
      builder.bar("matte", net, footFrom, handTo, 0.02, 4);
      builder.bar("matte", net, footTo, handFrom, 0.02, 4);
    }
  });
};

const buildBridgeStandIn = (builder: AttractionBuilder) => {
  [-1, 0, 1].forEach((third) => {
    const x = (third * bridgeHalf * 2) / 3;
    builder.box(
      "matte",
      plank,
      [(bridgeHalf * 2) / 3 + 0.05, 0.08, bridgeWidth],
      [x, bridgeHeightAt(x), bridgeZ],
    );
  });
};

const buildSloth = (builder: AttractionBuilder) => {
  /* It hangs below the branch by its long arms, face turned to visitors */
  builder.cylinder("matte", barkDark, {
    radius: 0.09,
    length: 1.6,
    at: [0, 0, 0],
    axis: "x",
    segments: 8,
  });
  [-0.2, 0.2].forEach((side) => {
    builder.bar(
      "matte",
      slothFur,
      [side, -0.05, 0],
      [side * 0.8, -0.5, 0],
      0.09,
      6,
    );
    builder.bar(
      "matte",
      shade(slothFur, 0.9),
      [side * 1.3, -0.05, 0],
      [side * 0.6, -0.8, 0.02],
      0.08,
      6,
    );
    builder.box("matte", "#3b2f25", [0.04, 0.08, 0.12], [side, 0.04, 0.04]);
  });
  builder.sphere("matte", slothFur, 0.24, [0, -0.72, 0], [1, 1.25, 0.85], 12);
  builder.sphere(
    "matte",
    "#e8dcc4",
    0.13,
    [0, -0.5, 0.12],
    [1.1, 0.9, 0.7],
    10,
  );
  [-0.05, 0.05].forEach((side) => {
    builder.sphere(
      "matte",
      "#3b2f25",
      0.035,
      [side, -0.48, 0.21],
      [1.4, 0.7, 0.5],
      6,
    );
  });
  builder.sphere("paint", palette.black, 0.02, [0, -0.53, 0.22], [1, 1, 1], 6);
};

const buildButterfly = (builder: AttractionBuilder) => {
  builder.box("matte", palette.black, [0.03, 0.03, 0.14], [0, 0, 0]);
  [-1, 1].forEach((side) => {
    builder.box(
      "glow",
      morphoBlue,
      [0.13, 0.01, 0.12],
      [side * 0.075, 0.02, 0.02],
      [0, 0, side * 0.35],
    );
  });
};

/* The walk: up the ramp, round the trunk, over the bridge and down again */
const walkPoints: Triple[] = [
  [-3.4, 0, 3.85],
  [-3.4, 0, rampFoot],
  [-3.4, deckTop, rampTop],
  [-2.45, deckTop, -0.35],
  [-bridgeHalf, deckTop, bridgeZ],
  [-bridgeHalf * 0.5, bridgeHeightAt(bridgeHalf * 0.5), bridgeZ],
  [0, bridgeHeightAt(0), bridgeZ],
  [bridgeHalf * 0.5, bridgeHeightAt(bridgeHalf * 0.5), bridgeZ],
  [bridgeHalf, deckTop, bridgeZ],
  [2.45, deckTop, -0.35],
  [3.4, deckTop, rampTop],
  [3.4, 0, rampFoot],
  [3.4, 0, 3.85],
];

const walkLengths = walkPoints.map((point, index) => {
  if (index === 0) {
    return 0;
  }
  const before = walkPoints[index - 1];
  return Math.hypot(point[0] - before[0], point[2] - before[2]);
});
const walkTotal = walkLengths.reduce((sum, length) => sum + length, 0);

const crossBridge = (progress: number, seconds: number): LocalSpot => {
  let left = Math.min(1, Math.max(0, progress)) * walkTotal;
  for (let index = 1; index < walkPoints.length; index++) {
    const length = walkLengths[index];
    if (left <= length || index === walkPoints.length - 1) {
      const share = length > 0 ? Math.min(1, left / length) : 1;
      const [fromX, fromY, fromZ] = walkPoints[index - 1];
      const [toX, toY, toZ] = walkPoints[index];
      const x = fromX + (toX - fromX) * share;
      const isOnBridge =
        Math.abs(x) < bridgeHalf && Math.abs(fromZ - bridgeZ) < 0.01;
      const sway = isOnBridge ? 0.04 * Math.sin(seconds * 3) : 0;
      return {
        x,
        y: isOnBridge ? bridgeHeightAt(x) : fromY + (toY - fromY) * share,
        z: fromZ + (toZ - fromZ) * share + sway,
        heading: Math.atan2(toX - fromX, toZ - fromZ),
      };
    }
    left -= length;
  }
  return { x: 3.4, y: 0, z: 3.85, heading: 0 };
};

const platformDeck: Deck = ({ x, z }) => {
  const isOnPlatform = trees.some(
    (tree) =>
      Math.hypot(x - tree.x, z - tree.z) <= platformRadius - 0.05 &&
      Math.hypot(x - tree.x, z - tree.z) >= trunkRadius,
  );
  return isOnPlatform ? { height: deckTop, kind: "bridge" } : undefined;
};

const bridgeDeck: Deck = ({ x, z }) =>
  Math.abs(x) <= bridgeHalf && Math.abs(z - bridgeZ) <= bridgeWidth / 2
    ? { height: bridgeHeightAt(x), kind: "bridge" }
    : undefined;

const rampDeck: Deck = ({ x, z }) => {
  const isOnRamp = trees.some(
    (tree) =>
      Math.abs(x - tree.x) <= rampWidth / 2 && z >= rampTop && z <= rampFoot,
  );
  return isOnRamp ? { height: rampHeightAt(z), kind: "bridge" } : undefined;
};

export const canopyWalkwayModel: CuriosityModel = {
  kind: "canopy-walkway",
  islandId: "jungle-reach",
  name: "Canopy Walkway",
  fact: "A rainforest grows in layers. Tall emergent trees poke out at the top, the leafy canopy is a roof below them, the shady understorey comes next, and the dark forest floor is at the bottom. Each layer is a different habitat, so different animals live in each one. Most rainforest animals live up in the canopy.",
  curriculumLink:
    "Science, Year 4: living things and their habitats. Explore and use classification keys to group, identify and name a variety of living things in their local and wider environment (the layers of the rainforest).",
  footprint: 5.6,
  setting: "inland",
  signSpot: { x: 0, z: 4.1 },
  build: (builder) => {
    buildForestFloor(builder);
    trees.forEach((tree, index) => {
      const side = index === 0 ? -1 : 1;
      buildGiantTree(builder, tree, side);
      buildPlatform(builder, tree, side);
      buildRamp(builder, tree.x);
    });
    if (builder.isFar) {
      buildBridgeStandIn(builder);
    } else {
      /* The sloth's branch, reaching back from the first tree */
      builder.bar(
        "matte",
        bark,
        [trees[0].x, 3.3, trees[0].z],
        [trees[0].x + 0.3, 3.65, -2.3],
        0.16,
        8,
      );
      addLeafClump(builder, [trees[0].x + 0.4, 3.95, -2.6], 0.6, leafMid);
    }
    buildLayerPost(builder);
    addSignBoard(builder, [0, 0, 4.1], signColour);
  },
  moving: [
    {
      name: "rope bridge",
      pivot: bridgePivot,
      build: buildBridge,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 6,
        amplitude: 0.07,
        period: 2.2,
      },
    },
    {
      name: "sloth",
      pivot: [trees[0].x + 0.27, 3.62, -2.2],
      build: buildSloth,
      motion: { kind: "swing", axis: "x", amplitude: 0.14, period: 5 },
    },
  ],
  wanderers: [
    {
      name: "blue morpho butterflies",
      build: buildButterfly,
      count: 5,
      centre: { x: 0, z: 0.6 },
      radius: 2.8,
      height: 1.7,
      bob: 0.35,
      speed: 0.6,
    },
  ],
  decks: [platformDeck, bridgeDeck, rampDeck],
  rides: [
    {
      id: "rope-bridge",
      name: "the rope bridge",
      start: { x: -3.4, z: 3.85 },
      reach: 0.6,
      seconds: 14,
      finish: { x: 3.4, z: 3.85 },
      follow: crossBridge,
    },
  ],
  blockers: trees.map((tree): LocalBlocker => ({
    x: tree.x,
    z: tree.z,
    radius: 0.75,
  })),
  play: {
    label: "Cross the bridge",
    news: "Wobble, wobble! You crossed the rope bridge high in the canopy, where most of the rainforest's animals live.",
  },
};
