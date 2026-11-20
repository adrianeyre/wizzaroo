import {
  addBench,
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type LocalPoint,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const bark = "#6e5a44";
const darkBark = "#544332";
const leafDeep = "#256b2a";
const leafMid = "#2f8a35";
const leafBright = "#4fa83c";
const plank = "#b07a48";
const darkPlank = "#7a5232";
const rope = "#d8c08a";
const safetyRope = "#e8642a";
const netRope = "#e2cf9a";
const steel = "#9aa3ad";
const chips = "#9a7a52";
const signColour = "#c8642a";

/* The tree platforms, high up, in the order the course visits them */

const deckHeight = 3.0;
const platformHalf = 0.8;

interface Station {
  x: number;
  z: number;
  /** Where its tree trunk stands, just off the platform's middle. */
  trunk: LocalPoint;
}

const stations: Station[] = [
  { x: -5.5, z: 3.5, trunk: { x: -6.25, z: 3.5 } },
  { x: -5.5, z: -2.5, trunk: { x: -6.25, z: -2.8 } },
  { x: -1.0, z: -5.0, trunk: { x: -1.0, z: -5.75 } },
  { x: 4.0, z: -5.0, trunk: { x: 4.6, z: -5.6 } },
  { x: 5.5, z: 1.0, trunk: { x: 6.25, z: 1.0 } },
];

const upright = (point: LocalPoint, y: number): Triple => [point.x, y, point.z];

const addTreeTrunk = (
  builder: AttractionBuilder,
  trunk: LocalPoint,
  index: number,
) => {
  builder.cylinder("matte", index % 2 === 0 ? bark : shade(bark, 0.9), {
    radius: 0.3,
    radiusEnd: 0.18,
    length: 6.4,
    at: [trunk.x, 3.2, trunk.z],
    segments: 9,
  });
  builder.cylinder("matte", darkBark, {
    radius: 0.5,
    radiusEnd: 0.3,
    length: 0.5,
    at: [trunk.x, 0.25, trunk.z],
    segments: 9,
  });
  const clumps: [number, number, number, number][] = builder.isFar
    ? [[0, 6.6, 0, 1.6]]
    : [
        [0, 6.9, 0, 1.3],
        [0.8, 6.3, 0.4, 1.0],
        [-0.7, 6.4, -0.3, 1.0],
        [0.2, 6.2, -0.8, 0.9],
      ];
  clumps.forEach(([dx, dy, dz, radius], clump) => {
    builder.sphere(
      "matte",
      [leafMid, leafDeep, leafBright][(clump + index) % 3],
      radius,
      [trunk.x + dx, dy, trunk.z + dz],
      [1, 0.75, 1],
      builder.isFar ? 10 : 9,
    );
  });
};

const buildPlatform = (
  builder: AttractionBuilder,
  station: Station,
  index: number,
) => {
  const { x, z, trunk } = station;
  builder.box(
    "matte",
    darkPlank,
    [platformHalf * 2, 0.14, platformHalf * 2],
    [x, deckHeight - 0.07, z],
  );
  if (!builder.isFar) {
    for (let board = 0; board < 5; board++) {
      builder.box(
        "matte",
        board % 2 === 0 ? plank : shade(plank, 0.92),
        [platformHalf * 2 - 0.04, 0.03, 0.29],
        [x, deckHeight + 0.01, z - platformHalf + 0.16 + board * 0.32],
      );
    }
  }
  /* Braces from the trunk up under the platform */
  [-1, 1].forEach((side) => {
    const along =
      trunk.x === x ? { x: side * 0.6, z: 0 } : { x: 0, z: side * 0.6 };
    builder.bar(
      "matte",
      darkPlank,
      [trunk.x, deckHeight - 1.3, trunk.z],
      [x + along.x, deckHeight - 0.12, z + along.z],
      0.1,
      4,
    );
  });
  /* The safety cable's anchor high on the trunk */
  builder.torus(
    "metal",
    steel,
    0.26,
    0.04,
    [trunk.x, deckHeight + 1.9, trunk.z],
    "y",
    builder.isFar ? 8 : 14,
  );
  /* A number on a little board, so climbers know where they are */
  if (!builder.isFar) {
    builder.box(
      "paint",
      signColour,
      [0.34, 0.34, 0.04],
      [
        trunk.x,
        deckHeight + 1.1,
        trunk.z + (trunk.z === z ? 0.3 : Math.sign(z - trunk.z) * 0.3),
      ],
    );
    for (let mark = 0; mark <= index; mark++) {
      builder.box(
        "paint",
        palette.cream,
        [0.04, 0.2, 0.02],
        [
          trunk.x - 0.1 + mark * 0.06,
          deckHeight + 1.1,
          trunk.z + (trunk.z === z ? 0.33 : Math.sign(z - trunk.z) * 0.33),
        ],
      );
    }
  }
};

const buildTrees = (builder: AttractionBuilder) => {
  stations.forEach((station, index) => {
    addTreeTrunk(builder, station.trunk, index);
    buildPlatform(builder, station, index);
  });
};

/* The ladder up to the first platform */

const ladder = {
  x: stations[0].x,
  footZ: 5.2,
  topZ: stations[0].z + platformHalf,
};

const buildLadder = (builder: AttractionBuilder) => {
  [-0.28, 0.28].forEach((side) => {
    builder.bar(
      "matte",
      darkPlank,
      [ladder.x + side, 0, ladder.footZ],
      [ladder.x + side, deckHeight + 0.9, ladder.topZ - 0.02],
      0.08,
      6,
    );
  });
  const rungs = builder.isFar ? 4 : 9;
  for (let rung = 1; rung <= rungs; rung++) {
    const height = (rung / (rungs + 1)) * (deckHeight + 0.1);
    const share = height / (deckHeight + 0.9);
    builder.cylinder("matte", plank, {
      radius: 0.03,
      length: 0.56,
      at: [
        ladder.x,
        height,
        ladder.footZ + (ladder.topZ - ladder.footZ) * share,
      ],
      axis: "x",
      segments: 5,
    });
  }
};

/* The rope bridge, from the first platform to the second */

const bridge = {
  x: stations[0].x,
  from: stations[0].z - platformHalf,
  to: stations[1].z + platformHalf,
  sag: 0.28,
};
const bridgePivot: Triple = [
  bridge.x,
  deckHeight + 1.0,
  (bridge.from + bridge.to) / 2,
];

const bridgeHeightAt = (z: number): number => {
  const middle = (bridge.from + bridge.to) / 2;
  const half = (bridge.from - bridge.to) / 2;
  return deckHeight - bridge.sag * (1 - ((z - middle) / half) ** 2);
};

const buildRopeBridge = (builder: AttractionBuilder) => {
  const [px, py, pz] = bridgePivot;
  const planks = builder.isFar ? 5 : 13;
  for (let index = 0; index < planks; index++) {
    const z =
      bridge.from - ((index + 0.5) / planks) * (bridge.from - bridge.to);
    builder.box(
      "matte",
      index % 2 === 0 ? plank : shade(plank, 0.9),
      [0.7, 0.05, 0.3],
      [bridge.x - px, bridgeHeightAt(z) - py, z - pz],
    );
  }
  const pieces = builder.isFar ? 2 : 6;
  [-0.4, 0.4].forEach((side) => {
    [0, 0.9].forEach((lift) => {
      for (let piece = 0; piece < pieces; piece++) {
        const from = bridge.from - (piece / pieces) * (bridge.from - bridge.to);
        const to =
          bridge.from - ((piece + 1) / pieces) * (bridge.from - bridge.to);
        builder.bar(
          "matte",
          lift === 0 ? darkPlank : rope,
          [bridge.x + side - px, bridgeHeightAt(from) + lift - py, from - pz],
          [bridge.x + side - px, bridgeHeightAt(to) + lift - py, to - pz],
          lift === 0 ? 0.05 : 0.045,
          4,
        );
      }
    });
    if (!builder.isFar) {
      for (let tie = 1; tie < 8; tie++) {
        const z = bridge.from - (tie / 8) * (bridge.from - bridge.to);
        builder.bar(
          "matte",
          rope,
          [bridge.x + side - px, bridgeHeightAt(z) - py, z - pz],
          [bridge.x + side - px, bridgeHeightAt(z) + 0.9 - py, z - pz],
          0.025,
          3,
        );
      }
    }
  });
};

/* The balance log, from the second platform to the third */

const beamFrom: Triple = [
  stations[1].x + 0.6,
  deckHeight - 0.05,
  stations[1].z - 0.45,
];
const beamTo: Triple = [
  stations[2].x - 0.6,
  deckHeight - 0.05,
  stations[2].z + 0.3,
];

const buildBalanceLog = (builder: AttractionBuilder) => {
  builder.bar("matte", bark, beamFrom, beamTo, 0.26, builder.isFar ? 6 : 10);
  [-1, 1].forEach((side) => {
    const shift: Triple = [side * 0.25, 1.15, side * 0.45];
    builder.bar(
      "matte",
      rope,
      [beamFrom[0] + shift[0], beamFrom[1] + shift[1], beamFrom[2] + shift[2]],
      [beamTo[0] + shift[0], beamTo[1] + shift[1], beamTo[2] + shift[2]],
      0.04,
      4,
    );
  });
};

/* The swinging logs, from the third platform to the fourth */

const logs = {
  from: stations[2].x + platformHalf,
  to: stations[3].x - platformHalf,
  z: stations[2].z,
  cable: deckHeight + 2.0,
  count: 5,
};
const logsPivot: Triple = [(logs.from + logs.to) / 2, logs.cable, logs.z];

const listLogXs = (): number[] =>
  Array.from(
    { length: logs.count },
    (_, index) =>
      logs.from + ((index + 0.5) / logs.count) * (logs.to - logs.from),
  );

const buildLogCable = (builder: AttractionBuilder) => {
  [stations[2].trunk, stations[3].trunk].forEach((trunk) => {
    builder.bar(
      "metal",
      steel,
      [trunk.x, logs.cable, trunk.z],
      [trunk.x, logs.cable, logs.z],
      0.04,
      4,
    );
  });
  builder.bar(
    "metal",
    steel,
    [stations[2].trunk.x, logs.cable, logs.z],
    [stations[3].trunk.x, logs.cable, logs.z],
    0.04,
    5,
  );
};

const buildSwingingLogs = (builder: AttractionBuilder) => {
  const [px, py, pz] = logsPivot;
  listLogXs().forEach((x, index) => {
    const top = deckHeight + 0.02;
    builder.cylinder("matte", index % 2 === 0 ? bark : shade(bark, 1.1), {
      radius: 0.2,
      length: 0.6,
      at: [x - px, top - 0.2 - py, logs.z - pz],
      axis: "z",
      segments: builder.segments(10, 6),
    });
    if (!builder.isFar) {
      [-0.22, 0.22].forEach((side) => {
        builder.bar(
          "matte",
          rope,
          [x - px, top - 0.05 - py, logs.z + side - pz],
          [x - px, 0, logs.z - pz],
          0.03,
          3,
        );
      });
      builder.cylinder("matte", "#c9a46a", {
        radius: 0.19,
        length: 0.62,
        at: [x - px, top - 0.2 - py, logs.z - pz],
        axis: "z",
        segments: 10,
      });
    }
  });
};

/* The cargo net, from the fourth platform to the fifth */

const net = {
  from: { x: stations[3].x + 0.3, z: stations[3].z + platformHalf },
  to: { x: stations[4].x - 0.2, z: stations[4].z - platformHalf },
  half: 0.6,
  sag: 0.35,
};

const netPoint = (along: number, across: number): Triple => {
  const x = net.from.x + (net.to.x - net.from.x) * along;
  const z = net.from.z + (net.to.z - net.from.z) * along;
  const length = Math.hypot(net.to.x - net.from.x, net.to.z - net.from.z);
  const side = {
    x: (net.to.z - net.from.z) / length,
    z: -(net.to.x - net.from.x) / length,
  };
  return [
    x + side.x * across,
    deckHeight -
      0.05 -
      net.sag * Math.sin(along * Math.PI) -
      0.1 * Math.abs(across),
    z + side.z * across,
  ];
};

const buildCargoNet = (builder: AttractionBuilder) => {
  const lengthwise = builder.isFar ? 2 : 5;
  const pieces = builder.isFar ? 2 : 5;
  for (let line = 0; line < lengthwise; line++) {
    const across = -net.half + (line / (lengthwise - 1)) * net.half * 2;
    for (let piece = 0; piece < pieces; piece++) {
      builder.bar(
        "matte",
        netRope,
        netPoint(piece / pieces, across),
        netPoint((piece + 1) / pieces, across),
        0.04,
        4,
      );
    }
  }
  const crossings = builder.isFar ? 3 : 11;
  for (let line = 0; line <= crossings; line++) {
    const along = line / crossings;
    builder.bar(
      "matte",
      netRope,
      netPoint(along, -net.half),
      netPoint(along, net.half),
      0.035,
      4,
    );
  }
  /* Hand ropes either side */
  [-1, 1].forEach((side) => {
    const [fx, , fz] = netPoint(0, side * (net.half + 0.1));
    const [tx, , tz] = netPoint(1, side * (net.half + 0.1));
    builder.bar(
      "matte",
      rope,
      [fx, deckHeight + 1.0, fz],
      [tx, deckHeight + 1.0, tz],
      0.04,
      4,
    );
  });
};

/* The zip wire, from the last platform down to the landing */

const zipFrom: Triple = [
  stations[4].x - 0.4,
  deckHeight + 2.1,
  stations[4].z + 0.5,
];
const zipTo: Triple = [-0.6, 2.45, 7.0];
const zipHang = 1.6;
const zipLength = Math.hypot(zipTo[0] - zipFrom[0], zipTo[2] - zipFrom[2]);
const zipAlong = {
  x: (zipTo[0] - zipFrom[0]) / zipLength,
  z: (zipTo[2] - zipFrom[2]) / zipLength,
};
const zipHeading = Math.atan2(zipAlong.x, zipAlong.z);

const buildZipWire = (builder: AttractionBuilder) => {
  builder.bar("metal", steel, zipFrom, zipTo, 0.04, 5);
  /* A frame on the last platform to hang the wire from */
  [-0.55, 0.55].forEach((side) => {
    builder.box(
      "matte",
      darkPlank,
      [0.12, 2.3, 0.12],
      [
        zipFrom[0] - zipAlong.z * side,
        deckHeight + 1.15,
        zipFrom[2] + zipAlong.x * side,
      ],
    );
  });
  builder.box(
    "matte",
    darkPlank,
    [1.3, 0.14, 0.14],
    [zipFrom[0], deckHeight + 2.25, zipFrom[2]],
    [0, zipHeading, 0],
  );
  const post: Triple = [
    zipTo[0] + zipAlong.x * 0.3,
    0,
    zipTo[2] + zipAlong.z * 0.3,
  ];
  builder.cylinder("matte", darkPlank, {
    radius: 0.14,
    radiusEnd: 0.11,
    length: zipTo[1] + 0.4,
    at: [post[0], (zipTo[1] + 0.4) / 2, post[2]],
    segments: 8,
  });
  builder.cylinder("matte", "#3a6aa8", {
    radius: 0.16,
    length: 0.5,
    at: [post[0], 1.6, post[2]],
    segments: 8,
  });
  builder.cylinder("matte", chips, {
    radius: 1.4,
    length: 0.05,
    at: [zipTo[0] - zipAlong.x * 1.1, 0.025, zipTo[2] - zipAlong.z * 1.1],
    segments: builder.segments(16, 8),
  });
  if (!builder.isFar) {
    builder.box(
      "metal",
      "#c8302a",
      [0.12, 0.16, 0.24],
      [zipFrom[0], zipFrom[1] - 0.1, zipFrom[2]],
      [0, zipHeading, 0],
    );
    builder.bar(
      "matte",
      safetyRope,
      [zipFrom[0], zipFrom[1] - 0.18, zipFrom[2]],
      [zipFrom[0], zipFrom[1] - 0.95, zipFrom[2]],
      0.03,
      4,
    );
  }
};

/* Safety cables over every crossing */

const buildSafetyCables = (builder: AttractionBuilder) => {
  for (let index = 1; index < stations.length - 1; index++) {
    const from = stations[index - 1].trunk;
    const to = stations[index].trunk;
    if (index === 3) {
      continue;
    }
    builder.bar(
      "metal",
      steel,
      upright(from, deckHeight + 1.9),
      upright(to, deckHeight + 1.9),
      0.03,
      4,
    );
  }
  builder.bar(
    "metal",
    steel,
    upright(stations[3].trunk, deckHeight + 1.9),
    upright(stations[4].trunk, deckHeight + 1.9),
    0.03,
    4,
  );
};

/* The low ropes trail for little ones: stumps and a plank, to stand on */

const stumpTop = 0.3;
const stumps: [number, number][] = [
  [-2.6, 2.2],
  [-1.9, 1.4],
  [-1.1, 0.9],
  [-0.3, 0.4],
  [0.5, -0.1],
  [1.3, -0.5],
];
const stumpRadius = 0.34;
const plankWalk = {
  from: { x: 1.9, z: -0.3 },
  to: { x: 3.3, z: 1.3 },
  half: 0.28,
};

const buildLowTrail = (builder: AttractionBuilder) => {
  stumps.forEach(([x, z], index) => {
    builder.cylinder("matte", index % 2 === 0 ? bark : shade(bark, 1.1), {
      radius: stumpRadius,
      radiusEnd: stumpRadius * 0.92,
      length: stumpTop,
      at: [x, stumpTop / 2, z],
      segments: builder.segments(12, 6),
    });
    if (!builder.isFar) {
      builder.cylinder("matte", "#c9a46a", {
        radius: stumpRadius * 0.85,
        length: 0.01,
        at: [x, stumpTop + 0.003, z],
        segments: 12,
      });
    }
  });
  const length = Math.hypot(
    plankWalk.to.x - plankWalk.from.x,
    plankWalk.to.z - plankWalk.from.z,
  );
  const heading = Math.atan2(
    plankWalk.to.x - plankWalk.from.x,
    plankWalk.to.z - plankWalk.from.z,
  );
  const middle = {
    x: (plankWalk.from.x + plankWalk.to.x) / 2,
    z: (plankWalk.from.z + plankWalk.to.z) / 2,
  };
  builder.box(
    "matte",
    plank,
    [plankWalk.half * 2, 0.08, length],
    [middle.x, stumpTop - 0.04, middle.z],
    [0, heading, 0],
  );
  [-0.4, 0.4].forEach((share) => {
    builder.box(
      "matte",
      darkPlank,
      [plankWalk.half * 2, stumpTop - 0.08, 0.16],
      [
        middle.x + Math.sin(heading) * length * share,
        (stumpTop - 0.08) / 2,
        middle.z + Math.cos(heading) * length * share,
      ],
      [0, heading, 0],
    );
  });
  builder.cylinder("matte", chips, {
    radius: 3.1,
    length: 0.02,
    at: [0.2, 0.01, 0.8],
    segments: builder.segments(24, 10),
  });
};

/* The kit hut, where climbers get their helmets and harnesses */

const hut = { x: 5.8, z: 6.0 };

const buildHut = (builder: AttractionBuilder) => {
  const { x, z } = hut;
  const turn = -0.7;
  builder.box("matte", plank, [2.0, 1.8, 1.4], [x, 0.9, z], [0, turn, 0]);
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      "#9a8a3a",
      [2.5, 0.1, 1.15],
      [x + Math.sin(turn) * side * 0.45, 2.1, z + Math.cos(turn) * side * 0.45],
      [side * 0.55, turn, 0],
    );
  });
  const front = { x: x + Math.sin(turn) * 0.71, z: z + Math.cos(turn) * 0.71 };
  builder.box(
    "glow",
    palette.warmLight,
    [0.9, 0.55, 0.04],
    [front.x, 1.15, front.z],
    [0, turn, 0],
  );
  if (!builder.isFar) {
    ["#e8302a", "#2f6fd6", "#f2c230", "#3aa64a", "#c8642a"].forEach(
      (colour, index) => {
        const across = -0.5 + index * 0.25;
        builder.sphere(
          "paint",
          colour,
          0.1,
          [
            front.x + Math.cos(turn) * across + Math.sin(turn) * 0.12,
            0.95,
            front.z - Math.sin(turn) * across + Math.cos(turn) * 0.12,
          ],
          [1, 0.8, 1.1],
          8,
        );
      },
    );
    builder.box(
      "matte",
      darkPlank,
      [1.3, 0.08, 0.3],
      [front.x + Math.sin(turn) * 0.12, 0.84, front.z + Math.cos(turn) * 0.12],
      [0, turn, 0],
    );
    builder.box(
      "paint",
      signColour,
      [1.2, 0.26, 0.04],
      [front.x + Math.sin(turn) * 0.02, 1.62, front.z + Math.cos(turn) * 0.02],
      [0, turn, 0],
    );
  }
};

