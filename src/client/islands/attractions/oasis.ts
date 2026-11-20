import {
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  Euler,
  IcosahedronGeometry,
  LatheGeometry,
  Quaternion,
  Vector2,
  Vector3,
} from "three";
import {
  addBush,
  addSignBoard,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionModel,
  type LocalBlocker,
  type Motion,
  type MovingPart,
  type Triple,
} from "./attraction-kit.js";

const sand = "#e3c690";
const dampSand = "#c7a46e";
const sandstone = "#c99a62";
const oasisGrass = "#7f9a3f";
const poolWater = "#2b9fb8";
const poolDeep = "#2a7d84";
const trunkBrown = "#8a6a45";
const trunkDark = "#6c5034";
const frondGreen = "#4f8236";
const frondLight = "#62953e";
const frondDry = "#a88a4f";
const dates = "#b5612a";
const reed = "#6f8f3a";
const tentCloth = "#3b2e28";
const tentStripe = "#c9b08a";
const rugRed = "#9e2f2a";
const rugGold = "#d9a441";
const rugIndigo = "#2f3f6e";
const camelCoat = "#c89a63";
const signTerracotta = "#a8532f";

/* ------------------------------------------------------------------ */
/* Little geometry helpers                                             */
/* ------------------------------------------------------------------ */

const upright = new Vector3(0, 1, 0);

/** A tapered round bar from one point to another. */
const addTaperedBar = (
  builder: AttractionBuilder,
  finish: "matte" | "paint",
  colour: string,
  from: Triple,
  to: Triple,
  radiusFrom: number,
  radiusTo: number,
  segments: number,
): void => {
  const start = new Vector3(...from);
  const direction = new Vector3(...to).sub(start);
  const turn = new Euler().setFromQuaternion(
    new Quaternion().setFromUnitVectors(upright, direction.clone().normalize()),
  );
  const middle = start.add(direction.clone().multiplyScalar(0.5));
  builder.add(
    finish,
    colour,
    new CylinderGeometry(
      radiusTo,
      radiusFrom,
      direction.length(),
      builder.segments(segments, Math.max(4, Math.round(segments / 2))),
    ),
    { at: [middle.x, middle.y, middle.z], rotation: [turn.x, turn.y, turn.z] },
  );
};

/** A geometry from points and triangles, drawn from both sides. */
const makeTwoSided = (
  points: readonly Triple[],
  triangles: readonly [number, number, number][],
): BufferGeometry => {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(points.flat()), 3),
  );
  geometry.setIndex(
    triangles.flatMap(([first, second, third]) => [
      first,
      second,
      third,
      first,
      third,
      second,
    ]),
  );
  return geometry;
};

const addLump = (
  builder: AttractionBuilder,
  colour: string,
  at: Triple,
  size: Triple,
  seed: number,
  detail = 1,
): void => {
  const geometry = new IcosahedronGeometry(1, builder.isFar ? 0 : detail);
  const positions = geometry.getAttribute("position");
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const lump =
      1 +
      0.14 * Math.sin(x * 3.9 + seed) * Math.cos(z * 3.3 + seed * 1.4) +
      0.08 * Math.sin(y * 5.1 + seed * 0.6);
    positions.setXYZ(index, x * lump, y * lump, z * lump);
  }
  builder.add("matte", colour, geometry, {
    at,
    rotation: [0, seed * 1.7, 0],
    scale: size,
  });
};

/** A soft mound (a dune or a snowdrift), round in plan and stretched along x. */
const addMound = (
  builder: AttractionBuilder,
  colour: string,
  at: Triple,
  size: number,
  height: number,
): void => {
  const profile: readonly [number, number][] = [
    [1, 0],
    [0.82, 0.32],
    [0.55, 0.78],
    [0.25, 0.97],
    [0, 1],
  ];
  builder.add(
    "matte",
    colour,
    new LatheGeometry(
      profile.map(([radius, up]) => new Vector2(radius * size, up * height)),
      builder.segments(14, 8),
    ),
    { at, scale: [1.5, 1, 1] },
  );
};

/* ------------------------------------------------------------------ */
/* The pool                                                            */
/* ------------------------------------------------------------------ */

const pool = { x: -0.5, z: -0.7, radiusX: 2.7, radiusZ: 1.95, turn: 0.3 };
const poolLevel = 0.08;

