import {
  CylinderGeometry,
  Euler,
  Quaternion,
  TorusGeometry,
  Vector3,
} from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalPoint,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const moonGrey = "#bfc2cc";
const craterGrey = "#8e92a0";
const skirtBlue = "#2f4290";
const netBlack = "#23253a";
const padBlue = "#4a5ad0";
const rocketWhite = "#f1f2f6";
const rocketRed = "#d8453a";
const visorGold = "#e8b84a";
const balloonPurple = "#8a5ad8";
const signColour = "#33408a";

/* The bouncy moon sits inside a netted ring, entered through a rocket arch. */
const moon = { x: 0, z: -0.6 };
const moonRadius = 2.1;
const moonHeight = 0.78;
const netRadius = 2.45;
const netHeight = 2.4;
const entryGap = 0.42;
const archZ = moon.z + netRadius + 0.2;
const rocketX = 0.78;
const archTop = 2.0;
const rideStart: LocalPoint = { x: 0, z: archZ + 0.75 };
const rideFinish: LocalPoint = { x: 0.9, z: archZ + 1.55 };

/** How high the moon's skin is at a spot, or 0 off its edge. */
const moonSurfaceAt = (x: number, z: number): number => {
  const share = Math.hypot(x - moon.x, z - moon.z) / moonRadius;
  return share >= 1 ? 0 : moonHeight * Math.sqrt(1 - share * share);
};

/** Turns a shape's own `from` direction to point along the moon's skin there. */
const turnToSkin = (x: number, z: number, from: Vector3): Triple => {
  const y = moonSurfaceAt(x, z);
  const normal = new Vector3(
    (x - moon.x) / (moonRadius * moonRadius),
    y / (moonHeight * moonHeight),
    (z - moon.z) / (moonRadius * moonRadius),
  ).normalize();
  const turn = new Euler().setFromQuaternion(
    new Quaternion().setFromUnitVectors(from, normal),
  );
  return [turn.x, turn.y, turn.z];
};

const craters: readonly [number, number, number][] = [
  [0.3, -0.4, 0.42],
  [-0.9, 0.5, 0.32],
  [1.1, 0.6, 0.28],
  [-0.4, -1.4, 0.3],
  [1.3, -0.9, 0.24],
  [-1.5, -0.5, 0.26],
  [0.1, 1.3, 0.22],
  [-0.2, 0.35, 0.18],
];

const buildMoon = (builder: AttractionBuilder) => {
  builder.sphere(
    "paint",
    moonGrey,
    1,
    [moon.x, 0, moon.z],
    [moonRadius, moonHeight, moonRadius],
    builder.isFar ? 14 : 28,
  );
  if (builder.isFar) {
    return;
  }
  /* A puffy blue skirt round the bottom */
  builder.torus(
    "paint",
    skirtBlue,
    moonRadius + 0.02,
    0.16,
    [moon.x, 0.12, moon.z],
    "y",
    32,
  );
  /* Craters with raised rims and darker floors */
  craters.forEach(([dx, dz, size]) => {
    const x = moon.x + dx;
    const z = moon.z + dz;
    const y = moonSurfaceAt(x, z);
    builder.add(
      "paint",
      shade(moonGrey, 0.92),
      new TorusGeometry(size, size * 0.22, 5, 12),
      { at: [x, y, z], rotation: turnToSkin(x, z, new Vector3(0, 0, 1)) },
    );
    builder.add(
      "paint",
      craterGrey,
      new CylinderGeometry(size, size, 0.02, 12),
      {
        at: [x, y - 0.005, z],
        rotation: turnToSkin(x, z, new Vector3(0, 1, 0)),
      },
    );
  });
};

