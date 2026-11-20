import { RingGeometry, TorusGeometry } from "three";
import {
  addSignBoard,
  listRingPoints,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type MovingPart,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const frameNavy = "#26306e";
const frameSilver = "#c9cfd8";
const plinthStone = "#a9a5bd";
const wireGrey = "#8e95a6";
const starWhite = "#fff8d8";
const starBlue = "#bfe2ff";
const starRed = "#ffb08a";
const lineGlow = "#8fdcff";
const pathColour = "#c7c1d8";
const flowerPurple = "#9a6bdc";
const signColour = "#2b2f6b";

const frameWidth = 2.7;
const postHeight = 2.4;
const archRadius = frameWidth / 2;
const middleHeight = 1.85;
const crossbarHeight = 2.95;

interface Star {
  x: number;
  y: number;
  size: number;
  colour: string;
}

interface Constellation {
  name: string;
  at: { x: number; z: number };
  /** Which way the frame faces: 0 faces +z. */
  turn: number;
  stars: readonly Star[];
  lines: readonly [number, number][];
  colour: string;
}

const star = (x: number, y: number, size = 0.09, colour = starWhite): Star => ({
  x,
  y,
  size,
  colour,
});

/* Each pattern is drawn as seen looking up at the night sky. */
const constellations: readonly Constellation[] = [
  {
    name: "the Plough",
    at: { x: 0, z: -2.75 },
    turn: 0,
    colour: "#4a3a9c",
    stars: [
      star(-1.08, 2.2, 0.085),
      star(-0.66, 2.38, 0.09),
      star(-0.24, 2.32, 0.095),
      star(0.16, 2.15, 0.07),
      star(0.26, 1.62, 0.085),
      star(0.98, 1.52, 0.09),
      star(1.02, 2.12, 0.1),
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 3],
    ],
  },
  {
    name: "Orion",
    at: { x: -2.75, z: -0.35 },
    turn: Math.PI / 2 - 0.25,
    colour: "#2f5a9c",
    stars: [
      star(-0.62, 2.5, 0.12, starRed),
      star(0.55, 2.4, 0.09),
      star(-0.26, 1.64, 0.08),
      star(0.0, 1.72, 0.085),
      star(0.26, 1.8, 0.08),
      star(-0.5, 0.85, 0.085),
      star(0.66, 0.95, 0.12, starBlue),
      star(0.0, 2.8, 0.06),
    ],
    lines: [
      [0, 2],
      [1, 4],
      [2, 3],
      [3, 4],
      [2, 5],
      [4, 6],
      [0, 7],
      [7, 1],
    ],
  },
  {
    name: "Cassiopeia",
    at: { x: 2.75, z: -0.35 },
    turn: -Math.PI / 2 + 0.25,
    colour: "#6a3a8c",
    stars: [
      star(-1.0, 2.15, 0.09),
      star(-0.5, 1.5, 0.095),
      star(0.0, 1.98, 0.1),
      star(0.5, 1.45, 0.09),
      star(1.0, 2.2, 0.085),
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
];

/** A point in a frame's own plane (x across, y up, z out of its face). */
const framePoint = (
  { at, turn }: Constellation,
  x: number,
  y: number,
  z = 0,
): Triple => [
  at.x + x * Math.cos(turn) + z * Math.sin(turn),
  y,
  at.z - x * Math.sin(turn) + z * Math.cos(turn),
];

const pivotOf = (constellation: Constellation): Triple =>
  framePoint(constellation, 0, middleHeight);

/** A point in a frame's plane, measured from its pivot (for its stars). */
const fromPivot = (
  constellation: Constellation,
  x: number,
  y: number,
  z = 0,
): Triple => {
  const [px, py, pz] = pivotOf(constellation);
  const [wx, wy, wz] = framePoint(constellation, x, y, z);
  return [wx - px, wy - py, wz - pz];
};

/** The frame: two posts, an arch, wires for the stars, and a name plinth. */
const buildFrame = (
  builder: AttractionBuilder,
  constellation: Constellation,
) => {
  const { turn, colour } = constellation;
  const rotation: Triple = [0, turn, 0];
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      frameNavy,
      [0.14, postHeight, 0.14],
      framePoint(constellation, side * archRadius, postHeight / 2),
      rotation,
    );
  });
  builder.add(
    "paint",
    frameNavy,
    new TorusGeometry(archRadius, 0.07, 6, builder.isFar ? 8 : 24, Math.PI),
    { at: framePoint(constellation, 0, postHeight), rotation },
  );
  if (builder.isFar) {
    return;
  }
  /* Silver caps, feet and a crossbar the stars hang from */
  [-1, 1].forEach((side) => {
    builder.box(
      "metal",
      frameSilver,
      [0.24, 0.12, 0.24],
      framePoint(constellation, side * archRadius, 0.06),
      rotation,
    );
    builder.box(
      "metal",
      frameSilver,
      [0.2, 0.06, 0.2],
      framePoint(constellation, side * archRadius, postHeight),
      rotation,
    );
  });
  builder.box(
    "metal",
    frameSilver,
    [
      2 * Math.sqrt(archRadius ** 2 - (crossbarHeight - postHeight) ** 2),
      0.05,
      0.05,
    ],
    framePoint(constellation, 0, crossbarHeight, 0),
    rotation,
  );
  builder.sphere(
    "metal",
    frameSilver,
    0.1,
    framePoint(constellation, 0, postHeight + archRadius + 0.05),
    [1, 1, 1],
    10,
  );
  /* Small silver studs where the stars hang, seen by day */
  constellation.stars.forEach(({ x, y }) => {
    const top =
      y > 2.6
        ? Math.min(
            postHeight + Math.sqrt(Math.max(0, archRadius ** 2 - x * x)) - 0.03,
            3.6,
          )
        : crossbarHeight;
    builder.bar(
      "metal",
      wireGrey,
      framePoint(constellation, x, top),
      framePoint(constellation, x, y + 0.05),
      0.01,
      3,
    );
    builder.sphere(
      "metal",
      frameSilver,
      0.05,
      framePoint(constellation, x, y),
      [1, 1, 1],
      8,
    );
  });
  /* A little plinth in front with a plaque in the constellation's colour */
  const plinth = framePoint(constellation, 0, 0, 0.95);
  builder.cylinder("matte", plinthStone, {
    radius: 0.22,
    radiusEnd: 0.18,
    length: 0.75,
    at: [plinth[0], 0.375, plinth[2]],
    segments: 12,
  });
  builder.box(
    "matte",
    shade(plinthStone, 0.85),
    [0.52, 0.06, 0.4],
    [plinth[0], 0.78, plinth[2]],
    rotation,
  );
  builder.box(
    "paint",
    colour,
    [0.46, 0.05, 0.34],
    framePoint(constellation, 0, 0.83, 0.95),
    [-0.35, turn, 0],
  );
  /* Tiny stars on the plaque in the same pattern */
  constellation.stars.forEach(({ x, y }) => {
    builder.box(
      "glow",
      starWhite,
      [0.025, 0.012, 0.025],
      framePoint(
        constellation,
        x * 0.17,
        0.86 + (y - 1.8) * 0.06,
        0.95 - (y - 1.8) * 0.15,
      ),
      rotation,
    );
  });
};

