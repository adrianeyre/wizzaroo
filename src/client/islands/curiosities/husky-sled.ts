import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  RingGeometry,
  SphereGeometry,
} from "three";
import {
  addGableRoof,
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionFinish,
  type LocalBlocker,
  type LocalSpot,
  type MovingPart,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const snowPad = "#e8eef2";
const snowWhite = "#fbfdff";
const trailSnow = "#d3dfe8";
const huskyGrey = "#6f7782";
const huskyDark = "#41464e";
const huskyWhite = "#f4f2ec";
const harnessColours: readonly string[] = [
  "#d8342c",
  "#2f7fc8",
  "#f0b62e",
  "#3f9a4a",
];
const sledTimber = "#b5824c";
const kennelRed = "#a8452f";
const signColour = "#2f6f9a";

/* The groomed loop the sled runs round: an oval about the middle */
const loop = { x: 0, z: -0.25, alongX: 3.3, alongZ: 2.45 };

/** A spot on the loop, and the way along it (heading 0 faces +z). */
const onLoop = (angle: number, out = 0): LocalSpot => {
  const dx = loop.alongX * Math.cos(angle);
  const dz = -loop.alongZ * Math.sin(angle);
  const heading = Math.atan2(dx, dz);
  return {
    x: loop.x + loop.alongX * Math.sin(angle) + Math.cos(heading) * out,
    y: 0,
    z: loop.z + loop.alongZ * Math.cos(angle) - Math.sin(heading) * out,
    heading,
  };
};

/** How far round the loop the parked sled's back stands. */
const sledAngle = -0.62;
/** The angle a distance further along the loop, near enough for short hops. */
const aheadOf = (angle: number, distance: number): number => {
  const dx = loop.alongX * Math.cos(angle);
  const dz = loop.alongZ * Math.sin(angle);
  return angle + distance / Math.hypot(dx, dz);
};
const dogAngles = [0, 1].map((pair) => aheadOf(sledAngle, 2.05 + pair * 0.85));
/* The team stands in the outer lane; the ride runs round the inner one */
const teamOut = 0.4;
const laneOut = -0.5;
const dogs = dogAngles.flatMap((angle) =>
  [-0.28, 0.28].map((out) => onLoop(angle, teamOut + out)),
);
const kennel = { x: -0.5, z: -0.9, turn: 0.35 };
const signAt: Triple = [-2.55, 0, 3.55];
const rideStart = onLoop(sledAngle - 0.2, teamOut);
const rideFinish = { x: rideStart.x - 0.95, z: rideStart.z + 0.7 };

/** A blocker over the middle of the parked sled's bed. */
const sledBlocker = (): LocalBlocker => {
  const back = onLoop(sledAngle, teamOut);
  const [x, , z] = placer(back, back.heading)(0, 0, 1.0);
  return { x, z, radius: 0.45 };
};

/** Places local points (x across, z forward) about an origin turned by heading. */
const placer =
  (origin: { x: number; z: number }, heading: number) =>
  (x: number, y: number, z: number): Triple => [
    origin.x + x * Math.cos(heading) + z * Math.sin(heading),
    y,
    origin.z - x * Math.sin(heading) + z * Math.cos(heading),
  ];

/** A sphere stretched by `scale`, then turned to the heading. */
const addOval = (
  builder: AttractionBuilder,
  finish: AttractionFinish,
  colour: string,
  radius: number,
  at: Triple,
  scale: Triple,
  heading: number,
  segments = 10,
) => {
  builder.add(
    finish,
    colour,
    new SphereGeometry(
      radius,
      builder.segments(segments),
      builder.segments(Math.round(segments * 0.7)),
    ),
    { at, rotation: [0, heading, 0], scale },
  );
};

/* ------------------------------------------------------------------ */
/* The trail, the sled and the dogs                                    */
/* ------------------------------------------------------------------ */

const buildTrail = (builder: AttractionBuilder) => {
  builder.add(
    "matte",
    trailSnow,
    new RingGeometry(0.75, 1.3, builder.segments(48), 1)
      .rotateX(-Math.PI / 2)
      .scale(loop.alongX / 1.025, 1, loop.alongZ / 1.025),
    { at: [loop.x, 0.012, loop.z] },
    undefined,
  );
  if (builder.isFar) {
    return;
  }
  /* Twin grooves cut by the runners */
  [-0.24, 0.24].forEach((out) => {
    const scaleX = (loop.alongX + out) / 1;
    const scaleZ = (loop.alongZ + out) / 1;
    builder.add(
      "matte",
      shade(trailSnow, 0.9),
      new RingGeometry(0.985, 1.0, 48, 1)
        .rotateX(-Math.PI / 2)
        .scale(scaleX, 1, scaleZ),
      { at: [loop.x, 0.018, loop.z] },
      undefined,
    );
  });
  /* Marker poles round the outside, red and blue in turn */
  for (let pole = 0; pole < 8; pole++) {
    const spot = onLoop((pole / 8) * Math.PI * 2 + 0.3, 0.95);
    builder.cylinder("paint", pole % 2 === 0 ? "#d8342c" : "#2f6fb8", {
      radius: 0.035,
      length: 1.1,
      at: [spot.x, 0.55, spot.z],
      segments: 6,
    });
    builder.box(
      "paint",
      pole % 2 === 0 ? "#d8342c" : "#2f6fb8",
      [0.02, 0.18, 0.26],
      [spot.x, 1.0, spot.z + 0.12],
    );
  }
};

const buildSled = (builder: AttractionBuilder) => {
  const back = onLoop(sledAngle, teamOut);
  const place = placer(back, back.heading);
  const rotation: Triple = [0, back.heading, 0];
  /* The bed, raised on stanchions */
  builder.box(
    "matte",
    sledTimber,
    [0.62, 0.05, 1.25],
    place(0, 0.36, 0.85),
    rotation,
  );
  if (builder.isFar) {
    return;
  }
  for (let slat = 0; slat < 6; slat++) {
    builder.box(
      "matte",
      shade(sledTimber, slat % 2 === 0 ? 1.08 : 0.92),
      [0.6, 0.03, 0.17],
      place(0, 0.4, 0.33 + slat * 0.21),
      rotation,
    );
  }
  [-1, 1].forEach((side) => {
    /* Runners, long enough to stand on at the back, curling up at the front */
    builder.box(
      "metal",
      palette.darkSteel,
      [0.06, 0.04, 1.85],
      place(side * 0.28, 0.02, 0.62),
      rotation,
    );
    builder.box(
      "matte",
      palette.darkTimber,
      [0.12, 0.03, 0.42],
      place(side * 0.28, 0.055, 0.0),
      rotation,
    );
    builder.bar(
      "matte",
      sledTimber,
      place(side * 0.28, 0.02, 1.55),
      place(side * 0.28, 0.32, 1.85),
      0.05,
      6,
    );
    builder.bar(
      "matte",
      sledTimber,
      place(side * 0.28, 0.32, 1.85),
      place(side * 0.28, 0.42, 1.6),
      0.05,
      6,
    );
    [0.35, 0.85, 1.35].forEach((along) => {
      builder.box(
        "matte",
        palette.darkTimber,
        [0.05, 0.34, 0.05],
        place(side * 0.28, 0.19, along),
        rotation,
      );
    });
    /* Side rails, and the bow the musher holds at the back */
    builder.bar(
      "matte",
      sledTimber,
      place(side * 0.3, 0.62, 0.25),
      place(side * 0.3, 0.55, 1.5),
      0.04,
      6,
    );
    builder.bar(
      "matte",
      sledTimber,
      place(side * 0.28, 0.02, 0.22),
      place(side * 0.3, 1.05, 0.1),
      0.05,
      6,
    );
  });
  builder.bar(
    "matte",
    sledTimber,
    place(-0.3, 1.05, 0.1),
    place(0.3, 1.05, 0.1),
    0.05,
    6,
  );
  builder.cylinder("matte", "#2a2a2e", {
    radius: 0.035,
    length: 0.5,
    at: place(0, 1.05, 0.1),
    axis: "x",
    segments: 8,
  });
  /* A kit bag strapped on the bed, and a brake claw */
  builder.roundedBox(
    "matte",
    "#2f5d7c",
    [0.5, 0.3, 0.55],
    0.1,
    place(0, 0.57, 0.9),
    rotation,
  );
  builder.box(
    "matte",
    "#e9c46a",
    [0.52, 0.04, 0.06],
    place(0, 0.6, 0.9),
    rotation,
  );
  builder.box(
    "metal",
    palette.darkSteel,
    [0.22, 0.04, 0.3],
    place(0, 0.07, 0.25),
    rotation,
  );
  /* The gangline out to the dogs */
  const front = place(0, 0.38, 1.9);
  const lead = onLoop(dogAngles[1], teamOut);
  builder.bar("matte", "#e65a2a", front, [lead.x, 0.36, lead.z], 0.025, 4);
};

/** One husky, standing in harness, without its tail. */
const buildHusky = (
  builder: AttractionBuilder,
  spot: LocalSpot,
  index: number,
) => {
  const place = placer(spot, spot.heading);
  const heading = spot.heading;
  const harness = harnessColours[index % harnessColours.length];
  if (builder.isFar) {
    addOval(
      builder,
      "matte",
      huskyGrey,
      0.24,
      place(0, 0.45, 0.05),
      [0.85, 0.85, 1.7],
      heading,
      5,
    );
    return;
  }
  /* Body, white chest and belly, and the dark saddle on the back */
  addOval(
    builder,
    "matte",
    huskyGrey,
    0.22,
    place(0, 0.44, 0),
    [0.85, 0.8, 1.55],
    heading,
    9,
  );
  addOval(
    builder,
    "matte",
    huskyDark,
    0.18,
    place(0, 0.53, -0.04),
    [0.8, 0.5, 1.5],
    heading,
    8,
  );
  addOval(
    builder,
    "matte",
    huskyWhite,
    0.16,
    place(0, 0.4, 0.22),
    [0.85, 0.95, 0.8],
    heading,
    8,
  );
  addOval(
    builder,
    "matte",
    huskyWhite,
    0.14,
    place(0, 0.33, -0.02),
    [0.9, 0.5, 1.6],
    heading,
    6,
  );
  /* Head, white mask and muzzle */
  addOval(
    builder,
    "matte",
    huskyGrey,
    0.13,
    place(0, 0.66, 0.38),
    [1, 0.95, 1],
    heading,
    9,
  );
  addOval(
    builder,
    "matte",
    huskyWhite,
    0.105,
    place(0, 0.63, 0.44),
    [1, 0.85, 0.8],
    heading,
    8,
  );
  addOval(
    builder,
    "matte",
    huskyWhite,
    0.065,
    place(0, 0.59, 0.53),
    [0.85, 0.7, 1.3],
    heading,
    6,
  );
  builder.sphere(
    "paint",
    palette.black,
    0.025,
    place(0, 0.61, 0.61),
    [1.2, 0.9, 1],
    6,
  );
  builder.box(
    "matte",
    "#e57f8b",
    [0.04, 0.008, 0.06],
    place(0.02, 0.54, 0.56),
    [0.4, heading, 0],
  );
  [-1, 1].forEach((side) => {
    /* Pale blue eyes, and pointed ears */
    builder.sphere(
      "paint",
      "#9fd3f0",
      0.02,
      place(side * 0.05, 0.69, 0.48),
      [1, 1, 0.6],
      6,
    );
    builder.add("matte", huskyGrey, new ConeGeometry(0.045, 0.12, 4), {
      at: place(side * 0.07, 0.8, 0.35),
      rotation: [0, heading, side * -0.2],
    });
    builder.add("matte", "#e9c9c4", new ConeGeometry(0.025, 0.07, 4), {
      at: place(side * 0.07, 0.79, 0.37),
      rotation: [0, heading, side * -0.2],
    });
  });
  /* Legs, with white socks */
  [-1, 1].forEach((sideX) => {
    [-1, 1].forEach((sideZ) => {
      builder.add(
        "matte",
        huskyGrey,
        new CylinderGeometry(0.042, 0.038, 0.3, builder.segments(8)),
        {
          at: place(sideX * 0.09, 0.2, sideZ * 0.21),
          rotation: [0, heading, 0],
        },
      );
      addOval(
        builder,
        "matte",
        huskyWhite,
        0.05,
        place(sideX * 0.09, 0.04, sideZ * 0.21 + 0.02),
        [1, 0.7, 1.3],
        heading,
        5,
      );
    });
  });
  /* The harness: a strap round the chest and one along the back */
  builder.add("paint", harness, new BoxGeometry(0.34, 0.05, 0.05), {
    at: place(0, 0.48, 0.2),
    rotation: [0, heading, 0],
  });
  builder.add("paint", harness, new BoxGeometry(0.05, 0.03, 0.5), {
    at: place(0, 0.62, -0.02),
    rotation: [0, heading, 0],
  });
  builder.add("paint", harness, new BoxGeometry(0.36, 0.05, 0.05), {
    at: place(0, 0.5, -0.2),
    rotation: [0, heading, 0],
  });
  /* The tug line back to the gangline */
  const gang = onLoop(dogAngles[Math.floor(index / 2)] - 0.06, teamOut);
  builder.bar(
    "matte",
    "#e65a2a",
    place(0, 0.5, -0.3),
    [gang.x, 0.36, gang.z],
    0.018,
    4,
  );
};

/** The base of a husky's tail, behind its back. */
const tailBase = (spot: LocalSpot): Triple =>
  placer(spot, spot.heading)(0, 0.52, -0.3);

/** A bushy tail curling up over the back, to wag. */
const buildTail = (spot: LocalSpot) => (builder: AttractionBuilder) => {
  const place = placer({ x: 0, z: 0 }, spot.heading);
  const curl: [number, number, number, string][] = [
    [0.06, -0.06, 0.07, huskyGrey],
    [0.17, -0.07, 0.075, huskyGrey],
    [0.26, -0.01, 0.07, huskyGrey],
    [0.3, 0.08, 0.06, huskyWhite],
  ];
  curl.forEach(([y, z, radius, colour]) => {
    addOval(
      builder,
      "matte",
      colour,
      radius,
      place(0, y, z),
      [0.9, 1.1, 1.1],
      spot.heading,
      8,
    );
  });
};

/* ------------------------------------------------------------------ */
/* The kennel and its yard                                             */
/* ------------------------------------------------------------------ */

const buildKennel = (builder: AttractionBuilder) => {
  const place = placer(kennel, kennel.turn);
  const rotation: Triple = [0, kennel.turn, 0];
  builder.box(
    "matte",
    kennelRed,
    [0.95, 0.75, 1.0],
    place(0, 0.4, 0),
    rotation,
  );
  addGableRoof(builder, {
    width: 1.0,
    depth: 0.95,
    rise: 0.4,
    at: place(0, 0.77, 0),
    colour: snowWhite,
    overhang: 0.12,
    thickness: 0.08,
    turn: kennel.turn + Math.PI / 2,
  });
  if (builder.isFar) {
    return;
  }
  /* Gable end, arched doorway and a name board */
  builder.add(
    "matte",
    kennelRed,
    new BoxGeometry(0.98, 0.5 * Math.SQRT2, 0.5 * Math.SQRT2)
      .rotateX(Math.PI / 4)
      .scale(1, 0.4 / 0.5, 1)
      .rotateY(Math.PI / 2 + kennel.turn),
    { at: place(0, 0.77, 0) },
    undefined,
  );
  builder.add(
    "matte",
    "#251d18",
    new CylinderGeometry(0.22, 0.22, 0.02, 14, 1, false, -Math.PI / 2, Math.PI)
      .rotateX(Math.PI / 2)
      .rotateY(kennel.turn),
    { at: place(0, 0.3, 0.51) },
  );
  builder.add(
    "matte",
    "#251d18",
    new BoxGeometry(0.44, 0.3, 0.02).rotateY(kennel.turn),
    { at: place(0, 0.17, 0.51) },
  );
  builder.box(
    "paint",
    palette.cream,
    [0.4, 0.12, 0.02],
    place(0, 0.66, 0.52),
    rotation,
  );
  for (let plank = 0; plank < 4; plank++) {
    builder.box(
      "matte",
      shade(kennelRed, 0.82),
      [0.97, 0.02, 1.02],
      place(0, 0.15 + plank * 0.17, 0),
      rotation,
    );
  }
  /* Straw spilling out of the door */
  builder.box(
    "matte",
    palette.thatch,
    [0.5, 0.04, 0.25],
    place(0, 0.02, 0.62),
    rotation,
  );
  /* Bowls, a sack of food and a spare harness on a peg */
  [-0.75, 0.75].forEach((across, index) => {
    const at = place(across, 0, 0.85);
    builder.lathe(
      "metal",
      palette.steel,
      [
        [0, 0],
        [0.13, 0],
        [0.16, 0.08],
        [0.13, 0.08],
        [0.09, 0.03],
        [0, 0.03],
      ],
      at,
      "y",
      16,
    );
    builder.cylinder(
      index === 0 ? "matte" : "water",
      index === 0 ? "#8a5a35" : palette.water,
      {
        radius: 0.11,
        length: 0.02,
        at: [at[0], 0.05, at[2]],
        segments: 14,
      },
    );
  });
  const sack = place(0.75, 0, -0.35);
  builder.cylinder("matte", "#c9b07a", {
    radius: 0.17,
    radiusEnd: 0.15,
    length: 0.42,
    at: [sack[0], 0.21, sack[2]],
    segments: 12,
  });
  builder.sphere(
    "matte",
    "#c9b07a",
    0.15,
    [sack[0], 0.43, sack[2]],
    [1, 0.45, 1],
    10,
  );
  builder.box("paint", "#d8342c", [0.2, 0.12, 0.01], place(0.75, 0.3, -0.22), [
    0,
    kennel.turn + 0.3,
    0,
  ]);
  const peg = place(-0.75, 0, -0.3);
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.05,
    length: 1.2,
    at: [peg[0], 0.6, peg[2]],
    segments: 8,
  });
  builder.torus(
    "paint",
    "#3f9a4a",
    0.14,
    0.02,
    [peg[0], 0.9, peg[2] + 0.06],
    "z",
    14,
  );
  builder.torus(
    "paint",
    "#2f7fc8",
    0.12,
    0.02,
    [peg[0], 0.85, peg[2] + 0.08],
    "z",
    14,
  );
};

