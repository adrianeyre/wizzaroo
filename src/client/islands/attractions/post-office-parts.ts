import {
  BoxGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  PlaneGeometry,
  Shape,
  TorusGeometry,
  type BufferGeometry,
} from "three";
import {
  addWindow,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionFinish,
  type LocalPoint,
  type Triple,
} from "./attraction-kit.js";

/**
 * Shapes shared by the village buildings (the Post Office, the Bakery,
 * the Fire Station, the Lighthouse and the School).
 */

/** Turns a point given in a part's own frame into the Attraction's. */
export const makePlacer =
  (at: Triple, turn = 0) =>
  (x: number, y: number, z: number): Triple => [
    at[0] + x * Math.cos(turn) + z * Math.sin(turn),
    at[1] + y,
    at[2] - x * Math.sin(turn) + z * Math.cos(turn),
  ];

/** Places a ready-made geometry, turned about y by `turn`. */
export const addTurned = (
  builder: AttractionBuilder,
  finish: AttractionFinish,
  colour: string,
  geometry: BufferGeometry,
  at: Triple,
  rotation: Triple,
): AttractionBuilder =>
  builder.add(finish, colour, geometry, { at, rotation }, undefined);

/**
 * A block of walls with gable ends in one piece: walls `eaves` high and
 * the gable apex `rise` above them. The ridge runs along local x (or
 * along z when `turn` is a quarter turn).
 */