/** The glowing stars and the lines that join them, for one frame. */
const buildStars = (
  builder: AttractionBuilder,
  constellation: Constellation,
) => {
  const rotation: Triple = [0, constellation.turn, 0];
  constellation.stars.forEach(({ x, y, size, colour }) => {
    const at = fromPivot(constellation, x, y, 0.02);
    builder.sphere("glow", colour, size, at, [1, 1, 1], 8);
    /* Four little points of twinkle */
    builder.box("glow", colour, [size * 3.2, size * 0.35, 0.02], at, [
      rotation[0],
      rotation[1],
      0,
    ]);
    builder.box("glow", colour, [size * 0.35, size * 3.2, 0.02], at, rotation);
  });
  constellation.lines.forEach(([from, to]) => {
    const start = constellation.stars[from];
    const end = constellation.stars[to];
    builder.bar(
      "glow",
      lineGlow,
      fromPivot(constellation, start.x, start.y, 0.01),
      fromPivot(constellation, end.x, end.y, 0.01),
      0.022,
      4,
    );
  });
};

const buildGrounds = (builder: AttractionBuilder) => {
  builder.add(
    "matte",
    pathColour,
    new RingGeometry(0.001, 1.6, builder.isFar ? 12 : 40, 1).rotateX(
      -Math.PI / 2,
    ),
    { at: [0, 0.02, 0] },
  );
  builder.box("matte", pathColour, [1.1, 0.04, 2.8], [0, 0.02, 2.9]);
  if (builder.isFar) {
    return;
  }
  /* A compass star set into the middle of the paving, pointing north */
  [0, Math.PI / 2].forEach((angle) => {
    builder.box(
      "paint",
      frameNavy,
      [0.18, 0.02, 2.2],
      [0, 0.035, 0],
      [0, angle, 0],
    );
  });
  builder.cylinder("glow", "#ffe58a", {
    radius: 0.12,
    length: 0.03,
    at: [0, 0.045, 0],
    segments: 5,
  });
  builder.cylinder("paint", frameSilver, {
    radius: 1.6,
    length: 0.05,
    at: [0, 0.03, 0],
    segments: 40,
    isOpen: true,
  });
  /* Reclining star-gazing seats */
  [
    { x: 1.75, z: 1.55, turn: 0.75 + Math.PI },
    { x: -1.75, z: 1.55, turn: -0.75 + Math.PI },
  ].forEach(({ x, z, turn }) => {
    const place = (dx: number, dy: number, dz: number): Triple => [
      x + dx * Math.cos(turn) + dz * Math.sin(turn),
      dy,
      z - dx * Math.sin(turn) + dz * Math.cos(turn),
    ];
    builder.box("paint", frameNavy, [0.6, 0.08, 0.8], place(0, 0.32, 0.2), [
      0,
      turn,
      0,
    ]);
    builder.box("paint", frameNavy, [0.6, 0.08, 0.75], place(0, 0.58, -0.45), [
      0.7,
      turn,
      0,
    ]);
    builder.box("matte", "#7c6bc9", [0.5, 0.06, 0.6], place(0, 0.38, 0.2), [
      0,
      turn,
      0,
    ]);
    [-0.25, 0.25].forEach((side) => {
      builder.box(
        "metal",
        frameSilver,
        [0.05, 0.3, 0.05],
        place(side, 0.15, 0.5),
        [0, turn, 0],
      );
      builder.box(
        "metal",
        frameSilver,
        [0.05, 0.3, 0.05],
        place(side, 0.15, -0.1),
        [0, turn, 0],
      );
    });
  });
  /* Night-scented flowers and little glowing toadstool lamps round the edge */
  listRingPoints(4.55, 16).forEach((point, index) => {
    if (point.z > 3.2) {
      return;
    }
    builder.sphere(
      "matte",
      index % 2 === 0 ? palette.hedge : shade(palette.hedge, 1.15),
      0.24,
      [point.x, 0.14, point.z],
      [1.2, 0.7, 1],
      8,
    );
    builder.sphere(
      "paint",
      index % 3 === 0 ? flowerPurple : "#d6c2ff",
      0.06,
      [point.x + 0.08, 0.32, point.z],
      [1, 1, 1],
      6,
    );
  });
  [
    [-1.2, 3.6],
    [1.2, 3.6],
    [-3.6, 2.2],
    [3.6, 2.2],
  ].forEach(([x, z]) => {
    builder.cylinder("paint", frameSilver, {
      radius: 0.04,
      length: 0.35,
      at: [x, 0.175, z],
      segments: 6,
    });
    builder.sphere("glow", starBlue, 0.12, [x, 0.38, z], [1, 0.55, 1], 10);
  });
};