const pointByPool = (angle: number, out: number): Triple => {
  const along = Math.cos(angle) * (pool.radiusX + out);
  const across = Math.sin(angle) * (pool.radiusZ + out);
  return [
    pool.x + along * Math.cos(pool.turn) + across * Math.sin(pool.turn),
    0,
    pool.z - along * Math.sin(pool.turn) + across * Math.cos(pool.turn),
  ];
};

const addPoolLathe = (
  builder: AttractionBuilder,
  finish: "matte" | "water",
  colour: string,
  profile: readonly (readonly [number, number])[],
): void => {
  builder.add(
    finish,
    colour,
    new LatheGeometry(
      profile.map(([radius, height]) => new Vector2(radius, height)),
      builder.segments(32, 16),
    ),
    {
      at: [pool.x, 0, pool.z],
      rotation: [0, pool.turn, 0],
      scale: [1, 1, pool.radiusZ / pool.radiusX],
    },
  );
};

const buildPool = (builder: AttractionBuilder) => {
  const radius = pool.radiusX;
  addPoolLathe(builder, "matte", oasisGrass, [
    [radius + 1.5, 0.0],
    [radius + 1.2, 0.035],
    [radius + 0.45, 0.05],
    [radius + 0.3, 0.05],
  ]);
  addPoolLathe(builder, "matte", dampSand, [
    [radius + 0.32, 0.05],
    [radius + 0.05, 0.04],
    [radius * 0.85, -0.12],
    [radius * 0.5, -0.3],
    [0, -0.36],
  ]);
  addPoolLathe(builder, "matte", poolDeep, [
    [radius * 0.86, -0.1],
    [radius * 0.6, -0.25],
    [radius * 0.3, -0.33],
    [0, -0.34],
  ]);
  addPoolLathe(builder, "water", poolWater, [
    [radius + 0.08, poolLevel],
    [0, poolLevel],
  ]);
  if (builder.isFar) {
    return;
  }
  /* Reed beds and cattails round much of the edge. */
  const clumps = 11;
  for (let clump = 0; clump < clumps; clump++) {
    const angle = (clump / clumps) * Math.PI * 2 + 0.2;
    if (Math.sin(angle) > 0.75) {
      continue;
    }
    const [x, , z] = pointByPool(angle, 0.05);
    const blades = 4;
    for (let blade = 0; blade < blades; blade++) {
      const lean = (blade - 1.5) * 0.16;
      const height = 0.75 + 0.3 * Math.abs(Math.sin(clump * 3.1 + blade));
      const baseX = x + (blade - 1.5) * 0.06;
      addTaperedBar(
        builder,
        "matte",
        blade % 2 === 0 ? reed : shade(reed, 1.15),
        [baseX, 0, z],
        [
          baseX + Math.cos(angle + lean) * height * 0.25,
          height,
          z + Math.sin(angle + lean) * height * 0.25,
        ],
        0.03,
        0.004,
        4,
      );
    }
    if (clump % 2 === 0) {
      const top: Triple = [x + 0.05, 1.0, z];
      addTaperedBar(
        builder,
        "matte",
        shade(reed, 0.85),
        [x + 0.03, 0, z],
        top,
        0.012,
        0.01,
        4,
      );
      builder.cylinder("matte", "#6a4326", {
        radius: 0.035,
        length: 0.16,
        at: [top[0], top[1] - 0.06, top[2]],
        segments: 6,
      });
    }
  }
  /* A few lily pads. */
  [
    [-1.4, -0.2],
    [-1.0, 0.25],
    [0.9, -1.5],
  ].forEach(([x, z], index) => {
    builder.cylinder("matte", index === 1 ? frondLight : frondGreen, {
      radius: 0.2,
      length: 0.02,
      at: [pool.x + x, poolLevel + 0.012, pool.z + z],
      segments: 10,
    });
  });
  builder.sphere(
    "matte",
    "#f3e9f0",
    0.07,
    [pool.x - 1.0, poolLevel + 0.05, pool.z + 0.25],
    [1, 0.6, 1],
    8,
  );
};

/* ------------------------------------------------------------------ */
/* The date palms                                                      */
/* ------------------------------------------------------------------ */

interface Palm {
  x: number;
  z: number;
  height: number;
  /** Which way it leans, towards the water. */
  lean: number;
  curve: number;
}

