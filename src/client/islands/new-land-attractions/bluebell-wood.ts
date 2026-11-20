import { ConeGeometry } from "three";
import {
  addBench,
  addSignBoard,
  findMotionPose,
  moveWithPose,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalPoint,
  type LocalSpot,
  type Motion,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";
import { meadowColours } from "./village-fete-parts.js";

/*
 * An ancient wood in spring: tall beeches and oaks over a carpet of
 * bluebells, a winding boardwalk to keep feet off the flowers, a
 * mossy fallen log to balance along, a rope swing on the great oak, a
 * badger sett, an owl in its hollow and a squirrel up a trunk.
 */

const bluebell = "#5b5fd6";
const bluebellPale = "#7f84e8";
const bluebellCarpet = "#5a57b8";
const stemGreen = "#3f7d34";
const woodFloor = "#4d6b2f";
const beechBark = "#8f8a80";
const oakBark = "#5e4a38";
const beechLeaf = "#6fb043";
const oakLeaf = "#4b8a36";
const moss = "#6f9a3a";
const boardTimber = "#9a7048";
const railTimber = "#7a5534";
const signColour = "#4a3f8c";
const ropeHemp = "#c9b07a";

/* The trees */

interface WoodTree {
  x: number;
  z: number;
  size: number;
  isOak?: boolean;
}

const owlTree: WoodTree = { x: -5.6, z: 2.6, size: 1.05, isOak: true };
const squirrelTree: WoodTree = { x: 3.8, z: 1.0, size: 0.95 };
const greatOak = { x: -5.0, z: -4.4 };

const trees: readonly WoodTree[] = [
  owlTree,
  squirrelTree,
  { x: 3.6, z: 5.0, size: 1.0 },
  { x: 6.2, z: -1.6, size: 1.1, isOak: true },
  { x: -3.4, z: 5.9, size: 0.9 },
  { x: 2.4, z: -7.0, size: 1.05 },
  { x: -1.6, z: -7.6, size: 0.95, isOak: true },
  { x: 6.0, z: -5.4, size: 0.9 },
  { x: -7.4, z: -1.0, size: 0.95 },
];

const addWoodTree = (
  builder: AttractionBuilder,
  { x, z, size, isOak = false }: WoodTree,
) => {
  const bark = isOak ? oakBark : beechBark;
  const trunk = (isOak ? 2.6 : 3.2) * size;
  builder.cylinder("matte", bark, {
    radius: (isOak ? 0.3 : 0.24) * size,
    radiusEnd: 0.15 * size,
    length: trunk,
    at: [x, trunk / 2, z],
    segments: 10,
  });
  /* Roots flaring into the ground */
  builder.cylinder("matte", shade(bark, 0.9), {
    radius: (isOak ? 0.5 : 0.4) * size,
    radiusEnd: (isOak ? 0.3 : 0.24) * size,
    length: 0.3,
    at: [x, 0.15, z],
    segments: 10,
  });
  [0.6, 2.7].forEach((turn) => {
    builder.bar(
      "matte",
      bark,
      [x, trunk * 0.75, z],
      [
        x + Math.sin(turn) * 1.1 * size,
        trunk + 0.5,
        z + Math.cos(turn) * 1.1 * size,
      ],
      0.14 * size,
      6,
    );
  });
  const leaf = isOak ? oakLeaf : beechLeaf;
  const clumps: [number, number, number, number][] = builder.isFar
    ? [[0, 0.8, 0, 1.45]]
    : [
        [0, 1.0, 0, 1.15],
        [1.0, 0.5, 0.4, 0.85],
        [-0.8, 0.6, -0.5, 0.9],
      ];
  clumps.forEach(([dx, dy, dz, scale], index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? leaf : shade(leaf, 1.12),
      1.2 * size * scale,
      [x + dx * size, trunk + dy * size, z + dz * size],
      [1.1, 0.75, 1.1],
      10,
    );
  });
};

/* The great oak and its rope swing */

const swingPivot: Triple = [greatOak.x + 2.0, 3.0, greatOak.z];
const ropeDrop = 2.4;
const swingMotion: Motion = {
  kind: "swing",
  axis: "x",
  amplitude: 0.45,
  period: 3.4,
  phase: 1,
};

