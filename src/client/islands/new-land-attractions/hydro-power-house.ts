import {
  addDoor,
  addGableRoof,
  addSignBoard,
  addWindow,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const concrete = "#b9b4a8";
const darkConcrete = "#8f8a7f";
const earth = "#6b5a3a";
const rockGrey = "#7d776c";
const leafDeep = "#256b2a";
const leafMid = "#2f8a35";
const leafBright = "#4fa83c";
const brick = "#b4583e";
const darkBrick = "#8a3f2c";
const roofGreen = "#2f6b4a";
const pipeBlue = "#3f6f86";
const wheelWood = "#8a5a35";
const darkWood = "#5a3a22";
const plank = "#b48d5f";
const gateYellow = "#f2c230";
const foam = "#e8f6fb";
const signColour = "#1f6f8b";

/* The dam and the reservoir behind it */

const dam = { front: -5.1, back: -5.9, half: 4.8, top: 3.3 };
const reservoir = { half: 4.6, back: -8.6, level: 2.86 };
const spillHalf = 0.75;
const chute = { topZ: dam.front, footZ: -3.9, foot: 0.15 };

/** How high the spillway's floor is at a point along it. */
const chuteHeightAt = (z: number): number => {
  const share = Math.min(
    1,
    Math.max(0, (chute.footZ - z) / (chute.footZ - chute.topZ)),
  );
  return chute.foot + (dam.top - 0.1 - chute.foot) * share * share;
};

const buildReservoir = (builder: AttractionBuilder) => {
  const depth = dam.back - reservoir.back;
  builder.box(
    "matte",
    earth,
    [reservoir.half * 2, reservoir.level - 0.05, depth],
    [0, (reservoir.level - 0.05) / 2, (dam.back + reservoir.back) / 2],
  );
  builder.box(
    "water",
    palette.water,
    [reservoir.half * 2 - 0.2, 0.04, depth - 0.2],
    [0, reservoir.level, (dam.back + reservoir.back) / 2],
  );
  /* Grassy, rocky banks round the reservoir */
  const banks: [number, number, number, number][] = [
    [-4.4, -7.0, 0.9, 0],
    [-4.0, -8.3, 0.8, 1],
    [-2.2, -8.6, 0.85, 2],
    [0.2, -8.7, 0.8, 0],
    [2.4, -8.5, 0.85, 1],
    [4.1, -8.1, 0.8, 2],
    [4.5, -6.8, 0.9, 0],
  ];
  (builder.isFar ? banks.filter((_, index) => index % 2 === 0) : banks).forEach(
    ([x, z, radius, colour]) => {
      builder.sphere(
        "matte",
        [leafMid, leafDeep, rockGrey][colour],
        radius,
        [x, reservoir.level + 0.1, z],
        [1.3, 0.55, 1],
        builder.isFar ? 8 : 9,
      );
    },
  );
};

const buildDam = (builder: AttractionBuilder) => {
  const width = dam.half * 2;
  const thick = dam.front - dam.back;
  /* Two walls, either side of the spillway */
  [-1, 1].forEach((side) => {
    const inner = spillHalf + 0.12;
    const span = dam.half - inner;
    builder.box(
      "matte",
      concrete,
      [span, dam.top, thick],
      [side * (inner + span / 2), dam.top / 2, (dam.front + dam.back) / 2],
    );
  });
  builder.box(
    "matte",
    darkConcrete,
    [spillHalf * 2 + 0.24, dam.top - 0.12, thick],
    [0, (dam.top - 0.12) / 2, (dam.front + dam.back) / 2],
  );
  builder.box(
    "matte",
    shade(concrete, 1.06),
    [width + 0.3, 0.14, thick + 0.3],
    [0, dam.top + 0.07, (dam.front + dam.back) / 2],
  );
  /* Buttresses down the front */
  const ribs = [-4.2, -3.0, -1.6, 1.6, 3.0, 4.2];
  ribs.forEach((x) => {
    if (x > 0.9 && x < 4.7) {
      return;
    }
    builder.box(
      "matte",
      darkConcrete,
      [0.26, dam.top, 0.3],
      [x, dam.top / 2, dam.front + 0.12],
    );
  });
  if (!builder.isFar) {
    /* Stains and lines in the concrete */
    [0.9, 1.9, 2.8].forEach((height) => {
      [-1, 1].forEach((side) => {
        builder.box(
          "matte",
          shade(concrete, 0.9),
          [dam.half - spillHalf - 0.3, 0.04, 0.02],
          [
            side * ((dam.half + spillHalf) / 2 + 0.05),
            height,
            dam.front + 0.01,
          ],
        );
      });
    });
    /* A railing along the top */
    /* Left open over the spillway and at the top of the steps */
    const runs: [number, number][] = [
      [-dam.half, -spillHalf - 0.15],
      [stairs.topX + 0.35, dam.half],
    ];
    runs.forEach(([from, to]) => {
      const posts = Math.max(2, Math.round((to - from) / 0.8) + 1);
      for (let post = 0; post < posts; post++) {
        const x = from + (post / (posts - 1)) * (to - from);
        builder.box(
          "metal",
          gateYellow,
          [0.05, 0.7, 0.05],
          [x, dam.top + 0.49, dam.front - 0.06],
        );
      }
      [0.45, 0.82].forEach((height) => {
        builder.box(
          "metal",
          gateYellow,
          [to - from, 0.04, 0.04],
          [(from + to) / 2, dam.top + 0.14 + height, dam.front - 0.06],
        );
      });
    });
    /* A big painted lightning bolt, for electricity */
    const bolt: [number, number, number, number][] = [
      [-3.0, 2.55, 0.45, -0.5],
      [-2.85, 2.05, 0.6, 0.9],
      [-2.75, 1.55, 0.45, -0.5],
    ];
    bolt.forEach(([x, y, length, tilt]) => {
      builder.box(
        "paint",
        gateYellow,
        [0.14, length, 0.02],
        [x, y, dam.front + 0.02],
        [0, 0, tilt],
      );
    });
  }
};

const buildSpillway = (builder: AttractionBuilder) => {
  const steps = builder.segments(14, 6);
  const stations = Array.from({ length: steps + 1 }, (_, step) => {
    const z = chute.topZ + ((chute.footZ - chute.topZ) * step) / steps;
    const floor = chuteHeightAt(z);
    return {
      z,
      points: [
        [-spillHalf - 0.12, floor + 0.32] as const,
        [-spillHalf, floor + 0.32] as const,
        [-spillHalf, floor] as const,
        [spillHalf, floor] as const,
        [spillHalf, floor + 0.32] as const,
        [spillHalf + 0.12, floor + 0.32] as const,
        [spillHalf + 0.12, floor - 0.12] as const,
        [-spillHalf - 0.12, floor - 0.12] as const,
      ],
    };
  });
  builder.loft({
    stations,
    paint: () => ({ colour: concrete, finish: "matte" }),
  });
  const water = Array.from({ length: steps + 1 }, (_, step) => {
    const z = chute.topZ + ((chute.footZ - chute.topZ) * step) / steps;
    const floor = chuteHeightAt(z) + 0.05;
    return {
      z,
      points: [
        [-spillHalf + 0.02, floor + 0.02] as const,
        [spillHalf - 0.02, floor + 0.02] as const,
        [spillHalf - 0.02, floor] as const,
        [-spillHalf + 0.02, floor] as const,
      ],
    };
  });
  builder.loft({
    stations: water,
    paint: () => ({ colour: "#7cc7e0", finish: "water" }),
  });
};

/* The sluice gate's frame and wheel, on top of the dam */

const gatePivot: Triple = [0, dam.top + 0.1, dam.front - 0.35];

const buildGateFrame = (builder: AttractionBuilder) => {
  [-1, 1].forEach((side) => {
    builder.box(
      "metal",
      palette.darkSteel,
      [0.16, 1.9, 0.2],
      [side * (spillHalf + 0.1), dam.top + 0.95, gatePivot[2]],
    );
  });
  builder.box(
    "metal",
    palette.darkSteel,
    [spillHalf * 2 + 0.4, 0.18, 0.24],
    [0, dam.top + 1.95, gatePivot[2]],
  );
  builder.torus(
    "metal",
    "#c8302a",
    0.32,
    0.04,
    [0, dam.top + 2.4, gatePivot[2] + 0.05],
    "z",
    builder.isFar ? 10 : 20,
  );
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.05,
    length: 0.5,
    at: [0, dam.top + 2.15, gatePivot[2]],
    segments: 6,
  });
  if (!builder.isFar) {
    [0, 1, 2].forEach((spoke) => {
      builder.box(
        "metal",
        "#c8302a",
        [0.6, 0.04, 0.03],
        [0, dam.top + 2.4, gatePivot[2] + 0.05],
        [0, 0, (spoke / 3) * Math.PI],
      );
    });
  }
};

