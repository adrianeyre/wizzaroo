import { ExtrudeGeometry, LatheGeometry, Shape, Vector2 } from "three";
import {
  shade,
  type AttractionBuilder,
  type AttractionFinish,
  type Triple,
} from "../attractions/attraction-kit.js";

/* The Obsidian Quarry's shapes: its stepped quarry face, the hoist and
 * its cage, the derrick crane, the mine carts and the quarry workers. */

export const basalt = "#2f2928";
export const basaltLight = "#4a403d";
export const ashLayer = "#7a5a4a";
export const gravel = "#6f6660";
export const obsidian = "#16111a";
export const obsidianSheen = "#2b2138";
export const timber = "#6b4428";
export const darkTimber = "#4a2e1b";
export const bronze = "#b07a3a";
export const rust = "#8a4a2a";
export const ember = "#ff7a1f";
export const hiVis = "#ff8a1f";
export const helmetYellow = "#f2c12e";

/** The quarry face curves round a centre, its back towards local -z. */
export const faceCentre = { x: 0, z: 0.5 };
export const faceSweep = 1.15;
/** Each bench: where its face stands (radius) and how high its top is. */
export const benches = [
  { radius: 6.0, top: 1.1 },
  { radius: 7.0, top: 2.2 },
  { radius: 8.0, top: 3.3 },
] as const;
export const faceBack = 9.0;

/** A point on the curve, `angle` from straight back, `radius` out. */
export const onFace = (angle: number, radius: number, y = 0): Triple => [
  faceCentre.x + Math.sin(Math.PI + angle) * radius,
  y,
  faceCentre.z + Math.cos(Math.PI + angle) * radius,
];

/** Part of a lathe, from `-sweep` to `sweep` round the back. */
export const addArc = (
  builder: AttractionBuilder,
  finish: AttractionFinish,
  colour: string,
  profile: readonly (readonly [number, number])[],
  sweep: number,
  segments: number,
  centre = faceCentre,
): AttractionBuilder =>
  builder.add(
    finish,
    colour,
    new LatheGeometry(
      profile.map(([radius, height]) => new Vector2(radius, height)),
      builder.segments(segments, Math.max(4, Math.round(segments / 2))),
      Math.PI - sweep,
      sweep * 2,
    ),
    { at: [centre.x, 0, centre.z] },
  );

/** The stepped profile of the quarry face, from its foot up to the back. */
const faceProfile: [number, number][] = [
  [faceBack + 0.3, 0],
  [faceBack, benches[2].top],
  [benches[2].radius, benches[2].top],
  [benches[2].radius, benches[1].top],
  [benches[1].radius, benches[1].top],
  [benches[1].radius, benches[0].top],
  [benches[0].radius, benches[0].top],
  [benches[0].radius, 0],
];