const addGreatOak = (builder: AttractionBuilder) => {
  const { x, z } = greatOak;
  builder.cylinder("matte", oakBark, {
    radius: 0.45,
    radiusEnd: 0.3,
    length: 2.6,
    at: [x, 1.3, z],
    segments: 12,
  });
  builder.cylinder("matte", shade(oakBark, 0.88), {
    radius: 0.75,
    radiusEnd: 0.45,
    length: 0.35,
    at: [x, 0.17, z],
    segments: 12,
  });
  builder.bar(
    "matte",
    oakBark,
    [x, 2.2, z],
    [swingPivot[0] + 0.7, swingPivot[1] + 0.2, swingPivot[2]],
    0.24,
    8,
  );
  builder.bar("matte", oakBark, [x, 2.4, z], [x - 1.2, 3.6, z + 0.8], 0.22, 6);
  builder.bar("matte", oakBark, [x, 2.4, z], [x - 0.4, 3.8, z - 1.2], 0.2, 6);
  const clumps: [number, number, number, number][] = builder.isFar
    ? [
        [0, 4.0, 0, 1.9],
        [2.2, 3.9, 0, 1.2],
      ]
    : [
        [0, 4.3, 0, 1.6],
        [-1.3, 3.8, 0.6, 1.1],
        [0.8, 3.9, -1.0, 1.1],
        [2.2, 4.0, 0.2, 1.1],
        [-0.6, 4.1, -1.3, 1.0],
      ];
  clumps.forEach(([dx, dy, dz, radius], index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? oakLeaf : shade(oakLeaf, 1.12),
      radius,
      [x + dx, dy, z + dz],
      [1.1, 0.72, 1.1],
      10,
    );
  });
};

const buildSwing = (builder: AttractionBuilder) => {
  builder.bar(
    "matte",
    ropeHemp,
    [0, 0.05, 0],
    [0, -ropeDrop + 0.1, 0],
    0.045,
    5,
  );
  /* A round wooden seat with a knot under it */
  builder.cylinder("matte", boardTimber, {
    radius: 0.24,
    length: 0.08,
    at: [0, -ropeDrop + 0.08, 0],
    segments: 14,
  });
  builder.sphere(
    "matte",
    ropeHemp,
    0.07,
    [0, -ropeDrop - 0.01, 0],
    [1, 0.8, 1],
    6,
  );
  builder.torus("matte", ropeHemp, 0.08, 0.03, [0, 0.02, 0], "x", 8);
};

/* The boardwalk */

const boardwalk: readonly LocalPoint[] = [
  { x: 0.6, z: 8.2 },
  { x: 1.6, z: 5.0 },
  { x: 0.4, z: 2.2 },
  { x: -1.6, z: 0.2 },
  { x: -1.0, z: -2.0 },
];
const boardHeight = 0.28;
const boardHalfWidth = 0.75;

const distanceToSegment = (
  point: LocalPoint,
  from: LocalPoint,
  to: LocalPoint,
): number => {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const share = Math.max(
    0,
    Math.min(
      1,
      ((point.x - from.x) * dx + (point.z - from.z) * dz) / (dx * dx + dz * dz),
    ),
  );
  return Math.hypot(
    point.x - from.x - dx * share,
    point.z - from.z - dz * share,
  );
};

const distanceToBoardwalk = (point: LocalPoint): number =>
  Math.min(
    ...boardwalk
      .slice(1)
      .map((to, index) => distanceToSegment(point, boardwalk[index], to)),
  );

const boardwalkDeck: Deck = (point) =>
  distanceToBoardwalk(point) <= boardHalfWidth
    ? { height: boardHeight, kind: "bridge" }
    : undefined;