const buildGate = (builder: AttractionBuilder) => {
  builder.box(
    "metal",
    gateYellow,
    [spillHalf * 2 + 0.1, 0.9, 0.1],
    [0, 0.45, 0],
  );
  if (!builder.isFar) {
    [0.2, 0.45, 0.7].forEach((height) => {
      builder.box(
        "metal",
        shade(gateYellow, 0.8),
        [spillHalf * 2 + 0.1, 0.06, 0.14],
        [0, height, 0],
      );
    });
  }
  builder.cylinder("metal", palette.steel, {
    radius: 0.035,
    length: 1.1,
    at: [0, 1.4, 0],
    segments: 6,
  });
};

/* The steps up the dam */

const stairs = { bottomX: 4.55, topX: 1.15, front: -4.3, steps: 11 };

const buildStairs = (builder: AttractionBuilder) => {
  const run = (stairs.bottomX - stairs.topX) / stairs.steps;
  const depth = stairs.front - dam.front;
  for (let step = 0; step < stairs.steps; step++) {
    const top = ((step + 1) / stairs.steps) * dam.top;
    builder.box(
      "matte",
      step % 2 === 0 ? concrete : shade(concrete, 0.95),
      [run + 0.01, top, depth],
      [
        stairs.bottomX - run * (step + 0.5),
        top / 2,
        (stairs.front + dam.front) / 2,
      ],
    );
  }
  builder.bar(
    "metal",
    gateYellow,
    [stairs.bottomX, 0.9, stairs.front - 0.05],
    [stairs.topX, dam.top + 0.9, stairs.front - 0.05],
    0.05,
    6,
  );
  if (!builder.isFar) {
    for (let post = 0; post <= 4; post++) {
      const share = post / 4;
      const x = stairs.bottomX + (stairs.topX - stairs.bottomX) * share;
      const y = share * dam.top;
      builder.box(
        "metal",
        gateYellow,
        [0.05, 0.9, 0.05],
        [x, y + 0.45, stairs.front - 0.05],
      );
    }
  }
};