const buildGrounds = (builder: AttractionBuilder) => {
  addBench(builder, [-3.6, 0, 7.3], 0.4, palette.paleTimber);
  addBench(builder, [2.6, 0, 4.4], Math.PI - 0.3, palette.paleTimber);
  if (!builder.isFar) {
    const ferns: [number, number, string][] = [
      [-7.8, 0.4, leafMid],
      [-3.4, -6.6, leafBright],
      [7.6, -3.2, leafDeep],
      [1.8, -7.8, leafMid],
      [-8.2, 5.6, leafBright],
    ];
    ferns.forEach(([x, z, colour], fern) => {
      for (let frond = 0; frond < 5; frond++) {
        const angle = (frond / 5) * Math.PI * 2 + fern;
        builder.box(
          "matte",
          frond % 2 === 0 ? colour : shade(colour, 1.15),
          [0.22, 0.02, 0.9],
          [x + Math.sin(angle) * 0.38, 0.28, z + Math.cos(angle) * 0.38],
          [-0.55, angle, 0],
        );
      }
    });
  }
};

/* The moving parts */

const bellPivot: Triple = [
  stations[4].trunk.x - 0.3,
  deckHeight + 1.75,
  stations[4].trunk.z,
];

const buildBell = (builder: AttractionBuilder) => {
  builder.lathe(
    "metal",
    palette.brass,
    [
      [0, 0],
      [0.06, 0],
      [0.1, -0.08],
      [0.12, -0.22],
      [0.18, -0.34],
      [0, -0.34],
    ],
    [0, 0, 0],
    "y",
    builder.segments(14, 8),
  );
  builder.sphere("metal", palette.darkSteel, 0.05, [0, -0.36, 0], [1, 1, 1], 6);
};

