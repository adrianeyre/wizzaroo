import { IcosahedronGeometry, Vector3 } from "three";
import {
  addBench,
  addBush,
  addFence,
  addLampPost,
  addSignBoard,
  addTree,
  findMotionPose,
  moveWithPose,
  palette,
  type AttractionBuilder,
  type AttractionModel,
  type LocalSpot,
  type Motion,
  type Triple,
} from "./attraction-kit.js";

const frameGreen = "#2f6b3a";
const plasticRed = "#d63a2f";
const plasticYellow = "#f2b51d";
const plasticBlue = "#2f6fd6";
const safetySurface = "#3f7a4a";
const rubberTile = "#b4553d";
const chain = "#c3c8cc";

/* The swings */

const swingsAt = { x: -4.4, z: -2.6 };
const swingTop = 2.15;
const seatDrop = 1.65;
const swingSeats = [-0.75, 0.75];
const swingMotion = (seat: number): Motion => ({
  kind: "swing",
  axis: "x",
  amplitude: seat === 0 ? 0.55 : 0.32,
  period: 2.8,
  phase: seat * 2.1,
});
const swingPivot = (seat: number): Triple => [
  swingsAt.x + swingSeats[seat],
  swingTop,
  swingsAt.z,
];

const buildSwingFrame = (builder: AttractionBuilder) => {
  const halfSpan = 1.65;
  const legSpread = 0.85;
  builder.cylinder("paint", frameGreen, {
    radius: 0.06,
    length: halfSpan * 2 + 0.2,
    at: [swingsAt.x, swingTop + 0.02, swingsAt.z],
    axis: "x",
    segments: 12,
  });
  [-1, 1].forEach((side) => {
    [-1, 1].forEach((leg) => {
      builder.bar(
        "paint",
        frameGreen,
        [swingsAt.x + side * halfSpan, swingTop, swingsAt.z],
        [
          swingsAt.x + side * (halfSpan + 0.25),
          0,
          swingsAt.z + leg * legSpread,
        ],
        0.1,
        10,
      );
    });
    builder.sphere(
      "paint",
      frameGreen,
      0.085,
      [swingsAt.x + side * halfSpan, swingTop + 0.02, swingsAt.z],
      [1, 1, 1],
      10,
    );
    if (!builder.isFar) {
      builder.bar(
        "paint",
        frameGreen,
        [
          swingsAt.x + side * (halfSpan + 0.17),
          0.7,
          swingsAt.z - legSpread * 0.68,
        ],
        [
          swingsAt.x + side * (halfSpan + 0.17),
          0.7,
          swingsAt.z + legSpread * 0.68,
        ],
        0.06,
      );
    }
  });
  builder.roundedBox("matte", rubberTile, [3.6, 0.06, 3.6], 0.03, [
    swingsAt.x,
    0.03,
    swingsAt.z,
  ]);
};

const buildSwingSeat = (builder: AttractionBuilder) => {
  [-0.22, 0.22].forEach((side) => {
    builder.bar(
      "metal",
      chain,
      [side, 0, 0],
      [side, -seatDrop + 0.04, 0],
      0.025,
      6,
    );
    if (!builder.isFar) {
      builder.torus("metal", chain, 0.035, 0.012, [side, -0.02, 0], "x", 8);
    }
  });
  builder.roundedBox("paint", "#202326", [0.52, 0.06, 0.22], 0.025, [
    0,
    -seatDrop,
    0,
  ]);
};

/* The slide */

const slideAt = { x: 4.2, z: -2.4 };
const deckHeight = 1.7;
const ladderFoot = -4.3;
const chuteStart = -2.7;
const chuteEnd = 1.1;
const chuteBottom = 0.32;

const findChuteHeight = (z: number): number => {
  const share = Math.min(
    1,
    Math.max(0, (z - chuteStart) / (chuteEnd - chuteStart)),
  );
  const eased =
    share < 0.8 ? 1 - (share / 0.8) ** 1.4 * 0.92 : 0.08 - (share - 0.8) * 0.4;
  return chuteBottom + (deckHeight - chuteBottom) * Math.max(0, eased);
};

