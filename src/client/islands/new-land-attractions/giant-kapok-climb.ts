import {
  CylinderGeometry,
  Euler,
  ExtrudeGeometry,
  Quaternion,
  Shape,
  Vector3,
} from "three";
import {
  addSignBoard,
  findMotionPose,
  moveWithPose,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalSpot,
  type Motion,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const bark = "#8d7f6a";
const darkBark = "#6a5d4c";
const paleBark = "#a99a82";
const leafDeep = "#256b2a";
const leafMid = "#2f8a35";
const leafBright = "#4fa83c";
const plank = "#b07a48";
const darkPlank = "#7a5232";
const rope = "#d8c08a";
const litter = "#7a5a3a";
const podGreen = "#6f7a3a";
const podBrown = "#7a5a32";
const fluff = "#f7f4ec";
const signColour = "#2f6b3a";

/* The giant tree */

const tree = { x: 0, z: -1.0 };
const trunkProfile: [number, number][] = [
  [0, -0.1],
  [1.25, -0.1],
  [1.02, 0.4],
  [0.86, 1.4],
  [0.78, 3.0],
  [0.7, 5.0],
  [0.62, 6.8],
  [0.55, 8.3],
  [0.42, 9.6],
  [0, 9.9],
];

const trunkRadiusAt = (y: number): number => {
  for (let index = 1; index < trunkProfile.length; index++) {
    const [fromRadius, fromY] = trunkProfile[index - 1];
    const [toRadius, toY] = trunkProfile[index];
    if (y <= toY) {
      const share = (y - fromY) / (toY - fromY);
      return fromRadius + (toRadius - fromRadius) * share;
    }
  }
  return 0.4;
};

const aroundTree = (angle: number, radius: number, y: number): Triple => [
  tree.x + Math.sin(angle) * radius,
  y,
  tree.z + Math.cos(angle) * radius,
];

const upright = new Vector3(0, 1, 0);

/** A round bar that tapers from `fromRadius` to `toRadius`. */
const addTaperedBar = (
  builder: AttractionBuilder,
  colour: string,
  from: Triple,
  to: Triple,
  fromRadius: number,
  toRadius: number,
  segments = 8,
) => {
  const start = new Vector3(...from);
  const direction = new Vector3(...to).sub(start);
  const turn = new Euler().setFromQuaternion(
    new Quaternion().setFromUnitVectors(upright, direction.clone().normalize()),
  );
  const middle = start.add(direction.clone().multiplyScalar(0.5));
  builder.add(
    "matte",
    colour,
    new CylinderGeometry(
      toRadius,
      fromRadius,
      direction.length(),
      builder.segments(segments, Math.max(4, Math.round(segments / 2))),
    ),
    { at: [middle.x, middle.y, middle.z], rotation: [turn.x, turn.y, turn.z] },
  );
};

/** A buttress root: a thin, curved fin flaring out from the trunk. */
const addButtress = (
  builder: AttractionBuilder,
  angle: number,
  reach: number,
  height: number,
) => {
  const shape = new Shape();
  shape.moveTo(0, 0);
  shape.lineTo(reach, 0);
  shape.quadraticCurveTo(reach * 0.25, height * 0.2, 0, height);
  shape.lineTo(0, 0);
  const fin = new ExtrudeGeometry(shape, {
    depth: 0.2,
    bevelEnabled: false,
    curveSegments: builder.segments(6, 3),
  });
  fin.translate(0, 0, -0.1);
  fin.rotateY(angle - Math.PI / 2);
  const [x, , z] = aroundTree(angle, 0.6, 0);
  builder.add("matte", angle > 5 ? darkBark : bark, fin, { at: [x, 0, z] });
};

const buttresses: [number, number, number][] = [
  [3.7, 2.7, 2.2],
  [4.6, 2.4, 1.9],
  [5.4, 2.8, 2.3],
  [6.1, 2.2, 1.7],
];

const crownBranches: [number, number, number][] = [
  [0.3, 3.6, 9.0],
  [1.6, 3.4, 9.3],
  [2.9, 3.7, 8.9],
  [4.2, 3.4, 9.2],
  [5.4, 3.6, 9.0],
];

const buildTree = (builder: AttractionBuilder) => {
  builder.lathe(
    "matte",
    bark,
    trunkProfile,
    [tree.x, 0, tree.z],
    "y",
    builder.segments(16, 8),
  );
  buttresses.forEach(([angle, reach, height]) => {
    addButtress(builder, angle, reach, height);
  });
  if (!builder.isFar) {
    /* Pale lichen patches and knobbly bark */
    const patches: [number, number, number][] = [
      [0.4, 2.2, 0.3],
      [2.2, 4.0, 0.25],
      [3.9, 5.6, 0.28],
      [5.3, 3.1, 0.22],
      [1.2, 7.4, 0.2],
    ];
    patches.forEach(([angle, y, radius]) => {
      builder.sphere(
        "matte",
        paleBark,
        radius,
        aroundTree(angle, trunkRadiusAt(y) - 0.02, y),
        [1, 1.4, 0.4],
        6,
      );
    });
  }
  /* Branches up into the crown */
  crownBranches.forEach(([angle, reach, y]) => {
    addTaperedBar(
      builder,
      darkBark,
      aroundTree(angle, 0.3, 7.6),
      aroundTree(angle, reach, y),
      0.26,
      0.1,
      7,
    );
  });
  /* The wide, flat-topped crown that kapoks are known for */
  const clumps: [number, number, number, number][] = builder.isFar
    ? [
        [0, 0, 10.0, 2.6],
        [1.0, 3.0, 9.6, 2.0],
        [3.6, 3.0, 9.6, 2.0],
      ]
    : [
        [0, 0, 10.1, 2.3],
        [0.3, 3.4, 9.4, 1.6],
        [1.6, 3.3, 9.7, 1.6],
        [2.9, 3.5, 9.3, 1.6],
        [4.2, 3.3, 9.6, 1.6],
        [5.4, 3.5, 9.4, 1.6],
        [1.0, 1.8, 10.6, 1.4],
        [3.6, 1.9, 10.5, 1.4],
      ];
  clumps.forEach(([angle, reach, y, radius], index) => {
    builder.sphere(
      "matte",
      [leafMid, leafDeep, leafBright][index % 3],
      radius,
      aroundTree(angle, reach, y),
      [1.2, 0.5, 1.2],
      builder.isFar ? 14 : 12,
    );
  });
  if (!builder.isFar) {
    /* Bromeliads perched on the trunk and branches */
    const bromeliads: [number, number][] = [
      [1.1, 3.4],
      [2.6, 4.6],
      [4.0, 2.6],
      [5.6, 5.4],
      [0.2, 7.0],
      [3.4, 7.2],
    ];
    bromeliads.forEach(([angle, y], index) => {
      const at = aroundTree(angle, trunkRadiusAt(y) + 0.08, y);
      for (let leaf = 0; leaf < 5; leaf++) {
        const turn = (leaf / 5) * Math.PI * 2;
        builder.box(
          "matte",
          leaf % 2 === 0 ? "#5aa83a" : "#7fbf4a",
          [0.05, 0.34, 0.12],
          [
            at[0] + Math.sin(turn) * 0.08,
            y + 0.14,
            at[2] + Math.cos(turn) * 0.08,
          ],
          [Math.cos(turn) * 0.5, turn, -Math.sin(turn) * 0.5],
        );
      }
      builder.sphere(
        "paint",
        index % 2 === 0 ? "#e8304a" : "#ff7a1a",
        0.07,
        [at[0], y + 0.3, at[2]],
        [1, 1.4, 1],
        6,
      );
    });
    /* Lianas hanging from the crown, ending well above the Character */
    const lianas: [number, number, number][] = [
      [0.9, 3.0, 2.2],
      [2.4, 3.2, 2.6],
      [3.5, 2.9, 1.9],
      [4.8, 3.1, 2.4],
      [5.9, 3.0, 2.0],
    ];
    lianas.forEach(([angle, reach, bottom]) => {
      const top = aroundTree(angle, reach, 8.9);
      const middle = aroundTree(angle + 0.08, reach + 0.15, (8.9 + bottom) / 2);
      const end = aroundTree(angle, reach - 0.1, bottom);
      builder.bar("matte", "#5a6a2a", top, middle, 0.05, 4);
      builder.bar("matte", "#5a6a2a", middle, end, 0.05, 4);
      builder.sphere("matte", leafBright, 0.12, end, [1, 0.6, 1], 6);
    });
  }
  /* Seed pods hanging under the crown */
  if (!builder.isFar) {
    podSpots.forEach(([x, y, z], index) => {
      builder.bar(
        "matte",
        darkBark,
        [x, y + 0.35, z],
        [x, y + 0.15, z],
        0.03,
        4,
      );
      builder.sphere(
        "matte",
        index % 2 === 0 ? podGreen : podBrown,
        0.13,
        [x, y, z],
        [0.8, 1.6, 0.8],
        7,
      );
    });
  }
};

const podSpots: Triple[] = [
  aroundTree(0.5, 2.4, 8.4),
  aroundTree(1.9, 2.6, 8.6),
  aroundTree(3.0, 2.2, 8.3),
  aroundTree(4.4, 2.5, 8.5),
  aroundTree(5.6, 2.3, 8.4),
];

/* The spiral stairs round the trunk, up to the lookout */

const spiral = {
  startAngle: 0.6,
  turns: 1.5,
  bottom: 0.25,
  top: 6.2,
  inner: 0.95,
  outer: 2.0,
};
const spiralSweep = spiral.turns * Math.PI * 2;
const lookout = { y: spiral.top, radius: 2.45 };
const zipAngle = 0.75;

const spiralSpot = (share: number, radius: number, lift = 0): Triple =>
  aroundTree(
    spiral.startAngle + spiralSweep * share,
    radius,
    spiral.bottom + (spiral.top - spiral.bottom) * share + lift,
  );

const buildSpiral = (builder: AttractionBuilder) => {
  const treads = builder.isFar ? 14 : 34;
  for (let tread = 0; tread < treads; tread++) {
    const share = tread / treads;
    const angle = spiral.startAngle + spiralSweep * share;
    const middle = (spiral.inner + spiral.outer) / 2;
    builder.box(
      "matte",
      tread % 2 === 0 ? plank : shade(plank, 0.92),
      [spiral.outer - spiral.inner, 0.07, builder.isFar ? 0.7 : 0.34],
      spiralSpot(share, middle),
      [0, angle + Math.PI / 2, 0],
    );
  }
  /* The handrail and its posts */
  const rails = builder.isFar ? 8 : 26;
  for (let rail = 0; rail < rails; rail++) {
    const from = rail / rails;
    const to = (rail + 1) / rails;
    builder.bar(
      "matte",
      darkPlank,
      spiralSpot(from, spiral.outer, 0.9),
      spiralSpot(to, spiral.outer, 0.9),
      0.06,
      5,
    );
    if (!builder.isFar) {
      const post = spiralSpot(from, spiral.outer, 0);
      builder.box(
        "matte",
        darkPlank,
        [0.06, 0.92, 0.06],
        [post[0], post[1] + 0.46, post[2]],
      );
      builder.bar(
        "matte",
        rope,
        spiralSpot(from, spiral.outer, 0.45),
        spiralSpot(to, spiral.outer, 0.45),
        0.025,
        4,
      );
    }
  }
  /* Brackets holding the stairs to the trunk */
  const brackets = builder.isFar ? 0 : 9;
  for (let bracket = 1; bracket < brackets; bracket++) {
    const share = bracket / brackets;
    const top = spiralSpot(share, 1.6, -0.05);
    const angle = spiral.startAngle + spiralSweep * share;
    builder.bar(
      "matte",
      darkPlank,
      aroundTree(angle, trunkRadiusAt(top[1] - 0.8), top[1] - 0.8),
      top,
      0.07,
      4,
    );
  }
};

const buildLookout = (builder: AttractionBuilder) => {
  builder.cylinder("matte", darkPlank, {
    radius: lookout.radius,
    length: 0.16,
    at: [tree.x, lookout.y - 0.08, tree.z],
    segments: builder.segments(18, 10),
  });
  if (!builder.isFar) {
    builder.cylinder("matte", plank, {
      radius: lookout.radius - 0.08,
      length: 0.02,
      at: [tree.x, lookout.y + 0.005, tree.z],
      segments: 18,
    });
  }
  const braces = builder.isFar ? 3 : 6;
  for (let brace = 0; brace < braces; brace++) {
    const angle = (brace / braces) * Math.PI * 2 + 0.3;
    builder.bar(
      "matte",
      darkPlank,
      aroundTree(angle, trunkRadiusAt(lookout.y - 1.4), lookout.y - 1.4),
      aroundTree(angle, lookout.radius - 0.2, lookout.y - 0.12),
      0.1,
      4,
    );
  }
  const posts = builder.isFar ? 8 : 16;
  for (let post = 0; post < posts; post++) {
    const angle = zipAngle + ((post + 0.5) / posts) * Math.PI * 2;
    const isGap = Math.abs(Math.sin((angle - zipAngle) / 2)) < 0.2;
    if (isGap) {
      continue;
    }
    const [x, , z] = aroundTree(angle, lookout.radius - 0.08, 0);
    builder.box(
      "matte",
      darkPlank,
      [0.07, 0.95, 0.07],
      [x, lookout.y + 0.47, z],
      [0, angle, 0],
    );
    const next = angle + (Math.PI * 2) / posts;
    if (Math.abs(Math.sin((next - zipAngle) / 2)) >= 0.2) {
      builder.bar(
        "matte",
        darkPlank,
        aroundTree(angle, lookout.radius - 0.08, lookout.y + 0.93),
        aroundTree(next, lookout.radius - 0.08, lookout.y + 0.93),
        0.07,
        5,
      );
    }
  }
  /* The zip wire's launch frame */
  const launch = aroundTree(zipAngle, lookout.radius - 0.1, lookout.y);
  const sideways: Triple = [Math.cos(zipAngle), 0, -Math.sin(zipAngle)];
  [-0.6, 0.6].forEach((side) => {
    builder.box(
      "matte",
      darkPlank,
      [0.12, 2.0, 0.12],
      [
        launch[0] + sideways[0] * side,
        lookout.y + 1.0,
        launch[2] + sideways[2] * side,
      ],
    );
  });
  builder.box(
    "matte",
    darkPlank,
    [1.4, 0.14, 0.14],
    [launch[0], lookout.y + 2.0, launch[2]],
    [0, zipAngle, 0],
  );
  /* A flag on top */
  if (!builder.isFar) {
    builder.cylinder("matte", darkPlank, {
      radius: 0.03,
      length: 0.9,
      at: [launch[0], lookout.y + 2.45, launch[2]],
      segments: 5,
    });
    builder.box(
      "matte",
      "#e8a23a",
      [0.02, 0.24, 0.42],
      [launch[0], lookout.y + 2.75, launch[2] + 0.21],
    );
  }
};

/* The zip wire, down to a landing post near the front */

const zipFrom: Triple = (() => {
  const [x, , z] = aroundTree(zipAngle, lookout.radius - 0.1, 0);
  return [x, lookout.y + 1.92, z];
})();
const zipTo: Triple = [
  zipFrom[0] + Math.sin(zipAngle) * 6.4,
  2.45,
  zipFrom[2] + Math.cos(zipAngle) * 6.4,
];
const zipHang = 1.6;

const buildZipWire = (builder: AttractionBuilder) => {
  builder.bar("metal", palette.steel, zipFrom, zipTo, 0.04, 5);
  const post: Triple = [
    zipTo[0] + Math.sin(zipAngle) * 0.3,
    0,
    zipTo[2] + Math.cos(zipAngle) * 0.3,
  ];
  builder.cylinder("matte", darkPlank, {
    radius: 0.14,
    radiusEnd: 0.11,
    length: zipTo[1] + 0.35,
    at: [post[0], (zipTo[1] + 0.35) / 2, post[2]],
    segments: 8,
  });
  builder.box(
    "matte",
    darkPlank,
    [0.5, 0.12, 0.12],
    [post[0], zipTo[1], post[2]],
    [0, zipAngle, 0],
  );
  /* A soft mat of bark chips to land on */
  builder.cylinder("matte", "#9a7a52", {
    radius: 1.3,
    length: 0.05,
    at: [
      zipTo[0] - Math.sin(zipAngle) * 1.0,
      0.025,
      zipTo[2] - Math.cos(zipAngle) * 1.0,
    ],
    segments: builder.segments(16, 8),
  });
  /* The trolley waiting at the top */
  if (!builder.isFar) {
    builder.box(
      "metal",
      "#c8302a",
      [0.12, 0.16, 0.24],
      [zipFrom[0] + 0.05, zipFrom[1] - 0.1, zipFrom[2] + 0.05],
    );
    builder.bar(
      "matte",
      rope,
      [zipFrom[0] + 0.05, zipFrom[1] - 0.18, zipFrom[2] + 0.05],
      [zipFrom[0] + 0.05, zipFrom[1] - 0.9, zipFrom[2] + 0.05],
      0.03,
      4,
    );
    builder.box(
      "paint",
      "#2f6fd6",
      [0.4, 0.06, 0.2],
      [zipFrom[0] + 0.05, zipFrom[1] - 0.92, zipFrom[2] + 0.05],
    );
  }
};

/* The seed-pod swing, hanging from a big low branch */

const swingPivot: Triple = [-3.3, 4.4, 0.4];
const swingDrop = 3.75;
const swingMotion: Motion = {
  kind: "swing",
  axis: "x",
  amplitude: 0.28,
  period: 4.6,
};

const buildSwingBranch = (builder: AttractionBuilder) => {
  addTaperedBar(
    builder,
    darkBark,
    aroundTree(-1.2, 0.3, 4.9),
    [swingPivot[0] - 0.5, swingPivot[1] + 0.25, swingPivot[2] + 0.1],
    0.26,
    0.1,
    8,
  );
  builder.sphere(
    "matte",
    leafMid,
    0.8,
    [swingPivot[0] - 0.6, swingPivot[1] + 0.6, swingPivot[2]],
    [1.3, 0.6, 1],
    builder.isFar ? 8 : 10,
  );
};

const buildPodSwing = (builder: AttractionBuilder) => {
  [-0.3, 0.3].forEach((side) => {
    builder.bar(
      "matte",
      rope,
      [side * 0.4, 0, 0],
      [side, -swingDrop + 0.3, 0],
      0.04,
      5,
    );
  });
  /* The seat: a giant kapok pod, split open and full of fluff */
  builder.sphere(
    "matte",
    podBrown,
    0.32,
    [0, -swingDrop, 0],
    [2.2, 0.6, 1.1],
    builder.isFar ? 8 : 14,
  );
  builder.sphere(
    "matte",
    fluff,
    0.28,
    [0, -swingDrop + 0.1, 0],
    [2.0, 0.35, 0.9],
    builder.isFar ? 6 : 12,
  );
  if (!builder.isFar) {
    [-0.55, 0.55].forEach((side) => {
      builder.sphere(
        "matte",
        fluff,
        0.12,
        [side, -swingDrop + 0.18, 0.05],
        [1, 0.8, 1],
        8,
      );
    });
  }
};

/* The animals: a toucan, a spider monkey and the kapok fluff */

const toucanPivot: Triple = (() => {
  const [x, , z] = aroundTree(3.0, 2.3, 0);
  return [x, 4.95, z];
})();

const buildToucanBranch = (builder: AttractionBuilder) => {
  addTaperedBar(
    builder,
    darkBark,
    aroundTree(3.0, 0.4, 4.5),
    aroundTree(3.0, 2.8, 4.9),
    0.17,
    0.07,
    6,
  );
};

const buildToucan = (builder: AttractionBuilder) => {
  builder.sphere(
    "paint",
    palette.black,
    0.14,
    [0, 0.17, 0],
    [0.9, 1.3, 0.9],
    10,
  );
  builder.sphere("paint", "#f7e04a", 0.08, [0, 0.27, 0.09], [1, 1, 0.6], 8);
  builder.sphere("paint", palette.black, 0.09, [0, 0.36, 0.02], [1, 1, 1], 8);
  builder.cylinder("paint", "#ff8a1a", {
    radius: 0.06,
    radiusEnd: 0.02,
    length: 0.28,
    at: [0, 0.35, 0.22],
    axis: "z",
    segments: builder.segments(8, 4),
  });
  if (!builder.isFar) {
    builder.box(
      "paint",
      palette.black,
      [0.08, 0.04, 0.2],
      [0, 0.08, -0.17],
      [0.4, 0, 0],
    );
    [-1, 1].forEach((side) => {
      builder.sphere(
        "paint",
        "#5fd0ff",
        0.025,
        [side * 0.07, 0.38, 0.06],
        [1, 1, 1],
        5,
      );
    });
  }
};

const monkeyPivot: Triple = (() => {
  const [x, , z] = aroundTree(5.0, 2.6, 0);
  return [x, 5.4, z];
})();

const buildMonkeyBranch = (builder: AttractionBuilder) => {
  addTaperedBar(
    builder,
    darkBark,
    aroundTree(5.0, 0.4, 5.0),
    aroundTree(5.0, 3.0, 5.5),
    0.18,
    0.08,
    6,
  );
};

const monkeyFur = "#4a3a2c";

const buildMonkey = (builder: AttractionBuilder) => {
  /* Hanging by its tail, upside down */
  builder.bar("matte", monkeyFur, [0, 0, 0], [0, -0.45, 0], 0.04, 5);
  builder.sphere("matte", monkeyFur, 0.16, [0, -0.62, 0], [0.8, 1.2, 0.7], 10);
  builder.sphere("matte", monkeyFur, 0.11, [0, -0.88, 0.02], [1, 1, 1], 8);
  builder.sphere("matte", "#c9a07a", 0.07, [0, -0.9, 0.09], [1, 0.8, 0.6], 6);
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      monkeyFur,
      [side * 0.08, -0.55, 0],
      [side * 0.22, -1.05, 0.05],
      0.05,
      5,
    );
    if (!builder.isFar) {
      builder.bar(
        "matte",
        monkeyFur,
        [side * 0.06, -0.48, 0],
        [side * 0.18, -0.3, 0.12],
        0.05,
        5,
      );
    }
  });
};