export const buildQuarryFace = (builder: AttractionBuilder) => {
  const segments = 28;
  addArc(builder, "matte", basalt, faceProfile, faceSweep, segments);
  /* The grassy, ashy bank the quarry has been cut into, seen from behind */
  addArc(
    builder,
    "matte",
    "#5d6b45",
    [
      [faceBack + 0.85, 0],
      [faceBack + 0.6, 1.2],
      [faceBack + 0.25, 2.6],
      [faceBack + 0.02, benches[2].top + 0.03],
    ],
    faceSweep,
    segments,
  );
  /* Gravel on each bench's top, and the ash layers and glassy obsidian
   * seams that run along the faces */
  benches.forEach(({ radius, top }, index) => {
    const outer = index < 2 ? benches[index + 1].radius : faceBack;
    addArc(
      builder,
      "matte",
      gravel,
      [
        [outer, top + 0.015],
        [radius, top + 0.015],
      ],
      faceSweep,
      segments,
    );
    const below = index === 0 ? 0 : benches[index - 1].top;
    const height = top - below;
    addArc(
      builder,
      "matte",
      index === 1 ? ashLayer : shade(ashLayer, 0.85),
      [
        [radius - 0.012, below + height * 0.62],
        [radius - 0.012, below + height * 0.5],
      ],
      faceSweep - 0.02,
      segments,
    );
    addArc(
      builder,
      "glass",
      obsidian,
      [
        [radius - 0.02, below + height * 0.32],
        [radius - 0.02, below + height * 0.18],
      ],
      faceSweep * (0.55 + index * 0.15),
      segments,
    );
  });
  /* The ends of the curve, stepped like the face */
  const end = new Shape();
  faceProfile.forEach(([radius, height], index) => {
    if (index === 0) {
      end.moveTo(radius, height);
    } else {
      end.lineTo(radius, height);
    }
  });
  end.lineTo(faceBack + 0.3, 0);
  [-1, 1].forEach((side) => {
    const angle = Math.PI + side * faceSweep;
    const geometry = new ExtrudeGeometry(end, {
      depth: 0.04,
      bevelEnabled: false,
    });
    geometry.translate(0, 0, -0.02);
    builder.add("matte", basaltLight, geometry, {
      at: [faceCentre.x, 0, faceCentre.z],
      rotation: [0, angle - Math.PI / 2, 0],
    });
  });
  /* Loose blocks and glassy boulders along the foot of each bench */
  const rocks: [number, number, number, boolean][] = builder.isFar
    ? [
        [-0.6, 0, 0.5, true],
        [0.7, 1, 0.45, false],
      ]
    : [
        [-0.95, 0, 0.42, false],
        [-0.6, 0, 0.5, true],
        [0.1, 0, 0.32, false],
        [0.85, 0, 0.4, true],
        [-0.4, 1, 0.38, false],
        [0.3, 1, 0.45, true],
        [0.7, 1, 0.35, false],
        [-0.75, 2, 0.4, true],
        [0.05, 2, 0.3, false],
      ];
  rocks.forEach(([angle, bench, size, isGlassy]) => {
    const radius =
      bench === 0 ? benches[0].radius - 0.35 : benches[bench].radius + 0.35;
    const y = bench === 0 ? 0 : benches[bench - 1].top;
    const [x, , z] = onFace(angle, radius);
    builder.sphere(
      isGlassy ? "glass" : "matte",
      isGlassy ? obsidian : basaltLight,
      size,
      [x, y + size * 0.45, z],
      [1.2, 0.85, 1],
      isGlassy ? 5 : 6,
    );
  });
};

/** A tapering spike of glassy obsidian, from its foot to its tip. */
export const addShard = (
  builder: AttractionBuilder,
  at: Triple,
  height: number,
  radius: number,
  lean: Triple = [0, 0, 0],
): AttractionBuilder =>
  builder.cylinder("glass", obsidianSheen, {
    radius,
    radiusEnd: radius * 0.08,
    length: height,
    at: [at[0] + lean[0], at[1] + height / 2, at[2] + lean[2]],
    segments: 5,
  });

/* ------------------------------------------------------------------ */
/* The hoist                                                           */
/* ------------------------------------------------------------------ */

export const hoistAt = { x: -2.0, z: -3.8 };
/** The way from the hoist out to the face (and its lookout gantry). */
export const hoistOut = { x: 0, z: -1 };
export const hoistHalf = 0.75;
export const hoistHeight = 4.7;
export const gantryHeight = benches[2].top;
export const cageHalf = 0.5;
/** The cage rides up and down from the floor to the gantry. */
export const cageTravel = gantryHeight / 2;
export const cagePeriod = 14;
/** How far out from the hoist the gantry reaches, over the top bench. */
export const gantryTo =
  hoistAt.z -
  faceCentre.z +
  Math.sqrt(benches[2].radius ** 2 - (hoistAt.x - faceCentre.x) ** 2) +
  0.4;