const buildSlide = (builder: AttractionBuilder) => {
  const { x, z } = slideAt;
  const deckFront = z + chuteStart;
  const deckBack = deckFront - 1.1;
  [x - 0.5, x + 0.5].forEach((postX) => {
    [deckBack, deckFront].forEach((postZ) => {
      builder.cylinder("paint", plasticBlue, {
        radius: 0.07,
        length: deckHeight + 1,
        at: [postX, (deckHeight + 1) / 2, postZ],
        segments: 10,
      });
      builder.sphere(
        "paint",
        plasticYellow,
        0.1,
        [postX, deckHeight + 1.04, postZ],
        [1, 1, 1],
        10,
      );
    });
  });
  builder.roundedBox("paint", plasticYellow, [1.15, 0.1, 1.2], 0.03, [
    x,
    deckHeight,
    (deckBack + deckFront) / 2,
  ]);
  const roofAt: Triple = [x, deckHeight + 1.15, (deckBack + deckFront) / 2];
  builder.lathe(
    "paint",
    plasticRed,
    [
      [0, 0.55],
      [0.12, 0.5],
      [0.82, 0.02],
      [0.86, 0],
    ],
    roofAt,
    "y",
    4,
  );
  [-1, 1].forEach((side) => {
    builder.roundedBox("paint", plasticRed, [0.06, 0.55, 1.1], 0.02, [
      x + side * 0.55,
      deckHeight + 0.38,
      (deckBack + deckFront) / 2,
    ]);
  });
  const rungs = builder.isFar ? 3 : 6;
  [-0.32, 0.32].forEach((side) => {
    builder.bar(
      "paint",
      plasticBlue,
      [x + side, 0, z + ladderFoot],
      [x + side, deckHeight + 0.4, deckBack + 0.02],
      0.07,
    );
  });
  for (let rung = 1; rung <= rungs; rung++) {
    const share = rung / (rungs + 1);
    builder.cylinder("metal", palette.steel, {
      radius: 0.03,
      length: 0.64,
      at: [
        x,
        share * (deckHeight + 0.4),
        z + ladderFoot + (deckBack + 0.02 - (z + ladderFoot)) * share,
      ],
      axis: "x",
      segments: 8,
    });
  }
  const steps = builder.segments(18, 8);
  const stations = Array.from({ length: steps + 1 }, (_, step) => {
    const along = chuteStart + ((chuteEnd - chuteStart) * step) / steps;
    const lift = findChuteHeight(along);
    const half = 0.34;
    const wall = 0.24;
    return {
      z: z + along,
      points: [
        [x - half - 0.05, lift + wall] as const,
        [x - half, lift + 0.04] as const,
        [x - half * 0.6, lift - 0.02] as const,
        [x + half * 0.6, lift - 0.02] as const,
        [x + half, lift + 0.04] as const,
        [x + half + 0.05, lift + wall] as const,
        [x + half + 0.09, lift + wall] as const,
        [x + half + 0.06, lift - 0.06] as const,
        [x - half - 0.06, lift - 0.06] as const,
        [x - half - 0.09, lift + wall] as const,
      ],
    };
  });
  builder.loft({
    stations,
    paint: () => ({ colour: "#e9ecef", finish: "metal" }),
  });
  [-0.45, 0.45].forEach((side) => {
    builder.cylinder("paint", plasticBlue, {
      radius: 0.05,
      length: findChuteHeight(chuteEnd - 0.4),
      at: [
        x + side * 0.7,
        findChuteHeight(chuteEnd - 0.4) / 2,
        z + chuteEnd - 0.4,
      ],
      segments: 8,
    });
  });
  builder.roundedBox("matte", rubberTile, [2.6, 0.06, 7.2], 0.03, [
    x,
    0.03,
    z - 1.2,
  ]);
};

