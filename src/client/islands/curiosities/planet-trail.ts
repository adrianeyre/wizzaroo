import { TorusGeometry } from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalPoint,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const postSilver = "#c3cad6";
const plinthNavy = "#2b3566";
const pathStone = "#9a96b0";
const sunGold = "#ffcf4a";
const sunFlare = "#ffa63a";
const plateCream = "#efe8d6";
const starGlow = "#cfe2ff";
const signColour = "#2f3a86";

/* Planets stand round an arc, further apart the further from the Sun. */
const trailRadius = 3.6;
const pathRadius = 2.8;
const sunAngle = (225 / 180) * Math.PI;

/** A spot on a circle round the middle, by its angle from local +z. */
const spotAt = (radius: number, degrees: number): LocalPoint => {
  const angle = (degrees / 180) * Math.PI;
  return { x: Math.sin(angle) * radius, z: Math.cos(angle) * radius };
};

const sunSpot: LocalPoint = {
  x: Math.sin(sunAngle) * trailRadius,
  z: Math.cos(sunAngle) * trailRadius,
};
const sunRadius = 0.68;
const sunAt: Triple = [sunSpot.x, 1.55, sunSpot.z];

interface Planet {
  name: string;
  degrees: number;
  radius: number;
  colour: string;
}

const planets: readonly Planet[] = [
  { name: "Mercury", degrees: 204, radius: 0.12, colour: "#a8a29a" },
  { name: "Venus", degrees: 189, radius: 0.19, colour: "#e8c98a" },
  { name: "Earth", degrees: 173, radius: 0.2, colour: "#3a7fd0" },
  { name: "Mars", degrees: 156, radius: 0.15, colour: "#c4532e" },
  { name: "Jupiter", degrees: 132, radius: 0.48, colour: "#d9b48a" },
  { name: "Saturn", degrees: 103, radius: 0.38, colour: "#e6cf96" },
  { name: "Uranus", degrees: 76, radius: 0.28, colour: "#9edfe6" },
  { name: "Neptune", degrees: 52, radius: 0.27, colour: "#3a5ad8" },
];

const planetSpot = (planet: Planet): LocalPoint =>
  spotAt(trailRadius, planet.degrees);

/** Where a planet's middle is, perched on its post. */
const planetAt = (planet: Planet): Triple => {
  const { x, z } = planetSpot(planet);
  return [x, 1.05 + planet.radius, z];
};

const findPlanet = (name: string): Planet =>
  planets.find((planet) => planet.name === name) ?? planets[0];

const earth = findPlanet("Earth");
const mars = findPlanet("Mars");
const jupiter = findPlanet("Jupiter");
const saturn = findPlanet("Saturn");

/** Turns a plate at a spot to face the path in the middle. */
const faceInwards = ({ x, z }: LocalPoint): number => Math.atan2(-x, -z);

const buildSun = (builder: AttractionBuilder) => {
  const { x, z } = sunSpot;
  builder.cylinder("paint", plinthNavy, {
    radius: 0.6,
    radiusEnd: 0.45,
    length: 0.7,
    at: [x, 0.35, z],
    segments: builder.isFar ? 10 : 24,
  });
  builder.sphere(
    "glow",
    sunGold,
    sunRadius,
    sunAt,
    [1, 1, 1],
    builder.isFar ? 12 : 20,
  );
  if (builder.isFar) {
    return;
  }
  builder.cylinder("metal", postSilver, {
    radius: 0.12,
    length: 0.35,
    at: [x, 0.85, z],
    segments: 12,
  });
  builder.torus("metal", postSilver, 0.62, 0.04, [x, 0.72, z], "y", 28);
  /* Swirls of hotter gas on the Sun's face */
  for (let patch = 0; patch < 5; patch++) {
    const heading = patch * 0.9;
    const tilt = ((patch % 4) - 1.5) * 0.45;
    builder.sphere(
      "glow",
      sunFlare,
      0.14,
      [
        sunAt[0] + Math.sin(heading) * Math.cos(tilt) * sunRadius * 0.93,
        sunAt[1] + Math.sin(tilt) * sunRadius * 0.93,
        sunAt[2] + Math.cos(heading) * Math.cos(tilt) * sunRadius * 0.93,
      ],
      [1, 0.6, 1],
      6,
    );
  }
  /* A plaque: the start of the trail */
  const turn = faceInwards(sunSpot);
  builder.box(
    "paint",
    sunFlare,
    [0.5, 0.3, 0.04],
    [x + Math.sin(turn) * 0.62, 0.45, z + Math.cos(turn) * 0.62],
    [-0.3, turn, 0],
  );
};

