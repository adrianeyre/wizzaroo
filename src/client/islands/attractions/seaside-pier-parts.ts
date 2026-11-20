import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  OctahedronGeometry,
  Shape,
} from "three";
import {
  palette,
  shade,
  type AttractionBuilder,
  type LocalPoint,
  type Triple,
} from "./attraction-kit.js";

export const ironwork = "#35574f";
export const railingCream = "#ece6d3";
export const handrail = "#7a5232";
export const stripeRed = "#c4363b";
export const stripeCream = "#f3e7c7";
export const copperGreen = "#6aa596";
export const navy = "#2c4373";
export const gold = "#d4a843";

/** One ring of a swept tube: a centre, the sideways and up directions. */
export interface SweepRing {
  centre: Triple;
  side: Triple;
  up: Triple;
}

/**
 * Sweeps a closed profile of [side, up] points along rings, as one
 * geometry (for the helter-skelter's spiral slide).
 */
export const buildSweep = (
  rings: readonly SweepRing[],
  profile: readonly (readonly [number, number])[],
): BufferGeometry => {
  const positions: number[] = [];
  rings.forEach(({ centre, side, up }) => {
    profile.forEach(([across, lift]) => {
      positions.push(
        centre[0] + side[0] * across + up[0] * lift,
        centre[1] + side[1] * across + up[1] * lift,
        centre[2] + side[2] * across + up[2] * lift,
      );
    });
  });
  const around = profile.length;
  const indices: number[] = [];
  for (let ring = 0; ring < rings.length - 1; ring++) {
    for (let point = 0; point < around; point++) {
      const here = ring * around + point;
      const next = ring * around + ((point + 1) % around);
      indices.push(
        here,
        next + around,
        next,
        here,
        here + around,
        next + around,
      );
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3),
  );
  geometry.setIndex(indices);
  return geometry;
};

/**
 * A run of Victorian pier railing: a timber handrail on cream cast-iron
 * balusters, with posts and ball finials.
 */
export const addRailing = (
  builder: AttractionBuilder,
  from: LocalPoint,
  to: LocalPoint,
  base: number,
  height = 0.82,
): AttractionBuilder => {
  const length = Math.hypot(to.x - from.x, to.z - from.z);
  const turn = Math.atan2(to.x - from.x, to.z - from.z);
  const along: Triple = [0, turn, 0];
  const middle = (share: number, y: number): Triple => [
    from.x + (to.x - from.x) * share,
    base + y,
    from.z + (to.z - from.z) * share,
  ];
  builder.box(
    "paint",
    handrail,
    [0.09, 0.06, length],
    middle(0.5, height),
    along,
  );
  builder.box(
    "paint",
    railingCream,
    [0.04, 0.04, length],
    middle(0.5, builder.isFar ? 0.3 : 0.1),
    along,
  );
  const posts = Math.max(1, Math.round(length / (builder.isFar ? 4 : 2)));
  for (let post = 0; post <= posts; post++) {
    const at = middle(post / posts, 0);
    builder.box(
      "paint",
      railingCream,
      [0.08, height + 0.04, 0.08],
      [at[0], base + (height + 0.04) / 2, at[2]],
      along,
    );
    if (!builder.isFar) {
      builder.add(
        "paint",
        railingCream,
        new OctahedronGeometry(0.06),
        { at: [at[0], base + height + 0.1, at[2]], scale: [1, 1.3, 1] },
        undefined,
      );
    }
  }
  if (builder.isFar) {
    return builder;
  }
  const balusters = Math.max(2, Math.round(length / 0.3));
  for (let baluster = 1; baluster < balusters; baluster++) {
    const at = middle(baluster / balusters, 0);
    const top = height - 0.03;
    builder.add(
      "paint",
      railingCream,
      new CylinderGeometry(0.016, 0.016, top - 0.1, 3, 1, true),
      { at: [at[0], base + 0.1 + (top - 0.1) / 2, at[2]] },
      undefined,
    );
  }
  return builder;
};

