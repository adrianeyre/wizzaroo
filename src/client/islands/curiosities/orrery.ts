import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const ashGround = "#5b4a42";
const daisStone = "#8d847c";
const daisStoneDark = "#6f6760";
const brass = "#c9a24a";
const brassDark = "#9a7a34";
const sunGold = "#ffcf3f";
const sunCore = "#fff1a8";
const signColour = "#7a5a1e";

const daisRadius = 3.1;
const daisHeight = 0.32;
const pedestalTop = 1.25;
const sunHeight = 2.45;
const planeHeight = sunHeight;

interface Planet {
  name: string;
  orbit: number;
  radius: number;
  colour: string;
  /** Where its arm joins the column. */
  armHeight: number;
  /** Where it starts round its orbit. */
  angle: number;
}

/* Mercury to Neptune, in order out from the Sun, sizes roughly to scale */
const planets = {
  mercury: {
    name: "Mercury",
    orbit: 0.55,
    radius: 0.06,
    colour: "#9a958f",
    armHeight: 2.1,
    angle: 0.3,
  },
  venus: {
    name: "Venus",
    orbit: 0.82,
    radius: 0.1,
    colour: "#e8c98a",
    armHeight: 2.02,
    angle: 3.6,
  },
  earth: {
    name: "Earth",
    orbit: 1.1,
    radius: 0.105,
    colour: "#3a7fd0",
    armHeight: 1.94,
    angle: 1.4,
  },
  mars: {
    name: "Mars",
    orbit: 1.36,
    radius: 0.075,
    colour: "#c4532e",
    armHeight: 1.86,
    angle: 4.9,
  },
  jupiter: {
    name: "Jupiter",
    orbit: 1.78,
    radius: 0.27,
    colour: "#d9a36a",
    armHeight: 1.78,
    angle: 2.4,
  },
  saturn: {
    name: "Saturn",
    orbit: 2.2,
    radius: 0.22,
    colour: "#e3cf8e",
    armHeight: 1.7,
    angle: 5.6,
  },
  uranus: {
    name: "Uranus",
    orbit: 2.55,
    radius: 0.15,
    colour: "#9fdce6",
    armHeight: 1.62,
    angle: 0.9,
  },
  neptune: {
    name: "Neptune",
    orbit: 2.85,
    radius: 0.145,
    colour: "#3f5fd8",
    armHeight: 1.56,
    angle: 3.9,
  },
} satisfies Record<string, Planet>;

const buildDais = (builder: AttractionBuilder) => {
  const segments = builder.isFar ? 16 : 48;
  builder.cylinder("matte", daisStoneDark, {
    radius: daisRadius + 0.1,
    radiusEnd: daisRadius,
    length: daisHeight,
    at: [0, daisHeight / 2, 0],
    segments,
  });
  if (builder.isFar) {
    return;
  }
  builder.cylinder("matte", daisStone, {
    radius: daisRadius - 0.12,
    length: 0.02,
    at: [0, daisHeight + 0.01, 0],
    segments,
  });
  /* Brass rings inlaid in the floor, and twelve zodiac tiles round the edge */
  [1.0, 2.0, daisRadius - 0.3].forEach((radius) => {
    builder.torus(
      "metal",
      brassDark,
      radius,
      0.025,
      [0, daisHeight + 0.015, 0],
      "y",
      32,
    );
  });
  for (let tile = 0; tile < 12; tile++) {
    const angle = (tile / 12) * Math.PI * 2;
    const reach = daisRadius - 0.62;
    const x = Math.sin(angle) * reach;
    const z = Math.cos(angle) * reach;
    builder.box(
      "paint",
      tile % 2 === 0 ? "#2f4f7a" : "#5a2f7a",
      [0.34, 0.02, 0.34],
      [x, daisHeight + 0.025, z],
      [0, angle, 0],
    );
    builder.box(
      "metal",
      brass,
      [0.16, 0.025, 0.04],
      [x, daisHeight + 0.03, z],
      [0, angle + (tile % 3) * 0.6, 0],
    );
  }
  /* A low step up onto the dais at the front */
  builder.box(
    "matte",
    daisStone,
    [1.4, daisHeight / 2, 0.4],
    [0, daisHeight / 4, daisRadius + 0.12],
  );
};