const palms: readonly Palm[] = [
  { x: -3.9, z: -2.6, height: 3.9, lean: 1.2, curve: 0.9 },
  { x: -1.9, z: -3.9, height: 4.4, lean: 0.5, curve: 0.7 },
  { x: 1.6, z: -3.7, height: 3.6, lean: -0.3, curve: 1.0 },
  { x: 3.1, z: -1.0, height: 4.1, lean: -1.3, curve: 0.8 },
  { x: -4.1, z: 1.4, height: 3.4, lean: 2.2, curve: 0.9 },
  { x: 6.1, z: -0.2, height: 4.6, lean: -1.9, curve: 0.6 },
];

const findTrunkPoint = (palm: Palm, share: number): Triple => {
  const bend = palm.curve * share * share;
  return [
    palm.x + Math.sin(palm.lean) * bend,
    palm.height * share * (1 - 0.05 * palm.curve),
    palm.z + Math.cos(palm.lean) * bend,
  ];
};

const buildTrunk = (builder: AttractionBuilder, palm: Palm, index: number) => {
  const sections = builder.isFar ? 4 : 8;
  for (let section = 0; section < sections; section++) {
    const from = findTrunkPoint(palm, section / sections);
    const to = findTrunkPoint(palm, (section + 1) / sections);
    const radius = 0.2 - (section / sections) * 0.07;
    addTaperedBar(
      builder,
      "matte",
      section % 2 === index % 2 ? trunkBrown : trunkDark,
      from,
      to,
      radius * 0.86,
      radius * 1.06,
      7,
    );
  }
  builder.cylinder("matte", trunkDark, {
    radius: 0.3,
    radiusEnd: 0.2,
    length: 0.22,
    at: [palm.x, 0.1, palm.z],
    segments: 8,
  });
};

/** One drooping frond with leaflet edges, from the crown at the origin. */
const addFrond = (
  builder: AttractionBuilder,
  heading: number,
  rise: number,
  length: number,
  colour: string,
): void => {
  const stations = builder.isFar ? 5 : 9;
  const flat = new Vector3(Math.sin(heading), 0, Math.cos(heading));
  const side = new Vector3(Math.cos(heading), 0, -Math.sin(heading));
  const points: Triple[] = [];
  const triangles: [number, number, number][] = [];
  for (let station = 0; station <= stations; station++) {
    const share = station / stations;
    const out = length * share;
    const lift = length * (rise * share - 0.75 * share * share);
    const envelope = Math.sin(Math.PI * Math.min(1, share * 1.15)) * 0.34;
    const width =
      envelope * (builder.isFar || station % 2 === 0 ? 1 : 0.5) + 0.02;
    const centre = flat.clone().multiplyScalar(out).setY(lift);
    const fold = width * 0.35;
    points.push(
      [centre.x - side.x * width, centre.y - fold, centre.z - side.z * width],
      [centre.x, centre.y, centre.z],
      [centre.x + side.x * width, centre.y - fold, centre.z + side.z * width],
    );
    if (station > 0) {
      const here = station * 3;
      const back = here - 3;
      triangles.push(
        [back, here, back + 1],
        [back + 1, here, here + 1],
        [back + 1, here + 1, back + 2],
        [back + 2, here + 1, here + 2],
      );
    }
  }
  builder.add("matte", colour, makeTwoSided(points, triangles));
};

const crownPivot = (palm: Palm): Triple => findTrunkPoint(palm, 1);

const buildCrown =
  (palm: Palm, index: number) => (builder: AttractionBuilder) => {
    const fronds = builder.isFar ? 6 : 9;
    for (let frond = 0; frond < fronds; frond++) {
      const heading = (frond / fronds) * Math.PI * 2 + index * 0.6;
      const isLower = frond % 3 === 0;
      const isDry = !builder.isFar && frond === 4;
      addFrond(
        builder,
        heading,
        isLower ? 0.15 : 0.55,
        isLower ? 1.9 : 1.6 + 0.25 * Math.sin(frond * 1.7),
        isDry ? frondDry : frond % 2 === 0 ? frondGreen : frondLight,
      );
    }
    builder.sphere("matte", trunkDark, 0.22, [0, 0, 0], [1, 0.8, 1], 8);
    if (builder.isFar) {
      return;
    }
    /* Bunches of dates hanging under the crown. */
    [0.9, 3.4].forEach((angle, bunch) => {
      const along: Triple = [
        Math.sin(angle) * 0.22,
        -0.32,
        Math.cos(angle) * 0.22,
      ];
      addTaperedBar(
        builder,
        "matte",
        "#c79a3c",
        [0, -0.05, 0],
        along,
        0.025,
        0.02,
        4,
      );
      [0, 1, 2].forEach((berry) => {
        addLump(
          builder,
          berry === 1 ? shade(dates, 0.85) : dates,
          [along[0] + (berry - 1) * 0.07, along[1] - 0.07 * berry, along[2]],
          [0.11, 0.15, 0.11],
          bunch * 3 + berry,
          0,
        );
      });
    });
  };