/** A local point turned to the hoist: `across` sideways, `out` towards the face. */
export const atHoist = (across: number, y: number, out: number): Triple => [
  hoistAt.x + across * hoistOut.z + out * hoistOut.x,
  y,
  hoistAt.z - across * hoistOut.x + out * hoistOut.z,
];

export const buildHoist = (builder: AttractionBuilder) => {
  const corners: [number, number][] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  corners.forEach(([across, out]) => {
    const foot = atHoist(across * hoistHalf, 0, out * hoistHalf);
    builder.box(
      "paint",
      darkTimber,
      [0.16, hoistHeight, 0.16],
      [foot[0], hoistHeight / 2, foot[2]],
    );
    builder.box(
      "matte",
      basaltLight,
      [0.34, 0.2, 0.34],
      [foot[0], 0.1, foot[2]],
    );
  });
  /* Cross-bracing on the sides and back, leaving the front open */
  const levels = builder.isFar
    ? [1.6, 3.2, hoistHeight]
    : [1.6, 2.4, 3.2, 4.0, hoistHeight];
  levels.forEach((up, index) => {
    const low = index === 0 ? 1.6 : levels[index - 1];
    [
      [-1, -1, -1, 1],
      [1, -1, 1, 1],
      [-1, 1, 1, 1],
    ].forEach(([fromA, fromO, toA, toO]) => {
      builder.bar(
        "paint",
        timber,
        atHoist(fromA * hoistHalf, up, fromO * hoistHalf),
        atHoist(toA * hoistHalf, up, toO * hoistHalf),
        0.08,
        4,
      );
      if (index > 0 && !builder.isFar) {
        builder.bar(
          "paint",
          timber,
          atHoist(fromA * hoistHalf, low, fromO * hoistHalf),
          atHoist(toA * hoistHalf, up, toO * hoistHalf),
          0.06,
          4,
        );
      }
    });
    builder.bar(
      "paint",
      timber,
      atHoist(-hoistHalf, up, -hoistHalf),
      atHoist(hoistHalf, up, -hoistHalf),
      0.08,
      4,
    );
  });
  /* The head, with its wheel's bearings, and the cable down to the cage */
  builder.box(
    "paint",
    darkTimber,
    [hoistHalf * 2 + 0.3, 0.2, 0.3],
    atHoist(0, hoistHeight + 0.1, 0),
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "metal",
      bronze,
      [0.12, 0.3, 0.2],
      atHoist(side * 0.3, hoistHeight + 0.35, 0),
    );
  });
  /* The gantry out to the top of the face, with its railings */
  const gantryFrom = cageHalf + 0.05;
  const gantryLength = gantryTo - gantryFrom;
  builder.box(
    "paint",
    timber,
    [1.1, 0.12, gantryLength],
    atHoist(0, gantryHeight - 0.06, gantryFrom + gantryLength / 2),
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      darkTimber,
      [0.06, 0.06, gantryLength],
      atHoist(side * 0.52, gantryHeight + 0.85, gantryFrom + gantryLength / 2),
    );
    const posts = builder.isFar ? 2 : 5;
    for (let post = 0; post <= posts; post++) {
      const out = gantryFrom + (gantryLength * post) / posts;
      builder.box(
        "paint",
        darkTimber,
        [0.06, 0.88, 0.06],
        atHoist(side * 0.52, gantryHeight + 0.44, out),
      );
    }
  });
  /* Struts holding the gantry up from the benches below */
  [
    [hoistHalf + 0.6, 0],
    [hoistHalf + 1.6, benches[0].top],
  ].forEach(([out, foot]) => {
    [-1, 1].forEach((side) => {
      builder.bar(
        "paint",
        darkTimber,
        atHoist(side * 0.45, foot, out),
        atHoist(side * 0.45, gantryHeight - 0.1, out + 0.3),
        0.09,
        4,
      );
    });
  });
  /* A lantern at the top of the gantry */
  const lantern = atHoist(0.52, gantryHeight + 1.0, gantryTo - 0.2);
  builder.box("glow", "#ffd27a", [0.16, 0.22, 0.16], lantern);
  builder.box(
    "paint",
    "#1f2023",
    [0.22, 0.05, 0.22],
    [lantern[0], lantern[1] + 0.14, lantern[2]],
  );
};