/** A beach hut facing -z, its floor centred at `at`. */
export const addBeachHut = (
  builder: AttractionBuilder,
  at: Triple,
  colour: string,
  door: string,
): AttractionBuilder => {
  const [x, y, z] = at;
  const width = 1.1;
  const depth = 1.2;
  const wall = 1.3;
  const rise = 0.45;
  builder.box(
    "matte",
    palette.paleTimber,
    [width + 0.16, 0.12, depth + 0.4],
    [x, y + 0.06, z - 0.12],
  );
  const profile = new Shape();
  profile.moveTo(-width / 2, 0);
  profile.lineTo(width / 2, 0);
  profile.lineTo(width / 2, wall);
  profile.lineTo(0, wall + rise);
  profile.lineTo(-width / 2, wall);
  profile.closePath();
  builder.add(
    "paint",
    colour,
    new ExtrudeGeometry(profile, { depth, bevelEnabled: false }),
    { at: [x, y + 0.12, z - depth / 2] },
    undefined,
  );
  const front = z - depth / 2;
  const slope = Math.hypot(width / 2 + 0.12, rise);
  const angle = Math.atan2(rise, width / 2);
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      "#59626b",
      [slope, 0.06, depth + 0.24],
      [
        x + (side * (width / 2 + 0.06)) / 2,
        y + 0.12 + wall + rise / 2 + 0.03,
        z,
      ],
      [0, 0, -side * angle],
    );
    builder.box(
      "paint",
      palette.white,
      [slope, 0.1, 0.05],
      [
        x + (side * (width / 2 + 0.06)) / 2,
        y + 0.1 + wall + rise / 2,
        front - 0.14,
      ],
      [0, 0, -side * angle],
    );
    builder.box(
      "paint",
      palette.white,
      [0.07, wall, 0.07],
      [x + side * (width / 2 + 0.01), y + 0.12 + wall / 2, front - 0.01],
    );
  });
  builder.box("paint", door, [0.5, 1.0, 0.04], [x, y + 0.64, front - 0.02]);
  builder.box(
    "paint",
    palette.white,
    [0.62, 0.07, 0.06],
    [x, y + 1.17, front - 0.03],
  );
  if (!builder.isFar) {
    builder.box(
      "paint",
      shade(door, 0.85),
      [0.03, 0.98, 0.05],
      [x, y + 0.64, front - 0.03],
    );
    builder.box(
      "glass",
      palette.glass,
      [0.2, 0.12, 0.05],
      [x, y + 1.38, front - 0.02],
    );
    builder.sphere(
      "metal",
      palette.brass,
      0.025,
      [x + 0.07, y + 0.65, front - 0.06],
      [1, 1, 1],
      5,
    );
  }
  return builder;
};

/** A striped deckchair facing +z (turned by `turn`), its feet at `at`. */
export const addDeckchair = (
  builder: AttractionBuilder,
  at: Triple,
  turn: number,
  stripe: string,
): AttractionBuilder => {
  if (builder.isFar) {
    return builder;
  }
  const place = (x: number, y: number, z: number): Triple => [
    at[0] + x * Math.cos(turn) + z * Math.sin(turn),
    at[1] + y,
    at[2] - x * Math.sin(turn) + z * Math.cos(turn),
  ];
  [-0.24, 0.24].forEach((side) => {
    builder.bar(
      "matte",
      palette.paleTimber,
      place(side, 0, 0.3),
      place(side, 0.75, -0.3),
      0.04,
      5,
    );
    builder.bar(
      "matte",
      palette.paleTimber,
      place(side, 0, -0.32),
      place(side, 0.42, 0.18),
      0.04,
      5,
    );
  });
  builder.painted(
    new BoxGeometry(0.44, 0.02, 0.72, 5, 1, 1),
    (centre) => {
      const local =
        (centre.x - at[0]) * Math.cos(turn) -
        (centre.z - at[2]) * Math.sin(turn);
      return Math.floor((local + 0.22) / 0.088) % 2 === 0
        ? stripe
        : palette.white;
    },
    {
      at: place(0, 0.38, -0.02),
      rotation: [0, turn, 0],
    },
    "matte",
  );
  builder.box(
    "matte",
    palette.paleTimber,
    [0.5, 0.03, 0.03],
    place(0, 0.75, -0.3),
    [0, turn, 0],
  );
  return builder;
};