const buildBoardwalk = (builder: AttractionBuilder) => {
  boardwalk.slice(1).forEach((to, index) => {
    const from = boardwalk[index];
    const length = Math.hypot(to.x - from.x, to.z - from.z);
    const turn = Math.atan2(to.x - from.x, to.z - from.z);
    const middle: Triple = [(from.x + to.x) / 2, 0, (from.z + to.z) / 2];
    const across = { x: Math.cos(turn), z: -Math.sin(turn) };
    builder.box(
      "matte",
      boardTimber,
      [boardHalfWidth * 2, 0.08, length],
      [middle[0], boardHeight - 0.04, middle[2]],
      [0, turn, 0],
    );
    const planks = builder.isFar ? 0 : Math.round(length / 0.36);
    for (let plank = 1; plank < planks; plank++) {
      const share = plank / planks;
      builder.box(
        "matte",
        shade(boardTimber, 0.78),
        [boardHalfWidth * 2, 0.012, 0.035],
        [
          from.x + (to.x - from.x) * share,
          boardHeight + 0.002,
          from.z + (to.z - from.z) * share,
        ],
        [0, turn, 0],
      );
    }
    /* Handrails on posts, stopping short of the bends */
    const isFirst = index === 0;
    const isLast = index === boardwalk.length - 2;
    const trimStart = isFirst ? 0.1 : 0.7;
    const trimEnd = isLast ? 0.1 : 0.7;
    const railFrom = trimStart / length;
    const railTo = 1 - trimEnd / length;
    const along = (share: number): LocalPoint => ({
      x: from.x + (to.x - from.x) * share,
      z: from.z + (to.z - from.z) * share,
    });
    [-1, 1].forEach((side) => {
      const offset = (boardHalfWidth - 0.04) * side;
      const start = along(railFrom);
      const end = along(railTo);
      builder.bar(
        "matte",
        railTimber,
        [
          start.x + across.x * offset,
          boardHeight + 0.85,
          start.z + across.z * offset,
        ],
        [
          end.x + across.x * offset,
          boardHeight + 0.85,
          end.z + across.z * offset,
        ],
        0.07,
        6,
      );
      if (!builder.isFar) {
        builder.bar(
          "matte",
          railTimber,
          [
            start.x + across.x * offset,
            boardHeight + 0.45,
            start.z + across.z * offset,
          ],
          [
            end.x + across.x * offset,
            boardHeight + 0.45,
            end.z + across.z * offset,
          ],
          0.05,
          4,
        );
      }
      const posts = Math.max(
        1,
        Math.round(((railTo - railFrom) * length) / 1.1),
      );
      for (let post = 0; post <= posts; post++) {
        const spot = along(railFrom + ((railTo - railFrom) * post) / posts);
        builder.box(
          "matte",
          railTimber,
          [0.09, boardHeight + 0.9, 0.09],
          [
            spot.x + across.x * offset,
            (boardHeight + 0.9) / 2,
            spot.z + across.z * offset,
          ],
          [0, turn, 0],
        );
      }
    });
  });
  /* Round landings at the bends, so the planks meet */
  boardwalk.slice(1, -1).forEach(({ x, z }) => {
    builder.cylinder("matte", boardTimber, {
      radius: boardHalfWidth,
      length: 0.08,
      at: [x, boardHeight - 0.04, z],
      segments: 14,
    });
  });
};

/* Bluebells */

const addBluebell = (builder: AttractionBuilder, at: Triple, lean: number) => {
  const [x, y, z] = at;
  const top: Triple = [
    x + Math.sin(lean) * 0.08,
    y + 0.3,
    z + Math.cos(lean) * 0.08,
  ];
  builder.bar("matte", stemGreen, [x, y, z], top, 0.018, 3);
  [0.1, 0.18].forEach((down, bell) => {
    builder.add(
      "matte",
      bell === 0 ? bluebell : bluebellPale,
      new ConeGeometry(0.035, 0.07, 5),
      {
        at: [
          top[0] + Math.sin(lean) * (0.03 + bell * 0.02),
          top[1] - down,
          top[2] + Math.cos(lean) * (0.03 + bell * 0.02),
        ],
      },
    );
  });
};

/** Spots for patches of bluebells, clear of the boardwalk, clearing and trunks. */
const listBluebellPatches = (): [number, number, number][] => {
  const patches: [number, number, number][] = [];
  for (let patch = 0; patch < 70 && patches.length < 22; patch++) {
    const angle = patch * 2.39996;
    const reach =
      1.4 + 7.2 * Math.sqrt((((patch * 0.618) % 1) + patch / 70) / 2);
    const x = Math.sin(angle) * reach;
    const z = Math.cos(angle) * reach;
    const isClear =
      reach < 8.6 &&
      distanceToBoardwalk({ x, z }) > boardHalfWidth + 0.9 &&
      Math.hypot(x - 0.6, z + 3.6) > 2.6 &&
      Math.hypot(x - greatOak.x - 1.8, z - greatOak.z) > 1.8 &&
      Math.hypot(x - 4.9, z - 3.0) > 1.1;
    if (isClear) {
      patches.push([x, z, 0.55 + ((patch * 13) % 7) / 10]);
    }
  }
  return patches;
};