const fluffPivot: Triple = [tree.x, 8.4, tree.z];

const buildFluff = (builder: AttractionBuilder) => {
  podSpots.forEach(([x, y, z], pod) => {
    const puffs = builder.isFar ? 1 : 4;
    for (let puff = 0; puff < puffs; puff++) {
      const angle = puff * 1.7 + pod;
      builder.sphere(
        "matte",
        fluff,
        0.16 - puff * 0.02,
        [
          x - fluffPivot[0] + Math.sin(angle) * 0.25 * puff,
          y - fluffPivot[1] - 0.15 - puff * 0.22,
          z - fluffPivot[2] + Math.cos(angle) * 0.25 * puff,
        ],
        [1, 0.8, 1],
        builder.isFar ? 6 : 7,
      );
    }
  });
};

/* The ground: leaf litter, ferns, a hut for helmets and harnesses */

const addFern = (
  builder: AttractionBuilder,
  at: Triple,
  size: number,
  colour: string,
) => {
  if (builder.isFar) {
    return;
  }
  const fronds = 5;
  for (let frond = 0; frond < fronds; frond++) {
    const angle = (frond / fronds) * Math.PI * 2 + size;
    builder.box(
      "matte",
      frond % 2 === 0 ? colour : shade(colour, 1.15),
      [0.22 * size, 0.02, 0.9 * size],
      [
        at[0] + Math.sin(angle) * 0.38 * size,
        0.28 * size,
        at[2] + Math.cos(angle) * 0.38 * size,
      ],
      [-0.55, angle, 0],
    );
  }
};