const crownMotion = (index: number): Motion => ({
  kind: "swing",
  axis: index % 2 === 0 ? "x" : "z",
  amplitude: 0.045,
  period: 4.2 + index * 0.37,
  phase: index * 1.3,
});

/* ------------------------------------------------------------------ */
/* The tent                                                            */
/* ------------------------------------------------------------------ */

const tentAt = { x: 3.7, z: 2.7 };
const tentHalfWidth = 1.9;
const tentHalfDepth = 1.25;

const tentRoofHeight = (x: number, z: number): number => {
  const across = Math.abs(x) / tentHalfWidth;
  const poleRise = 0.12 * Math.cos(Math.abs(x) * Math.PI * 1.05) ** 2;
  const sag = 1 - 0.08 * (z / tentHalfDepth) ** 2;
  return (0.62 + 1.0 * (1 - across ** 1.6) + poleRise) * sag;
};

const buildTent = (builder: AttractionBuilder) => {
  const { x, z } = tentAt;
  const across = builder.isFar ? 7 : 15;
  const stations = builder.isFar ? 3 : 7;
  const sections = Array.from({ length: stations }, (_, station) => {
    const localZ =
      -tentHalfDepth + (2 * tentHalfDepth * station) / (stations - 1);
    const top = Array.from({ length: across }, (_, step) => {
      const localX = -tentHalfWidth + (2 * tentHalfWidth * step) / (across - 1);
      return [x + localX, tentRoofHeight(localX, localZ)] as const;
    });
    const under = top
      .toReversed()
      .map(([pointX, y]) => [pointX, y - 0.05] as const);
    return { z: z + localZ, points: [...top, ...under] };
  });
  builder.loft({
    stations: sections,
    finish: "matte",
    capStart: false,
    capEnd: false,
    paint: (centre, normal) => {
      const step = Math.floor(
        ((centre.x - x + tentHalfWidth) / (2 * tentHalfWidth)) * (across - 1),
      );
      const isStripe = normal.y > 0 && step % 4 === 1;
      return { colour: isStripe ? tentStripe : tentCloth, finish: "matte" };
    },
  });
  /* The back wall and the side walls, pegged to the sand. */
  builder.box(
    "matte",
    shade(tentCloth, 1.1),
    [tentHalfWidth * 2 - 0.1, 0.66, 0.04],
    [x, 0.33, z - tentHalfDepth + 0.05],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      shade(tentCloth, 1.05),
      [0.04, 0.62, tentHalfDepth * 1.4],
      [x + side * (tentHalfWidth - 0.04), 0.31, z - tentHalfDepth * 0.28],
    );
  });
  /* Poles along the ridge and the front. */
  [-1.0, 0, 1.0].forEach((poleX) => {
    [-0.85, 0.85].forEach((poleZ) => {
      builder.cylinder("matte", palette.paleTimber, {
        radius: 0.045,
        length: tentRoofHeight(poleX, poleZ) - 0.04,
        at: [x + poleX, (tentRoofHeight(poleX, poleZ) - 0.04) / 2, z + poleZ],
        segments: 6,
      });
    });
  });
  if (builder.isFar) {
    return;
  }
  /* Guy ropes and pegs. */
  [-1, 1].forEach((side) => {
    [-0.8, 0.8].forEach((ropeZ) => {
      const roofEdge: Triple = [
        x + side * (tentHalfWidth - 0.02),
        tentRoofHeight(tentHalfWidth, ropeZ) - 0.02,
        z + ropeZ,
      ];
      const peg: Triple = [
        x + side * (tentHalfWidth + 0.75),
        0.05,
        z + ropeZ * 1.2,
      ];
      builder.bar("matte", "#d8c9a6", roofEdge, peg, 0.018, 4);
      builder.box("matte", palette.darkTimber, [0.05, 0.12, 0.05], peg);
    });
  });
  /* Rugs, cushions and a tea tray under the shade. */
  builder.box("matte", rugRed, [2.6, 0.025, 1.7], [x, 0.012, z - 0.05]);
  builder.box("matte", rugGold, [2.4, 0.03, 1.5], [x, 0.014, z - 0.05]);
  builder.box("matte", rugRed, [2.2, 0.035, 1.3], [x, 0.016, z - 0.05]);
  builder.box(
    "matte",
    rugIndigo,
    [0.7, 0.04, 0.7],
    [x, 0.018, z - 0.05],
    [0, Math.PI / 4, 0],
  );
  builder.box(
    "matte",
    rugIndigo,
    [1.3, 0.025, 0.9],
    [x + 1.1, 0.012, z + 1.5],
    [0, 0.15, 0],
  );
  builder.box(
    "matte",
    rugGold,
    [1.1, 0.03, 0.12],
    [x + 1.1, 0.014, z + 1.5],
    [0, 0.15, 0],
  );
  const cushions: readonly [number, number, string][] = [
    [-1.3, -0.85, rugIndigo],
    [-0.6, -0.95, rugGold],
    [0.15, -0.95, rugRed],
    [0.9, -0.9, rugIndigo],
    [1.5, -0.55, rugGold],
    [-1.55, -0.2, rugRed],
  ];
  cushions.forEach(([cushionX, cushionZ, colour], index) => {
    const isSide = index === 5;
    builder.sphere(
      "matte",
      colour,
      0.26,
      [x + cushionX, 0.24, z + cushionZ],
      isSide ? [0.42, 0.75, 1] : [1, 0.75, 0.42],
      8,
    );
    builder.box(
      "matte",
      shade(colour, 1.2),
      [0.46, 0.07, 0.44],
      [
        x + cushionX + (isSide ? 0.2 : 0),
        0.055,
        z + cushionZ + (isSide ? 0 : 0.2),
      ],
    );
  });
  builder.cylinder("metal", palette.brass, {
    radius: 0.32,
    length: 0.03,
    at: [x + 0.1, 0.24, z],
    segments: 16,
  });
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.2,
    radiusEnd: 0.14,
    length: 0.22,
    at: [x + 0.1, 0.11, z],
    segments: 8,
  });
  builder.lathe(
    "metal",
    palette.brass,
    [
      [0, 0],
      [0.07, 0.01],
      [0.08, 0.06],
      [0.05, 0.11],
      [0.03, 0.13],
      [0.04, 0.16],
      [0, 0.17],
    ],
    [x + 0.05, 0.255, z - 0.05],
    "y",
    10,
  );
  [0.2, 0.3].forEach((glassX, index) => {
    builder.cylinder("glass", index === 0 ? "#c76a3a" : "#d99a5a", {
      radius: 0.025,
      length: 0.06,
      at: [x + glassX, 0.285, z + 0.12],
      segments: 6,
    });
  });
};