const flagPivot: Triple = [
  stations[4].trunk.x,
  deckHeight + 3.05,
  stations[4].trunk.z,
];

const buildFlag = (builder: AttractionBuilder) => {
  builder.cylinder("metal", steel, {
    radius: 0.025,
    length: 1.2,
    at: [0, 0.6, 0],
    segments: 6,
  });
  builder.box("matte", "#e8302a", [0.02, 0.32, 0.5], [0, 1.0, -0.25]);
  builder.box("matte", "#f2c230", [0.025, 0.1, 0.5], [0, 1.0, -0.25]);
};

/* Climbers in helmets and harnesses */

const buildClimber = (builder: AttractionBuilder) => {
  [-0.07, 0.07].forEach((side) => {
    builder.box("matte", "#3e4a5e", [0.09, 0.42, 0.1], [side, 0.21, 0]);
  });
  builder.cylinder("matte", "#3aa64a", {
    radius: 0.15,
    radiusEnd: 0.13,
    length: 0.4,
    at: [0, 0.62, 0],
    segments: 10,
  });
  if (!builder.isFar) {
    builder.torus("matte", safetyRope, 0.15, 0.02, [0, 0.45, 0], "y", 10);
    builder.bar(
      "matte",
      safetyRope,
      [0.05, 0.45, 0.14],
      [0.12, 0.3, 0.2],
      0.03,
      4,
    );
  }
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      "#3aa64a",
      [side * 0.17, 0.78, 0],
      [side * 0.22, 0.5, 0.05],
      0.07,
      5,
    );
  });
  builder.sphere("matte", "#c98d63", 0.13, [0, 0.95, 0], [1, 1.05, 1], 10);
  builder.sphere("paint", "#2f6fd6", 0.14, [0, 1.0, 0], [1, 0.7, 1], 10);
};