/* The plunge pool, the river and its bridge */

const pool = { half: 2.2, back: -5.0, front: -2.6 };
const riverPoints: [number, number][] = [
  [1.6, -3.0],
  [3.4, -0.6],
  [4.6, 2.2],
  [5.6, 5.0],
  [6.3, 7.2],
];

const buildPoolAndRiver = (builder: AttractionBuilder) => {
  builder.box(
    "water",
    palette.water,
    [pool.half * 2, 0.04, pool.front - pool.back],
    [0, 0.04, (pool.back + pool.front) / 2],
  );
  for (let index = 1; index < riverPoints.length; index++) {
    const [fromX, fromZ] = riverPoints[index - 1];
    const [toX, toZ] = riverPoints[index];
    const length = Math.hypot(toX - fromX, toZ - fromZ);
    const heading = Math.atan2(toX - fromX, toZ - fromZ);
    builder.box(
      "water",
      palette.water,
      [1.5, 0.04, length + 0.6],
      [(fromX + toX) / 2, 0.04, (fromZ + toZ) / 2],
      [0, heading, 0],
    );
    if (!builder.isFar) {
      [-1, 1].forEach((side) => {
        [0.2, 0.7].forEach((share, stone) => {
          builder.sphere(
            "matte",
            (index + stone) % 2 === 0 ? palette.stone : rockGrey,
            0.16 + stone * 0.04,
            [
              fromX + (toX - fromX) * share + Math.cos(heading) * side * 0.85,
              0.06,
              fromZ + (toZ - fromZ) * share - Math.sin(heading) * side * 0.85,
            ],
            [1.2, 0.6, 1],
            6,
          );
        });
      });
    }
  }
  /* A low stone kerb round the pool */
  builder.box(
    "matte",
    palette.stone,
    [pool.half * 2 + 0.3, 0.16, 0.2],
    [-0.35, 0.08, pool.front + 0.05],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      palette.stone,
      [0.2, 0.16, pool.front - pool.back],
      [side * (pool.half + 0.05), 0.08, (pool.back + pool.front) / 2],
    );
  });
  if (!builder.isFar) {
    /* White water where the spillway lands */
    [
      [-0.4, -3.6, 0.32],
      [0.35, -3.5, 0.28],
      [0, -3.2, 0.36],
    ].forEach(([x, z, radius]) => {
      builder.sphere("water", foam, radius, [x, 0.07, z], [1.3, 0.3, 1], 8);
    });
    /* Reeds along the river */
    const reeds: [number, number][] = [
      [2.5, -2.4],
      [2.1, 0.3],
      [6.3, 3.4],
      [4.4, 5.5],
    ];
    reeds.forEach(([x, z]) => {
      for (let reed = 0; reed < 4; reed++) {
        builder.bar(
          "matte",
          reed % 2 === 0 ? "#6f8f3a" : "#86a84a",
          [x + reed * 0.08, 0, z],
          [x + reed * 0.12 - 0.1, 0.8 + (reed % 3) * 0.15, z + 0.05],
          0.035,
          4,
        );
      }
      builder.cylinder("matte", "#6b4a2a", {
        radius: 0.045,
        length: 0.2,
        at: [x + 0.16, 0.9, z + 0.04],
        segments: 6,
      });
    });
  }
};

const bridge = { x: 4.0, z: 0.8, half: 1.6, halfWidth: 0.78, rise: 0.38 };
const riverHeading = Math.atan2(4.6 - 3.4, 2.2 - -0.6);
const across = { x: Math.cos(riverHeading), z: -Math.sin(riverHeading) };
const along = { x: Math.sin(riverHeading), z: Math.cos(riverHeading) };

const bridgeHeightAt = (u: number): number =>
  0.1 + bridge.rise * (1 - (u / bridge.half) ** 2);

const toBridge = (x: number, z: number) => ({
  u: (x - bridge.x) * across.x + (z - bridge.z) * across.z,
  v: (x - bridge.x) * along.x + (z - bridge.z) * along.z,
});

const onBridge = (u: number, v: number, lift: number): Triple => [
  bridge.x + across.x * u + along.x * v,
  lift,
  bridge.z + across.z * u + along.z * v,
];