/** Spiky glowing flares that reach out of the Sun when someone comes near. */
const buildCorona = (builder: AttractionBuilder) => {
  const rays = 18;
  for (let ray = 0; ray < rays; ray++) {
    const heading = ray * 2.39996;
    const height = 1 - (2 * (ray + 0.5)) / rays;
    const across = Math.sqrt(1 - height * height);
    const direction: Triple = [
      Math.sin(heading) * across,
      height,
      Math.cos(heading) * across,
    ];
    const from: Triple = [
      direction[0] * (sunRadius - 0.05),
      direction[1] * (sunRadius - 0.05),
      direction[2] * (sunRadius - 0.05),
    ];
    const length = ray % 2 === 0 ? 0.5 : 0.32;
    const to: Triple = [
      direction[0] * (sunRadius + length),
      direction[1] * (sunRadius + length),
      direction[2] * (sunRadius + length),
    ];
    builder.bar("glow", ray % 3 === 0 ? sunFlare : sunGold, from, to, 0.08, 4);
  }
};

const buildPost = (builder: AttractionBuilder, planet: Planet) => {
  const spot = planetSpot(planet);
  const top = 1.05;
  if (builder.isFar) {
    builder.box(
      "metal",
      postSilver,
      [0.08, top, 0.08],
      [spot.x, top / 2, spot.z],
    );
    return;
  }
  builder.cylinder("paint", plinthNavy, {
    radius: 0.24,
    radiusEnd: 0.18,
    length: 0.2,
    at: [spot.x, 0.1, spot.z],
    segments: 10,
  });
  builder.cylinder("metal", postSilver, {
    radius: 0.045,
    length: top - 0.2,
    at: [spot.x, 0.2 + (top - 0.2) / 2, spot.z],
    segments: 8,
  });
  /* A little cradle the planet sits in */
  builder.cylinder("metal", postSilver, {
    radius: Math.min(0.14, planet.radius * 0.6),
    radiusEnd: 0.04,
    length: 0.06,
    at: [spot.x, top - 0.01, spot.z],
    segments: 12,
  });
  /* A name plate facing the path, with the planet's colour and its number */
  const turn = faceInwards(spot);
  const plate: Triple = [
    spot.x + Math.sin(turn) * 0.22,
    0.62,
    spot.z + Math.cos(turn) * 0.22,
  ];
  builder.bar(
    "metal",
    postSilver,
    [spot.x, 0.55, spot.z],
    [plate[0], 0.55, plate[2]],
    0.025,
    4,
  );
  builder.box("paint", plateCream, [0.4, 0.22, 0.03], plate, [-0.35, turn, 0]);
  const side: Triple = [Math.cos(turn), 0, -Math.sin(turn)];
  builder.sphere(
    "paint",
    planet.colour,
    0.045,
    [
      plate[0] - side[0] * 0.12 + Math.sin(turn) * 0.025,
      plate[1] + 0.01,
      plate[2] - side[2] * 0.12 + Math.cos(turn) * 0.025,
    ],
    [1, 1, 0.5],
    6,
  );
  [0.04, -0.03].forEach((up, line) => {
    builder.box(
      "paint",
      plinthNavy,
      [0.2 - line * 0.06, 0.025, 0.01],
      [
        plate[0] + side[0] * 0.05 + Math.sin(turn) * 0.018,
        plate[1] + up,
        plate[2] + side[2] * 0.05 + Math.cos(turn) * 0.018,
      ],
      [-0.35, turn, 0],
    );
  });
};

/** A planet whose bands are rings of colour round its middle. */
const addBands = (
  builder: AttractionBuilder,
  at: Triple,
  radius: number,
  bands: readonly (readonly [number, string])[],
) => {
  bands.forEach(([height, colour]) => {
    const y = height * radius;
    builder.cylinder("paint", colour, {
      radius: Math.sqrt(radius * radius - y * y) + 0.006,
      length: radius * 0.14,
      at: [at[0], at[1] + y, at[2]],
      segments: 16,
      isOpen: true,
    });
  });
};