const buildParrot = (builder: AttractionBuilder) => {
  builder.sphere("paint", "#3aa64a", 0.11, [0, 0, 0], [0.8, 0.8, 1.5], 8);
  builder.sphere("paint", "#3aa64a", 0.07, [0, 0.05, 0.15], [1, 1, 1], 7);
  builder.box("paint", "#f2c230", [0.05, 0.02, 0.3], [0, -0.02, -0.26]);
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      "#2a8a3a",
      [0.32, 0.02, 0.15],
      [side * 0.2, 0.03, 0],
      [0, 0, side * 0.25],
    );
  });
  if (!builder.isFar) {
    builder.box("paint", "#e8302a", [0.05, 0.04, 0.05], [0, 0.03, 0.23]);
  }
};

/* The ride: all the way round, high up, and down the zip wire */

const rideStart = { x: ladder.x, z: ladder.footZ + 0.75 };
const rideFinish = {
  x: zipTo[0] - zipAlong.x * 1.1,
  z: zipTo[2] - zipAlong.z * 1.1,
};

const logXs = listLogXs();
const highPath: Triple[] = [
  [rideStart.x, 0, rideStart.z],
  [ladder.x, 0, ladder.footZ + 0.2],
  [ladder.x, deckHeight, ladder.topZ - 0.1],
  [stations[0].x, deckHeight, stations[0].z],
  ...Array.from({ length: 7 }, (_, step): Triple => {
    const z = bridge.from - ((step + 0.5) / 7) * (bridge.from - bridge.to);
    return [bridge.x, bridgeHeightAt(z), z];
  }),
  [stations[1].x, deckHeight, stations[1].z],
  [beamFrom[0], deckHeight + 0.08, beamFrom[2]],
  [beamTo[0], deckHeight + 0.08, beamTo[2]],
  [stations[2].x, deckHeight, stations[2].z],
  ...logXs.flatMap((x): Triple[] => [
    [x - 0.25, deckHeight + 0.35, logs.z],
    [x, deckHeight + 0.02, logs.z],
  ]),
  [stations[3].x, deckHeight, stations[3].z],
  ...[0.15, 0.35, 0.5, 0.65, 0.85].map((along): Triple => {
    const [x, y, z] = netPoint(along, 0);
    return [x, y - 0.2, z];
  }),
  [stations[4].x, deckHeight, stations[4].z],
  [zipFrom[0], deckHeight, zipFrom[2]],
];