/** The wheel at the top of the hoist, turning as the cage goes up and down. */
export const buildHoistWheel = (builder: AttractionBuilder) => {
  builder.torus("metal", rust, 0.5, 0.05, [0, 0, 0], "x", 18);
  builder.cylinder("metal", bronze, {
    radius: 0.09,
    length: 0.62,
    at: [0, 0, 0],
    axis: "x",
    segments: 8,
  });
  const spokes = builder.isFar ? 3 : 6;
  for (let spoke = 0; spoke < spokes; spoke++) {
    const angle = (spoke / spokes) * Math.PI;
    builder.bar(
      "metal",
      rust,
      [0, Math.sin(angle) * 0.48, Math.cos(angle) * 0.48],
      [0, -Math.sin(angle) * 0.48, -Math.cos(angle) * 0.48],
      0.04,
      4,
    );
  }
};

/** The cage, about its pivot halfway up its travel. */
export const buildCage = (builder: AttractionBuilder) => {
  const floor = -cageTravel + 0.05;
  const height = 1.5;
  builder.box(
    "metal",
    shade(bronze, 0.75),
    [cageHalf * 2, 0.08, cageHalf * 2],
    [0, floor, 0],
  );
  builder.box(
    "metal",
    shade(bronze, 0.75),
    [cageHalf * 2, 0.06, cageHalf * 2],
    [0, floor + height, 0],
  );
  const bars = builder.isFar ? 1 : 3;
  [-1, 1].forEach((side) => {
    for (let bar = -bars; bar <= bars; bar++) {
      const along = (bar / bars) * cageHalf * 0.96;
      builder.bar(
        "metal",
        bronze,
        [side * cageHalf, floor, along],
        [side * cageHalf, floor + height, along],
        0.04,
        4,
      );
    }
    [0.55, 1.05].forEach((up) => {
      builder.box(
        "metal",
        bronze,
        [0.05, 0.05, cageHalf * 2],
        [side * cageHalf, floor + up, 0],
      );
    });
  });
};

/* ------------------------------------------------------------------ */
/* The derrick crane                                                   */
/* ------------------------------------------------------------------ */

export const craneAt = { x: 3.0, z: -2.4 };
export const craneMast = 4.2;

export const buildCraneBase = (builder: AttractionBuilder) => {
  const { x, z } = craneAt;
  builder.box("matte", basaltLight, [1.3, 0.3, 1.3], [x, 0.15, z]);
  builder.cylinder("paint", darkTimber, {
    radius: 0.16,
    radiusEnd: 0.12,
    length: craneMast,
    at: [x, 0.3 + craneMast / 2, z],
    segments: 8,
  });
  /* Back-stays down to two stone weights */
  [
    [-1.2, -0.9],
    [1.3, -0.6],
  ].forEach(([dx, dz]) => {
    builder.bar(
      "metal",
      "#4b5259",
      [x, 0.3 + craneMast - 0.1, z],
      [x + dx, 0.55, z + dz],
      0.035,
      4,
    );
    builder.box(
      "matte",
      basalt,
      [0.6, 0.55, 0.6],
      [x + dx, 0.27, z + dz],
      [0, 0.4, 0],
    );
  });
  builder.cylinder("metal", bronze, {
    radius: 0.2,
    length: 0.12,
    at: [x, 0.3 + craneMast + 0.06, z],
    segments: 10,
  });
};