const bluebellPatches = listBluebellPatches();

const buildFloor = (builder: AttractionBuilder) => {
  /* Leaf litter under the trees */
  builder.cylinder("matte", woodFloor, {
    radius: 9.0,
    length: 0.02,
    at: [0, 0.01, 0],
    segments: builder.segments(40, 20),
  });
  /* The clearing at the back, short grass and a ring of toadstools */
  builder.cylinder("matte", "#77a84a", {
    radius: 2.6,
    length: 0.025,
    at: [0.6, 0.02, -3.6],
    segments: builder.segments(28, 12),
  });
  bluebellPatches.forEach(([x, z, size], index) => {
    builder.cylinder("matte", index % 3 === 0 ? bluebellPale : bluebellCarpet, {
      radius: size,
      radiusEnd: size * 0.85,
      length: 0.06,
      at: [x, 0.04, z],
      segments: builder.segments(12, 6),
    });
    if (builder.isFar) {
      return;
    }
    const flowers = 3;
    for (let flower = 0; flower < flowers; flower++) {
      const angle = flower * 2.1 + index;
      addBluebell(
        builder,
        [
          x + Math.sin(angle) * size * 0.55,
          0.06,
          z + Math.cos(angle) * size * 0.55,
        ],
        angle + 1,
      );
    }
  });
  if (builder.isFar) {
    return;
  }
  /* Ferns, curled and feathery, at the edges */
  [
    [-7.6, 3.4],
    [7.4, 2.2],
    [-6.4, -6.0],
    [4.6, -7.0],
    [7.8, -3.4],
  ].forEach(([x, z], index) => {
    for (let frond = 0; frond < 5; frond++) {
      const angle = frond * 1.26 + index;
      builder.add(
        "matte",
        frond % 2 === 0 ? "#5b9a3a" : "#4c8a30",
        new ConeGeometry(0.12, 0.9, 4).rotateX(1.0).rotateY(angle),
        { at: [x + Math.sin(angle) * 0.3, 0.3, z + Math.cos(angle) * 0.3] },
      );
    }
  });
  /* Toadstools: red with white spots */
  [
    [-1.2, -5.4],
    [2.9, -5.0],
    [3.1, -2.2],
    [-1.6, -2.9],
  ].forEach(([x, z]) => {
    builder.cylinder("matte", palette.cream, {
      radius: 0.04,
      length: 0.18,
      at: [x, 0.09, z],
      segments: 6,
    });
    builder.sphere("paint", "#d0342c", 0.12, [x, 0.19, z], [1, 0.55, 1], 8);
    builder.sphere(
      "matte",
      palette.white,
      0.025,
      [x + 0.05, 0.25, z],
      [1, 0.5, 1],
      4,
    );
  });
};

/* The fallen log */

const logFrom: Triple = [0.4, 0.32, -4.9];
const logTo: Triple = [3.6, 0.32, -3.5];

const buildLog = (builder: AttractionBuilder) => {
  builder.bar("matte", oakBark, logFrom, logTo, 0.62, 12);
  /* Pale cut ends showing the rings */
  [logFrom, logTo].forEach((end, index) => {
    const out = index === 0 ? -1 : 1;
    const dx = (logTo[0] - logFrom[0]) / 3.5;
    const dz = (logTo[2] - logFrom[2]) / 3.5;
    builder.sphere(
      "matte",
      "#d8b884",
      0.3,
      [end[0] + dx * out * 0.01, end[1], end[2] + dz * out * 0.01],
      [1, 1, 1],
      10,
    );
  });
  if (builder.isFar) {
    return;
  }
  /* Moss and a stump of a branch */
  builder.sphere("matte", moss, 0.28, [1.6, 0.56, -4.35], [1.6, 0.35, 1], 8);
  builder.sphere("matte", moss, 0.22, [2.9, 0.55, -3.8], [1.4, 0.35, 1], 8);
  builder.bar("matte", oakBark, [2.2, 0.45, -4.1], [2.4, 0.9, -4.6], 0.12, 5);
  /* Bracket fungus on the side */
  [0.9, 2.5].forEach((along) => {
    builder.cylinder("matte", "#e0a64a", {
      radius: 0.12,
      length: 0.04,
      at: [along, 0.3, -4.57 + (along - 0.4) * 0.4375],
      segments: 8,
    });
  });
};