const followPoints = (
  points: readonly Triple[],
  progress: number,
): LocalSpot => {
  const lengths = points
    .slice(1)
    .map((point, index) =>
      Math.hypot(
        point[0] - points[index][0],
        point[1] - points[index][1],
        point[2] - points[index][2],
      ),
    );
  const total = lengths.reduce((sum, length) => sum + length, 0);
  let left = Math.min(1, Math.max(0, progress)) * total;
  for (let index = 0; index < lengths.length; index++) {
    const [fromX, fromY, fromZ] = points[index];
    const [toX, toY, toZ] = points[index + 1];
    if (left <= lengths[index] || index === lengths.length - 1) {
      const share = lengths[index] > 0 ? Math.min(1, left / lengths[index]) : 1;
      return {
        x: fromX + (toX - fromX) * share,
        y: fromY + (toY - fromY) * share,
        z: fromZ + (toZ - fromZ) * share,
        heading:
          Math.abs(toX - fromX) + Math.abs(toZ - fromZ) < 0.01
            ? Math.PI
            : Math.atan2(toX - fromX, toZ - fromZ),
      };
    }
    left -= lengths[index];
  }
  const [x, y, z] = points[points.length - 1];
  return { x, y, z, heading: 0 };
};

const courseShare = 0.78;