const slideRide = (progress: number): LocalSpot => {
  const { x, z } = slideAt;
  const deckBack = z + chuteStart - 1.1;
  if (progress < 0.42) {
    const share = progress / 0.42;
    return {
      x,
      y: share * deckHeight,
      z:
        z +
        ladderFoot -
        0.25 +
        (deckBack + 0.25 - (z + ladderFoot - 0.25)) * share,
      heading: 0,
    };
  }
  if (progress < 0.55) {
    const share = (progress - 0.42) / 0.13;
    return {
      x,
      y: deckHeight + 0.05,
      z: deckBack + 0.25 + (z + chuteStart - (deckBack + 0.25)) * share,
      heading: 0,
    };
  }
  const share = ((progress - 0.55) / 0.45) ** 1.6;
  const along = chuteStart + (chuteEnd + 0.5 - chuteStart) * share;
  return {
    x,
    y:
      along > chuteEnd
        ? Math.max(0, chuteBottom * (1 - (along - chuteEnd) / 0.5))
        : findChuteHeight(along) + 0.02,
    z: z + along,
    heading: 0,
  };
};

/* The roundabout */

const roundaboutAt = { x: -4, z: 3.6 };
const roundaboutPivot: Triple = [roundaboutAt.x, 0.12, roundaboutAt.z];
const roundaboutMotion: Motion = { kind: "spin", axis: "y", speed: 1.1 };

const buildRoundaboutBase = (builder: AttractionBuilder) => {
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.18,
    length: 0.18,
    at: [roundaboutAt.x, 0.06, roundaboutAt.z],
    segments: 16,
  });
  builder.cylinder("matte", rubberTile, {
    radius: 2.1,
    length: 0.05,
    at: [roundaboutAt.x, 0.025, roundaboutAt.z],
    segments: 40,
  });
};

const buildRoundabout = (builder: AttractionBuilder) => {
  builder.cylinder("paint", plasticRed, {
    radius: 1.25,
    length: 0.08,
    at: [0, 0.04, 0],
    segments: 40,
  });
  builder.cylinder("metal", palette.steel, {
    radius: 1.27,
    length: 0.06,
    at: [0, 0.04, 0],
    segments: 40,
    isOpen: true,
  });
  const quarters = 4;
  for (let quarter = 0; quarter < quarters; quarter++) {
    const angle = (quarter / quarters) * Math.PI * 2 + Math.PI / 4;
    builder.box(
      "paint",
      quarter % 2 === 0 ? plasticYellow : plasticBlue,
      [0.08, 0.012, 2.4],
      [0, 0.085, 0],
      [0, angle, 0],
    );
    const tip: Triple = [Math.sin(angle) * 1.05, 0.08, Math.cos(angle) * 1.05];
    builder.bar(
      "metal",
      palette.steel,
      [0, 0.95, 0],
      [tip[0], 0.9, tip[2]],
      0.045,
    );
    builder.bar("metal", palette.steel, [tip[0], 0.9, tip[2]], tip, 0.045);
  }
  builder.cylinder("metal", palette.steel, {
    radius: 0.06,
    length: 0.95,
    at: [0, 0.5, 0],
    segments: 10,
  });
  builder.sphere("paint", plasticYellow, 0.11, [0, 1.0, 0], [1, 1, 1], 12);
};

const roundaboutRide = (progress: number, seconds: number): LocalSpot => {
  const pose = findMotionPose(roundaboutMotion, seconds);
  const seat: Triple = [roundaboutAt.x + 0.8, 0.12 + 0.08, roundaboutAt.z];
  const [x, y, z] = moveWithPose(roundaboutPivot, seat, pose);
  const share = Math.min(1, progress * 8, (1 - progress) * 8);
  const outside = { x: roundaboutAt.x + 1.75, z: roundaboutAt.z };
  return {
    x: outside.x + (x - outside.x) * share,
    y: y * share,
    z: outside.z + (z - outside.z) * share,
    heading: pose.rotation[1] + Math.PI,
  };
};

/* The climbing dome */

const domeAt = { x: 4.3, z: 3.9 };
const domeRadius = 1.55;