const logRide = (progress: number): LocalSpot => {
  const dx = logTo[0] - logFrom[0];
  const dz = logTo[2] - logFrom[2];
  const length = Math.hypot(dx, dz);
  const ux = dx / length;
  const uz = dz / length;
  const heading = Math.atan2(dx, dz);
  /* Step up at one end, balance along with a wobble, hop off the far end */
  const along = -0.9 + (length + 1.8) * progress;
  const onLog = along > -0.1 && along < length + 0.1;
  const wobble = onLog ? Math.sin(progress * 30) * 0.25 : 0;
  return {
    x: logFrom[0] + ux * along,
    y: onLog
      ? 0.64
      : Math.max(
          0,
          0.64 -
            Math.min(Math.abs(along + 0.1), Math.abs(along - length - 0.1)) *
              1.6,
        ),
    z: logFrom[2] + uz * along,
    heading: heading + wobble,
  };
};

const logLength = Math.hypot(logTo[0] - logFrom[0], logTo[2] - logFrom[2]);
const logStart = {
  x: logFrom[0] - ((logTo[0] - logFrom[0]) / logLength) * 0.9,
  z: logFrom[2] - ((logTo[2] - logFrom[2]) / logLength) * 0.9,
};
const logFinish = {
  x: logTo[0] + ((logTo[0] - logFrom[0]) / logLength) * 0.9,
  z: logTo[2] + ((logTo[2] - logFrom[2]) / logLength) * 0.9,
};

const swingRide = (progress: number, seconds: number): LocalSpot => {
  const seat: Triple = [
    swingPivot[0],
    swingPivot[1] - ropeDrop + 0.14,
    swingPivot[2],
  ];
  const [x, y, z] = moveWithPose(
    swingPivot,
    seat,
    findMotionPose(swingMotion, seconds),
  );
  const share = Math.min(1, progress * 10, (1 - progress) * 10);
  const outside = { x: swingPivot[0], z: swingPivot[2] + 1.3 };
  return {
    x: outside.x + (x - outside.x) * share,
    y: y * share,
    z: outside.z + (z - outside.z) * share,
    heading: 0,
  };
};

/* The badger sett, the owl and the squirrel */

const settAt = { x: 4.9, z: 3.0 };
const badgerAt: Triple = [settAt.x, -0.42, settAt.z + 0.55];

const buildSett = (builder: AttractionBuilder) => {
  const { x, z } = settAt;
  builder.sphere("matte", "#7a5a3a", 1.0, [x, 0, z], [1.1, 0.45, 1], 12);
  builder.sphere(
    "matte",
    palette.black,
    0.26,
    [x, 0.12, z + 0.62],
    [1.1, 0.8, 0.5],
    8,
  );
  if (!builder.isFar) {
    builder.sphere(
      "matte",
      "#8f6c48",
      0.35,
      [x + 0.7, 0.05, z + 0.6],
      [1, 0.35, 1],
      8,
    );
    builder.sphere(
      "matte",
      moss,
      0.3,
      [x - 0.5, 0.32, z - 0.2],
      [1.2, 0.35, 1],
      8,
    );
  }
};

const buildBadger = (builder: AttractionBuilder) => {
  builder.sphere("matte", "#5f5f63", 0.2, [0, 0.2, -0.1], [1, 0.8, 1.3], 10);
  builder.sphere(
    "matte",
    palette.white,
    0.12,
    [0, 0.3, 0.14],
    [0.95, 0.9, 1.2],
    10,
  );
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      palette.black,
      [0.035, 0.07, 0.2],
      [side * 0.05, 0.33, 0.18],
    );
    builder.sphere(
      "matte",
      palette.black,
      0.035,
      [side * 0.08, 0.41, 0.07],
      [1, 1, 0.6],
      5,
    );
  });
  builder.sphere("matte", palette.black, 0.025, [0, 0.29, 0.29], [1, 1, 1], 5);
};

