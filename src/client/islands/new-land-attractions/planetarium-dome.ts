import {
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  LatheGeometry,
  OctahedronGeometry,
  TorusGeometry,
  Vector2,
} from "three";
import {
  addBench,
  addBush,
  addSignBoard,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalPoint,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const midnight = "#1b2350";
const navy = "#26346e";
const domeSilver = "#cfd6e2";
const drumWhite = "#eef1f6";
const pilasterWhite = "#dfe4ee";
const starGold = "#ffd95e";
const glowCyan = "#62f0ff";
const glowViolet = "#b58cff";
const glowWhite = "#f4f8ff";
const carpet = "#2b2550";
const seatBlue = "#3c4f9e";
const paving = "#c9ccd6";
const pathStone = "#b4b8c6";

const domeAt: LocalPoint = { x: 0, z: -1.7 };
const drumRadius = 3.6;
const drumHeight = 2.1;
const wallThickness = 0.22;
const innerRadius = drumRadius - wallThickness;
const domeRadius = drumRadius + 0.12;
const gapHalf = 0.5;
const domeTop = drumHeight + domeRadius;

const projectorPivot: Triple = [domeAt.x, 1.32, domeAt.z];
const telescopePivot: Triple = [domeAt.x, domeTop + 0.05, domeAt.z];

const seatRadius = 2.6;
const seatAngles = [Math.PI - 1.15, Math.PI - 0.55, Math.PI, Math.PI + 0.55];
const rideSeatAngle = Math.PI;

const signAt: LocalPoint = { x: 1.9, z: 7.7 };

/** A point in the dome's own frame, `angle` round from +z. */
const roundDome = (angle: number, radius: number, y: number): Triple => [
  domeAt.x + Math.sin(angle) * radius,
  y,
  domeAt.z + Math.cos(angle) * radius,
];

/** A point on the dome's sky, by bearing and height above the drum. */
const onSky = (bearing: number, elevation: number, radius: number): Triple => [
  domeAt.x + Math.sin(bearing) * Math.cos(elevation) * radius,
  drumHeight + Math.sin(elevation) * radius,
  domeAt.z + Math.cos(bearing) * Math.cos(elevation) * radius,
];

const addStar = (
  builder: AttractionBuilder,
  at: Triple,
  size: number,
  colour: string,
) => {
  builder.add("glow", colour, new OctahedronGeometry(size, 0), {
    at,
    scale: [1, 1.25, 1],
  });
};

const addBulb = (builder: AttractionBuilder, at: Triple, colour: string) => {
  builder.add("glow", colour, new IcosahedronGeometry(0.045, 0), { at });
};

/** A thin glowing ring set in the floor round the dome's middle. */
const addFloorRing = (
  builder: AttractionBuilder,
  radius: number,
  colour: string,
  segments: number,
) => {
  builder.add(
    "glow",
    colour,
    new LatheGeometry(
      [new Vector2(radius + 0.04, 0.035), new Vector2(radius - 0.04, 0.035)],
      builder.segments(segments),
    ),
    { at: [domeAt.x, 0, domeAt.z] },
  );
};

/* The drum and the dome */

const buildDrum = (builder: AttractionBuilder) => {
  const segments = builder.segments(40, 20);
  builder.add(
    "paint",
    drumWhite,
    new LatheGeometry(
      [
        [drumRadius, 0],
        [drumRadius, drumHeight],
        [innerRadius, drumHeight],
        [innerRadius, 0],
      ].map(([radius, height]) => new Vector2(radius, height)),
      segments,
      gapHalf,
      Math.PI * 2 - gapHalf * 2,
    ),
    { at: [domeAt.x, 0, domeAt.z] },
  );
  builder.add(
    "matte",
    shade(drumWhite, 0.82),
    new LatheGeometry(
      [
        [drumRadius + 0.08, 0],
        [drumRadius + 0.08, 0.3],
        [drumRadius, 0.34],
      ].map(([radius, height]) => new Vector2(radius, height)),
      segments,
      gapHalf,
      Math.PI * 2 - gapHalf * 2,
    ),
    { at: [domeAt.x, 0, domeAt.z] },
  );
  builder.add(
    "paint",
    navy,
    new LatheGeometry(
      [
        [drumRadius + 0.03, drumHeight - 0.5],
        [drumRadius + 0.03, drumHeight - 0.08],
      ].map(([radius, height]) => new Vector2(radius, height)),
      segments,
      gapHalf,
      Math.PI * 2 - gapHalf * 2,
    ),
    { at: [domeAt.x, 0, domeAt.z] },
  );
  builder.add(
    "metal",
    domeSilver,
    new TorusGeometry(domeRadius, 0.09, 5, builder.segments(40, 20)),
    {
      at: [domeAt.x, drumHeight + 0.02, domeAt.z],
      rotation: [Math.PI / 2, 0, 0],
    },
  );
  const pilasters = builder.isFar ? 8 : 16;
  for (let index = 0; index < pilasters; index++) {
    const angle =
      gapHalf + 0.1 + (index / pilasters) * (Math.PI * 2 - gapHalf * 2 - 0.2);
    builder.box(
      "paint",
      pilasterWhite,
      [0.26, drumHeight - 0.5, 0.1],
      roundDome(angle, drumRadius + 0.04, (drumHeight - 0.5) / 2),
      [0, angle, 0],
    );
    if (builder.isFar || index === pilasters - 1) {
      continue;
    }
    const between = angle + (Math.PI * 2 - gapHalf * 2 - 0.2) / pilasters / 2;
    builder.add(
      "metal",
      domeSilver,
      new CylinderGeometry(0.19, 0.19, 0.06, 10)
        .rotateX(Math.PI / 2)
        .rotateY(between),
      { at: roundDome(between, drumRadius + 0.01, 1.1) },
    );
    builder.add(
      "glow",
      index % 2 === 0 ? glowCyan : glowViolet,
      new LatheGeometry(
        [new Vector2(0.15, 0), new Vector2(0.14, 0.03), new Vector2(0, 0.04)],
        10,
      )
        .rotateX(Math.PI / 2)
        .rotateY(between),
      { at: roundDome(between, drumRadius + 0.02, 1.1) },
    );
    addStar(
      builder,
      roundDome(between, drumRadius + 0.06, drumHeight - 0.29),
      0.07,
      starGold,
    );
  }
};

const buildDome = (builder: AttractionBuilder) => {
  const rings = builder.isFar ? 5 : 10;
  const outer = Array.from({ length: rings + 1 }, (_, ring) => {
    const angle = (ring / rings) * (Math.PI / 2);
    return new Vector2(
      Math.max(0.001, Math.cos(angle) * domeRadius),
      Math.sin(angle) * domeRadius,
    );
  });
  builder.add(
    "paint",
    "#e3e8f0",
    new LatheGeometry(outer, builder.segments(32, 16)),
    { at: [domeAt.x, drumHeight, domeAt.z] },
  );
  const inner = Array.from({ length: rings + 1 }, (_, ring) => {
    const angle = ((rings - ring) / rings) * (Math.PI / 2);
    return new Vector2(
      Math.max(0.001, Math.cos(angle) * (innerRadius - 0.02)),
      Math.sin(angle) * (innerRadius - 0.02),
    );
  });
  builder.add(
    "matte",
    midnight,
    new LatheGeometry(inner, builder.segments(24, 10)),
    { at: [domeAt.x, drumHeight, domeAt.z] },
  );
  builder.add(
    "matte",
    midnight,
    new LatheGeometry(
      [
        new Vector2(innerRadius - 0.01, drumHeight),
        new Vector2(innerRadius - 0.01, 0.4),
      ],
      builder.segments(32, 12),
      gapHalf + 0.05,
      Math.PI * 2 - gapHalf * 2 - 0.1,
    ),
    { at: [domeAt.x, 0, domeAt.z] },
  );
  const ribs = builder.isFar ? 4 : 8;
  for (let rib = 0; rib < ribs; rib++) {
    const bearing = (rib / ribs) * Math.PI * 2 + Math.PI / ribs;
    builder.add(
      "metal",
      shade(domeSilver, 0.9),
      new TorusGeometry(
        domeRadius + 0.01,
        0.045,
        3,
        builder.segments(10, 6),
        Math.PI / 2 - 0.12,
      ),
      {
        at: [domeAt.x, drumHeight, domeAt.z],
        rotation: [0, bearing - Math.PI / 2, 0],
      },
    );
  }
  builder.cylinder("paint", navy, {
    radius: 0.62,
    radiusEnd: 0.5,
    length: 0.35,
    at: [domeAt.x, domeTop - 0.02, domeAt.z],
    segments: 20,
  });
  builder.cylinder("metal", domeSilver, {
    radius: 0.66,
    length: 0.06,
    at: [domeAt.x, domeTop + 0.16, domeAt.z],
    segments: 20,
  });
  if (builder.isFar) {
    return;
  }
  for (let star = 0; star < 6; star++) {
    const bearing = (star / 6) * Math.PI * 2;
    addStar(
      builder,
      [
        domeAt.x + Math.sin(bearing) * 0.58,
        domeTop - 0.02,
        domeAt.z + Math.cos(bearing) * 0.58,
      ],
      0.06,
      starGold,
    );
  }
};

/** Stars and constellations shining on the inside of the dome. */
const buildSky = (builder: AttractionBuilder) => {
  const radius = innerRadius - 0.08;
  const count = builder.isFar ? 0 : 70;
  const colours = [glowWhite, glowWhite, glowCyan, starGold, glowViolet];
  for (let star = 0; star < count; star++) {
    const share = (star + 0.5) / count;
    const elevation = Math.asin(0.12 + share * 0.86);
    const bearing = star * 2.399963;
    addStar(
      builder,
      onSky(bearing, elevation, radius),
      0.035 + (star % 4) * 0.012,
      colours[star % colours.length],
    );
  }
  if (builder.isFar) {
    return;
  }
  const plough: [number, number][] = [
    [-0.55, 0.62],
    [-0.3, 0.7],
    [-0.08, 0.72],
    [0.12, 0.8],
    [0.18, 1.0],
    [0.45, 1.02],
    [0.48, 0.82],
  ];
  const ploughPoints = plough.map(([bearing, elevation]) =>
    onSky(Math.PI + bearing, elevation, radius - 0.02),
  );
  ploughPoints.forEach((point) => {
    addStar(builder, point, 0.075, glowWhite);
  });
  ploughPoints.slice(1).forEach((point, index) => {
    builder.bar("glow", "#7ea6ff", ploughPoints[index], point, 0.015, 4);
  });
  builder.bar("glow", "#7ea6ff", ploughPoints[6], ploughPoints[3], 0.015, 4);
  const moonAt = onSky(Math.PI - 1.2, 0.5, radius - 0.05);
  builder.sphere("glow", "#fff6d6", 0.22, moonAt, [1, 1, 1], 12);
  const ringedAt = onSky(Math.PI + 1.25, 0.45, radius - 0.1);
  builder.sphere("glow", "#ffcf8a", 0.16, ringedAt, [1, 1, 1], 12);
  builder.add("glow", "#ffe6b8", new TorusGeometry(0.27, 0.02, 4, 18), {
    at: ringedAt,
    rotation: [1.2, 0.3, 0],
  });
};

/* The doorway, the porch and the inside */

const buildPorch = (builder: AttractionBuilder) => {
  const front = domeAt.z + drumRadius;
  const porchFront = front + 1.5;
  [-1, 1].forEach((side) => {
    const [x, , z] = roundDome(side * (gapHalf + 0.02), drumRadius, 0);
    builder.box(
      "paint",
      pilasterWhite,
      [0.42, drumHeight, 0.42],
      [x, drumHeight / 2, z],
      [0, side * gapHalf, 0],
    );
    builder.cylinder("paint", drumWhite, {
      radius: 0.15,
      length: drumHeight,
      at: [side * 1.55, drumHeight / 2, porchFront],
      segments: 14,
    });
    builder.cylinder("metal", domeSilver, {
      radius: 0.22,
      length: 0.16,
      at: [side * 1.55, 0.08, porchFront],
      segments: 14,
    });
    builder.cylinder("metal", domeSilver, {
      radius: 0.2,
      length: 0.12,
      at: [side * 1.55, drumHeight - 0.06, porchFront],
      segments: 14,
    });
    if (!builder.isFar) {
      [0.4, 0.8, 1.2, 1.6].forEach((up) => {
        builder.cylinder("glow", side < 0 ? glowCyan : glowViolet, {
          radius: 0.158,
          length: 0.04,
          at: [side * 1.55, up, porchFront],
          segments: 14,
          isOpen: true,
        });
      });
    }
  });
  const canopyDepth = porchFront - front + 0.55;
  builder.box(
    "paint",
    navy,
    [3.7, 0.28, canopyDepth],
    [0, drumHeight + 0.14, front + canopyDepth / 2 - 0.3],
  );
  builder.box(
    "metal",
    domeSilver,
    [3.8, 0.07, canopyDepth + 0.08],
    [0, drumHeight + 0.31, front + canopyDepth / 2 - 0.3],
  );
  const pediment = new ConeGeometry(2.2, 0.75, 3, 1);
  builder.add("paint", drumWhite, pediment, {
    at: [0, drumHeight + 0.62, porchFront + 0.18],
    rotation: [0, 0, 0],
    scale: [1, 1, 0.12],
  });
  builder.box(
    "paint",
    navy,
    [2.6, 0.32, 0.06],
    [0, drumHeight + 0.55, porchFront + 0.43],
  );
  if (!builder.isFar) {
    for (let star = 0; star < 5; star++) {
      addStar(
        builder,
        [-0.9 + star * 0.45, drumHeight + 0.56, porchFront + 0.48],
        0.07,
        starGold,
      );
    }
    for (let bulb = 0; bulb < 9; bulb++) {
      addBulb(
        builder,
        [-1.8 + bulb * 0.45, drumHeight - 0.02, porchFront + 0.25],
        bulb % 2 === 0 ? glowCyan : glowWhite,
      );
    }
  }
  builder.box(
    "matte",
    paving,
    [3.4, 0.03, porchFront - front + 0.8],
    [0, 0.015, front + (porchFront - front) / 2],
  );
  builder.cylinder("matte", carpet, {
    radius: innerRadius - 0.02,
    length: 0.03,
    at: [domeAt.x, 0.015, domeAt.z],
    segments: builder.segments(32, 12),
  });
  if (!builder.isFar) {
    addFloorRing(builder, innerRadius - 0.35, glowCyan, 40);
    addFloorRing(builder, 1.0, glowViolet, 24);
  }
};

const buildProjectorStand = (builder: AttractionBuilder) => {
  const [x, , z] = projectorPivot;
  builder.cylinder("metal", "#3a3f4a", {
    radius: 0.55,
    radiusEnd: 0.42,
    length: 0.22,
    at: [x, 0.11, z],
    segments: 20,
  });
  builder.cylinder("paint", midnight, {
    radius: 0.16,
    radiusEnd: 0.12,
    length: 0.9,
    at: [x, 0.65, z],
    segments: 12,
  });
  builder.torus("metal", domeSilver, 0.26, 0.05, [x, 1.1, z], "x", 16);
};

/** The star projector: two starry balls on a cradle, which whirls as you come close. */
const buildProjector = (builder: AttractionBuilder) => {
  builder.bar("metal", domeSilver, [-0.7, 0, 0], [0.7, 0, 0], 0.16, 12);
  builder.cylinder("paint", midnight, {
    radius: 0.2,
    length: 0.4,
    at: [0, 0, 0],
    axis: "x",
    segments: 14,
  });
  [-1, 1].forEach((side) => {
    const centre: Triple = [side * 0.78, 0, 0];
    builder.sphere(
      "metal",
      "#4a5466",
      0.36,
      centre,
      [1, 1, 1],
      builder.segments(14, 8),
    );
    if (builder.isFar) {
      return;
    }
    for (let lens = 0; lens < 14; lens++) {
      const share = (lens + 0.5) / 14;
      const up = 1 - share * 2;
      const around = lens * 2.399963;
      const flat = Math.sqrt(1 - up * up);
      const direction: Triple = [
        Math.cos(around) * flat,
        up,
        Math.sin(around) * flat,
      ];
      addStar(
        builder,
        [
          centre[0] + direction[0] * 0.35,
          centre[1] + direction[1] * 0.35,
          centre[2] + direction[2] * 0.35,
        ],
        0.05,
        lens % 3 === 0 ? glowCyan : glowWhite,
      );
    }
    builder.torus("metal", domeSilver, 0.37, 0.025, centre, "x", 20);
  });
  if (!builder.isFar) {
    builder.sphere("glow", starGold, 0.09, [0, 0.24, 0], [1, 1, 1], 8);
  }
};

/** A reclining seat for looking up at the stars, facing +z (turned by `turn`). */
const addRecliner = (
  builder: AttractionBuilder,
  at: LocalPoint,
  turn: number,
) => {
  const place = (x: number, y: number, z: number): Triple => [
    at.x + x * Math.cos(turn) + z * Math.sin(turn),
    y,
    at.z - x * Math.sin(turn) + z * Math.cos(turn),
  ];
  const rotation: Triple = [0, turn, 0];
  builder.cylinder("metal", "#3a3f4a", {
    radius: 0.12,
    length: 0.26,
    at: place(0, 0.13, 0),
    segments: 10,
  });
  builder.box(
    "paint",
    seatBlue,
    [0.66, 0.16, 0.62],
    place(0, 0.36, 0),
    rotation,
  );
  builder.box("paint", seatBlue, [0.66, 0.7, 0.14], place(0, 0.68, -0.42), [
    -0.85,
    turn,
    0,
  ]);
  builder.box("paint", seatBlue, [0.66, 0.12, 0.42], place(0, 0.3, 0.46), [
    0.35,
    turn,
    0,
  ]);
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      midnight,
      [0.08, 0.1, 0.58],
      place(side * 0.36, 0.52, -0.02),
      rotation,
    );
  });
  if (!builder.isFar) {
    builder.box(
      "paint",
      shade(seatBlue, 1.2),
      [0.42, 0.16, 0.14],
      place(0, 0.98, -0.66),
      [-0.85, turn, 0],
    );
    builder.box(
      "glow",
      glowCyan,
      [0.5, 0.025, 0.025],
      place(0, 0.29, 0.33),
      rotation,
    );
  }
};