const buildBridge = (builder: AttractionBuilder) => {
  const planks = builder.isFar ? 4 : 12;
  for (let plankIndex = 0; plankIndex < planks; plankIndex++) {
    const u = -bridge.half + ((plankIndex + 0.5) / planks) * bridge.half * 2;
    const next = u + (bridge.half * 2) / planks;
    const slope = Math.atan2(
      bridgeHeightAt(next) - bridgeHeightAt(u),
      next - u,
    );
    builder.box(
      "matte",
      plankIndex % 2 === 0 ? plank : shade(plank, 0.92),
      [(bridge.half * 2) / planks + 0.01, 0.08, bridge.halfWidth * 2],
      onBridge(u, 0, bridgeHeightAt(u) - 0.04),
      [0, riverHeading, slope],
    );
  }
  [-1, 1].forEach((side) => {
    const v = side * (bridge.halfWidth - 0.04);
    const posts = builder.isFar ? 2 : 5;
    for (let post = 0; post < posts; post++) {
      const u =
        -bridge.half + 0.1 + (post / (posts - 1)) * (bridge.half * 2 - 0.2);
      const base = bridgeHeightAt(u);
      builder.box(
        "matte",
        darkWood,
        [0.08, 0.9, 0.08],
        onBridge(u, v, base + 0.45),
        [0, riverHeading, 0],
      );
    }
    const rails = builder.isFar ? 1 : 6;
    for (let rail = 0; rail < rails; rail++) {
      const from =
        -bridge.half + 0.1 + (rail / rails) * (bridge.half * 2 - 0.2);
      const to =
        -bridge.half + 0.1 + ((rail + 1) / rails) * (bridge.half * 2 - 0.2);
      builder.bar(
        "matte",
        darkWood,
        onBridge(from, v, bridgeHeightAt(from) + 0.88),
        onBridge(to, v, bridgeHeightAt(to) + 0.88),
        0.07,
        5,
      );
    }
  });
};

/* The power house, its penstock and its waterwheel */

const house = { x: -4.2, z: -0.2, halfX: 1.7, halfZ: 1.3, wall: 2.4 };
const wheel = {
  x: house.x + house.halfX + 0.45,
  y: 1.2,
  z: house.z - 0.1,
  radius: 1.05,
};

const buildPowerHouse = (builder: AttractionBuilder) => {
  const { x, z, halfX, halfZ, wall } = house;
  builder.box("matte", brick, [halfX * 2, wall, halfZ * 2], [x, wall / 2, z]);
  builder.box(
    "matte",
    darkConcrete,
    [halfX * 2 + 0.12, 0.3, halfZ * 2 + 0.12],
    [x, 0.15, z],
  );
  if (!builder.isFar) {
    /* Stone corners and a band of dark brick */
    [-1, 1].forEach((sx) => {
      [-1, 1].forEach((sz) => {
        for (let block = 0; block < 5; block++) {
          builder.box(
            "matte",
            palette.cream,
            [0.18, 0.22, 0.18],
            [
              x + sx * (halfX - 0.04),
              0.45 + block * 0.42,
              z + sz * (halfZ - 0.04),
            ],
          );
        }
      });
    });
    builder.box(
      "matte",
      darkBrick,
      [halfX * 2 + 0.04, 0.12, halfZ * 2 + 0.04],
      [x, wall - 0.3, z],
    );
  }
  addGableRoof(builder, {
    width: halfX * 2,
    depth: halfZ * 2,
    rise: 0.9,
    at: [x, wall, z],
    colour: roofGreen,
    finish: "paint",
  });
  /* The gable ends */
  [-1, 1].forEach((side) => {
    builder.lathe(
      "matte",
      brick,
      [
        [0, 0.9],
        [halfZ * 1.414, 0],
        [0, 0],
      ],
      [x + side * (halfX - 0.02), wall, z],
      "y",
      4,
    );
  });
  /* A louvred lantern on the ridge */
  builder.box("paint", palette.cream, [0.6, 0.45, 0.6], [x, wall + 1.05, z]);
  builder.cylinder("paint", roofGreen, {
    radius: 0.55,
    radiusEnd: 0.02,
    length: 0.35,
    at: [x, wall + 1.45, z],
    segments: 4,
  });
  /* The front: big arched windows, lit, and double doors */
  addDoor(builder, {
    at: [x, 0.3, z + halfZ + 0.01],
    width: 0.8,
    height: 1.3,
    colour: "#2f5f7a",
    frame: palette.cream,
  });
  [-1, 1].forEach((side) => {
    addWindow(builder, {
      at: [x + side * 1.05, 1.35, z + halfZ + 0.01],
      width: 0.6,
      height: 1.0,
      frame: palette.cream,
      isLit: true,
    });
    if (!builder.isFar) {
      builder.cylinder("paint", palette.cream, {
        radius: 0.34,
        length: 0.07,
        at: [x + side * 1.05, 1.86, z + halfZ + 0.03],
        axis: "z",
        segments: 10,
      });
    }
  });
  /* The name board over the door: a lightning bolt on blue */
  builder.box(
    "paint",
    signColour,
    [1.6, 0.32, 0.05],
    [x, 2.05, z + halfZ + 0.03],
  );
  if (!builder.isFar) {
    builder.box(
      "paint",
      gateYellow,
      [0.08, 0.26, 0.02],
      [x - 0.03, 2.05, z + halfZ + 0.06],
      [0, 0, 0.5],
    );
    builder.box(
      "paint",
      palette.cream,
      [1.1, 0.06, 0.02],
      [x + 0.1, 2.05, z + halfZ + 0.06],
    );
  }
};