const hut = { x: -5.4, z: 4.4 };

const buildHut = (builder: AttractionBuilder) => {
  const { x, z } = hut;
  builder.box("matte", plank, [1.8, 1.7, 1.4], [x, 0.85, z]);
  builder.box("matte", darkPlank, [1.9, 0.08, 1.5], [x, 0.04, z]);
  /* A thatched roof of big leaves */
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      "#9a8a3a",
      [2.3, 0.1, 1.15],
      [x, 2.0, z + side * 0.45],
      [side * 0.55, 0, 0],
    );
  });
  builder.box("glow", palette.warmLight, [0.8, 0.5, 0.04], [x, 1.1, z + 0.71]);
  builder.box("matte", darkPlank, [1.0, 0.08, 0.3], [x, 0.84, z + 0.85]);
  if (!builder.isFar) {
    /* Helmets in a row on the counter */
    ["#e8302a", "#2f6fd6", "#f2c230", "#3aa64a"].forEach((colour, index) => {
      builder.sphere(
        "paint",
        colour,
        0.1,
        [x - 0.36 + index * 0.24, 0.9, z + 0.86],
        [1, 0.8, 1.1],
        8,
      );
    });
    builder.box("paint", signColour, [1.1, 0.24, 0.04], [x, 1.55, z + 0.73]);
    builder.box("paint", palette.cream, [0.8, 0.05, 0.02], [x, 1.55, z + 0.76]);
  }
};