const seatSpot = (angle: number): LocalPoint => {
  const [x, , z] = roundDome(angle, seatRadius, 0);
  return { x, z };
};

const buildSeats = (builder: AttractionBuilder) => {
  seatAngles.forEach((angle) => {
    addRecliner(builder, seatSpot(angle), angle + Math.PI);
  });
};

/* Outside: the planet walk, the kiosk, lamps and benches */

const planets: { colour: string; size: number; ring?: string }[] = [
  { colour: "#b7a99a", size: 0.07 },
  { colour: "#e8c27a", size: 0.11 },
  { colour: "#4f8fd6", size: 0.12 },
  { colour: "#c2603a", size: 0.09 },
  { colour: "#d9a873", size: 0.24 },
  { colour: "#e6cf96", size: 0.2, ring: "#d8c08a" },
  { colour: "#9fe0e6", size: 0.15 },
  { colour: "#4a6fe0", size: 0.15 },
];

const planetWalk = (index: number): LocalPoint => ({
  x: -2.5 - (index % 2) * 0.15,
  z: 3.4 + index * 0.62,
});

const buildPlanetWalk = (builder: AttractionBuilder) => {
  const sunAt = { x: -2.4, z: 2.5 };
  builder.cylinder("paint", midnight, {
    radius: 0.3,
    radiusEnd: 0.24,
    length: 0.7,
    at: [sunAt.x, 0.35, sunAt.z],
    segments: 14,
  });
  builder.sphere(
    "glow",
    "#ffb43c",
    0.42,
    [sunAt.x, 1.1, sunAt.z],
    [1, 1, 1],
    builder.segments(14, 8),
  );
  if (builder.isFar) {
    return;
  }
  planets.forEach(({ colour, size, ring }, index) => {
    const { x, z } = planetWalk(index + 1);
    builder.cylinder("paint", midnight, {
      radius: 0.1,
      radiusEnd: 0.07,
      length: 0.85,
      at: [x, 0.425, z],
      segments: 8,
    });
    builder.sphere("paint", colour, size, [x, 0.85 + size, z], [1, 1, 1], 9);
    if (ring !== undefined) {
      builder.torus(
        "paint",
        ring,
        size * 1.6,
        0.018,
        [x, 0.85 + size, z],
        "y",
        18,
      );
    }
    if (!builder.isFar) {
      builder.box(
        "metal",
        domeSilver,
        [0.16, 0.08, 0.02],
        [x + 0.08, 0.6, z],
        [0, Math.PI / 2, 0],
      );
    }
  });
};