const buildPenstock = (builder: AttractionBuilder) => {
  const from: Triple = [house.x + 0.6, 2.5, dam.back + 0.4];
  const to: Triple = [house.x + 0.6, 1.0, house.z - house.halfZ];
  builder.bar("metal", pipeBlue, from, to, 0.5, 14);
  if (!builder.isFar) {
    [0.15, 0.4, 0.65, 0.9].forEach((share) => {
      const at: Triple = [
        from[0],
        from[1] + (to[1] - from[1]) * share,
        from[2] + (to[2] - from[2]) * share,
      ];
      builder.bar(
        "metal",
        shade(pipeBlue, 0.75),
        [at[0], at[1] - 0.012, at[2] - 0.05],
        [at[0], at[1] + 0.012, at[2] + 0.05],
        0.6,
        14,
      );
    });
  }
  [0.3, 0.7].forEach((share) => {
    const y = from[1] + (to[1] - from[1]) * share;
    builder.box(
      "matte",
      darkConcrete,
      [0.7, y - 0.2, 0.4],
      [from[0], (y - 0.2) / 2, from[2] + (to[2] - from[2]) * share],
    );
  });
};

const buildWheelRace = (builder: AttractionBuilder) => {
  /* The tailrace, carrying water from under the wheel to the pool */
  builder.box(
    "water",
    palette.water,
    [0.8, 0.04, 3.5],
    [wheel.x, 0.04, (pool.front + house.z + 1.2) / 2 - 0.2],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      palette.stone,
      [0.14, 0.2, 3.5],
      [wheel.x + side * 0.47, 0.1, (pool.front + house.z + 1.2) / 2 - 0.2],
    );
  });
  /* The axle's bearing blocks, on the wall and on a post */
  builder.box(
    "matte",
    darkConcrete,
    [0.3, 0.3, 0.3],
    [wheel.x + 0.5, wheel.y - 0.2, wheel.z],
  );
  builder.box(
    "matte",
    darkConcrete,
    [0.25, wheel.y - 0.3, 0.25],
    [wheel.x + 0.5, (wheel.y - 0.3) / 2, wheel.z],
  );
  /* The flume that pours water onto the top of the wheel */
  builder.box(
    "matte",
    darkWood,
    [0.5, 0.14, 1.5],
    [wheel.x, wheel.y + wheel.radius + 0.35, wheel.z - 0.95],
  );
  builder.box(
    "water",
    "#7cc7e0",
    [0.36, 0.03, 1.5],
    [wheel.x, wheel.y + wheel.radius + 0.43, wheel.z - 0.95],
  );
  builder.box(
    "water",
    "#9fd8ea",
    [0.34, 0.5, 0.06],
    [wheel.x, wheel.y + wheel.radius + 0.18, wheel.z - 0.2],
    [0.25, 0, 0],
  );
  builder.box(
    "matte",
    darkWood,
    [0.1, wheel.y + wheel.radius + 0.3, 0.1],
    [wheel.x, (wheel.y + wheel.radius + 0.3) / 2, wheel.z - 1.6],
  );
};

const buildWaterwheel = (builder: AttractionBuilder) => {
  const { radius } = wheel;
  [-0.22, 0.22].forEach((side) => {
    builder.torus(
      "matte",
      darkWood,
      radius,
      0.06,
      [side, 0, 0],
      "x",
      builder.isFar ? 12 : 26,
    );
  });
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.12,
    length: 0.9,
    at: [0.2, 0, 0],
    axis: "x",
    segments: builder.segments(10, 6),
  });
  const spokes = builder.isFar ? 3 : 6;
  for (let spoke = 0; spoke < spokes; spoke++) {
    const angle = (spoke / spokes) * Math.PI;
    [-0.22, 0.22].forEach((side) => {
      builder.box(
        "matte",
        wheelWood,
        [0.06, radius * 2, 0.07],
        [side, 0, 0],
        [angle, 0, 0],
      );
    });
  }
  const paddles = builder.isFar ? 6 : 14;
  for (let paddle = 0; paddle < paddles; paddle++) {
    const angle = (paddle / paddles) * Math.PI * 2;
    builder.box(
      "matte",
      paddle % 2 === 0 ? wheelWood : shade(wheelWood, 1.12),
      [0.5, 0.3, 0.05],
      [0, Math.cos(angle) * (radius - 0.1), Math.sin(angle) * (radius - 0.1)],
      [-angle, 0, 0],
    );
  }
};

/* Power poles, wires and the bulbs they light */

const poles: Triple[] = [
  [-1.0, 0, 3.4],
  [1.6, 0, 5.6],
];
const wireHeight = 2.5;
const houseWire: Triple = [house.x + 0.6, 2.2, house.z + house.halfZ + 0.05];
const bulbsPivot: Triple = [0.3, wireHeight - 0.45, 4.5];

const listBulbSpots = (): Triple[] => {
  const spots: Triple[] = [];
  const runs: [Triple, Triple, number][] = [
    [houseWire, [poles[0][0], wireHeight, poles[0][2]], 4],
    [
      [poles[0][0], wireHeight, poles[0][2]],
      [poles[1][0], wireHeight, poles[1][2]],
      4,
    ],
  ];
  runs.forEach(([from, to, count]) => {
    for (let bulb = 1; bulb <= count; bulb++) {
      const share = bulb / (count + 1);
      const sag = Math.sin(share * Math.PI) * 0.25;
      spots.push([
        from[0] + (to[0] - from[0]) * share,
        from[1] + (to[1] - from[1]) * share - sag - 0.2,
        from[2] + (to[2] - from[2]) * share,
      ]);
    }
  });
  return spots;
};

const bulbColours = ["#ffd27a", "#ff8a6a", "#9fe08a", "#8ad0ff"];