/** The top of the moon, which puffs up when someone comes near. */
const buildPuff = (builder: AttractionBuilder) => {
  builder.sphere(
    "paint",
    shade(moonGrey, 1.04),
    1,
    [0, -0.32, 0],
    [1.25, 0.42, 1.25],
    20,
  );
  [
    [0.5, 0.3, 0.16],
    [-0.45, -0.35, 0.13],
  ].forEach(([dx, dz, size]) => {
    builder.cylinder("paint", craterGrey, {
      radius: size,
      length: 0.02,
      at: [dx, 0.08, dz],
      segments: 12,
    });
  });
};

/** An arc of torus round the ring, with a gap at the front (+z). */
const ringArc = (radius: number, tube: number, segments: number) =>
  new TorusGeometry(radius, tube, 4, segments, Math.PI * 2 - entryGap * 2)
    .rotateX(-Math.PI / 2)
    .rotateY(entryGap - Math.PI / 2);

const buildNet = (builder: AttractionBuilder) => {
  const posts = 10;
  for (let post = 0; post < posts; post++) {
    const angle =
      entryGap + (post / (posts - 1)) * (Math.PI * 2 - entryGap * 2);
    const x = moon.x + Math.sin(angle) * netRadius;
    const z = moon.z + Math.cos(angle) * netRadius;
    if (builder.isFar) {
      builder.box(
        "paint",
        padBlue,
        [0.12, netHeight, 0.12],
        [x, netHeight / 2, z],
      );
    } else {
      builder.cylinder("metal", palette.steel, {
        radius: 0.04,
        length: netHeight,
        at: [x, netHeight / 2, z],
        segments: 8,
      });
      builder.cylinder("paint", padBlue, {
        radius: 0.1,
        length: 1.4,
        at: [x, 0.9, z],
        segments: 8,
      });
      builder.sphere(
        "paint",
        padBlue,
        0.07,
        [x, netHeight + 0.03, z],
        [1, 1, 1],
        6,
      );
    }
  }
  if (builder.isFar) {
    return;
  }
  [0.15, 1.3, netHeight - 0.05].forEach((height, index) => {
    builder.add(
      index === 0 ? "paint" : "matte",
      index === 0 ? padBlue : netBlack,
      ringArc(netRadius, index === 0 ? 0.08 : 0.025, 32),
      { at: [moon.x, height, moon.z] },
    );
  });
  /* The netting: fine strands between the posts */
  const strands = 28;
  for (let strand = 0; strand < strands; strand++) {
    const angle =
      entryGap + ((strand + 0.5) / strands) * (Math.PI * 2 - entryGap * 2);
    const x = moon.x + Math.sin(angle) * netRadius;
    const z = moon.z + Math.cos(angle) * netRadius;
    builder.bar(
      "matte",
      netBlack,
      [x, 0.2, z],
      [x, netHeight - 0.05, z],
      0.014,
      3,
    );
  }
};

const buildRocket = (builder: AttractionBuilder, side: number) => {
  const x = side * rocketX;
  const z = archZ;
  builder.lathe(
    "paint",
    rocketWhite,
    [
      [0, 0.25],
      [0.24, 0.25],
      [0.28, 0.6],
      [0.28, 1.9],
      [0.24, 2.3],
      [0.14, 2.65],
      [0.0, 2.9],
    ],
    [x, 0, z],
    "y",
    builder.isFar ? 8 : 18,
  );
  if (builder.isFar) {
    return;
  }
  /* A red nose and bands */
  builder.lathe(
    "paint",
    rocketRed,
    [
      [0.205, 2.4],
      [0.14, 2.65],
      [0.0, 2.92],
    ],
    [x, 0.005, z],
    "y",
    18,
  );
  [0.7, 1.75].forEach((height) => {
    builder.cylinder("paint", rocketRed, {
      radius: 0.29,
      length: 0.1,
      at: [x, height, z],
      segments: 18,
      isOpen: true,
    });
  });
  /* Three fins it stands on */
  for (let fin = 0; fin < 3; fin++) {
    const angle = (fin / 3) * Math.PI * 2 + (side > 0 ? 0.5 : -0.5);
    builder.box(
      "paint",
      rocketRed,
      [0.05, 0.75, 0.32],
      [x + Math.sin(angle) * 0.36, 0.38, z + Math.cos(angle) * 0.36],
      [0, angle, 0],
    );
  }
  /* A round porthole facing visitors */
  builder.torus(
    "metal",
    palette.steel,
    0.11,
    0.025,
    [x, 1.4, z + 0.28],
    "z",
    16,
  );
  builder.cylinder("glass", "#8fb8ff", {
    radius: 0.1,
    length: 0.02,
    at: [x, 1.4, z + 0.275],
    axis: "z",
    segments: 14,
  });
  builder.sphere("glow", "#ffe27a", 0.05, [x, 2.95, z], [1, 1, 1], 8);
};