/* ------------------------------------------------------------------ */
/* The well                                                            */
/* ------------------------------------------------------------------ */

const wellAt = { x: 2.4, z: -4.6 };

const buildWell = (builder: AttractionBuilder) => {
  const { x, z } = wellAt;
  const courses = builder.isFar ? 1 : 4;
  for (let course = 0; course < courses; course++) {
    builder.cylinder(
      "matte",
      course % 2 === 0 ? sandstone : shade(sandstone, 0.9),
      {
        radius: 0.62,
        length: 0.72 / courses,
        at: [x, (0.72 / courses) * (course + 0.5), z],
        segments: 14,
      },
    );
  }
  builder.cylinder("matte", shade(sandstone, 1.08), {
    radius: 0.68,
    length: 0.08,
    at: [x, 0.76, z],
    segments: 14,
  });
  builder.cylinder("water", "#1f4d55", {
    radius: 0.48,
    length: 0.02,
    at: [x, 0.78, z],
    segments: 14,
  });
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.1, 1.5, 0.1],
      [x + side * 0.6, 1.1, z],
    );
  });
  builder.cylinder("matte", palette.timber, {
    radius: 0.06,
    length: 1.35,
    at: [x, 1.72, z],
    axis: "x",
    segments: 8,
  });
  if (builder.isFar) {
    return;
  }
  builder.cylinder("matte", "#d8c9a6", {
    radius: 0.09,
    length: 0.4,
    at: [x, 1.72, z],
    axis: "x",
    segments: 8,
  });
  builder.bar(
    "matte",
    "#d8c9a6",
    [x, 1.66, z + 0.08],
    [x, 1.1, z + 0.08],
    0.015,
    4,
  );
  builder.lathe(
    "matte",
    palette.timber,
    [
      [0, 0],
      [0.1, 0],
      [0.12, 0.18],
      [0.11, 0.18],
      [0.09, 0.02],
      [0, 0.02],
    ],
    [x, 0.92, z + 0.08],
    "y",
    10,
  );
  builder.torus(
    "metal",
    palette.darkSteel,
    0.12,
    0.01,
    [x, 1.08, z + 0.08],
    "y",
    10,
  );
  /* A water trough beside the well, for the camels. */
  builder.box(
    "matte",
    sandstone,
    [1.2, 0.36, 0.5],
    [x - 1.2, 0.18, z + 0.6],
    [0, 0.3, 0],
  );
  builder.box(
    "water",
    poolWater,
    [1.0, 0.03, 0.32],
    [x - 1.2, 0.33, z + 0.6],
    [0, 0.3, 0],
  );
};