const buildGround = (builder: AttractionBuilder) => {
  builder.cylinder("matte", litter, {
    radius: 3.4,
    length: 0.04,
    at: [tree.x, 0.02, tree.z],
    segments: builder.segments(24, 12),
  });
  const stones: [number, number][] = [
    [1.2, 8.4],
    [1.6, 7.4],
    [1.9, 6.3],
    [2.0, 5.2],
    [1.9, 4.1],
    [1.8, 3.0],
  ];
  stones.forEach(([x, z], index) => {
    builder.cylinder(
      "matte",
      index % 2 === 0 ? palette.stone : shade(palette.stone, 0.9),
      {
        radius: 0.34,
        length: 0.06,
        at: [x, 0.03, z],
        segments: builder.segments(10, 6),
      },
    );
  });
  const ferns: [number, number, number, string][] = [
    [-3.4, -4.4, 1, leafMid],
    [3.6, -4.6, 1.1, leafBright],
    [-5.8, -1.0, 0.9, leafDeep],
    [6.0, -0.8, 0.9, leafMid],
    [-2.4, 6.6, 0.8, leafBright],
    [4.6, 2.0, 0.8, leafDeep],
    [-6.6, 2.0, 0.8, leafMid],
  ];
  ferns.forEach(([x, z, size, colour]) => {
    addFern(builder, [x, 0, z], size, colour);
  });
  if (!builder.isFar) {
    const flowers: [number, number, string][] = [
      [-4.0, -3.4, "#e8457a"],
      [4.4, -3.2, "#f2a33a"],
      [-3.6, 6.0, "#f6e05a"],
      [5.2, 1.4, "#e8457a"],
      [-6.2, 2.6, "#f2a33a"],
    ];
    flowers.forEach(([x, z, colour]) => {
      builder.cylinder("matte", leafMid, {
        radius: 0.02,
        length: 0.5,
        at: [x, 0.25, z],
        segments: 4,
      });
      builder.sphere("paint", colour, 0.12, [x, 0.52, z], [1, 0.7, 1], 7);
    });
  }
};