const buildKiosk = (builder: AttractionBuilder) => {
  const at: LocalPoint = { x: 3.3, z: 3.6 };
  builder.cylinder("paint", drumWhite, {
    radius: 0.7,
    length: 1.9,
    at: [at.x, 0.95, at.z],
    segments: 18,
  });
  builder.cylinder("paint", navy, {
    radius: 0.72,
    length: 0.3,
    at: [at.x, 0.15, at.z],
    segments: 18,
  });
  builder.lathe(
    "paint",
    navy,
    [
      [0.001, 1.9],
      [0.9, 1.9],
      [0.88, 2.0],
      [0.3, 2.55],
      [0.001, 2.8],
    ],
    [at.x, 0, at.z],
    "y",
    18,
  );
  addStar(builder, [at.x, 2.98, at.z], 0.14, starGold);
  builder.box(
    "glow",
    "#ffe6a8",
    [0.7, 0.45, 0.04],
    [at.x - 0.12, 1.3, at.z + 0.68],
    [0, -0.2, 0],
  );
  builder.box(
    "paint",
    domeSilver,
    [0.8, 0.06, 0.2],
    [at.x - 0.12, 1.03, at.z + 0.72],
    [0, -0.2, 0],
  );
  if (!builder.isFar) {
    for (let bulb = 0; bulb < 10; bulb++) {
      const angle = (bulb / 10) * Math.PI * 2;
      addBulb(
        builder,
        [at.x + Math.sin(angle) * 0.86, 1.92, at.z + Math.cos(angle) * 0.86],
        bulb % 2 === 0 ? glowCyan : glowViolet,
      );
    }
  }
};