/* ------------------------------------------------------------------ */
/* Camels                                                              */
/* ------------------------------------------------------------------ */

const buildCamel = (builder: AttractionBuilder) => {
  const segments = builder.segments(10, 6);
  builder.sphere(
    "matte",
    camelCoat,
    0.42,
    [0, 1.12, 0],
    [0.82, 0.62, 1.35],
    segments,
  );
  builder.sphere(
    "matte",
    shade(camelCoat, 1.04),
    0.3,
    [0, 1.42, -0.05],
    [0.9, 0.95, 1.2],
    segments,
  );
  builder.box("matte", rugRed, [0.62, 0.04, 0.5], [0, 1.2, 0.22], [0.15, 0, 0]);
  [-1, 1].forEach((side) => {
    [-1, 1].forEach((end) => {
      addTaperedBar(
        builder,
        "matte",
        shade(camelCoat, 0.92),
        [side * 0.18, 1.0, end * 0.33],
        [side * 0.19, 0.05, end * 0.36],
        0.11,
        0.06,
        6,
      );
    });
  });
  addTaperedBar(
    builder,
    "matte",
    camelCoat,
    [0, 1.15, 0.45],
    [0, 1.6, 0.78],
    0.2,
    0.13,
    8,
  );
  builder.sphere(
    "matte",
    camelCoat,
    0.16,
    [0, 1.67, 0.9],
    [0.8, 0.8, 1.4],
    segments,
  );
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      palette.black,
      [0.03, 0.04, 0.05],
      [side * 0.11, 1.73, 0.95],
    );
    builder.box(
      "matte",
      shade(camelCoat, 0.85),
      [0.04, 0.1, 0.05],
      [side * 0.08, 1.79, 0.82],
      [0, 0, side * 0.4],
    );
    builder.box("matte", rugGold, [0.04, 0.22, 0.2], [side * 0.32, 1.05, 0.22]);
  });
  addTaperedBar(
    builder,
    "matte",
    shade(camelCoat, 0.85),
    [0, 1.1, -0.55],
    [0, 0.7, -0.62],
    0.04,
    0.02,
    4,
  );
};

/* ------------------------------------------------------------------ */
/* The sands round it                                                  */
/* ------------------------------------------------------------------ */

