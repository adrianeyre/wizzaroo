import { LatheGeometry, SphereGeometry, Vector2 } from "three";
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

const pondWater = "#2f8c8a";
const pondBed = "#2e4a3a";
const rimStone = "#8f8a7a";
const padGreen = "#4f9a3a";
const padVein = "#3d7f2e";
const rimRed = "#9b3b3e";
const petalWhite = "#f7f2ea";
const petalPink = "#ec8fb0";
const petalDeep = "#d65a8a";
const flowerHeart = "#f2c84a";
const frogGreen = "#4fbf3a";
const reedGreen = "#6e8f3a";
const signColour = "#2f7d6a";

const pond = { x: 0, z: -0.3, radius: 3.4 };
const waterLevel = 0.1;
const padFloor = waterLevel + 0.03;

/* The giant pads, each a floating raft with an upturned rim */
const pads = [
  { x: 0.9, z: 2.2, radius: 0.8, turn: 0.3 },
  { x: -0.6, z: 1.1, radius: 0.95, turn: 2.1 },
  { x: 1.0, z: 0.0, radius: 1.25, turn: 4.0 },
  { x: -1.4, z: -0.9, radius: 1.05, turn: 1.0 },
  { x: 0.2, z: -2.3, radius: 1.0, turn: 5.2 },
  { x: 2.4, z: -1.5, radius: 0.7, turn: 3.3 },
];
const wakingFlowerAt = { x: -0.2, z: -0.6 };
const flowers = [
  { x: 1.9, z: 1.5, colour: petalPink },
  { x: -1.9, z: 0.3, colour: petalWhite },
];

/* The frog hop: in from the front, pad to pad, and out at the side */
const hopStart = { x: 1.6, z: 3.7 };
const hopFinish = { x: 3.9, z: -1.4 };
const hops: { x: number; z: number; y: number }[] = [
  { ...hopStart, y: 0 },
  ...[0, 1, 3, 4, 2, 5].map((index) => ({
    x: pads[index].x,
    z: pads[index].z,
    y: padFloor,
  })),
  { ...hopFinish, y: 0 },
];

/** A Victoria lily pad: a flat disc with a red rim, notched to drain rain. */
const addLilyPad = (
  builder: AttractionBuilder,
  {
    x,
    z,
    radius,
    turn,
  }: { x: number; z: number; radius: number; turn: number },
) => {
  if (builder.isFar) {
    builder.cylinder("matte", padGreen, {
      radius,
      length: 0.1,
      at: [x, waterLevel + 0.04, z],
      segments: 8,
    });
    return;
  }
  const segments = 28;
  const notch = 0.22;
  const ring = (points: [number, number][]) =>
    new LatheGeometry(
      points.map(([across, up]) => new Vector2(across, up)),
      segments,
      turn + notch,
      Math.PI * 2 - notch,
    );
  builder.add(
    "matte",
    rimRed,
    ring([
      [radius + 0.02, 0],
      [radius + 0.04, 0.12],
      [radius, 0.15],
    ]),
    { at: [x, waterLevel - 0.02, z] },
  );
  builder.add(
    "matte",
    padGreen,
    ring([
      [radius, 0.15],
      [radius - 0.04, 0.12],
      [radius - 0.07, 0.05],
      [0, 0.05],
    ]),
    { at: [x, waterLevel - 0.02, z] },
  );
  /* Veins spreading from the middle, like ribs holding the pad up */
  for (let vein = 0; vein < 8; vein++) {
    const angle = (vein / 8) * Math.PI * 2 + turn;
    builder.box(
      "matte",
      padVein,
      [0.03, 0.01, radius - 0.12],
      [
        x + Math.sin(angle) * (radius / 2 - 0.04),
        padFloor + 0.005,
        z + Math.cos(angle) * (radius / 2 - 0.04),
      ],
      [0, angle, 0],
    );
  }
  builder.cylinder("matte", padVein, {
    radius: 0.07,
    length: 0.02,
    at: [x, padFloor + 0.01, z],
    segments: 10,
  });
};

/** A petal, a flattened leaf shape leaning out from the middle. */
const addPetal = (
  builder: AttractionBuilder,
  centre: Triple,
  angle: number,
  lean: number,
  length: number,
  colour: string,
) => {
  const out = length * 0.5 * Math.sin(lean);
  builder.add(
    "paint",
    colour,
    new SphereGeometry(1, builder.segments(7, 4), builder.segments(4, 3))
      .scale(length * 0.22, length * 0.5, length * 0.08)
      .rotateX(lean)
      .rotateY(angle),
    {
      at: [
        centre[0] + Math.sin(angle) * out,
        centre[1] + length * 0.5 * Math.cos(lean),
        centre[2] + Math.cos(angle) * out,
      ],
    },
  );
};