/** A lamp post with a glowing star on top. */
const addStarLamp = (builder: AttractionBuilder, at: LocalPoint) => {
  builder.cylinder("paint", midnight, {
    radius: 0.09,
    length: 0.3,
    at: [at.x, 0.15, at.z],
    segments: 10,
  });
  builder.cylinder("metal", domeSilver, {
    radius: 0.04,
    radiusEnd: 0.03,
    length: 2.3,
    at: [at.x, 1.3, at.z],
    segments: 8,
  });
  builder.sphere("glow", glowWhite, 0.15, [at.x, 2.55, at.z], [1, 1, 1], 8);
  builder.cylinder("metal", domeSilver, {
    radius: 0.17,
    radiusEnd: 0.03,
    length: 0.1,
    at: [at.x, 2.36, at.z],
    segments: 8,
  });
  addStar(builder, [at.x, 2.86, at.z], 0.09, starGold);
};

const buildGrounds = (builder: AttractionBuilder) => {
  const front = domeAt.z + drumRadius + 2.2;
  builder.box(
    "matte",
    pathStone,
    [2.4, 0.03, 8.6 - front],
    [0, 0.015, (front + 8.6) / 2],
  );
  if (!builder.isFar) {
    for (let slab = 0; slab < 7; slab++) {
      builder.box(
        "matte",
        shade(pathStone, 0.9),
        [2.4, 0.032, 0.05],
        [0, 0.016, front + 0.3 + slab * 0.62],
      );
    }
  }
  builder.cylinder("matte", paving, {
    radius: 1.6,
    length: 0.035,
    at: [0, 0.017, 5.2],
    segments: builder.segments(28, 12),
  });
  builder.add("matte", navy, new OctahedronGeometry(1.0, 0), {
    at: [0, 0.02, 5.2],
    scale: [1, 0.02, 1],
  });
  addStar(builder, [0, 0.06, 5.2], 0.18, starGold);
  buildPlanetWalk(builder);
  buildKiosk(builder);
  [
    { x: -1.6, z: 3.3 },
    { x: 1.6, z: 3.3 },
    { x: -1.6, z: 7.2 },
    { x: 1.6, z: 7.2 },
  ].forEach((at) => {
    addStarLamp(builder, at);
  });
  addBench(builder, [3.6, 0, 6.2], -Math.PI / 2, "#7d8fc4");
  addBench(builder, [-4.1, 0, 6.4], Math.PI / 2, "#7d8fc4");
  addBush(builder, [5.4, 0, -1.5], 0.6, "#2f5e46");
  addBush(builder, [4.9, 0, -5.2], 0.7, "#2f5e46");
  addSignBoard(builder, [signAt.x, 0, signAt.z], navy);
};