const buildArch = (builder: AttractionBuilder) => {
  builder.add(
    "paint",
    skirtBlue,
    new TorusGeometry(
      rocketX,
      0.18,
      builder.isFar ? 5 : 10,
      builder.isFar ? 8 : 22,
      Math.PI,
    ),
    { at: [0, archTop, archZ] },
  );
  if (builder.isFar) {
    return;
  }
  /* Stars stuck on the arch */
  [-0.55, 0, 0.55].forEach((angle) => {
    builder.sphere(
      "glow",
      "#ffe27a",
      0.08,
      [
        Math.sin(angle) * rocketX,
        archTop + Math.cos(angle) * rocketX,
        archZ + 0.17,
      ],
      [1, 1, 0.4],
      6,
    );
  });
  /* A soft mat at the entrance */
  builder.box("paint", padBlue, [1.1, 0.06, 0.9], [0, 0.03, archZ - 0.1]);
};

/** An inflatable astronaut on the arch, waving. */
const buildAstronaut = (builder: AttractionBuilder) => {
  builder.sphere("paint", rocketWhite, 0.22, [0, 0.3, 0], [1, 1.15, 0.85], 12);
  builder.sphere("paint", rocketWhite, 0.17, [0, 0.66, 0], [1, 1, 1], 12);
  builder.sphere("glass", visorGold, 0.12, [0, 0.67, 0.08], [1, 0.8, 0.7], 12);
  builder.box(
    "paint",
    shade(rocketWhite, 0.9),
    [0.26, 0.3, 0.14],
    [0, 0.36, -0.2],
  );
  builder.box("paint", rocketRed, [0.1, 0.08, 0.02], [0.06, 0.4, 0.19]);
  /* One arm waving, one on its hip */
  builder.bar("paint", rocketWhite, [0.2, 0.42, 0], [0.42, 0.72, 0], 0.11, 8);
  builder.sphere(
    "paint",
    shade(rocketWhite, 0.9),
    0.07,
    [0.44, 0.76, 0],
    [1, 1, 1],
    8,
  );
  builder.bar(
    "paint",
    rocketWhite,
    [-0.2, 0.42, 0],
    [-0.32, 0.22, 0.04],
    0.11,
    8,
  );
  [-0.09, 0.09].forEach((dx) => {
    builder.bar(
      "paint",
      rocketWhite,
      [dx, 0.12, 0],
      [dx * 1.2, -0.05, 0.02],
      0.12,
      8,
    );
  });
};

/** A ringed planet balloon tethered over the back of the ring. */
const buildBalloon = (builder: AttractionBuilder) => {
  builder.bar("matte", netBlack, [0, -1.1, 0], [0, -0.3, 0], 0.01, 3);
  builder.sphere("paint", balloonPurple, 0.3, [0, 0, 0], [1, 1, 1], 16);
  builder.add(
    "paint",
    "#ffd27a",
    new TorusGeometry(0.46, 0.06, 4, 24)
      .scale(1, 1, 0.25)
      .rotateX(Math.PI / 2)
      .rotateZ(0.3),
  );
};