/** A twin pier kiosk with a copper ogee dome, at deck level `at`. */
export const addKiosk = (
  builder: AttractionBuilder,
  at: Triple,
  hatchColour: string,
  facing: number,
): AttractionBuilder => {
  const [x, y, z] = at;
  const turn = Math.PI / 8;
  builder.cylinder("paint", "#f0e8d2", {
    radius: 0.78,
    length: 0.95,
    at: [x, y + 0.475, z],
    segments: 8,
  });
  builder.cylinder("glass", "#8fb6cf", {
    radius: 0.72,
    length: 0.72,
    at: [x, y + 1.31, z],
    segments: 8,
  });
  builder.cylinder("paint", ironwork, {
    radius: 0.86,
    length: 0.24,
    at: [x, y + 1.79, z],
    segments: 8,
  });
  builder.cylinder("paint", palette.cream, {
    radius: 0.92,
    length: 0.06,
    at: [x, y + 1.93, z],
    segments: 8,
  });
  builder.lathe(
    "paint",
    copperGreen,
    [
      [0, 0],
      [0.9, 0],
      [0.86, 0.12],
      [0.7, 0.34],
      [0.5, 0.56],
      [0.26, 0.82],
      [0.1, 1.0],
      [0.04, 1.1],
      [0, 1.12],
    ],
    [x, y + 1.96, z],
    "y",
    12,
  );
  builder.sphere("metal", gold, 0.07, [x, y + 3.15, z], [1, 1, 1], 6);
  builder.bar("metal", gold, [x, y + 3.05, z], [x, y + 3.4, z], 0.03, 6);
  const hatch: Triple = [
    x + Math.sin(facing) * 0.74,
    y,
    z + Math.cos(facing) * 0.74,
  ];
  builder.box(
    "paint",
    hatchColour,
    [0.7, 0.08, 0.26],
    [hatch[0], y + 0.98, hatch[2]],
    [0, facing, 0],
  );
  builder.box(
    "glow",
    palette.warmLight,
    [0.6, 0.55, 0.04],
    [hatch[0], y + 1.3, hatch[2]],
    [0, facing, 0],
  );
  if (!builder.isFar) {
    for (let side = 0; side < 8; side++) {
      const angle = (side / 8) * Math.PI * 2 + turn;
      builder.box(
        "paint",
        ironwork,
        [0.05, 0.74, 0.05],
        [x + Math.sin(angle) * 0.75, y + 1.31, z + Math.cos(angle) * 0.75],
        [0, angle, 0],
      );
    }
    builder.box(
      "paint",
      hatchColour,
      [0.74, 0.2, 0.03],
      [
        hatch[0] + Math.sin(facing) * 0.14,
        y + 1.79,
        hatch[2] + Math.cos(facing) * 0.14,
      ],
      [0, facing, 0],
    );
  }
  return builder;
};

/** A Punch and Judy booth facing -z, standing at `at`. */
export const addPunchBooth = (
  builder: AttractionBuilder,
  at: Triple,
): AttractionBuilder => {
  const [x, y, z] = at;
  const width = 1.3;
  const depth = 0.95;
  const height = 2.2;
  const front = z - depth / 2;
  builder.painted(
    new BoxGeometry(width, height, depth, 10, 1, 7),
    (centre, normal) => {
      if (Math.abs(normal.y) > 0.5) {
        return undefined;
      }
      const across = Math.abs(normal.z) > 0.5 ? centre.x - x : centre.z - z;
      return Math.floor((across + 2) / 0.13) % 2 === 0
        ? stripeRed
        : stripeCream;
    },
    { at: [x, y + height / 2, z] },
    "matte",
    undefined,
  );
  builder.box(
    "matte",
    "#2a1d1a",
    [0.86, 0.52, 0.02],
    [x, y + 1.66, front - 0.005],
  );
  builder.box(
    "paint",
    palette.timber,
    [1.0, 0.07, 0.18],
    [x, y + 1.39, front - 0.07],
  );
  builder.box("paint", navy, [1.36, 0.34, 0.06], [x, y + 2.08, front - 0.03]);
  builder.box("paint", gold, [1.0, 0.06, 0.02], [x, y + 2.1, front - 0.065]);
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      "#8f1d2c",
      [0.16, 0.56, 0.05],
      [x + side * 0.42, y + 1.64, front - 0.03],
    );
  });
  const pediment = new Shape();
  pediment.moveTo(-0.7, 0);
  pediment.lineTo(0.7, 0);
  pediment.lineTo(0, 0.5);
  pediment.closePath();
  builder.add(
    "paint",
    navy,
    new ExtrudeGeometry(pediment, { depth: depth + 0.04, bevelEnabled: false }),
    { at: [x, y + height + 0.02, z - depth / 2 - 0.02] },
    undefined,
  );
  builder.sphere(
    "metal",
    gold,
    0.08,
    [x, y + height + 0.6, z - depth / 2 + 0.02],
    [1, 1, 1],
    8,
  );
  [-0.7, 0.7].forEach((side) => {
    builder.sphere(
      "paint",
      stripeRed,
      0.06,
      [x + side, y + height + 0.08, front - 0.02],
      [1, 1, 1],
      8,
    );
  });
  if (!builder.isFar) {
    for (let scallop = 0; scallop < 6; scallop++) {
      builder.sphere(
        "paint",
        "#8f1d2c",
        0.075,
        [x - 0.36 + scallop * 0.144, y + 1.9, front - 0.04],
        [1, 0.7, 0.4],
        6,
      );
    }
    builder.box(
      "paint",
      palette.cream,
      [0.5, 0.05, 0.02],
      [x, y + 2.0, front - 0.065],
    );
  }
  return builder;
};