/** Out of the roof the telescope rises as you come close. */
const buildTelescope = (builder: AttractionBuilder) => {
  builder.cylinder("paint", drumWhite, {
    radius: 0.14,
    length: 0.9,
    at: [0, -0.1, 0],
    segments: 12,
  });
  builder.add(
    "paint",
    drumWhite,
    new LatheGeometry(
      [
        [0.001, -0.75],
        [0.17, -0.75],
        [0.15, 0.6],
        [0.2, 0.62],
        [0.2, 0.72],
        [0.001, 0.72],
      ].map(([radius, height]) => new Vector2(radius, height)),
      builder.segments(16, 8),
    ),
    { at: [0, 0.4, 0], rotation: [0.6, 0, 0] },
  );
  builder.add(
    "glass",
    "#9fd8ff",
    new LatheGeometry(
      [new Vector2(0.17, 0.73), new Vector2(0.001, 0.73)],
      builder.segments(16, 8),
    ),
    { at: [0, 0.4, 0], rotation: [0.6, 0, 0] },
  );
  builder.sphere("metal", domeSilver, 0.18, [0, 0.4, 0], [1, 1, 1], 10);
  if (!builder.isFar) {
    builder.bar("paint", navy, [0, 0.4, 0], [0, 0.58, -0.24], 0.06, 6);
    builder.sphere("glow", glowCyan, 0.05, [0, 0.62, -0.28], [1, 1, 1], 6);
  }
};