const owlAt: Triple = [owlTree.x, 2.05, owlTree.z + 0.3];

const addOwlHollow = (builder: AttractionBuilder) => {
  builder.sphere(
    "matte",
    "#2a2018",
    0.2,
    [owlAt[0], owlAt[1] + 0.15, owlAt[2] - 0.06],
    [1, 1.4, 0.5],
    8,
  );
};

const buildOwl = (builder: AttractionBuilder) => {
  builder.sphere("matte", "#a37a4a", 0.14, [0, 0.12, 0], [1, 1.2, 0.9], 10);
  builder.sphere("matte", "#efe2c8", 0.1, [0, 0.12, 0.06], [1, 1.1, 0.6], 8);
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      "#f2c230",
      0.035,
      [side * 0.05, 0.2, 0.11],
      [1, 1, 0.5],
      6,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.017,
      [side * 0.05, 0.2, 0.125],
      [1, 1, 1],
      4,
    );
    builder.add("matte", "#7a5a34", new ConeGeometry(0.03, 0.07, 4), {
      at: [side * 0.07, 0.29, 0.02],
      rotation: [0, 0, -side * 0.3],
    });
  });
  builder.add(
    "matte",
    "#4a3524",
    new ConeGeometry(0.018, 0.05, 4).rotateX(Math.PI),
    {
      at: [0, 0.16, 0.13],
    },
  );
};

const squirrelAt: Triple = [squirrelTree.x, 0.35, squirrelTree.z + 0.3];

const buildSquirrel = (builder: AttractionBuilder) => {
  /* A red squirrel clinging to the trunk, head up, tail curled */
  builder.sphere("matte", "#b8552a", 0.09, [0, 0.12, 0], [0.9, 1.4, 0.9], 8);
  builder.sphere("matte", "#b8552a", 0.065, [0, 0.27, 0.03], [1, 1, 1.1], 8);
  builder.sphere("matte", "#c96a34", 0.08, [0, 0.1, 0.1], [0.8, 1.8, 0.8], 8);
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.add("matte", "#9a4422", new ConeGeometry(0.02, 0.06, 4), {
      at: [side * 0.035, 0.34, 0.02],
    });
    builder.sphere(
      "paint",
      palette.black,
      0.012,
      [side * 0.03, 0.29, 0.085],
      [1, 1, 1],
      4,
    );
  });
  builder.sphere(
    "matte",
    palette.cream,
    0.04,
    [0, 0.18, 0.06],
    [1, 1.4, 0.6],
    6,
  );
};

/* Wanderers */

const buildDeer = (builder: AttractionBuilder) => {
  const coat = "#a8683a";
  builder.sphere("matte", coat, 0.28, [0, 0.75, 0], [0.75, 0.75, 1.4], 10);
  builder.bar("matte", coat, [0, 0.85, 0.3], [0, 1.2, 0.45], 0.14, 6);
  builder.sphere("matte", coat, 0.11, [0, 1.25, 0.5], [0.9, 0.9, 1.3], 8);
  builder.sphere("matte", palette.black, 0.03, [0, 1.22, 0.65], [1, 1, 1], 4);
  builder.sphere("matte", palette.cream, 0.1, [0, 0.8, -0.36], [1, 1, 0.6], 6);
  [-1, 1].forEach((side) => {
    builder.add("matte", shade(coat, 0.85), new ConeGeometry(0.05, 0.14, 4), {
      at: [side * 0.08, 1.38, 0.45],
      rotation: [0, 0, -side * 0.4],
    });
    [-0.25, 0.25].forEach((end) => {
      builder.bar(
        "matte",
        shade(coat, 0.8),
        [side * 0.1, 0.6, end],
        [side * 0.1, 0, end],
        0.05,
        4,
      );
    });
  });
};

const buildButterfly = (builder: AttractionBuilder) => {
  builder.bar("matte", palette.black, [0, 0, -0.05], [0, 0, 0.05], 0.015, 3);
  if (builder.isFar) {
    builder.box(
      "matte",
      meadowColours.butter,
      [0.16, 0.008, 0.08],
      [0, 0.01, 0],
    );
    return;
  }
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      meadowColours.butter,
      [0.09, 0.008, 0.08],
      [side * 0.05, 0.01, 0.02],
      [0, 0, side * 0.5],
    );
    builder.box(
      "matte",
      "#f0a040",
      [0.06, 0.008, 0.05],
      [side * 0.04, 0.008, -0.04],
      [0, 0, side * 0.5],
    );
  });
};