const highRopesRide = (progress: number): LocalSpot => {
  if (progress < courseShare) {
    return followPoints(highPath, progress / courseShare);
  }
  const share = (progress - courseShare) / (1 - courseShare);
  const glide = 0.88;
  if (share < glide) {
    const along = (share / glide) ** 1.3;
    return {
      x: zipFrom[0] + (zipTo[0] - zipFrom[0]) * along,
      y: Math.max(0, zipFrom[1] + (zipTo[1] - zipFrom[1]) * along - zipHang),
      z: zipFrom[2] + (zipTo[2] - zipFrom[2]) * along,
      heading: zipHeading,
    };
  }
  const drop = (share - glide) / (1 - glide);
  const end: Triple = [zipTo[0], zipTo[1] - zipHang, zipTo[2]];
  return {
    x: end[0] + (rideFinish.x - end[0]) * drop,
    y: end[1] * (1 - drop),
    z: end[2] + (rideFinish.z - end[2]) * drop,
    heading: zipHeading,
  };
};

/* Where the Character can stand: the stumps and the plank */

const lowTrailDeck: Deck = ({ x, z }) => {
  const onStump = stumps.some(
    ([stumpX, stumpZ]) =>
      Math.hypot(x - stumpX, z - stumpZ) <= stumpRadius - 0.04,
  );
  if (onStump) {
    return { height: stumpTop, kind: "bridge" };
  }
  const dx = plankWalk.to.x - plankWalk.from.x;
  const dz = plankWalk.to.z - plankWalk.from.z;
  const length = Math.hypot(dx, dz);
  const along =
    ((x - plankWalk.from.x) * dx + (z - plankWalk.from.z) * dz) / length;
  const across =
    ((x - plankWalk.from.x) * dz - (z - plankWalk.from.z) * dx) / length;
  return along >= 0 && along <= length && Math.abs(across) <= plankWalk.half
    ? { height: stumpTop, kind: "bridge" }
    : undefined;
};