/** Mr Punch himself, his hands on the playboard at the origin. */
export const buildPunch = (builder: AttractionBuilder): void => {
  builder.add("paint", "#c8323a", new ConeGeometry(0.12, 0.3, 10), {
    at: [0, -0.05, 0],
  });
  builder.sphere("paint", "#f1c7a6", 0.085, [0, 0.17, 0], [1, 1, 1], 10);
  builder.sphere("paint", "#d9806b", 0.035, [0, 0.16, -0.085], [1, 1, 1.4], 6);
  builder.add("paint", stripeRed, new ConeGeometry(0.075, 0.2, 8), {
    at: [0, 0.32, 0.02],
    rotation: [0.5, 0, 0],
  });
  builder.sphere("paint", gold, 0.025, [0, 0.41, 0.07], [1, 1, 1], 6);
  builder.box(
    "matte",
    palette.paleTimber,
    [0.03, 0.03, 0.28],
    [0.1, 0.08, -0.1],
    [0.6, 0, 0],
  );
};

/** A herring gull, gliding along +z. */
export const buildGull = (builder: AttractionBuilder): void => {
  builder.sphere("paint", palette.white, 0.12, [0, 0, 0], [0.8, 0.7, 1.7], 6);
  builder.sphere("paint", palette.white, 0.075, [0, 0.06, 0.2], [1, 1, 1], 6);
  builder.add("paint", "#e9b03c", new ConeGeometry(0.025, 0.09, 5), {
    at: [0, 0.05, 0.3],
    rotation: [Math.PI / 2, 0, 0],
  });
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      "#a9b1b8",
      [0.32, 0.02, 0.16],
      [side * 0.18, 0.04, 0],
      [0, 0, side * -0.18],
    );
    builder.box(
      "paint",
      "#3a3d42",
      [0.2, 0.021, 0.12],
      [side * 0.42, 0.09, -0.02],
      [0, 0, side * -0.4],
    );
  });
  builder.box(
    "paint",
    palette.white,
    [0.12, 0.02, 0.12],
    [0, 0.0, -0.22],
    [0, Math.PI / 4, 0],
  );
};

/** A Victorian lamp post with a glowing lantern and a crown cap. */
export const addPierLamp = (
  builder: AttractionBuilder,
  at: Triple,
  height = 2.3,
): AttractionBuilder => {
  const [x, y, z] = at;
  builder.cylinder("paint", ironwork, {
    radius: 0.09,
    radiusEnd: 0.06,
    length: 0.4,
    at: [x, y + 0.2, z],
    segments: 8,
    isOpen: true,
  });
  builder.cylinder("paint", ironwork, {
    radius: 0.04,
    radiusEnd: 0.03,
    length: height,
    at: [x, y + height / 2, z],
    segments: 6,
    isOpen: true,
  });
  builder.box(
    "glow",
    palette.warmLight,
    [0.17, 0.24, 0.17],
    [x, y + height + 0.1, z],
  );
  if (builder.isFar) {
    return builder;
  }
  builder.add("paint", ironwork, new ConeGeometry(0.16, 0.16, 6, 1, true), {
    at: [x, y + height + 0.3, z],
  });
  builder.add(
    "metal",
    gold,
    new OctahedronGeometry(0.04),
    {
      at: [x, y + height + 0.42, z],
    },
    undefined,
  );
  return builder;
};

/** A small glowing festoon bulb. */
export const addBulb = (
  builder: AttractionBuilder,
  at: Triple,
  colour: string,
): AttractionBuilder =>
  builder.add("glow", colour, new OctahedronGeometry(0.05), { at }, undefined);