const buildDomeGlow = (builder: AttractionBuilder) => {
  builder.sphere(
    "glow",
    "#8fb4ff",
    domeRadius + 0.6,
    [0, 0, 0],
    [1, 0.75, 1],
    16,
  );
};

const buildModel = (builder: AttractionBuilder) => {
  buildGrounds(builder);
  buildDrum(builder);
  buildDome(builder);
  buildSky(builder);
  buildPorch(builder);
  if (!builder.isFar) {
    buildProjectorStand(builder);
    buildSeats(builder);
  }
};

/* The star show: hop into the middle seat and lie back */

const rideSeat = seatSpot(rideSeatAngle);
const rideStart: LocalPoint = (() => {
  const [x, , z] = roundDome(rideSeatAngle, 1.45, 0);
  return { x, z };
})();
const rideFinish: LocalPoint = { x: 1.3, z: domeAt.z + 2.0 };

const starShow = (progress: number, clockSeconds: number): LocalSpot => {
  const hop = 0.1;
  const seatY = 0.46;
  const facing = rideSeatAngle + Math.PI;
  if (progress < hop) {
    const share = progress / hop;
    return {
      x: rideStart.x + (rideSeat.x - rideStart.x) * share,
      y: seatY * share + Math.sin(share * Math.PI) * 0.4,
      z: rideStart.z + (rideSeat.z - rideStart.z) * share,
      heading: facing,
    };
  }
  if (progress > 1 - hop) {
    const share = (progress - (1 - hop)) / hop;
    return {
      x: rideSeat.x + (rideFinish.x - rideSeat.x) * share,
      y: seatY * (1 - share) + Math.sin(share * Math.PI) * 0.4,
      z: rideSeat.z + (rideFinish.z - rideSeat.z) * share,
      heading: Math.atan2(rideFinish.x - rideSeat.x, rideFinish.z - rideSeat.z),
    };
  }
  return {
    x: rideSeat.x,
    y: seatY + 0.02 * Math.sin(clockSeconds * 1.5),
    z: rideSeat.z,
    heading: facing + 0.35 * Math.sin(clockSeconds * 0.4),
  };
};