const trunkBlockers: LocalBlocker[] = stations.map(({ trunk }) => ({
  x: trunk.x,
  z: trunk.z,
  radius: 0.45,
}));

export const highRopesCourseModel: NewLandAttractionModel = {
  kind: "high-ropes-course",
  islandId: "jungle-reach",
  name: "High Ropes Course",
  fact: "Your sense of balance comes from tiny tubes of liquid deep inside your ears. When you wobble, the liquid sloshes about and tells your brain which way is up, so your muscles can hold you steady. Practising on beams, rope bridges and nets makes your balance and your muscles stronger.",
  curriculumLink:
    "Physical education, Key Stage 2: develop flexibility, strength, technique, control and balance, and take part in outdoor and adventurous activity challenges, both individually and within a team.",
  footprint: 11,
  setting: "inland",
  signSpot: { x: -2.4, z: 9.2 },
  build: (builder) => {
    buildTrees(builder);
    buildLadder(builder);
    buildBalanceLog(builder);
    buildLogCable(builder);
    buildCargoNet(builder);
    buildZipWire(builder);
    buildSafetyCables(builder);
    buildLowTrail(builder);
    buildHut(builder);
    buildGrounds(builder);
    addSignBoard(builder, [-2.4, 0, 8.5], signColour, 0.2);
  },
  moving: [
    {
      name: "wobbly rope bridge",
      pivot: bridgePivot,
      build: buildRopeBridge,
      motion: {
        kind: "nod",
        axis: "z",
        reach: 6,
        amplitude: 0.06,
        period: 1.8,
      },
    },
    {
      name: "swinging logs",
      pivot: logsPivot,
      build: buildSwingingLogs,
      motion: { kind: "swing", axis: "x", amplitude: 0.12, period: 3.4 },
    },
    {
      name: "finish bell",
      pivot: bellPivot,
      build: buildBell,
      motion: { kind: "nod", axis: "x", reach: 7, amplitude: 0.4, period: 0.9 },
    },
    {
      name: "finish flag",
      pivot: flagPivot,
      build: buildFlag,
      motion: { kind: "rise", reach: 8, height: 0.9, period: 2.6 },
    },
  ],
  wanderers: [
    {
      name: "climbers",
      build: buildClimber,
      count: 3,
      centre: { x: 0.4, z: 4.2 },
      radius: 1.8,
      speed: 0.5,
    },
    {
      name: "parrots",
      build: buildParrot,
      count: 3,
      centre: { x: 0, z: -1 },
      radius: 5,
      speed: 1.3,
      height: 6.0,
      bob: 0.4,
    },
  ],
  blockers: trunkBlockers,
  decks: [lowTrailDeck],
  rides: [
    {
      id: "high-ropes",
      name: "the high ropes and zip wire",
      start: rideStart,
      reach: 0.6,
      seconds: 34,
      finish: rideFinish,
      follow: highRopesRide,
    },
  ],
  play: {
    label: "Ring the finish bell",
    news: "Ding ding! You crossed the wobbly bridge, balanced along the log, hopped the swinging logs and zipped all the way down.",
  },
};