const buildClimbingDome = (builder: AttractionBuilder) => {
  const shell = new IcosahedronGeometry(domeRadius, builder.isFar ? 1 : 2);
  const barSides = builder.isFar ? 3 : 4;
  const positions = shell.getAttribute("position");
  const seen = new Set<string>();
  const corner = new Vector3();
  const other = new Vector3();
  for (let index = 0; index < positions.count; index += 3) {
    for (let edge = 0; edge < 3; edge++) {
      corner.fromBufferAttribute(positions, index + edge);
      other.fromBufferAttribute(positions, index + ((edge + 1) % 3));
      if (corner.y < -0.05 || other.y < -0.05) {
        continue;
      }
      const key = [corner, other]
        .map(
          (point) =>
            `${point.x.toFixed(2)},${point.y.toFixed(2)},${point.z.toFixed(2)}`,
        )
        .toSorted()
        .join("|");
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const level = (corner.y + other.y) / 2 / domeRadius;
      builder.bar(
        "paint",
        level > 0.66 ? plasticRed : level > 0.33 ? plasticYellow : plasticBlue,
        [domeAt.x + corner.x, Math.max(0, corner.y), domeAt.z + corner.z],
        [domeAt.x + other.x, Math.max(0, other.y), domeAt.z + other.z],
        0.055,
        barSides,
      );
    }
  }
  shell.dispose();
  builder.cylinder("matte", rubberTile, {
    radius: domeRadius + 0.9,
    length: 0.05,
    at: [domeAt.x, 0.025, domeAt.z],
    segments: 36,
  });
};

const domeRide = (progress: number): LocalSpot => {
  const angle = -Math.PI / 2 + progress * Math.PI;
  const lift = Math.sin(progress * Math.PI);
  const reach = domeRadius + 0.35 - lift * (domeRadius + 0.35);
  return {
    x: domeAt.x + Math.sin(angle) * reach,
    y: lift * (domeRadius - 0.05),
    z: domeAt.z + Math.cos(angle) * reach * 0.4,
    heading: progress < 0.5 ? Math.PI / 2 : Math.PI / 2,
  };
};

/* The park round it */

const buildPark = (builder: AttractionBuilder) => {
  builder.cylinder("matte", safetySurface, {
    radius: 7.6,
    length: 0.04,
    at: [0, 0.02, 0],
    segments: builder.segments(48, 24),
  });
  builder.box("matte", palette.path, [1.6, 0.05, 2.2], [0, 0.025, 7.9]);
  const corners = 24;
  const fenceRadius = 8.2;
  for (let side = 0; side < corners; side++) {
    const from = (side / corners) * Math.PI * 2;
    const to = ((side + 1) / corners) * Math.PI * 2;
    const middle = (from + to) / 2;
    if (Math.abs(Math.atan2(Math.sin(middle), Math.cos(middle))) < 0.13) {
      continue;
    }
    addFence(
      builder,
      { x: Math.sin(from) * fenceRadius, z: Math.cos(from) * fenceRadius },
      { x: Math.sin(to) * fenceRadius, z: Math.cos(to) * fenceRadius },
      { colour: "#2b5a2f", height: 0.6, spacing: 0.24, isPicket: false },
    );
  }
  [-0.85, 0.85].forEach((side) => {
    builder.cylinder("paint", "#2b5a2f", {
      radius: 0.07,
      length: 0.85,
      at: [side, 0.42, fenceRadius],
      segments: 10,
    });
    builder.sphere("metal", palette.brass, 0.07, [side, 0.88, fenceRadius]);
  });
  addBench(builder, [-1.9, 0, 6.4], Math.PI);
  addBench(builder, [1.9, 0, 6.4], Math.PI);
  addBench(builder, [-7.1, 0, -0.4], Math.PI / 2);
  addLampPost(builder, [-1.1, 0, 7.6]);
  addLampPost(builder, [1.1, 0, 7.6]);
  addTree(builder, [-6.6, 0, -5.4], 1.25);
  addTree(builder, [6.4, 0, -5.6], 1.1, "#4a9440");
  addBush(builder, [-6.9, 0, 3.6], 0.55);
  addBush(builder, [6.9, 0, 4.6], 0.5, "#3a7d34");
  addBush(builder, [3.2, 0, 7.3], 0.45);
  builder.cylinder("paint", "#2b5a2f", {
    radius: 0.24,
    radiusEnd: 0.2,
    length: 0.7,
    at: [2.6, 0.35, 6.9],
    segments: 14,
  });
  addSignBoard(builder, [-2.4, 0, 8.6], frameGreen);
};