/* The wood round it all */

const buildWood = (builder: AttractionBuilder) => {
  buildFloor(builder);
  trees.forEach((tree) => {
    addWoodTree(builder, tree);
  });
  addGreatOak(builder);
  buildBoardwalk(builder);
  buildLog(builder);
  buildSett(builder);
  addOwlHollow(builder);
  addBench(builder, [3.4, 0, -6.0], 0, boardTimber);
  /* A carved wooden way-marker post with a bluebell on top */
  builder.cylinder("matte", railTimber, {
    radius: 0.1,
    length: 1.1,
    at: [-1.8, 0.55, 3.0],
    segments: 8,
  });
  builder.sphere("paint", bluebell, 0.12, [-1.8, 1.16, 3.0], [1, 0.8, 1], 8);
  if (!builder.isFar) {
    builder.box("paint", palette.cream, [0.04, 0.12, 0.3], [-1.69, 0.85, 3.0]);
    /* Stacked logs: a home for beetles */
    [
      [-3.5, 1.1, 0.14],
      [-3.5, 1.4, 0.14],
      [-3.5, 1.25, 0.38],
    ].forEach(([x, z, y]) => {
      builder.cylinder("matte", oakBark, {
        radius: 0.13,
        length: 1.0,
        at: [x, y, z],
        axis: "x",
        segments: 8,
      });
    });
  }
  addSignBoard(builder, [-2.2, 0, 8.0], signColour);
};

export const bluebellWoodModel: NewLandAttractionModel = {
  kind: "bluebell-wood",
  islandId: "meadow-isle",
  name: "Bluebell Wood",
  fact: "Bluebells grow from bulbs under the ground in old woods. They flower in spring, before the leaves open on the trees above and shade the woodland floor. Bluebells are protected in the UK, so we look at them and smell them but never pick them.",
  curriculumLink:
    "Science, Year 1: plants. Identify and name a variety of common wild plants and deciduous trees, and see how the wood changes with the seasons.",
  footprint: 9.6,
  setting: "inland",
  signSpot: { x: -2.2, z: 9.0 },
  build: buildWood,
  moving: [
    {
      name: "rope-swing",
      pivot: swingPivot,
      build: buildSwing,
      motion: swingMotion,
    },
    {
      name: "badger",
      pivot: badgerAt,
      build: buildBadger,
      motion: { kind: "rise", reach: 4, height: 0.42, period: 1.8 },
    },
    {
      name: "owl",
      pivot: owlAt,
      build: buildOwl,
      motion: { kind: "nod", axis: "y", reach: 5, amplitude: 0.9, period: 2.4 },
    },
    {
      name: "squirrel",
      pivot: squirrelAt,
      build: buildSquirrel,
      motion: { kind: "rise", reach: 4, height: 2.0, period: 1.2 },
    },
  ],
  wanderers: [
    {
      name: "deer",
      build: buildDeer,
      count: 2,
      centre: { x: 4.8, z: -3.4 },
      radius: 2.0,
      speed: 0.35,
    },
    {
      name: "butterflies",
      build: buildButterfly,
      count: 4,
      centre: { x: -3.2, z: 2.6 },
      radius: 2.4,
      speed: 0.7,
      height: 0.7,
      bob: 0.3,
    },
  ],
  decks: [boardwalkDeck],
  rides: [
    {
      id: "rope-swing",
      name: "the rope swing",
      start: { x: swingPivot[0], z: swingPivot[2] + 1.3 },
      reach: 0.55,
      seconds: 9,
      finish: { x: swingPivot[0] + 1.1, z: swingPivot[2] + 1.2 },
      follow: swingRide,
    },
    {
      id: "fallen-log",
      name: "the fallen log",
      start: logStart,
      reach: 0.55,
      seconds: 7,
      finish: logFinish,
      follow: logRide,
    },
  ],
  tune: [79, 76, 79, 76, 77, 74, 72, 74, 76],
  play: {
    label: "Smell the bluebells",
    news: "Mmm! The bluebells smell sweet, and a fat bumblebee buzzed past to drink their nectar. Look, but never pick!",
  },
};