/** Bounces in big, slow arcs, the way astronauts jump on the Moon. */
const bounceRide = (progress: number): LocalSpot => {
  const landing = (angle: number, distance: number) => {
    const x = moon.x + Math.sin(angle) * distance;
    const z = moon.z + Math.cos(angle) * distance;
    return { x, z, y: moonSurfaceAt(x, z) };
  };
  const stops = [
    { x: rideStart.x, z: rideStart.z, y: 0 },
    landing(0.1, 1.5),
    landing(1.6, 0.9),
    landing(3.2, 1.0),
    landing(4.7, 0.9),
    landing(0, 1.3),
    { x: 0, z: archZ - 0.1, y: 0.06 },
    { x: rideFinish.x, z: rideFinish.z, y: 0 },
  ];
  const peaks = [0.4, 2.0, 2.3, 2.1, 1.9, 0.9, 0.5];
  const hops = peaks.length;
  const along = Math.min(hops - 0.0001, Math.max(0, progress) * hops);
  const hop = Math.floor(along);
  const share = along - hop;
  const from = stops[hop];
  const to = stops[hop + 1];
  return {
    x: from.x + (to.x - from.x) * share,
    y: from.y + (to.y - from.y) * share + peaks[hop] * 4 * share * (1 - share),
    z: from.z + (to.z - from.z) * share,
    heading: Math.atan2(to.x - from.x, to.z - from.z),
  };
};

export const moonBounceModel: CuriosityModel = {
  kind: "moon-bounce",
  islandId: "starfall-isle",
  name: "Moon Bounce",
  fact: "Gravity is a force that pulls things down towards the ground. The Moon is much smaller than the Earth, so its gravity is only about one sixth as strong. Astronauts on the Moon could jump much higher than on Earth and floated slowly back down, which is why they bounced along instead of walking!",
  curriculumLink:
    "Science, Year 5: forces. Explain that unsupported objects fall towards the Earth because of the force of gravity acting between the Earth and the falling object.",
  footprint: 4.4,
  setting: "inland",
  signSpot: { x: -1.9, z: 3.2 },
  build: (builder) => {
    buildMoon(builder);
    buildNet(builder);
    buildRocket(builder, -1);
    buildRocket(builder, 1);
    buildArch(builder);
    if (builder.isFar) {
      builder.sphere(
        "paint",
        rocketWhite,
        0.25,
        [0, archTop + rocketX + 0.5, archZ],
        [1, 1.4, 1],
        6,
      );
    } else {
      builder.box(
        "matte",
        palette.paving,
        [1.0, 0.03, 0.9],
        [0.4, 0.015, archZ + 1.2],
      );
    }
    addSignBoard(builder, [-1.9, 0, 3.2], signColour);
  },
  moving: [
    {
      name: "moon top",
      pivot: [moon.x, moonHeight - 0.02, moon.z],
      build: buildPuff,
      motion: { kind: "rise", reach: 6, height: 0.14, period: 0.9 },
    },
    {
      name: "astronaut",
      pivot: [0, archTop + rocketX + 0.12, archZ],
      build: buildAstronaut,
      motion: {
        kind: "nod",
        axis: "z",
        reach: 7,
        amplitude: 0.25,
        period: 1.4,
      },
    },
    {
      name: "planet balloon",
      pivot: [moon.x - 1.2, netHeight + 1.2, moon.z - 1.4],
      build: buildBalloon,
      motion: { kind: "bob", height: 0.15, period: 3.6 },
    },
  ],
  rides: [
    {
      id: "moon-bounce",
      name: "the moon bounce",
      start: rideStart,
      reach: 0.6,
      seconds: 10,
      finish: rideFinish,
      follow: bounceRide,
    },
  ],
  blockers: [
    { x: moon.x, z: moon.z, radius: netRadius + 0.1 },
    { x: -rocketX, z: archZ, radius: 0.42 },
    { x: rocketX, z: archZ, radius: 0.42 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Bounce like on the Moon",
    news: "Boing... boing... boing! You floated up high and drifted slowly down, just like an astronaut on the Moon.",
    tune: [60, 72, 64, 76, 67, 79],
  },
};