const buildPedestal = (builder: AttractionBuilder) => {
  builder.lathe(
    "matte",
    daisStone,
    [
      [0, daisHeight],
      [0.62, daisHeight],
      [0.62, daisHeight + 0.14],
      [0.45, daisHeight + 0.22],
      [0.3, daisHeight + 0.35],
      [0.24, pedestalTop - 0.25],
      [0.36, pedestalTop - 0.12],
      [0.4, pedestalTop - 0.05],
      [0, pedestalTop - 0.05],
    ],
    [0, 0, 0],
    "y",
    builder.isFar ? 8 : 24,
  );
  /* The brass gearbox drum on top, and the column of nested tubes */
  builder.cylinder("metal", brass, {
    radius: 0.34,
    length: 0.24,
    at: [0, pedestalTop + 0.07, 0],
    segments: builder.isFar ? 8 : 28,
  });
  builder.cylinder("metal", brassDark, {
    radius: 0.06,
    radiusEnd: 0.035,
    length: sunHeight - pedestalTop,
    at: [0, (sunHeight + pedestalTop) / 2, 0],
    segments: builder.isFar ? 6 : 12,
  });
  builder.sphere(
    "glow",
    sunGold,
    0.34,
    [0, sunHeight, 0],
    [1, 1, 1],
    builder.isFar ? 8 : 18,
  );
  if (builder.isFar) {
    return;
  }
  /* Gear teeth round the drum */
  for (let tooth = 0; tooth < 24; tooth++) {
    const angle = (tooth / 24) * Math.PI * 2;
    builder.box(
      "metal",
      brassDark,
      [0.05, 0.2, 0.06],
      [Math.sin(angle) * 0.36, pedestalTop + 0.07, Math.cos(angle) * 0.36],
      [0, angle, 0],
    );
  }
  /* Collars where each planet's arm turns on the column */
  Object.values(planets).forEach(({ armHeight }) => {
    builder.cylinder("metal", brass, {
      radius: 0.08,
      length: 0.04,
      at: [0, armHeight, 0],
      segments: 12,
    });
  });
  /* The Sun's flares, a ring of glowing rays */
  for (let ray = 0; ray < 12; ray++) {
    const angle = (ray / 12) * Math.PI * 2;
    builder.bar(
      "glow",
      sunCore,
      [
        Math.sin(angle) * 0.3,
        sunHeight + Math.cos(angle * 2) * 0.08,
        Math.cos(angle) * 0.3,
      ],
      [
        Math.sin(angle) * 0.46,
        sunHeight + Math.cos(angle * 2) * 0.12,
        Math.cos(angle) * 0.46,
      ],
      0.04,
      4,
    );
  }
  /* The winding crank on the pedestal's side */
  builder.cylinder("metal", brassDark, {
    radius: 0.03,
    length: 0.3,
    at: [0, pedestalTop - 0.35, 0.36],
    axis: "z",
    segments: 8,
  });
  builder.bar(
    "metal",
    brass,
    [0, pedestalTop - 0.35, 0.5],
    [0.22, pedestalTop - 0.45, 0.52],
    0.04,
    6,
  );
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.035,
    length: 0.14,
    at: [0.22, pedestalTop - 0.45, 0.6],
    axis: "z",
    segments: 8,
  });
  /* A brass plaque naming the planets */
  builder.box(
    "metal",
    brass,
    [0.36, 0.22, 0.02],
    [0, daisHeight + 0.55, 0.3],
    [-0.12, 0, 0],
  );
  for (let line = 0; line < 3; line++) {
    builder.box(
      "paint",
      palette.black,
      [0.26, 0.02, 0.005],
      [0, daisHeight + 0.62 - line * 0.06, 0.312],
      [-0.12, 0, 0],
    );
  }
};

/** One planet on its arm: a bar out from the column, a rod up, and the globe. */
const addPlanetArm = (builder: AttractionBuilder, planet: Planet) => {
  const { orbit, radius, colour, armHeight, angle } = planet;
  const along = (distance: number, height: number): Triple => [
    Math.sin(angle) * distance,
    height,
    Math.cos(angle) * distance,
  ];
  builder.bar(
    "metal",
    brass,
    along(0.06, armHeight),
    along(orbit, armHeight),
    0.035,
    6,
  );
  builder.bar(
    "metal",
    brass,
    along(orbit, armHeight),
    along(orbit, planeHeight - radius),
    0.025,
    6,
  );
  builder.sphere(
    "metal",
    brassDark,
    0.03,
    along(orbit, armHeight),
    [1, 1, 1],
    6,
  );
  const centre = along(orbit, planeHeight);
  const detail = Math.min(16, Math.max(10, Math.round(radius * 80)));
  builder.sphere("paint", colour, radius, centre, [1, 1, 1], detail);
  return centre;
};