/** The crane's jib and its hanging obsidian block, about the mast. */
export const buildCraneJib = (builder: AttractionBuilder) => {
  const reach = 2.2;
  const low = 1.6;
  builder.bar("paint", timber, [0, low, 0], [reach, low + 1.5, 0], 0.14, 6);
  builder.bar(
    "metal",
    "#4b5259",
    [0, craneMast - 0.6, 0],
    [reach, low + 1.5, 0],
    0.035,
    4,
  );
  builder.bar("paint", timber, [0, low, 0], [-0.8, low + 0.3, 0], 0.12, 6);
  builder.box("matte", basalt, [0.5, 0.5, 0.5], [-0.95, low + 0.2, 0]);
  /* The winch drum and its handle */
  builder.cylinder("metal", rust, {
    radius: 0.15,
    length: 0.4,
    at: [0.35, low - 0.05, 0],
    axis: "z",
    segments: 10,
  });
  /* The hook and its block */
  const tip: Triple = [reach, low + 1.5, 0];
  builder.bar("metal", "#9aa3ad", tip, [reach, low + 0.25, 0], 0.025, 4);
  builder.torus(
    "metal",
    "#4b5259",
    0.08,
    0.025,
    [reach, low + 0.17, 0],
    "z",
    10,
  );
  builder.box(
    "glass",
    obsidian,
    [0.55, 0.42, 0.45],
    [reach, low - 0.1, 0],
    [0.1, 0.4, 0.05],
  );
  if (!builder.isFar) {
    [-1, 1].forEach((side) => {
      builder.bar(
        "metal",
        "#9aa3ad",
        [reach, low + 0.17, 0],
        [reach + side * 0.24, low + 0.1, side * 0.1],
        0.02,
        4,
      );
    });
  }
};

/* ------------------------------------------------------------------ */
/* Carts, tools and the quarry workers                                 */
/* ------------------------------------------------------------------ */

/** A mine cart's tub and its load, its bottom at `at`. */
export const addCartTub = (
  builder: AttractionBuilder,
  at: Triple = [0, 0, 0],
): AttractionBuilder => {
  builder.add(
    "metal",
    rust,
    new LatheGeometry(
      [
        [0.001, 0],
        [0.32, 0.02],
        [0.42, 0.45],
        [0.38, 0.47],
        [0.3, 0.06],
        [0.001, 0.06],
      ].map(([radius, height]) => new Vector2(radius, height)),
      4,
      Math.PI / 4,
    ),
    { at: [at[0], at[1] + 0.08, at[2]], scale: [1.3, 1, 0.95] },
  );
  [
    [0, 0.42, 0, 0.22],
    [0.18, 0.38, 0.1, 0.16],
    [-0.16, 0.4, -0.08, 0.18],
  ].forEach(([x, y, z, size], index) => {
    builder.sphere(
      index === 1 ? "matte" : "glass",
      index === 1 ? basaltLight : obsidian,
      size,
      [at[0] + x, at[1] + y, at[2] + z],
      [1, 0.8, 1],
      5,
    );
  });
  return builder;
};

/** A mine cart's wheels and frame, standing on rails along local x. */
export const addCartFrame = (
  builder: AttractionBuilder,
  at: Triple,
  turn: number,
) => {
  const place = (x: number, y: number, z: number): Triple => [
    at[0] + x * Math.cos(turn) + z * Math.sin(turn),
    at[1] + y,
    at[2] - x * Math.sin(turn) + z * Math.cos(turn),
  ];
  builder.box("metal", "#3a3f44", [0.8, 0.08, 0.5], place(0, 0.18, 0), [
    0,
    turn,
    0,
  ]);
  if (builder.isFar) {
    return;
  }
  [-0.25, 0.25].forEach((along) => {
    [-0.27, 0.27].forEach((side) => {
      const wheel = place(along, 0.12, side);
      builder.add(
        "metal",
        "#2b2f33",
        new LatheGeometry(
          [
            [0.001, -0.03],
            [0.12, -0.03],
            [0.12, 0.03],
            [0.001, 0.03],
          ].map(([radius, height]) => new Vector2(radius, height)),
          builder.segments(8, 5),
        ),
        { at: wheel, rotation: [Math.PI / 2, turn, 0] },
      );
    });
  });
};