/** A flower cup, open at the top, for the far view and the closed buds. */
const addFlowerCup = (
  builder: AttractionBuilder,
  at: Triple,
  colour: string,
  size: number,
) => {
  builder.lathe(
    "paint",
    colour,
    [
      [0.02, 0],
      [0.16 * size, 0.06 * size],
      [0.22 * size, 0.18 * size],
      [0.2 * size, 0.3 * size],
      [0.04 * size, 0.42 * size],
      [0, 0.44 * size],
    ],
    at,
    "y",
    12,
  );
};

const addOpenFlower = (
  builder: AttractionBuilder,
  at: Triple,
  colour: string,
) => {
  for (let petal = 0; petal < 8; petal++) {
    addPetal(builder, at, (petal / 8) * Math.PI * 2, 1.15, 0.36, colour);
  }
  for (let petal = 0; petal < 6; petal++) {
    addPetal(
      builder,
      [at[0], at[1] + 0.03, at[2]],
      (petal / 6) * Math.PI * 2 + 0.3,
      0.55,
      0.3,
      colour === petalWhite ? shade(petalWhite, 0.96) : petalDeep,
    );
  }
  builder.sphere(
    "paint",
    flowerHeart,
    0.08,
    [at[0], at[1] + 0.08, at[2]],
    [1, 0.6, 1],
    10,
  );
};

const buildPond = (builder: AttractionBuilder) => {
  const segments = builder.segments(40, 12);
  builder.cylinder("matte", pondBed, {
    radius: pond.radius,
    length: 0.03,
    at: [pond.x, 0.02, pond.z],
    segments,
  });
  builder.cylinder("water", pondWater, {
    radius: pond.radius,
    length: 0.04,
    at: [pond.x, waterLevel - 0.02, pond.z],
    segments,
  });
  if (builder.isFar) {
    return;
  }
  builder.torus(
    "matte",
    rimStone,
    pond.radius + 0.05,
    0.12,
    [pond.x, 0.06, pond.z],
    "y",
    32,
  );
  /* Bigger stones set round the edge */
  for (let stone = 0; stone < 12; stone++) {
    const angle = (stone / 12) * Math.PI * 2 + 0.2;
    builder.sphere(
      "matte",
      shade(rimStone, stone % 3 === 0 ? 0.85 : 1.08),
      0.18 + (stone % 2) * 0.05,
      [
        pond.x + Math.sin(angle) * (pond.radius + 0.18),
        0.08,
        pond.z + Math.cos(angle) * (pond.radius + 0.18),
      ],
      [1.3, 0.6, 1],
      6,
    );
  }
  /* Reeds and bulrushes along the back */
  [
    [-2.6, -2.6],
    [2.8, -2.4],
    [-3.6, 0.4],
  ].forEach(([x, z]) => {
    for (let reed = 0; reed < 5; reed++) {
      const lean = (reed - 2) * 0.1;
      const top: Triple = [
        x + reed * 0.07 + lean,
        0.9 + (reed % 2) * 0.25,
        z + lean * 0.4,
      ];
      builder.bar("matte", reedGreen, [x + reed * 0.07, 0, z], top, 0.03, 4);
      if (reed % 2 === 1) {
        builder.cylinder("matte", "#6a4326", {
          radius: 0.04,
          length: 0.18,
          at: [top[0], top[1] - 0.12, top[2]],
          segments: 6,
        });
      }
    }
  });
  addBush(builder, [-3.9, 0, -2.0], 0.55, "#2a6a30");
  addBush(builder, [3.8, 0, 1.2], 0.5, "#3a8a3a");
};

const buildFlowers = (builder: AttractionBuilder) => {
  flowers.forEach(({ x, z, colour }) => {
    if (builder.isFar) {
      addFlowerCup(builder, [x, waterLevel, z], colour, 1.2);
      return;
    }
    addOpenFlower(builder, [x, waterLevel + 0.02, z], colour);
  });
  /* The bud that opens as you come near */
  addFlowerCup(
    builder,
    [wakingFlowerAt.x, waterLevel, wakingFlowerAt.z],
    "#cfd8b0",
    0.7,
  );
};

const buildWakingFlower = (builder: AttractionBuilder) => {
  addOpenFlower(builder, [0, 0, 0], petalWhite);
};