export const addGabledBlock = (
  builder: AttractionBuilder,
  {
    centre,
    width,
    depth,
    eaves,
    rise,
    colour,
    turn = 0,
    base = 0,
    finish = "matte",
  }: {
    centre: LocalPoint;
    width: number;
    depth: number;
    eaves: number;
    rise: number;
    colour: string;
    turn?: number;
    base?: number;
    finish?: AttractionFinish;
  },
): AttractionBuilder => {
  const half = depth / 2;
  const shape = new Shape();
  shape.moveTo(-half, base);
  shape.lineTo(half, base);
  shape.lineTo(half, eaves);
  if (rise > 0) {
    shape.lineTo(0, eaves + rise);
  }
  shape.lineTo(-half, eaves);
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, {
    depth: width,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geometry.translate(0, 0, -width / 2);
  return addTurned(
    builder,
    finish,
    colour,
    geometry,
    [centre.x, 0, centre.z],
    [0, Math.PI / 2 + turn, 0],
  );
};

/** A box tilted about x by `tilt`, then turned about y by `turn`, then moved. */
export const addTiltedBox = (
  builder: AttractionBuilder,
  finish: AttractionFinish,
  colour: string,
  size: Triple,
  at: Triple,
  tilt: number,
  turn: number,
): AttractionBuilder =>
  builder.add(
    finish,
    colour,
    new BoxGeometry(...size).rotateX(tilt).rotateY(turn),
    { at },
    undefined,
  );

/**
 * A pitched roof that sits exactly on `addGabledBlock`'s gables, with
 * tile courses and ridge tiles close up.
 */
export const addPitchedRoof = (
  builder: AttractionBuilder,
  {
    centre,
    width,
    depth,
    eaves,
    rise,
    colour,
    overhang = 0.22,
    turn = 0,
    courses = 6,
    ridgeColour,
    finish = "matte",
  }: {
    centre: LocalPoint;
    width: number;
    depth: number;
    eaves: number;
    rise: number;
    colour: string;
    overhang?: number;
    turn?: number;
    courses?: number;
    ridgeColour?: string;
    finish?: AttractionFinish;
  },
): AttractionBuilder => {
  const half = depth / 2;
  const halfDepth = half + overhang;
  const slopeRise = (rise * halfDepth) / half;
  const angle = Math.atan2(rise, half);
  const thickness = 0.1;
  const lift = thickness / 2 / Math.cos(angle);
  const roofBase = eaves - (rise * overhang) / half + lift;
  const place = makePlacer([centre.x, 0, centre.z], turn);
  const length = width + overhang * 2;
  const slope = Math.hypot(halfDepth, slopeRise);
  [1, -1].forEach((side) => {
    addTiltedBox(
      builder,
      finish,
      colour,
      [length, thickness, slope + 0.02],
      place(0, roofBase + slopeRise / 2, (side * halfDepth) / 2),
      side * angle,
      turn,
    );
  });
  const ridgeTop = roofBase + slopeRise;
  addTurned(
    builder,
    "matte",
    ridgeColour ?? shade(colour, 0.8),
    new CylinderGeometry(0.075, 0.075, length + 0.04, 8),
    place(0, ridgeTop + 0.03, 0),
    [0, turn, Math.PI / 2],
  );
  if (builder.isFar) {
    return builder;
  }
  const courseColour = shade(colour, 0.78);
  [1, -1].forEach((side) => {
    for (let course = 1; course <= courses; course++) {
      const share = course / (courses + 0.6);
      const along = side * halfDepth * share;
      const up = roofBase + slopeRise * (1 - share);
      const out = thickness / 2 + 0.008;
      addTiltedBox(
        builder,
        "matte",
        courseColour,
        [length + 0.01, 0.022, 0.05],
        place(
          0,
          up + Math.cos(angle) * out,
          along + side * Math.sin(angle) * out,
        ),
        side * angle,
        turn,
      );
    }
    builder.box(
      "matte",
      courseColour,
      [length + 0.02, 0.07, 0.06],
      place(0, roofBase - 0.02, side * (halfDepth + 0.01)),
      [0, turn, 0],
    );
  });
  return builder;
};

/** A brick chimney stack with a stone cap and clay pots; returns the smoke spot. */
export const addChimney = (
  builder: AttractionBuilder,
  at: Triple,
  {
    width = 0.62,
    depth = 0.46,
    height = 1.1,
    colour = palette.brick,
    pots = 2,
  }: {
    width?: number;
    depth?: number;
    height?: number;
    colour?: string;
    pots?: number;
  } = {},
): Triple => {
  const [x, y, z] = at;
  builder.box("matte", colour, [width, height, depth], [x, y + height / 2, z]);
  builder.box(
    "matte",
    palette.stone,
    [width + 0.1, 0.08, depth + 0.1],
    [x, y + height + 0.04, z],
  );
  if (!builder.isFar) {
    builder.box(
      "matte",
      palette.stone,
      [width + 0.06, 0.05, depth + 0.06],
      [x, y + height - 0.16, z],
    );
  }
  const potTop = y + height + 0.08 + 0.32;
  for (let pot = 0; pot < pots; pot++) {
    const potX = x + (pot - (pots - 1) / 2) * (width / pots);
    builder.cylinder("matte", "#b5653d", {
      radius: 0.09,
      radiusEnd: 0.075,
      length: 0.32,
      at: [potX, y + height + 0.08 + 0.16, z],
      segments: 10,
    });
    if (!builder.isFar) {
      builder.cylinder("matte", "#a35a36", {
        radius: 0.095,
        length: 0.05,
        at: [potX, potTop - 0.02, z],
        segments: 10,
      });
    }
  }
  return [x, potTop + 0.05, z];
};

/** A sash window with a stone lintel above, facing +z turned by `turn`. */
export const addSash = (
  builder: AttractionBuilder,
  {
    at,
    width,
    height,
    turn = 0,
    isLit = false,
    frame = palette.white,
    lintel = palette.cream,
    glass = "#6f93ad",
  }: {
    at: Triple;
    width: number;
    height: number;
    turn?: number;
    isLit?: boolean;
    frame?: string;
    lintel?: string;
    glass?: string;
  },
): AttractionBuilder => {
  addWindow(builder, { at, width, height, turn, isLit, frame, glass });
  const place = makePlacer(at, turn);
  builder.box(
    "matte",
    lintel,
    [width + 0.22, 0.13, 0.08],
    place(0, height / 2 + 0.1, 0.02),
    [0, turn, 0],
  );
  if (!builder.isFar) {
    builder.box("paint", frame, [width + 0.02, 0.04, 0.07], place(0, 0, 0.04), [
      0,
      turn,
      0,
    ]);
  }
  return builder;
};

/** A half-round fanlight over a door, facing +z turned by `turn`. */
export const addFanlight = (
  builder: AttractionBuilder,
  {
    at,
    radius,
    turn = 0,
    frame = palette.white,
    isLit = false,
  }: {
    at: Triple;
    radius: number;
    turn?: number;
    frame?: string;
    isLit?: boolean;
  },
): AttractionBuilder => {
  const place = makePlacer(at, turn);
  const pane = new CylinderGeometry(
    radius,
    radius,
    0.04,
    builder.segments(14, 8),
    1,
    false,
    -Math.PI / 2,
    Math.PI,
  ).rotateX(-Math.PI / 2);
  addTurned(
    builder,
    isLit ? "glow" : "glass",
    isLit ? palette.warmLight : "#6f93ad",
    pane,
    place(0, 0, 0),
    [0, turn, 0],
  );
  addTurned(
    builder,
    "paint",
    frame,
    new TorusGeometry(radius + 0.02, 0.04, 5, builder.segments(14, 8), Math.PI),
    place(0, 0, 0.02),
    [0, turn, 0],
  );
  if (!builder.isFar) {
    [-0.6, 0, 0.6].forEach((spoke) => {
      builder.box(
        "paint",
        frame,
        [0.03, radius, 0.05],
        place(
          Math.sin(spoke) * radius * 0.5,
          Math.cos(spoke) * radius * 0.5,
          0.03,
        ),
        [0, turn, -spoke],
      );
    });
  }
  return builder;
};

const flowerColours = ["#e2557a", "#f4f1ea", "#9b5fc0", "#f2b51d", "#e8613c"];

/** Flowers dotted over the top of a round clump of leaves. */
const addBlooms = (
  builder: AttractionBuilder,
  centre: Triple,
  [across, up]: readonly [number, number],
  count: number,
  seed: number,
  size = 0.06,
) => {
  if (builder.isFar) {
    return;
  }
  for (let bloom = 0; bloom < count; bloom++) {
    const turn = bloom * 2.4 + seed;
    const lift = 0.25 + ((bloom * 0.37) % 1) * 1.1;
    builder.sphere(
      "matte",
      flowerColours[(bloom + seed) % flowerColours.length],
      size,
      [
        centre[0] + Math.cos(lift) * Math.sin(turn) * across * 0.97,
        centre[1] + Math.sin(lift) * up * 0.97,
        centre[2] + Math.cos(lift) * Math.cos(turn) * across * 0.97,
      ],
      [1, 0.8, 1],
      6,
    );
  }
};

/** A hanging basket of flowers on a wrought-iron bracket fixed to a wall. */
export const addHangingBasket = (
  builder: AttractionBuilder,
  wallAt: Triple,
  turn = 0,
  reach = 0.45,
): AttractionBuilder => {
  const place = makePlacer(wallAt, turn);
  builder.bar(
    "metal",
    palette.black,
    place(0, 0, 0),
    place(0, 0, reach + 0.05),
    0.035,
    6,
  );
  builder.bar(
    "metal",
    palette.black,
    place(0, -0.25, 0),
    place(0, 0, reach * 0.7),
    0.03,
    6,
  );
  const basket = place(0, -0.42, reach);
  if (!builder.isFar) {
    builder.bar(
      "metal",
      palette.black,
      place(0, 0, reach),
      place(0, -0.3, reach),
      0.015,
      4,
    );
  }
  builder.lathe(
    "matte",
    "#4a3a26",
    [
      [0, -0.12],
      [0.12, -0.1],
      [0.2, 0.02],
      [0.21, 0.04],
    ],
    basket,
    "y",
    builder.segments(12, 6),
  );
  builder.sphere(
    "matte",
    "#3f7a35",
    0.24,
    [basket[0], basket[1] + 0.06, basket[2]],
    [1, 0.7, 1],
    builder.segments(10, 6),
  );
  if (builder.isFar) {
    return builder;
  }
  addBlooms(
    builder,
    [basket[0], basket[1] + 0.06, basket[2]],
    [0.24, 0.17],
    12,
    0,
  );
  [0.6, 2.2, 3.8, 5.2].forEach((angle, strand) => {
    for (let leaf = 0; leaf < 3; leaf++) {
      builder.sphere(
        "matte",
        leaf === 2 && strand % 2 === 0 ? "#e2557a" : "#4f8f3a",
        0.05 - leaf * 0.008,
        [
          basket[0] + Math.sin(angle) * 0.2,
          basket[1] - 0.04 - leaf * 0.09,
          basket[2] + Math.cos(angle) * 0.2,
        ],
        [1, 1.2, 1],
        6,
      );
    }
  });
  return builder;
};

/** A flowering tub or planter on the ground. */
export const addPlanter = (
  builder: AttractionBuilder,
  at: Triple,
  {
    radius = 0.28,
    colour = "#3d4f45",
    flowers = 0,
  }: { radius?: number; colour?: string; flowers?: number } = {},
): AttractionBuilder => {
  const [x, y, z] = at;
  builder.lathe(
    "paint",
    colour,
    [
      [0, 0],
      [radius * 0.8, 0],
      [radius, radius * 1.1],
      [radius * 1.08, radius * 1.15],
      [radius * 1.05, radius * 1.25],
      [radius * 0.9, radius * 1.2],
    ],
    [x, y, z],
    "y",
    builder.segments(14, 8),
  );
  builder.sphere(
    "matte",
    "#3f7a35",
    radius * 1.05,
    [x, y + radius * 1.3, z],
    [1, 0.65, 1],
    builder.segments(10, 6),
  );
  addBlooms(
    builder,
    [x, y + radius * 1.3, z],
    [radius * 1.05, radius * 0.68],
    flowers,
    flowers,
    radius * 0.26,
  );
  return builder;
};

/** Stone quoins up each corner of a rectangular block. */
export const addQuoins = (
  builder: AttractionBuilder,
  {
    corners,
    height,
    colour = palette.cream,
    from = 0.1,
  }: {
    corners: readonly LocalPoint[];
    height: number;
    colour?: string;
    from?: number;
  },
): AttractionBuilder => {
  if (builder.isFar) {
    return builder;
  }
  const step = 0.3;
  corners.forEach(({ x, z }) => {
    for (let level = 0; from + level * step + 0.26 <= height; level++) {
      const isLong = level % 2 === 0;
      builder.box(
        "matte",
        colour,
        [isLong ? 0.36 : 0.24, 0.24, isLong ? 0.24 : 0.36],
        [x, from + level * step + 0.13, z],
      );
    }
  });
  return builder;
};

/** A flagpole with a gilded finial; returns the point the flag hangs from. */
export const addFlagpole = (
  builder: AttractionBuilder,
  at: Triple,
  height: number,
): Triple => {
  const [x, y, z] = at;
  builder.cylinder("matte", palette.stone, {
    radius: 0.24,
    radiusEnd: 0.2,
    length: 0.18,
    at: [x, y + 0.09, z],
    segments: 10,
  });
  builder.cylinder("paint", palette.white, {
    radius: 0.05,
    radiusEnd: 0.03,
    length: height,
    at: [x, y + height / 2, z],
    segments: 8,
  });
  builder.sphere(
    "metal",
    palette.brass,
    0.06,
    [x, y + height + 0.04, z],
    [1, 1, 1],
    8,
  );
  if (!builder.isFar) {
    builder.bar(
      "metal",
      palette.steel,
      [x + 0.04, y + height - 0.1, z],
      [x + 0.04, y + 1.0, z],
      0.012,
      4,
    );
    builder.box(
      "metal",
      palette.steel,
      [0.04, 0.1, 0.04],
      [x + 0.05, y + 1.0, z],
    );
  }
  return [x, y + height - 0.08, z];
};

/** A rectangular flag hanging from its pole at the origin, flying towards +x. */
export const buildFlag =
  (colours: { field: string; stripe?: string; length?: number }) =>
  (builder: AttractionBuilder) => {
    const length = colours.length ?? 1.1;
    const height = length * 0.6;
    const folds = builder.segments(5, 2);
    for (let fold = 0; fold < folds; fold++) {
      const share = (fold + 0.5) / folds;
      const wave = Math.sin(share * Math.PI * 1.6) * 0.06 * share;
      builder.box(
        "matte",
        colours.field,
        [length / folds + 0.05, height, 0.025],
        [0.04 + share * length, -height / 2, wave],
        [0, Math.cos(share * Math.PI * 1.6) * 0.25 * share, 0],
      );
      if (colours.stripe !== undefined) {
        builder.box(
          "matte",
          colours.stripe,
          [length / folds + 0.05, height * 0.22, 0.03],
          [0.04 + share * length, -height / 2, wave],
          [0, Math.cos(share * Math.PI * 1.6) * 0.25 * share, 0],
        );
      }
    }
  };

/** A road wheel with tyre and hub, its axle along local x. */
export const addRoadWheel = (
  builder: AttractionBuilder,
  at: Triple,
  radius: number,
  {
    width = 0.2,
    side = 1,
    hub = palette.steel,
  }: { width?: number; side?: number; hub?: string } = {},
): AttractionBuilder => {
  builder.cylinder("matte", "#222326", {
    radius,
    length: width,
    at,
    axis: "x",
    segments: 18,
  });
  builder.cylinder("metal", hub, {
    radius: radius * 0.58,
    length: width + 0.02,
    at,
    axis: "x",
    segments: 14,
  });
  if (!builder.isFar) {
    builder.cylinder("metal", shade(hub, 0.7), {
      radius: radius * 0.2,
      length: 0.05,
      at: [at[0] + (side * (width + 0.03)) / 2, at[1], at[2]],
      axis: "x",
      segments: 8,
    });
  }
  return builder;
};

/** A low wall of stone or brick, with a coping, along a straight line. */
export const addLowWall = (
  builder: AttractionBuilder,
  from: LocalPoint,
  to: LocalPoint,
  {
    height = 0.55,
    thickness = 0.3,
    colour = palette.stone,
    coping = palette.cream,
  }: {
    height?: number;
    thickness?: number;
    colour?: string;
    coping?: string;
  } = {},
): AttractionBuilder => {
  const length = Math.hypot(to.x - from.x, to.z - from.z);
  const turn = Math.atan2(to.x - from.x, to.z - from.z) + Math.PI / 2;
  const middle: Triple = [(from.x + to.x) / 2, 0, (from.z + to.z) / 2];
  builder.box(
    "matte",
    colour,
    [length, height, thickness],
    [middle[0], height / 2, middle[2]],
    [0, turn, 0],
  );
  builder.box(
    "matte",
    coping,
    [length + 0.04, 0.07, thickness + 0.08],
    [middle[0], height + 0.035, middle[2]],
    [0, turn, 0],
  );
  return builder;
};

type Stroke = readonly [number, number, number, number];

const bowlTop: Stroke[] = [
  [0, 4, 1.5, 4],
  [1.5, 4, 2, 3.4],
  [2, 3.4, 2, 2.6],
  [2, 2.6, 1.5, 2],
  [1.5, 2, 0, 2],
];

const ring: Stroke[] = [
  [0.5, 0, 1.5, 0],
  [1.5, 0, 2, 0.7],
  [2, 0.7, 2, 3.3],
  [2, 3.3, 1.5, 4],
  [1.5, 4, 0.5, 4],
  [0.5, 4, 0, 3.3],
  [0, 3.3, 0, 0.7],
  [0, 0.7, 0.5, 0],
];

const sixStrokes: Stroke[] = [
  [1.8, 4, 0.6, 4],
  [0.6, 4, 0, 3.2],
  [0, 3.2, 0, 0.6],
  [0, 0.6, 0.5, 0],
  [0.5, 0, 1.5, 0],
  [1.5, 0, 2, 0.6],
  [2, 0.6, 2, 1.6],
  [2, 1.6, 1.5, 2.2],
  [1.5, 2.2, 0, 2.2],
];

/** Capital letters drawn as strokes on a grid two wide and four tall. */
const letterStrokes: Readonly<Record<string, readonly Stroke[]>> = {
  A: [
    [0, 0, 1, 4],
    [1, 4, 2, 0],
    [0.45, 1.6, 1.55, 1.6],
  ],
  B: [
    [0, 0, 0, 4],
    [0, 4, 1.4, 4],
    [1.4, 4, 1.85, 3.4],
    [1.85, 3.4, 1.85, 2.6],
    [1.85, 2.6, 1.4, 2],
    [0, 2, 1.5, 2],
    [1.5, 2, 2, 1.4],
    [2, 1.4, 2, 0.6],
    [2, 0.6, 1.5, 0],
    [1.5, 0, 0, 0],
  ],
  C: [
    [2, 4, 0.5, 4],
    [0.5, 4, 0, 3.3],
    [0, 3.3, 0, 0.7],
    [0, 0.7, 0.5, 0],
    [0.5, 0, 2, 0],
  ],
  E: [
    [0, 0, 0, 4],
    [0, 4, 2, 4],
    [0, 2, 1.5, 2],
    [0, 0, 2, 0],
  ],
  F: [
    [0, 0, 0, 4],
    [0, 4, 2, 4],
    [0, 2, 1.5, 2],
  ],
  H: [
    [0, 0, 0, 4],
    [2, 0, 2, 4],
    [0, 2, 2, 2],
  ],
  I: [
    [1, 0, 1, 4],
    [0.3, 4, 1.7, 4],
    [0.3, 0, 1.7, 0],
  ],
  K: [
    [0, 0, 0, 4],
    [0, 1.5, 2, 4],
    [0.75, 2.4, 2, 0],
  ],
  L: [
    [0, 0, 0, 4],
    [0, 0, 2, 0],
  ],
  N: [
    [0, 0, 0, 4],
    [0, 4, 2, 0],
    [2, 0, 2, 4],
  ],
  O: ring,
  P: [[0, 0, 0, 4], ...bowlTop],
  R: [[0, 0, 0, 4], ...bowlTop, [0.9, 2, 2, 0]],
  S: [
    [2, 3.5, 1.5, 4],
    [1.5, 4, 0.5, 4],
    [0.5, 4, 0, 3.4],
    [0, 3.4, 0, 2.6],
    [0, 2.6, 0.5, 2],
    [0.5, 2, 1.5, 2],
    [1.5, 2, 2, 1.4],
    [2, 1.4, 2, 0.6],
    [2, 0.6, 1.5, 0],
    [1.5, 0, 0.5, 0],
    [0.5, 0, 0, 0.5],
  ],
  T: [
    [1, 0, 1, 4],
    [0, 4, 2, 4],
  ],
  W: [
    [0, 4, 0.5, 0],
    [0.5, 0, 1, 2.4],
    [1, 2.4, 1.5, 0],
    [1.5, 0, 2, 4],
  ],
  Y: [
    [0, 4, 1, 2],
    [2, 4, 1, 2],
    [1, 2, 1, 0],
  ],
  "0": ring,
  "1": [
    [1, 0, 1, 4],
    [0.4, 3.3, 1, 4],
    [0.4, 0, 1.6, 0],
  ],
  "2": [
    [0, 3.4, 0.5, 4],
    [0.5, 4, 1.5, 4],
    [1.5, 4, 2, 3.4],
    [2, 3.4, 2, 2.7],
    [2, 2.7, 0, 0],
    [0, 0, 2, 0],
  ],
  "3": [
    [0, 4, 1.5, 4],
    [1.5, 4, 2, 3.4],
    [2, 3.4, 2, 2.6],
    [2, 2.6, 1.5, 2],
    [0.6, 2, 1.5, 2],
    [1.5, 2, 2, 1.4],
    [2, 1.4, 2, 0.6],
    [2, 0.6, 1.5, 0],
    [1.5, 0, 0, 0],
  ],
  "4": [
    [1.5, 0, 1.5, 4],
    [1.5, 4, 0, 1.2],
    [0, 1.2, 2, 1.2],
  ],
  "5": [
    [2, 4, 0, 4],
    [0, 4, 0, 2.2],
    [0, 2.2, 1.5, 2.2],
    [1.5, 2.2, 2, 1.6],
    [2, 1.6, 2, 0.6],
    [2, 0.6, 1.5, 0],
    [1.5, 0, 0, 0],
  ],
  "6": sixStrokes,
  "7": [
    [0, 4, 2, 4],
    [2, 4, 0.7, 0],
  ],
  "8": [
    [0.5, 0, 1.5, 0],
    [1.5, 0, 2, 0.6],
    [2, 0.6, 2, 1.5],
    [2, 1.5, 1.5, 2],
    [0.5, 2, 1.5, 2],
    [0.5, 2, 0, 1.5],
    [0, 1.5, 0, 0.6],
    [0, 0.6, 0.5, 0],
    [0.6, 2, 0.2, 2.5],
    [0.2, 2.5, 0.2, 3.5],
    [0.2, 3.5, 0.6, 4],
    [0.6, 4, 1.4, 4],
    [1.4, 4, 1.8, 3.5],
    [1.8, 3.5, 1.8, 2.5],
    [1.8, 2.5, 1.4, 2],
  ],
  "9": sixStrokes.map(([fromX, fromY, toX, toY]): Stroke => [
    2 - fromX,
    4 - fromY,
    2 - toX,
    4 - toY,
  ]),
};

/**
 * Raised capital lettering (as on a shop fascia), centred on `at`,
 * facing +z turned by `turn`. Only drawn close up.
 */
export const addLettering = (
  builder: AttractionBuilder,
  text: string,
  {
    at,
    height,
    colour,
    turn = 0,
    finish = "paint",
    isFlat = false,
  }: {
    at: Triple;
    height: number;
    colour: string;
    turn?: number;
    finish?: AttractionFinish;
    /** Painted flat on the ground, its top towards -z (turned by `turn`). */
    isFlat?: boolean;
  },
): AttractionBuilder => {
  if (builder.isFar) {
    return builder;
  }
  const unit = height / 4;
  const pitch = unit * 3;
  const place = makePlacer(at, turn);
  const startX = -((text.length - 1) * pitch) / 2 - unit;
  const thickness = unit * 0.62;
  Array.from({ length: text.length }, (_, index) => {
    const strokes = letterStrokes[text.charAt(index)] ?? [];
    strokes.forEach(([fromX, fromY, toX, toY]) => {
      const length = Math.hypot(toX - fromX, toY - fromY) * unit;
      const angle = Math.atan2(toY - fromY, toX - fromX);
      const across = startX + index * pitch + ((fromX + toX) / 2) * unit;
      const up = ((fromY + toY) / 2) * unit - height / 2;
      if (isFlat) {
        builder.add(
          finish,
          colour,
          new PlaneGeometry(length + thickness * 0.9, thickness)
            .rotateX(-Math.PI / 2)
            .rotateY(turn + angle),
          { at: place(across, 0, -up) },
          undefined,
        );
        return;
      }
      builder.box(
        finish,
        colour,
        [length + thickness * 0.9, thickness, 0.025],
        place(across, up, 0),
        [0, turn, angle],
      );
    });
  });
  return builder;
};