/* Macaws circling the crown */

const buildMacaw = (builder: AttractionBuilder) => {
  builder.sphere("paint", "#d8282a", 0.12, [0, 0, 0], [0.8, 0.8, 1.5], 8);
  builder.sphere("paint", "#d8282a", 0.08, [0, 0.05, 0.17], [1, 1, 1], 7);
  builder.box("paint", "#d8282a", [0.06, 0.02, 0.36], [0, -0.02, -0.3]);
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      "#2f6fd6",
      [0.36, 0.02, 0.16],
      [side * 0.22, 0.03, 0],
      [0, 0, side * 0.25],
    );
    if (!builder.isFar) {
      builder.box(
        "paint",
        "#f2c230",
        [0.16, 0.022, 0.1],
        [side * 0.12, 0.035, 0.02],
        [0, 0, side * 0.2],
      );
    }
  });
  if (!builder.isFar) {
    builder.box("paint", palette.cream, [0.04, 0.05, 0.06], [0, 0.03, 0.25]);
  }
};

/* Climbers in helmets, waiting their turn */

const buildClimber = (builder: AttractionBuilder) => {
  [-0.07, 0.07].forEach((side) => {
    builder.box("matte", "#3e4a5e", [0.09, 0.42, 0.1], [side, 0.21, 0]);
  });
  builder.cylinder("matte", "#2f9fd0", {
    radius: 0.15,
    radiusEnd: 0.13,
    length: 0.4,
    at: [0, 0.62, 0],
    segments: 10,
  });
  if (!builder.isFar) {
    /* The harness */
    builder.torus("matte", "#f2a23a", 0.15, 0.02, [0, 0.45, 0], "y", 10);
  }
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      "#2f9fd0",
      [side * 0.17, 0.78, 0],
      [side * 0.22, 0.5, 0.05],
      0.07,
      5,
    );
  });
  builder.sphere("matte", "#c98d63", 0.13, [0, 0.95, 0], [1, 1.05, 1], 10);
  builder.sphere("paint", "#e8302a", 0.14, [0, 1.0, 0], [1, 0.7, 1], 10);
};