const buildPolesAndWires = (builder: AttractionBuilder) => {
  poles.forEach(([x, , z]) => {
    builder.cylinder("matte", darkWood, {
      radius: 0.08,
      radiusEnd: 0.06,
      length: wireHeight + 0.4,
      at: [x, (wireHeight + 0.4) / 2, z],
      segments: 8,
    });
    builder.box(
      "matte",
      darkWood,
      [0.7, 0.08, 0.08],
      [x, wireHeight + 0.2, z],
      [0, 0.7, 0],
    );
    if (!builder.isFar) {
      [-0.25, 0.25].forEach((side) => {
        builder.cylinder("glass", "#8fd0a0", {
          radius: 0.05,
          length: 0.12,
          at: [x + side * 0.77, wireHeight + 0.3, z - side * 0.64],
          segments: 6,
        });
      });
    }
  });
  const points: Triple[] = [
    houseWire,
    [poles[0][0], wireHeight, poles[0][2]],
    [poles[1][0], wireHeight, poles[1][2]],
  ];
  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1];
    const to = points[index];
    const pieces = builder.isFar ? 1 : 4;
    for (let piece = 0; piece < pieces; piece++) {
      const lift = (share: number) =>
        from[1] + (to[1] - from[1]) * share - Math.sin(share * Math.PI) * 0.25;
      const a = piece / pieces;
      const b = (piece + 1) / pieces;
      builder.bar(
        "matte",
        palette.black,
        [
          from[0] + (to[0] - from[0]) * a,
          lift(a),
          from[2] + (to[2] - from[2]) * a,
        ],
        [
          from[0] + (to[0] - from[0]) * b,
          lift(b),
          from[2] + (to[2] - from[2]) * b,
        ],
        0.025,
        4,
      );
    }
  }
  /* The bulbs, dark until the Character comes near */
  listBulbSpots().forEach(([x, y, z]) => {
    if (builder.isFar) {
      return;
    }
    builder.bar(
      "matte",
      palette.black,
      [x, y + 0.2, z],
      [x, y + 0.08, z],
      0.02,
      4,
    );
    builder.sphere("glass", "#dfe6ea", 0.09, [x, y, z], [1, 1.2, 1], 8);
  });
};

const buildLitBulbs = (builder: AttractionBuilder) => {
  listBulbSpots().forEach(([x, y, z], index) => {
    if (builder.isFar) {
      builder.box(
        "glow",
        bulbColours[index % bulbColours.length],
        [0.18, 0.2, 0.18],
        [x - bulbsPivot[0], y - bulbsPivot[1], z - bulbsPivot[2]],
      );
      return;
    }
    builder.sphere(
      "glow",
      bulbColours[index % bulbColours.length],
      0.1,
      [x - bulbsPivot[0], y - bulbsPivot[1], z - bulbsPivot[2]],
      [1, 1.2, 1],
      8,
    );
  });
};

/* The ground: paths, trees, a bench and an information board */

const addJungleTree = (
  builder: AttractionBuilder,
  at: Triple,
  size: number,
) => {
  const [x, , z] = at;
  builder.cylinder("matte", "#5e4630", {
    radius: 0.22 * size,
    radiusEnd: 0.12 * size,
    length: 4 * size,
    at: [x, 2 * size, z],
    segments: 8,
  });
  const clumps: [number, number, number, number][] = builder.isFar
    ? [[0, 4.3, 0, 1.4]]
    : [
        [0, 4.4, 0, 1.2],
        [0.8, 4.0, 0.3, 0.9],
        [-0.7, 4.1, -0.3, 0.9],
        [0.1, 5.0, 0.2, 0.8],
      ];
  clumps.forEach(([dx, dy, dz, radius], index) => {
    builder.sphere(
      "matte",
      [leafDeep, leafMid, leafBright][index % 3],
      radius * size,
      [x + dx * size, dy * size, z + dz * size],
      [1, 0.75, 1],
      builder.isFar ? 10 : 9,
    );
  });
};

const addBanana = (builder: AttractionBuilder, at: Triple) => {
  const [x, , z] = at;
  builder.cylinder("matte", "#7a8f3a", {
    radius: 0.1,
    radiusEnd: 0.07,
    length: 1.5,
    at: [x, 0.75, z],
    segments: 6,
  });
  const leaves = builder.isFar ? 2 : 5;
  for (let leaf = 0; leaf < leaves; leaf++) {
    const angle = (leaf / leaves) * Math.PI * 2;
    builder.sphere(
      "matte",
      leaf % 2 === 0 ? leafBright : leafMid,
      0.6,
      [x + Math.sin(angle) * 0.5, 1.6, z + Math.cos(angle) * 0.5],
      [0.25, 0.06, 1],
      6,
    );
  }
};