const buildFrog = (builder: AttractionBuilder) => {
  builder.sphere("paint", frogGreen, 0.1, [0, 0.08, 0], [1, 0.7, 1.2], 10);
  builder.sphere("paint", "#f2eccf", 0.07, [0, 0.06, 0.05], [1, 0.6, 1.1], 8);
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      frogGreen,
      0.04,
      [side * 0.05, 0.15, 0.07],
      [1, 1, 1],
      6,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.022,
      [side * 0.06, 0.16, 0.1],
      [1, 1, 1],
      5,
    );
    builder.sphere(
      "paint",
      shade(frogGreen, 0.8),
      0.05,
      [side * 0.08, 0.04, -0.06],
      [0.8, 0.6, 1.6],
      6,
    );
  });
};

const buildDragonfly = (builder: AttractionBuilder) => {
  builder.cylinder("glow", "#3fa8d8", {
    radius: 0.012,
    length: 0.22,
    at: [0, 0, -0.04],
    axis: "z",
    segments: 5,
  });
  builder.sphere("paint", "#2a6aa8", 0.022, [0, 0, 0.08], [1, 1, 1], 5);
  [-1, 1].forEach((side) => {
    [0.04, -0.01].forEach((along) => {
      builder.box(
        "glass",
        "#e0f0f4",
        [0.13, 0.004, 0.035],
        [side * 0.07, 0.01, along],
      );
    });
  });
};

const hopRide = (progress: number): LocalSpot => {
  const legs = hops.length - 1;
  const leg = Math.min(legs - 1, Math.floor(progress * legs));
  const share = Math.min(1, Math.max(0, progress * legs - leg));
  const from = hops[leg];
  const to = hops[leg + 1];
  const distance = Math.hypot(to.x - from.x, to.z - from.z);
  return {
    x: from.x + (to.x - from.x) * share,
    y:
      from.y +
      (to.y - from.y) * share +
      0.45 * distance * 0.5 * Math.sin(share * Math.PI),
    z: from.z + (to.z - from.z) * share,
    heading: Math.atan2(to.x - from.x, to.z - from.z),
  };
};

const padDeck: Deck = ({ x, z }) =>
  pads.some((pad) => Math.hypot(x - pad.x, z - pad.z) <= pad.radius - 0.05)
    ? { height: padFloor, kind: "bridge" }
    : undefined;

export const giantLilyPadsModel: CuriosityModel = {
  kind: "giant-lily-pads",
  islandId: "jungle-reach",
  name: "Giant Lily Pads",
  fact: "The giant Amazon water lily is a plant with leaves big enough to hold up a small child. Each leaf has a turned-up rim and strong ribs underneath, with spikes to keep fish from nibbling it. Its flowers open white on the first night, then turn pink on the second. Plants can be grouped by how they live, and these grow in water.",
  curriculumLink:
    "Science, Year 4: living things and their habitats. Recognise that living things can be grouped in a variety of ways (flowering plants, and how they are adapted to live in water).",
  footprint: 5,
  setting: "inland",
  signSpot: { x: -1.4, z: 4.2 },
  build: (builder) => {
    buildPond(builder);
    pads.forEach((pad) => {
      addLilyPad(builder, pad);
    });
    buildFlowers(builder);
    addSignBoard(builder, [-1.4, 0, 4.2], signColour);
  },
  moving: [
    {
      name: "opening flower",
      pivot: [wakingFlowerAt.x, waterLevel + 0.04, wakingFlowerAt.z],
      build: buildWakingFlower,
      motion: { kind: "wake", reach: 6 },
    },
  ],
  wanderers: [
    {
      name: "frogs",
      build: buildFrog,
      count: 2,
      centre: { x: pads[2].x, z: pads[2].z },
      radius: 0.6,
      speed: 0.25,
      height: padFloor,
      bob: 0.08,
    },
    {
      name: "dragonflies",
      build: buildDragonfly,
      count: 3,
      centre: { x: pond.x, z: pond.z },
      radius: 2.6,
      speed: 1.4,
      height: 0.9,
      bob: 0.25,
    },
  ],
  decks: [padDeck],
  rides: [
    {
      id: "lily-hop",
      name: "the lily pads",
      start: hopStart,
      reach: 0.6,
      seconds: 9,
      finish: hopFinish,
      follow: hopRide,
    },
  ],
  blockers: flowers.map(({ x, z }): LocalBlocker => ({ x, z, radius: 0.25 })),
  play: {
    label: "Stand on a lily pad",
    news: "Boing! You hopped from pad to pad like a frog. The giant leaves are so strong and wide that they held you up.",
  },
};