const buildStillPlanets = (builder: AttractionBuilder) => {
  planets.forEach((planet) => {
    buildPost(builder, planet);
    const isMoving = planet === earth || planet === mars || planet === jupiter;
    if (isMoving && !builder.isFar) {
      return;
    }
    const at = planetAt(planet);
    const segments = builder.isFar
      ? 8
      : planet.radius > 0.3
        ? 20
        : planet.radius > 0.18
          ? 16
          : 12;
    builder.sphere(
      "paint",
      planet.colour,
      planet.radius,
      at,
      [1, 1, 1],
      segments,
    );
    if (builder.isFar) {
      return;
    }
    if (planet.name === "Mercury") {
      [
        [0.6, 0.4, 0.66],
        [-0.3, 0.2, 0.93],
        [0.2, -0.5, 0.84],
      ].forEach(([dx, dy, dz]) => {
        builder.sphere(
          "matte",
          shade(planet.colour, 0.7),
          0.03,
          [
            at[0] + dx * planet.radius,
            at[1] + dy * planet.radius,
            at[2] + dz * planet.radius,
          ],
          [1, 1, 1],
          5,
        );
      });
    }
    if (planet.name === "Venus") {
      addBands(builder, at, planet.radius, [
        [0.35, shade(planet.colour, 1.1)],
        [-0.3, shade(planet.colour, 0.9)],
      ]);
    }
    if (planet.name === "Uranus") {
      builder.torus(
        "paint",
        shade(planet.colour, 0.8),
        planet.radius + 0.12,
        0.012,
        at,
        "x",
        16,
      );
    }
    if (planet.name === "Neptune") {
      builder.sphere(
        "paint",
        shade(planet.colour, 0.6),
        0.06,
        [at[0] + 0.1, at[1] - 0.05, at[2] + 0.23],
        [1, 0.6, 0.6],
        6,
      );
      addBands(builder, at, planet.radius, [[0.4, shade(planet.colour, 1.15)]]);
    }
  });
  /* Saturn's rings, tilted as they really are */
  const at = planetAt(saturn);
  if (builder.isFar) {
    builder.cylinder("paint", shade(saturn.colour, 0.9), {
      radius: saturn.radius + 0.36,
      length: 0.02,
      at,
      segments: 12,
    });
    return;
  }
  addBands(builder, at, saturn.radius, [
    [0.45, shade(saturn.colour, 0.85)],
    [0.15, shade(saturn.colour, 1.08)],
    [-0.25, shade(saturn.colour, 0.9)],
  ]);
  (
    [
      [saturn.radius + 0.17, 0.12, "#d8c28e"],
      [saturn.radius + 0.38, 0.08, "#bfa678"],
    ] satisfies [number, number, string][]
  ).forEach(([ringRadius, tube, colour]) => {
    builder.add(
      "paint",
      colour,
      new TorusGeometry(ringRadius, tube, 4, 30)
        .scale(1, 1, 0.12)
        .rotateX(Math.PI / 2)
        .rotateZ(0.47),
      { at },
    );
  });
};

const buildEarth = (builder: AttractionBuilder) => {
  const radius = earth.radius;
  builder.sphere("paint", earth.colour, radius, [0, 0, 0], [1, 1, 1], 16);
  /* Green and brown land, and white ice caps */
  (
    [
      [0.5, 0.3, 0.81, 0.09],
      [-0.6, -0.1, 0.79, 0.08],
      [0.1, -0.5, -0.86, 0.1],
      [-0.4, 0.4, -0.82, 0.07],
      [0.85, -0.2, -0.48, 0.07],
    ] satisfies [number, number, number, number][]
  ).forEach(([dx, dy, dz, size], index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? "#4f9a4a" : "#8a9a4a",
      size,
      [dx * radius * 0.95, dy * radius * 0.95, dz * radius * 0.95],
      [1, 0.8, 1],
      6,
    );
  });
  [-1, 1].forEach((pole) => {
    builder.sphere(
      "matte",
      palette.white,
      radius * 0.45,
      [0, pole * radius * 0.86, 0],
      [1, 0.4, 1],
      8,
    );
  });
  /* The Moon on its arm */
  builder.bar("metal", postSilver, [0, 0, 0], [0.42, 0.06, 0], 0.012, 3);
  builder.sphere("matte", "#cfcfd6", 0.06, [0.45, 0.06, 0], [1, 1, 1], 8);
};

const buildMars = (builder: AttractionBuilder) => {
  builder.sphere("paint", mars.colour, mars.radius, [0, 0, 0], [1, 1, 1], 14);
  builder.sphere(
    "matte",
    palette.white,
    mars.radius * 0.45,
    [0, mars.radius * 0.85, 0],
    [1, 0.4, 1],
    8,
  );
  builder.sphere(
    "matte",
    shade(mars.colour, 0.7),
    0.05,
    [0.08, 0.02, 0.11],
    [1, 0.6, 0.6],
    6,
  );
};