const buildGrounds = (builder: AttractionBuilder) => {
  const path: [number, number, number][] = [
    [-1.6, 8.6, 1.3],
    [-1.8, 5.6, 1.3],
    [-3.6, 2.4, 1.3],
    [-1.8, 5.6, 1.1],
    [1.2, 3.2, 1.1],
    [2.6, 1.4, 1.1],
  ];
  for (let index = 1; index < path.length; index++) {
    if (index === 3) {
      continue;
    }
    const [fromX, fromZ, width] = path[index - 1];
    const [toX, toZ] = path[index];
    builder.box(
      "matte",
      palette.path,
      [width, 0.03, Math.hypot(toX - fromX, toZ - fromZ) + 0.5],
      [(fromX + toX) / 2, 0.015, (fromZ + toZ) / 2],
      [0, Math.atan2(toX - fromX, toZ - fromZ), 0],
    );
  }
  builder.box(
    "matte",
    palette.path,
    [1.3, 0.03, 2.2],
    [5.4, 0.015, -0.6],
    [0, riverHeading, 0],
  );
  /* A transformer, humming quietly, behind a little fence */
  const transformer: Triple = [-7.0, 0, 0.4];
  builder.box(
    "paint",
    "#4f7a5a",
    [0.9, 1.1, 0.7],
    [transformer[0], 0.55, transformer[2]],
  );
  builder.box(
    "paint",
    shade("#4f7a5a", 0.8),
    [1.0, 0.08, 0.8],
    [transformer[0], 1.14, transformer[2]],
  );
  [-0.25, 0, 0.25].forEach((side) => {
    builder.cylinder("glass", "#8fd0a0", {
      radius: 0.06,
      radiusEnd: 0.04,
      length: 0.35,
      at: [transformer[0] + side, 1.35, transformer[2]],
      segments: 6,
    });
  });
  if (!builder.isFar) {
    for (let fin = 0; fin < 5; fin++) {
      builder.box(
        "paint",
        shade("#4f7a5a", 0.85),
        [0.04, 0.8, 0.12],
        [transformer[0] - 0.47, 0.55, transformer[2] - 0.28 + fin * 0.14],
      );
    }
    /* A yellow warning sign with a black lightning bolt */
    builder.cylinder("paint", gateYellow, {
      radius: 0.2,
      length: 0.03,
      at: [transformer[0], 0.7, transformer[2] + 0.37],
      axis: "z",
      segments: 3,
    });
    builder.box(
      "paint",
      palette.black,
      [0.04, 0.18, 0.01],
      [transformer[0], 0.68, transformer[2] + 0.39],
      [0, 0, 0.4],
    );
  }
  addJungleTree(builder, [-7.0, 0, -4.4], 1);
  addJungleTree(builder, [7.0, 0, -4.2], 1.05);
  addBanana(builder, [-6.6, 0, 1.6]);
  addBanana(builder, [-6.0, 0, 3.6]);
  addBanana(builder, [7.4, 0, 2.0]);
  if (!builder.isFar) {
    /* A board about the water cycle and electricity, by the bridge */
    const board: Triple = [6.6, 0, -0.9];
    [-0.45, 0.45].forEach((side) => {
      builder.box(
        "matte",
        darkWood,
        [0.08, 1.4, 0.08],
        [board[0] + side * 0.4, 0.7, board[2] + side * 0.75],
        [0, -0.5, 0],
      );
    });
    builder.box(
      "paint",
      signColour,
      [1.15, 0.7, 0.05],
      [board[0], 1.2, board[2]],
      [0, -0.5 - Math.PI / 2 + Math.PI, 0],
    );
    builder.sphere(
      "paint",
      gateYellow,
      0.1,
      [board[0] - 0.04, 1.32, board[2] - 0.02],
      [0.3, 1, 1],
      6,
    );
    [-0.2, 0.2].forEach((side) => {
      builder.box(
        "paint",
        palette.cream,
        [0.02, 0.05, 0.3],
        [board[0] - 0.04, 1.08 + side * 0.25, board[2] + 0.1],
        [0, -0.5, 0],
      );
    });
    /* A bench looking up at the dam */
    builder.box("matte", plank, [1.2, 0.08, 0.4], [0.1, 0.42, 1.6]);
    builder.box(
      "matte",
      plank,
      [1.2, 0.3, 0.06],
      [0.1, 0.65, 1.8],
      [0.15, 0, 0],
    );
    [-0.5, 0.5].forEach((side) => {
      builder.box(
        "matte",
        darkWood,
        [0.1, 0.42, 0.36],
        [0.1 + side, 0.21, 1.6],
      );
    });
  }
};

/* Ducks on the plunge pool */

const buildDuck = (builder: AttractionBuilder) => {
  builder.sphere("matte", "#8a6a4a", 0.14, [0, 0.08, 0], [0.8, 0.6, 1.2], 8);
  builder.sphere("matte", "#2f7a4a", 0.08, [0, 0.2, 0.12], [1, 1, 1], 7);
  builder.box("paint", "#f2a23a", [0.06, 0.03, 0.08], [0, 0.19, 0.22]);
  if (!builder.isFar) {
    builder.box(
      "matte",
      "#5a4a3a",
      [0.08, 0.04, 0.08],
      [0, 0.12, -0.18],
      [0.5, 0, 0],
    );
    [-1, 1].forEach((side) => {
      builder.sphere(
        "paint",
        palette.black,
        0.015,
        [side * 0.05, 0.23, 0.17],
        [1, 1, 1],
        4,
      );
    });
  }
};

/* The ride: up the steps, along the dam and down the spillway */