/** Mercury and Venus, the fastest to go round. */
const buildInnerPlanets = (builder: AttractionBuilder) => {
  addPlanetArm(builder, planets.mercury);
  const venus = addPlanetArm(builder, planets.venus);
  builder.sphere(
    "paint",
    shade(planets.venus.colour, 1.1),
    planets.venus.radius * 1.02,
    venus,
    [1, 0.4, 1],
    12,
  );
};

/** Earth with its Moon, and red Mars. */
const buildEarthAndMars = (builder: AttractionBuilder) => {
  const earth = addPlanetArm(builder, planets.earth);
  /* Green land and white ice caps on the Earth */
  [
    [0.5, 0.3, 0.6],
    [-0.6, 0.1, 0.5],
    [0.1, -0.4, -0.8],
  ].forEach(([x, y, z]) => {
    builder.sphere(
      "matte",
      "#4f9a3c",
      0.04,
      [earth[0] + x * 0.09, earth[1] + y * 0.09, earth[2] + z * 0.09],
      [1, 0.6, 1],
      6,
    );
  });
  [-1, 1].forEach((pole) => {
    builder.sphere(
      "matte",
      palette.white,
      0.04,
      [earth[0], earth[1] + pole * 0.09, earth[2]],
      [1, 0.4, 1],
      6,
    );
  });
  /* The Moon on a little arm round the Earth */
  builder.bar(
    "metal",
    brass,
    earth,
    [earth[0] + 0.22, earth[1], earth[2]],
    0.015,
    4,
  );
  builder.sphere(
    "paint",
    "#d6d2cb",
    0.03,
    [earth[0] + 0.24, earth[1], earth[2]],
    [1, 1, 1],
    8,
  );
  const mars = addPlanetArm(builder, planets.mars);
  builder.sphere(
    "matte",
    palette.white,
    0.025,
    [mars[0], mars[1] + 0.065, mars[2]],
    [1, 0.4, 1],
    6,
  );
};

/** The gas giants: banded Jupiter and ringed Saturn. */
const buildGiants = (builder: AttractionBuilder) => {
  const jupiter = addPlanetArm(builder, planets.jupiter);
  [-0.12, 0.0, 0.12].forEach((height, band) => {
    const ring = Math.sqrt(planets.jupiter.radius ** 2 - height * height);
    builder.torus(
      "paint",
      band % 2 === 0 ? "#b9773e" : "#f1dfc0",
      ring,
      0.022,
      [jupiter[0], jupiter[1] + height, jupiter[2]],
      "y",
      16,
    );
  });
  builder.sphere(
    "paint",
    "#c4532e",
    0.05,
    [
      jupiter[0] + Math.sin(planets.jupiter.angle) * 0.25,
      jupiter[1] - 0.08,
      jupiter[2] + Math.cos(planets.jupiter.angle) * 0.25,
    ],
    [1, 0.6, 1],
    8,
  );
  const saturn = addPlanetArm(builder, planets.saturn);
  builder.lathe(
    "paint",
    "#d9c08a",
    [
      [planets.saturn.radius * 1.3, 0],
      [planets.saturn.radius * 2.1, 0.0],
      [planets.saturn.radius * 2.1, 0.012],
      [planets.saturn.radius * 1.3, 0.012],
      [planets.saturn.radius * 1.3, 0],
    ],
    saturn,
    "y",
    24,
  );
  builder.torus(
    "paint",
    "#b9a06a",
    planets.saturn.radius * 1.75,
    0.012,
    [saturn[0], saturn[1] + 0.008, saturn[2]],
    "y",
    20,
  );
};

/** The ice giants, Uranus and Neptune, slowest of all. */
const buildIceGiants = (builder: AttractionBuilder) => {
  const uranus = addPlanetArm(builder, planets.uranus);
  /* Uranus spins on its side, so its faint ring stands upright */
  builder.torus(
    "paint",
    "#cfeef2",
    planets.uranus.radius * 1.45,
    0.008,
    uranus,
    "x",
    20,
  );
  const neptune = addPlanetArm(builder, planets.neptune);
  builder.sphere(
    "paint",
    "#2a3f9a",
    0.04,
    [neptune[0], neptune[1] + 0.05, neptune[2] + 0.1],
    [1.4, 0.6, 1],
    6,
  );
};