/* The rides */

const climbStart = (() => {
  const [x, , z] = aroundTree(spiral.startAngle, 2.85, 0);
  return { x, z };
})();
const zipFinish = (() => {
  const x = zipTo[0] - Math.sin(zipAngle) * 1.1;
  const z = zipTo[2] - Math.cos(zipAngle) * 1.1;
  return { x, z };
})();

const climbShare = 0.55;
const lapShare = 0.17;

const climbRide = (progress: number): LocalSpot => {
  const middle = (spiral.inner + spiral.outer) / 2;
  if (progress < 0.04) {
    const share = progress / 0.04;
    const [x, y, z] = spiralSpot(0, middle);
    return {
      x: climbStart.x + (x - climbStart.x) * share,
      y: y * share,
      z: climbStart.z + (z - climbStart.z) * share,
      heading: spiral.startAngle + Math.PI,
    };
  }
  if (progress < climbShare) {
    const share = (progress - 0.04) / (climbShare - 0.04);
    const [x, y, z] = spiralSpot(share, middle, 0.04);
    return {
      x,
      y,
      z,
      heading: spiral.startAngle + spiralSweep * share + Math.PI / 2,
    };
  }
  const endAngle = spiral.startAngle + spiralSweep;
  const launchAngle =
    zipAngle + Math.PI * 2 * Math.ceil((endAngle - zipAngle) / (Math.PI * 2));
  if (progress < climbShare + lapShare) {
    const share = (progress - climbShare) / lapShare;
    const angle = endAngle + (launchAngle - endAngle) * share;
    const radius = middle + (lookout.radius - 0.35 - middle) * share;
    const [x, , z] = aroundTree(angle, radius, 0);
    return { x, y: lookout.y, z, heading: angle + Math.PI / 2 };
  }
  const share =
    (progress - climbShare - lapShare) / (1 - climbShare - lapShare);
  const glide = 0.9;
  if (share < glide) {
    const along = (share / glide) ** 1.3;
    return {
      x: zipFrom[0] + (zipTo[0] - zipFrom[0]) * along,
      y: Math.max(0, zipFrom[1] + (zipTo[1] - zipFrom[1]) * along - zipHang),
      z: zipFrom[2] + (zipTo[2] - zipFrom[2]) * along,
      heading: zipAngle,
    };
  }
  const drop = (share - glide) / (1 - glide);
  const end: Triple = [zipTo[0], zipTo[1] - zipHang, zipTo[2]];
  return {
    x: end[0] + (zipFinish.x - end[0]) * drop,
    y: end[1] * (1 - drop),
    z: end[2] + (zipFinish.z - end[2]) * drop,
    heading: zipAngle,
  };
};