const rideStart = { x: 5.0, z: -3.3 };
const rideFinish = { x: -0.6, z: -1.3 };
const climb: Triple[] = [
  [rideStart.x, 0, rideStart.z],
  [stairs.bottomX + 0.3, 0, (stairs.front + dam.front) / 2],
  [stairs.topX, dam.top, (stairs.front + dam.front) / 2],
  [0.9, dam.top + 0.14, dam.front - 0.45],
  [0, dam.top + 0.14, dam.front - 0.45],
  [0, chuteHeightAt(chute.topZ) + 0.05, chute.topZ + 0.05],
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
        heading: Math.atan2(toX - fromX, toZ - fromZ),
      };
    }
    left -= lengths[index];
  }
  const [x, y, z] = points[points.length - 1];
  return { x, y, z, heading: 0 };
};

const climbShare = 0.6;

const spillwayRide = (progress: number): LocalSpot => {
  if (progress < climbShare) {
    return followPoints(climb, progress / climbShare);
  }
  const share = ((progress - climbShare) / (1 - climbShare)) ** 1.4;
  const slideEnd = 0.55;
  if (share < slideEnd) {
    const z = chute.topZ + (chute.footZ - chute.topZ) * (share / slideEnd);
    return { x: 0, y: chuteHeightAt(z) + 0.05, z, heading: 0 };
  }
  const glide = (share - slideEnd) / (1 - slideEnd);
  return {
    x: rideFinish.x * glide,
    y: chute.foot * (1 - glide),
    z: chute.footZ + (rideFinish.z - chute.footZ) * glide,
    heading: Math.atan2(rideFinish.x, rideFinish.z - chute.footZ),
  };
};

const bridgeDeck: Deck = ({ x, z }) => {
  const { u, v } = toBridge(x, z);
  return Math.abs(u) <= bridge.half && Math.abs(v) <= bridge.halfWidth
    ? { height: bridgeHeightAt(u), kind: "bridge" }
    : undefined;
};

const houseBlockers: LocalBlocker[] = [
  { x: house.x - 0.85, z: house.z, radius: 1.2 },
  { x: house.x + 0.85, z: house.z, radius: 1.2 },
];

export const hydroPowerHouseModel: NewLandAttractionModel = {
  kind: "hydro-power-house",
  islandId: "jungle-reach",
  name: "Hydro Power House",
  fact: "A hydroelectric power station makes electricity from moving water. Water rushing down from a dam spins a turbine or a waterwheel, which turns a generator, and the electricity travels along wires to homes and lamps. A bulb only lights up when the electricity can flow all the way round a complete circuit.",
  curriculumLink:
    "Science, Year 4: electricity. Identify common appliances that run on electricity, construct a simple series electrical circuit, and recognise that a lamp lights only in a complete loop (river water spins the generator that powers the bulbs).",
  footprint: 10,
  setting: "inland",
  signSpot: { x: -1.6, z: 8.7 },
  build: (builder) => {
    buildReservoir(builder);
    buildDam(builder);
    buildSpillway(builder);
    buildGateFrame(builder);
    buildStairs(builder);
    buildPoolAndRiver(builder);
    buildBridge(builder);
    buildPowerHouse(builder);
    buildPenstock(builder);
    buildWheelRace(builder);
    buildPolesAndWires(builder);
    buildGrounds(builder);
    addSignBoard(builder, [-1.6, 0, 8.0], signColour);
  },
  moving: [
    {
      name: "waterwheel",
      pivot: [wheel.x, wheel.y, wheel.z],
      build: buildWaterwheel,
      motion: { kind: "whirl", axis: "x", idle: 0.5, speed: 3.2, reach: 6 },
    },
    {
      name: "sluice gate",
      pivot: gatePivot,
      build: buildGate,
      motion: { kind: "rise", reach: 7, height: 1.4, period: 3 },
    },
    {
      name: "spillway splash",
      pivot: [0, 0.05, chute.footZ + 0.3],
      build: (builder) => {
        [
          [-0.4, 0, 0.32],
          [0.35, 0.1, 0.28],
          [0, -0.1, 0.4],
        ].forEach(([x, z, radius]) => {
          builder.sphere(
            "water",
            foam,
            radius,
            [x, 0.5, z],
            [1, 1.6, 1],
            builder.isFar ? 6 : 10,
          );
        });
      },
      motion: { kind: "splash", reach: 6, period: 0.9 },
    },
    {
      name: "lit bulbs",
      pivot: bulbsPivot,
      build: buildLitBulbs,
      motion: { kind: "wake", reach: 6 },
    },
  ],
  wanderers: [
    {
      name: "ducks",
      build: buildDuck,
      count: 3,
      centre: { x: 0, z: -3.6 },
      radius: 1.3,
      speed: 0.3,
      height: 0.04,
    },
  ],
  smoke: [
    {
      at: [0, 0.3, chute.footZ + 0.2],
      colour: "#f2fbff",
      puffs: 6,
      size: 0.45,
      rise: 1.4,
      spread: 0.9,
    },
  ],
  blockers: houseBlockers,
  decks: [bridgeDeck],
  rides: [
    {
      id: "spillway-slide",
      name: "the spillway slide",
      start: rideStart,
      reach: 0.6,
      seconds: 13,
      finish: rideFinish,
      follow: spillwayRide,
    },
  ],
  play: {
    label: "Open the sluice gate",
    news: "Whoosh! Water rushed down from the dam, spun the waterwheel and the generator, and lit up every bulb along the path.",
  },
};