const buildJupiter = (builder: AttractionBuilder) => {
  const radius = jupiter.radius;
  builder.sphere("paint", jupiter.colour, radius, [0, 0, 0], [1, 1, 1], 20);
  addBands(builder, [0, 0, 0], radius, [
    [0.62, "#b98a5e"],
    [0.32, "#f0dcc0"],
    [0.08, "#a9744a"],
    [-0.2, "#f0dcc0"],
    [-0.45, "#b98a5e"],
    [-0.72, "#c9a07a"],
  ]);
  /* The Great Red Spot, a storm bigger than the Earth */
  builder.sphere(
    "paint",
    "#c4532e",
    0.1,
    [0.16, -0.16, radius * 0.88],
    [1.3, 0.7, 0.45],
    10,
  );
};

const buildTrail = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  /* Stepping stones along the path, from the Sun out past Neptune */
  for (let stone = 0; stone < 16; stone++) {
    const degrees = 214 - stone * 11.5;
    const { x, z } = spotAt(pathRadius + ((stone % 3) - 1) * 0.08, degrees);
    builder.cylinder(
      "matte",
      stone % 2 === 0 ? pathStone : shade(pathStone, 0.88),
      {
        radius: 0.3,
        radiusEnd: 0.33,
        length: 0.06,
        at: [x, 0.03, z],
        segments: 10,
      },
    );
  }
  /* Tiny starlights between the stones */
  for (let light = 0; light < 7; light++) {
    const degrees = 206 - light * 25;
    const { x, z } = spotAt(pathRadius - 0.55, degrees);
    builder.cylinder("metal", postSilver, {
      radius: 0.02,
      length: 0.2,
      at: [x, 0.1, z],
      segments: 4,
    });
    builder.sphere("glow", starGlow, 0.05, [x, 0.22, z], [1, 1, 1], 6);
  }
  /* A bench in the middle to sit and count the planets */
  builder.box(
    "paint",
    plinthNavy,
    [1.2, 0.08, 0.4],
    [0.2, 0.42, 0.1],
    [0, 0.6, 0],
  );
  [-0.45, 0.45].forEach((along) => {
    builder.box(
      "metal",
      postSilver,
      [0.06, 0.4, 0.34],
      [0.2 + Math.cos(0.6) * along, 0.2, 0.1 - Math.sin(0.6) * along],
      [0, 0.6, 0],
    );
  });
};

export const planetTrailModel: CuriosityModel = {
  kind: "planet-trail",
  islandId: "starfall-isle",
  name: "Planet Trail",
  fact: "Eight planets travel round the Sun, each on its own path called an orbit. In order from the Sun they are Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus and Neptune. The further a planet is from the Sun, the longer it takes to go round once: a year on Neptune lasts about 165 Earth years!",
  curriculumLink:
    "Science, Year 5: Earth and space. Describe the movement of the Earth, and other planets, relative to the Sun in the solar system.",
  footprint: 4.6,
  setting: "inland",
  signSpot: { x: -1.1, z: 3.6 },
  build: (builder) => {
    buildSun(builder);
    buildStillPlanets(builder);
    buildTrail(builder);
    addSignBoard(builder, [-1.1, 0, 3.6], signColour);
  },
  moving: [
    {
      name: "solar flares",
      pivot: sunAt,
      build: buildCorona,
      motion: { kind: "wake", reach: 7 },
    },
    {
      name: "Earth",
      pivot: planetAt(earth),
      build: buildEarth,
      motion: { kind: "spin", axis: "y", speed: 0.9 },
    },
    {
      name: "Mars",
      pivot: planetAt(mars),
      build: buildMars,
      motion: { kind: "spin", axis: "y", speed: 0.85 },
    },
    {
      name: "Jupiter",
      pivot: planetAt(jupiter),
      build: buildJupiter,
      motion: { kind: "spin", axis: "y", speed: 2.2 },
    },
  ],
  blockers: [
    { x: sunSpot.x, z: sunSpot.z, radius: 0.75 },
    ...planets.map((planet) => ({
      ...planetSpot(planet),
      radius: planet.radius > 0.3 ? 0.4 : 0.3,
    })),
    { x: 0.2, z: 0.1, radius: 0.55 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Walk the solar system",
    news: "Zoom! You strode from the blazing Sun past all eight planets, from little Mercury out to icy blue Neptune.",
    tune: [60, 62, 64, 65, 67, 69, 71, 72],
  },
};