const wallBlockers: LocalBlocker[] = Array.from({ length: 14 }, (_, index) => {
  const angle =
    gapHalf + 0.25 + (index / 13) * (Math.PI * 2 - gapHalf * 2 - 0.5);
  const [x, , z] = roundDome(angle, drumRadius - 0.1, 0);
  return { x, z, radius: 0.35 };
});

export const planetariumDomeModel: NewLandAttractionModel = {
  kind: "planetarium-dome",
  islandId: "starfall-isle",
  name: "Planetarium Dome",
  fact: "Stars seem to wheel slowly across the night sky, but really it is the Earth that is spinning, once every 24 hours. That same spin gives us day when our side of the Earth faces the Sun, and night when it faces away. A planetarium shows the stars on a dome, so you can watch a whole night go by in a few minutes.",
  curriculumLink:
    "Science, Year 5: Earth and space. Use the idea of the Earth's rotation to explain day and night and the apparent movement of the Sun and stars across the sky.",
  footprint: 9,
  setting: "inland",
  signSpot: { x: signAt.x, z: signAt.z + 0.7 },
  build: buildModel,
  moving: [
    {
      name: "star-projector",
      pivot: projectorPivot,
      build: buildProjector,
      motion: { kind: "whirl", axis: "y", idle: 0.25, speed: 1.8, reach: 6 },
    },
    {
      name: "roof-telescope",
      pivot: telescopePivot,
      build: buildTelescope,
      motion: { kind: "rise", reach: 8, height: 0.9, period: 3.2 },
    },
    {
      name: "dome-glow",
      pivot: [domeAt.x, drumHeight, domeAt.z],
      build: buildDomeGlow,
      motion: { kind: "wake", reach: 10 },
      look: "halo",
    },
  ],
  blockers: [
    ...wallBlockers,
    { x: projectorPivot[0], z: projectorPivot[2], radius: 0.5 },
    { x: 3.3, z: 3.6, radius: 0.8 },
  ],
  rides: [
    {
      id: "star-show",
      name: "the star show",
      start: rideStart,
      reach: 0.6,
      seconds: 14,
      finish: rideFinish,
      follow: starShow,
    },
  ],
  tune: [60, 60, 67, 67, 69, 69, 67, 65, 65, 64, 64, 62, 62, 60],
  play: {
    label: "Start the star show",
    news: "The lights dimmed, the projector whirred, and the dome filled with twinkling stars, wheeling slowly overhead just as they seem to while the Earth spins.",
  },
};