export const playgroundModel: AttractionModel = {
  kind: "playground",
  name: "Playground",
  fact: "Have a go on the swings, the slide, the roundabout and the climbing dome! A swing is a pendulum: each push makes it swing higher, and the pull of gravity brings it back down.",
  curriculumLink:
    "Science, Year 3: forces. Pushes, pulls and gravity on the swings and the slide.",
  footprint: 10,
  setting: "inland",
  signSpot: { x: -2.4, z: 9.6 },
  build: (builder) => {
    buildPark(builder);
    buildSwingFrame(builder);
    buildSlide(builder);
    buildRoundaboutBase(builder);
    buildClimbingDome(builder);
  },
  moving: [
    ...swingSeats.map((_, seat) => ({
      name: `swing-seat-${String(seat)}`,
      pivot: swingPivot(seat),
      build: buildSwingSeat,
      motion: swingMotion(seat),
    })),
    {
      name: "roundabout",
      pivot: roundaboutPivot,
      build: buildRoundabout,
      motion: roundaboutMotion,
    },
  ],
  blockers: [
    { x: swingsAt.x - 1.85, z: swingsAt.z, radius: 0.45 },
    { x: swingsAt.x + 1.85, z: swingsAt.z, radius: 0.45 },
    { x: slideAt.x, z: slideAt.z + chuteStart - 0.55, radius: 0.85 },
    { x: roundaboutAt.x, z: roundaboutAt.z, radius: 1.3 },
    { x: domeAt.x, z: domeAt.z, radius: domeRadius + 0.1 },
  ],
  rides: [
    {
      id: "swings",
      name: "the swings",
      start: { x: swingsAt.x + swingSeats[0], z: swingsAt.z + 0.9 },
      reach: 0.55,
      seconds: 8,
      finish: { x: swingsAt.x + swingSeats[0], z: swingsAt.z + 2.2 },
      follow: (progress, seconds) => {
        const pivot = swingPivot(0);
        const seat: Triple = [pivot[0], pivot[1] - seatDrop + 0.05, pivot[2]];
        const [x, y, z] = moveWithPose(
          pivot,
          seat,
          findMotionPose(swingMotion(0), seconds),
        );
        const share = Math.min(1, progress * 10, (1 - progress) * 10);
        const outside = { x: pivot[0], y: 0, z: pivot[2] + 0.9 };
        return {
          x: outside.x + (x - outside.x) * share,
          y: outside.y + (y - outside.y) * share,
          z: outside.z + (z - outside.z) * share,
          heading: 0,
        };
      },
    },
    {
      id: "slide",
      name: "the slide",
      start: { x: slideAt.x, z: slideAt.z + ladderFoot - 0.25 },
      reach: 0.55,
      seconds: 6,
      finish: { x: slideAt.x, z: slideAt.z + chuteEnd + 0.9 },
      follow: slideRide,
    },
    {
      id: "roundabout",
      name: "the roundabout",
      start: { x: roundaboutAt.x + 1.75, z: roundaboutAt.z },
      reach: 0.5,
      seconds: 9,
      finish: { x: roundaboutAt.x + 1.9, z: roundaboutAt.z + 1.2 },
      follow: roundaboutRide,
    },
    {
      id: "climbing-dome",
      name: "the climbing dome",
      start: { x: domeAt.x - domeRadius - 0.35, z: domeAt.z },
      reach: 0.5,
      seconds: 7,
      finish: { x: domeAt.x + domeRadius + 0.6, z: domeAt.z },
      follow: domeRide,
    },
  ],
};