const starParts: MovingPart[] = constellations.map((constellation) => ({
  name: `stars-${constellation.name.replace("the ", "").toLowerCase()}`,
  pivot: pivotOf(constellation),
  build: (builder: AttractionBuilder) => {
    buildStars(builder, constellation);
  },
  motion: { kind: "wake", reach: 7 },
}));

export const constellationGardenModel: CuriosityModel = {
  kind: "constellation-garden",
  islandId: "starfall-isle",
  name: "Constellation Garden",
  fact: "A constellation is a group of stars that makes a pattern in the night sky, like the Plough, Orion the hunter and the W of Cassiopeia. The stars seem to wheel slowly across the sky each night, but it is really the Earth that is spinning. Stars are suns, so far away that they look like tiny points of light.",
  curriculumLink:
    "Science, Year 5: Earth and space. Use the idea of the Earth's rotation to explain day and night and the apparent movement of the Sun and stars across the sky.",
  footprint: 5,
  setting: "inland",
  signSpot: { x: 1.7, z: 4.2 },
  build: (builder) => {
    buildGrounds(builder);
    constellations.forEach((constellation) => {
      buildFrame(builder, constellation);
    });
    addSignBoard(builder, [1.7, 0, 4.2], signColour);
  },
  moving: starParts,
  blockers: constellations.flatMap((constellation) => {
    const left = framePoint(constellation, -archRadius, 0);
    const right = framePoint(constellation, archRadius, 0);
    const plinth = framePoint(constellation, 0, 0, 0.95);
    return [
      { x: left[0], z: left[2], radius: 0.25 },
      { x: right[0], z: right[2], radius: 0.25 },
      { x: plinth[0], z: plinth[2], radius: 0.3 },
    ];
  }) satisfies LocalBlocker[],
  play: {
    label: "Find the Plough",
    news: "There it is! Seven bright stars make the Plough, and the two at its end point the way to the North Star.",
  },
};