/** A run of rails from one local point to another. */
export const addRails = (
  builder: AttractionBuilder,
  from: { x: number; z: number },
  to: { x: number; z: number },
) => {
  const length = Math.hypot(to.x - from.x, to.z - from.z);
  const turn = Math.atan2(to.x - from.x, to.z - from.z);
  const across = { x: Math.cos(turn), z: -Math.sin(turn) };
  [-0.27, 0.27].forEach((side) => {
    builder.box(
      "metal",
      "#5d6166",
      [0.05, 0.06, length],
      [
        (from.x + to.x) / 2 + across.x * side,
        0.08,
        (from.z + to.z) / 2 + across.z * side,
      ],
      [0, turn, 0],
    );
  });
  const sleepers = Math.round(length / (builder.isFar ? 1.2 : 0.45));
  for (let sleeper = 0; sleeper <= sleepers; sleeper++) {
    const share = sleeper / sleepers;
    builder.box(
      "matte",
      darkTimber,
      [0.8, 0.05, 0.14],
      [
        from.x + (to.x - from.x) * share,
        0.025,
        from.z + (to.z - from.z) * share,
      ],
      [0, turn, 0],
    );
  }
};

/** A pickaxe leaning on something, its head at `at`. */
export const addPickaxe = (
  builder: AttractionBuilder,
  at: Triple,
  turn: number,
) => {
  builder.bar(
    "matte",
    timber,
    at,
    [at[0] + Math.sin(turn) * 0.25, 0, at[2] + Math.cos(turn) * 0.25],
    0.04,
    4,
  );
  builder.box(
    "metal",
    "#6d737a",
    [0.42, 0.05, 0.05],
    [at[0], at[1] + 0.02, at[2]],
    [0, turn + Math.PI / 2, 0.15],
  );
};

/** A quarry worker in a hard hat and a bright vest, facing +z. */
export const buildWorker = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    builder.box("paint", "#3b4a5c", [0.3, 0.5, 0.14], [0, 0.25, 0]);
    builder.box("paint", hiVis, [0.36, 0.42, 0.22], [0, 0.71, 0]);
    builder.sphere("paint", helmetYellow, 0.15, [0, 1.06, 0], [1, 1, 1], 6);
    return;
  }
  [-0.09, 0.09].forEach((side) => {
    builder.box("paint", "#3b4a5c", [0.12, 0.5, 0.14], [side, 0.25, 0]);
    builder.box("paint", "#2a2420", [0.13, 0.08, 0.2], [side, 0.04, 0.03]);
  });
  builder.box("paint", "#3b4a5c", [0.34, 0.42, 0.2], [0, 0.71, 0]);
  builder.box("paint", hiVis, [0.36, 0.3, 0.22], [0, 0.74, 0]);
  builder.box("paint", "#e8e4dc", [0.37, 0.04, 0.23], [0, 0.68, 0]);
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      "#3b4a5c",
      [0.09, 0.4, 0.1],
      [side * 0.22, 0.7, 0.02],
      [0.2, 0, side * 0.08],
    );
    builder.box(
      "paint",
      "#d9a07a",
      [0.08, 0.08, 0.08],
      [side * 0.23, 0.48, 0.06],
    );
  });
  builder.sphere("paint", "#d9a07a", 0.13, [0, 1.03, 0], [1, 1.05, 1], 8);
  builder.sphere("paint", helmetYellow, 0.15, [0, 1.08, 0], [1, 0.75, 1.08], 8);
  builder.cylinder("paint", helmetYellow, {
    radius: 0.18,
    length: 0.02,
    at: [0, 1.06, 0.02],
    segments: 8,
  });
};