const buildSands = (builder: AttractionBuilder) => {
  const dunes: readonly [number, number, number, number][] = [
    [-6.5, -4.4, 1.8, 0.45],
    [6.2, -4.6, 1.5, 0.4],
    [-7.2, 2.5, 1.3, 0.35],
    [7.0, 4.6, 1.1, 0.3],
  ];
  dunes.forEach(([x, z, size, height]) => {
    addMound(builder, shade(sand, 1.03), [x, 0, z], size, height);
  });
  const rocks: readonly [number, number, number][] = [
    [-5.2, -1.0, 0.45],
    [4.7, -3.2, 0.5],
    [-2.4, 5.6, 0.32],
    [0.6, -5.8, 0.4],
  ];
  rocks.forEach(([x, z, size], index) => {
    addLump(
      builder,
      index % 2 === 0 ? sandstone : shade(sandstone, 0.88),
      [x, size * 0.35, z],
      [size * 1.3, size * 0.75, size],
      index * 4.1,
    );
  });
  const bushes: readonly [number, number, number][] = [
    [-2.9, -3.1, 0.5],
    [0.2, -3.5, 0.45],
    [2.6, 0.9, 0.42],
    [-3.3, 0.0, 0.48],
    [5.4, 1.6, 0.4],
    [-5.0, -3.6, 0.42],
  ];
  bushes.forEach(([x, z, size], index) => {
    addBush(builder, [x, 0, z], size, index % 2 === 0 ? "#5e7f33" : "#6f8c3c");
  });
  /* A camel saddle and water jars by the tent. */
  if (!builder.isFar) {
    [
      [5.7, 3.7, 0.2],
      [5.95, 3.35, 0.16],
    ].forEach(([x, z, size]) => {
      builder.lathe(
        "matte",
        "#b5653a",
        [
          [0, 0],
          [size * 0.8, 0.02],
          [size * 1.25, size * 1.1],
          [size * 0.9, size * 2],
          [size * 0.45, size * 2.25],
          [size * 0.5, size * 2.5],
          [0, size * 2.5],
        ],
        [x, 0, z],
        "y",
        12,
      );
    });
  }
};

const buildOasis = (builder: AttractionBuilder) => {
  buildPool(builder);
  palms.forEach((palm, index) => {
    buildTrunk(builder, palm, index);
  });
  buildTent(builder);
  buildWell(builder);
  buildSands(builder);
  addSignBoard(builder, [-1.9, 0, 6.6], signTerracotta);
};

const poolBlockers: LocalBlocker[] = listWallBlockers(
  {
    x: pool.x - Math.cos(pool.turn) * (pool.radiusX - pool.radiusZ * 0.8),
    z: pool.z + Math.sin(pool.turn) * (pool.radiusX - pool.radiusZ * 0.8),
  },
  {
    x: pool.x + Math.cos(pool.turn) * (pool.radiusX - pool.radiusZ * 0.8),
    z: pool.z - Math.sin(pool.turn) * (pool.radiusX - pool.radiusZ * 0.8),
  },
  pool.radiusZ + 0.1,
  0.6,
);

const crowns: MovingPart[] = palms.map((palm, index) => ({
  name: `palm-crown-${String(index)}`,
  pivot: crownPivot(palm),
  build: buildCrown(palm, index),
  motion: crownMotion(index),
}));

export const oasisModel: AttractionModel = {
  kind: "oasis",
  name: "Oasis",
  fact: "An oasis is a green place in a desert where water from deep underground comes up to the surface, in a spring or a well. Date palms and other plants can grow there, so for thousands of years travellers and their camels have stopped at oases to drink, rest and find food.",
  curriculumLink:
    "Geography, Key Stage 2: physical geography, deserts, and where water comes from.",
  footprint: 8.6,
  setting: "inland",
  padColour: sand,
  signSpot: { x: -1.9, z: 7.5 },
  build: buildOasis,
  moving: crowns,
  wanderers: [
    {
      name: "camels",
      build: buildCamel,
      count: 2,
      centre: { x: -0.2, z: 4.9 },
      radius: 1.4,
      speed: 0.25,
    },
  ],
  blockers: [
    ...poolBlockers,
    ...palms.map((palm) => ({ x: palm.x, z: palm.z, radius: 0.32 })),
    ...listWallBlockers(
      { x: tentAt.x - tentHalfWidth + 0.2, z: tentAt.z - tentHalfDepth },
      { x: tentAt.x + tentHalfWidth - 0.2, z: tentAt.z - tentHalfDepth },
      0.35,
      0.6,
    ),
    { x: tentAt.x - tentHalfWidth, z: tentAt.z - 0.3, radius: 0.4 },
    { x: tentAt.x + tentHalfWidth, z: tentAt.z - 0.3, radius: 0.4 },
    { x: wellAt.x, z: wellAt.z, radius: 0.8 },
    { x: wellAt.x - 1.2, z: wellAt.z + 0.6, radius: 0.55 },
    { x: -1.9, z: 6.6, radius: 0.45 },
  ],
};