/** Benches round the dais for watching the planets go by. */
const buildSurroundings = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  [-2.2, 2.2].forEach((angle) => {
    const reach = daisRadius + 0.75;
    const x = Math.sin(angle) * reach;
    const z = Math.cos(angle) * reach;
    builder.box(
      "matte",
      daisStone,
      [1.0, 0.1, 0.4],
      [x, 0.42, z],
      [0, angle, 0],
    );
    [-0.35, 0.35].forEach((side) => {
      builder.box(
        "matte",
        daisStoneDark,
        [0.12, 0.38, 0.34],
        [x + Math.cos(angle) * side, 0.19, z - Math.sin(angle) * side],
        [0, angle, 0],
      );
    });
  });
  /* Little brass lamps at the dais's corners */
  [0.75, -0.75, Math.PI - 0.6, Math.PI + 0.6].forEach((angle) => {
    const reach = daisRadius + 0.35;
    const x = Math.sin(angle) * reach;
    const z = Math.cos(angle) * reach;
    builder.cylinder("metal", brassDark, {
      radius: 0.04,
      length: 0.8,
      at: [x, 0.4, z],
      segments: 8,
    });
    builder.sphere(
      "glow",
      palette.warmLight,
      0.09,
      [x, 0.86, z],
      [1, 1, 1],
      10,
    );
  });
};

const daisDeck: Deck = ({ x, z }) => {
  const reach = Math.hypot(x, z);
  if (reach <= daisRadius) {
    return { height: daisHeight, kind: "ground" };
  }
  if (Math.abs(x) <= 0.7 && z > 0 && z <= daisRadius + 0.32) {
    return { height: daisHeight / 2, kind: "ground" };
  }
  return undefined;
};

export const orreryModel: CuriosityModel = {
  kind: "orrery",
  islandId: "ember-isle",
  name: "Great Brass Orrery",
  fact: "An orrery is a clockwork model of the Solar System. The Sun is in the middle, and the eight planets, Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus and Neptune, travel round it in their orbits. Planets nearer the Sun go round faster: Mercury takes 88 days, the Earth one year, and Neptune about 165 years!",
  curriculumLink:
    "Science, Year 5: Earth and space. Describe the movement of the Earth, and other planets, relative to the Sun in the solar system.",
  footprint: 4.6,
  setting: "inland",
  padColour: ashGround,
  signSpot: { x: -1.7, z: 3.9 },
  build: (builder) => {
    buildDais(builder);
    buildPedestal(builder);
    buildSurroundings(builder);
    if (builder.isFar) {
      /* Still stand-ins for the planets: the giants on their arms */
      [planets.jupiter, planets.saturn, planets.earth].forEach(
        ({ orbit, radius, colour, angle }) => {
          builder.sphere(
            "paint",
            colour,
            radius,
            [Math.sin(angle) * orbit, planeHeight, Math.cos(angle) * orbit],
            [1, 1, 1],
            6,
          );
        },
      );
    }
    addSignBoard(builder, [-1.7, 0, 3.9], signColour);
  },
  moving: [
    {
      name: "Mercury and Venus",
      pivot: [0, 0, 0],
      build: buildInnerPlanets,
      motion: { kind: "whirl", axis: "y", idle: 0.45, speed: 2.6, reach: 8 },
    },
    {
      name: "Earth and Mars",
      pivot: [0, 0, 0],
      build: buildEarthAndMars,
      motion: { kind: "whirl", axis: "y", idle: 0.22, speed: 1.4, reach: 8 },
    },
    {
      name: "Jupiter and Saturn",
      pivot: [0, 0, 0],
      build: buildGiants,
      motion: { kind: "whirl", axis: "y", idle: 0.08, speed: 0.6, reach: 8 },
    },
    {
      name: "Uranus and Neptune",
      pivot: [0, 0, 0],
      build: buildIceGiants,
      motion: { kind: "whirl", axis: "y", idle: 0.03, speed: 0.3, reach: 8 },
    },
  ],
  decks: [daisDeck],
  blockers: [
    { x: 0, z: 0, radius: 0.7 },
    ...[-2.2, 2.2].map((angle) => ({
      x: Math.sin(angle) * (daisRadius + 0.75),
      z: Math.cos(angle) * (daisRadius + 0.75),
      radius: 0.5,
    })),
  ] satisfies LocalBlocker[],
  tune: [72, 79, 84, 88, 91],
  play: {
    label: "Wind the orrery",
    news: "Click-click-click! You turned the brass crank and the planets swept round the glowing Sun, little Mercury zooming past while Neptune crept slowly along.",
  },
};