const swingStart = { x: swingPivot[0] - 1.1, z: swingPivot[2] + 1.9 };
const swingFinish = { x: swingPivot[0] + 1.1, z: swingPivot[2] + 2.3 };

const swingRide = (progress: number, seconds: number): LocalSpot => {
  const seat: Triple = [
    swingPivot[0],
    swingPivot[1] - swingDrop + 0.18,
    swingPivot[2],
  ];
  const [x, y, z] = moveWithPose(
    swingPivot,
    seat,
    findMotionPose(swingMotion, seconds),
  );
  const share = Math.min(1, progress * 8, (1 - progress) * 8);
  const outside = progress < 0.5 ? swingStart : swingFinish;
  return {
    x: outside.x + (x - outside.x) * share,
    y: y * share,
    z: outside.z + (z - outside.z) * share,
    heading: 0,
  };
};

const trunkBlockers: LocalBlocker[] = [{ x: tree.x, z: tree.z, radius: 1.15 }];

export const giantKapokClimbModel: NewLandAttractionModel = {
  kind: "giant-kapok-climb",
  islandId: "jungle-reach",
  name: "Giant Kapok Climb",
  fact: "The kapok is one of the tallest trees in the rainforest, growing up to 60 metres, high above the other trees. Huge buttress roots, like wooden walls, hold it steady in the thin soil. A single kapok is a habitat for thousands of animals, from frogs and insects to monkeys and eagles, and its seeds float away on fluffy fibres to grow new trees.",
  curriculumLink:
    "Science, Year 4: living things and their habitats. Recognise that environments can change and that a habitat such as a rainforest tree is home to many different living things (the kapok, the giant of the rainforest).",
  footprint: 10,
  setting: "inland",
  signSpot: { x: 0.8, z: 9.0 },
  build: (builder) => {
    buildGround(builder);
    buildTree(builder);
    buildSpiral(builder);
    buildLookout(builder);
    buildZipWire(builder);
    buildSwingBranch(builder);
    buildToucanBranch(builder);
    buildMonkeyBranch(builder);
    buildHut(builder);
    addSignBoard(builder, [0.8, 0, 8.3], signColour);
  },
  moving: [
    {
      name: "seed-pod swing",
      pivot: swingPivot,
      build: buildPodSwing,
      motion: swingMotion,
    },
    {
      name: "toucan",
      pivot: toucanPivot,
      build: buildToucan,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 7,
        amplitude: 0.35,
        period: 1.3,
      },
    },
    {
      name: "spider monkey",
      pivot: monkeyPivot,
      build: buildMonkey,
      motion: { kind: "swing", axis: "z", amplitude: 0.35, period: 3.2 },
    },
    {
      name: "kapok fluff",
      pivot: fluffPivot,
      build: buildFluff,
      motion: { kind: "wake", reach: 8 },
    },
  ],
  wanderers: [
    {
      name: "macaws",
      build: buildMacaw,
      count: 3,
      centre: tree,
      radius: 4.5,
      speed: 1.4,
      height: 7.6,
      bob: 0.4,
    },
    {
      name: "climbers",
      build: buildClimber,
      count: 3,
      centre: { x: -1.8, z: 5.6 },
      radius: 1.8,
      speed: 0.5,
    },
  ],
  blockers: trunkBlockers,
  rides: [
    {
      id: "spiral-climb",
      name: "the spiral climb and zip wire",
      start: climbStart,
      reach: 0.6,
      seconds: 26,
      finish: zipFinish,
      follow: climbRide,
    },
    {
      id: "pod-swing",
      name: "the seed-pod swing",
      start: swingStart,
      reach: 0.6,
      seconds: 9,
      finish: swingFinish,
      follow: swingRide,
    },
  ],
  play: {
    label: "Shake the seed pods",
    news: "Poof! The kapok pods split open, and fluffy seeds floated away on the breeze to grow into new trees.",
  },
};