const buildYard = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  [
    [-3.9, -1.9, 0.6],
    [3.7, -2.3, 0.6],
    [0.4, -3.9, 0.55],
    [4.1, 1.8, 0.45],
  ].forEach(([x, z, size]) => {
    builder.sphere("matte", snowWhite, size, [x, 0, z], [1.5, 0.45, 1], 10);
  });
  /* A chopped log stack for the musher's stove */
  for (let log = 0; log < 5; log++) {
    const row = log < 3 ? 0 : 1;
    builder.cylinder(
      "matte",
      log % 2 === 0 ? palette.timber : shade(palette.timber, 0.85),
      {
        radius: 0.11,
        length: 0.6,
        at: [
          1.0 + (row === 0 ? (log - 1) * 0.23 : (log - 3.5) * 0.23),
          0.11 + row * 0.2,
          -1.25,
        ],
        axis: "z",
        segments: 8,
      },
    );
  }
};

export const huskySledModel: CuriosityModel = {
  kind: "husky-sled",
  islandId: "frost-isle",
  name: "Husky Sled",
  fact: 'In cold places near the North Pole, such as Alaska, Canada and Greenland, teams of husky dogs pull sleds across the snow. Huskies have two thick layers of fur, and when they sleep they curl their bushy tails over their noses to keep warm. The driver, called a musher, shouts "Hike!" or "Mush!" to tell the dogs to go.',
  curriculumLink:
    "Geography, Key Stage 1: identify the location of hot and cold areas of the world in relation to the Equator and the North and South Poles.",
  footprint: 4.8,
  setting: "inland",
  padColour: snowPad,
  signSpot: { x: signAt[0], z: signAt[2] },
  build: (builder) => {
    buildTrail(builder);
    buildSled(builder);
    dogs.forEach((spot, index) => {
      buildHusky(builder, spot, index);
    });
    buildKennel(builder);
    buildYard(builder);
    addSignBoard(builder, signAt, signColour);
  },
  moving: dogs.map((spot, index): MovingPart => ({
    name: `husky ${String(index + 1)}'s tail`,
    pivot: tailBase(spot),
    build: buildTail(spot),
    motion: {
      kind: "nod",
      axis: "y",
      reach: 7,
      amplitude: 0.45,
      period: 0.45 + index * 0.06,
      phase: index * 0.9,
    },
  })),
  rides: [
    {
      id: "sled",
      name: "the husky sled",
      start: { x: rideStart.x, z: rideStart.z },
      reach: 0.6,
      seconds: 14,
      finish: rideFinish,
      follow: (progress) => {
        if (progress < 0.06) {
          const share = progress / 0.06;
          const back = onLoop(sledAngle, laneOut);
          return {
            x: rideStart.x + (back.x - rideStart.x) * share,
            y: 0.08 * share,
            z: rideStart.z + (back.z - rideStart.z) * share,
            heading: back.heading,
          };
        }
        if (progress < 0.94) {
          /* Once round the loop, gently speeding up and slowing down */
          const share = (progress - 0.06) / 0.88;
          const eased = share - Math.sin(share * Math.PI * 2) / (Math.PI * 2);
          const spot = onLoop(sledAngle + eased * Math.PI * 2, laneOut);
          return { ...spot, y: 0.08 };
        }
        const share = (progress - 0.94) / 0.06;
        const back = onLoop(sledAngle, laneOut);
        return {
          x: back.x + (rideFinish.x - back.x) * share,
          y: 0.08 * (1 - share),
          z: back.z + (rideFinish.z - back.z) * share,
          heading: back.heading,
        };
      },
    },
  ],
  blockers: [
    ...dogAngles.map((angle) => {
      const spot = onLoop(angle, teamOut);
      return { x: spot.x, z: spot.z, radius: 0.5 };
    }),
    sledBlocker(),
    { x: kennel.x, z: kennel.z, radius: 0.75 },
    { x: 1.0, z: -1.25, radius: 0.45 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Mush, huskies!",
    news: "Woof woof! The huskies leapt forward and pulled the sled whooshing round the snowy trail.",
  },
};
