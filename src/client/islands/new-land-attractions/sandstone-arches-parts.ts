import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  IcosahedronGeometry,
  Vector3,
} from "three";
import {
  shade,
  type AttractionBuilder,
  type AttractionFinish,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";

/*
 * Shapes shared by the Sunscorch Sands' new-land Attractions: the
 * sandstone arches, the dinosaur park, the Archimedes screw, the
 * pottery kiln, the sand slide tower, the windcatcher house and the
 * painted cave. Golden sand, banded sandstone, terracotta and palms.
 */

export const desert = {
  sand: "#e6c98f",
  paleSand: "#f0dcae",
  dampSand: "#c9a46c",
  sandstone: "#d29a5c",
  paleSandstone: "#e2b47a",
  redSandstone: "#b8693f",
  darkSandstone: "#9a5634",
  terracotta: "#b9583a",
  paleTerracotta: "#d27a52",
  mudBrick: "#b98b5c",
  plaster: "#efe0c2",
  ochreRed: "#a8402a",
  ochreYellow: "#d9a23a",
  charcoal: "#2e2722",
  palmTrunk: "#8a6a48",
  palmTrunkDark: "#75583a",
  frond: "#4f8f3a",
  frondDark: "#3f7a30",
  scrub: "#7f8f45",
  turquoise: "#2f9fa6",
  indigo: "#2f3f7a",
  timber: "#9a6a3e",
  darkTimber: "#5e3e24",
  rope: "#c9ad78",
  water: "#3aa5c4",
  flame: "#ffb347",
  ember: "#ff7a2a",
} as const;

/** The stripes of sandstone, laid down one layer of sand at a time. */
export const sandstoneBands = [
  desert.sandstone,
  desert.paleSandstone,
  desert.redSandstone,
  desert.sandstone,
  "#c7854d",
  desert.paleSandstone,
] as const;

/** Paints faces in level stripes, like the layers in sandstone. */
export const paintBands =
  (bands: readonly string[], height: number, offset = 0) =>
  (centre: { y: number }): string =>
    bands[
      ((Math.floor((centre.y + offset) / height) % bands.length) +
        bands.length) %
        bands.length
    ];

/** A box laid from one point to another. */
export const addSlab = (
  builder: AttractionBuilder,
  finish: AttractionFinish,
  colour: string,
  from: Triple,
  to: Triple,
  width: number,
  thickness: number,
): void => {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dz = to[2] - from[2];
  const level = Math.hypot(dx, dz);
  builder.add(
    finish,
    colour,
    new BoxGeometry(width, thickness, Math.hypot(level, dy))
      .rotateX(Math.atan2(-dy, level))
      .rotateY(Math.atan2(dx, dz)),
    { at: [from[0] + dx / 2, from[1] + dy / 2, from[2] + dz / 2] },
    undefined,
  );
};

/** A knobbly rock or boulder, squashed to `size`. */
export const makeRock = (
  seed: number,
  detail: number,
  knobbliness = 0.14,
): BufferGeometry => {
  const geometry = new IcosahedronGeometry(1, detail);
  const positions = geometry.getAttribute("position");
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const lump =
      1 +
      knobbliness * Math.sin(x * 3.9 + seed) * Math.cos(z * 3.3 + seed * 1.4) +
      knobbliness * 0.6 * Math.sin(y * 5.1 + seed * 0.6);
    positions.setXYZ(index, x * lump, y * lump, z * lump);
  }
  return geometry;
};

export const addRock = (
  builder: AttractionBuilder,
  colour: string,
  at: Triple,
  size: Triple,
  seed: number,
  detail = 1,
): void => {
  builder.add("matte", colour, makeRock(seed, builder.isFar ? 0 : detail), {
    at,
    rotation: [0, seed * 1.7, 0],
    scale: size,
  });
};

/** Banded sandstone rock, its stripes level across the whole of it. */
export const addBandedRock = (
  builder: AttractionBuilder,
  at: Triple,
  size: Triple,
  seed: number,
  detail = 1,
  bands: readonly string[] = sandstoneBands,
): void => {
  builder.painted(
    makeRock(seed, builder.isFar ? 0 : detail),
    paintBands(bands, 0.32, seed * 0.1),
    { at, rotation: [0, seed * 1.7, 0], scale: size },
    "matte",
  );
};

export interface SweepSpec {
  /** The middle of the swept shape, from one end to the other. */
  path: readonly Triple[];
  /** A fixed sideways direction, for a path drawn in one upright plane. */
  side?: Triple;
  /** Points round the cross-section: [up from the path, sideways]. */
  section: readonly (readonly [number, number])[];
  /** How big the cross-section is along the path, [up, sideways]. */
  size: (share: number) => readonly [number, number];
  /** How knobbly, like rock (0 is smooth). */
  lump?: number;
  seed?: number;
  isCapped?: boolean;
}

/** A cross-section swept along a path: arches, necks, tails and slides. */
export const makeSweep = ({
  path,
  side,
  section,
  size,
  lump = 0,
  seed = 0,
  isCapped = true,
}: SweepSpec): BufferGeometry => {
  const around = section.length;
  const positions: number[] = [];
  const up = new Vector3(0, 1, 0);
  const fixedSide = side === undefined ? undefined : new Vector3(...side);
  path.forEach((point, ring) => {
    const before = new Vector3(...path[Math.max(0, ring - 1)]);
    const after = new Vector3(...path[Math.min(path.length - 1, ring + 1)]);
    const tangent = after.sub(before).normalize();
    const across =
      fixedSide?.clone() ??
      (Math.abs(tangent.y) > 0.98
        ? new Vector3(1, 0, 0)
        : tangent.clone().cross(up).normalize());
    const normal = across.clone().cross(tangent).normalize();
    const share = ring / Math.max(1, path.length - 1);
    const [high, wide] = size(share);
    section.forEach(([a, b], corner) => {
      const knob =
        1 +
        lump *
          Math.sin(ring * 1.71 + corner * 2.37 + seed) *
          Math.cos(ring * 0.93 - corner * 1.29 + seed * 1.9);
      positions.push(
        point[0] + (normal.x * a * high + across.x * b * wide) * knob,
        point[1] + (normal.y * a * high + across.y * b * wide) * knob,
        point[2] + (normal.z * a * high + across.z * b * wide) * knob,
      );
    });
  });
  const indices: number[] = [];
  for (let ring = 0; ring < path.length - 1; ring++) {
    for (let corner = 0; corner < around; corner++) {
      const here = ring * around + corner;
      const next = ring * around + ((corner + 1) % around);
      indices.push(
        here,
        next,
        next + around,
        here,
        next + around,
        here + around,
      );
    }
  }
  if (isCapped) {
    [0, path.length - 1].forEach((ring) => {
      const centre = positions.length / 3;
      positions.push(...path[ring]);
      for (let corner = 0; corner < around; corner++) {
        const here = ring * around + corner;
        const next = ring * around + ((corner + 1) % around);
        indices.push(
          ...(ring === 0 ? [centre, next, here] : [centre, here, next]),
        );
      }
    });
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3),
  );
  geometry.setIndex(indices);
  return geometry;
};

/** A round-ish cross-section with `count` corners, for makeSweep. */
export const listRoundSection = (
  count: number,
): readonly (readonly [number, number])[] =>
  Array.from({ length: count }, (_, corner) => {
    const angle = (corner / count) * Math.PI * 2;
    return [Math.cos(angle), Math.sin(angle)] as const;
  });

/** A U-shaped trough's cross-section, open to the top. */
export const listTroughSection = (
  inner: number,
  steps: number,
): (readonly [number, number])[] => {
  const outer: (readonly [number, number])[] = [];
  const back: (readonly [number, number])[] = [];
  for (let step = 0; step <= steps; step++) {
    const angle = (step / steps) * Math.PI;
    outer.push([-Math.sin(angle) * 1, Math.cos(angle) * 1]);
    back.unshift([-Math.sin(angle) * inner, Math.cos(angle) * inner]);
  }
  return [...outer, ...back];
};

/** Points along a curve, worked out from a share of the way along. */
export const listCurve = (
  steps: number,
  pointAt: (share: number) => Triple,
): Triple[] =>
  Array.from({ length: steps + 1 }, (_, step) => pointAt(step / steps));

/** A date palm: a ringed, leaning trunk and a crown of drooping fronds. */
export const addPalm = (
  builder: AttractionBuilder,
  at: Triple,
  height: number,
  lean: [number, number],
  turn = 0.3,
): void => {
  const pieces = builder.isFar ? 2 : 6;
  const pointAt = (share: number): Triple => [
    at[0] + lean[0] * share * share * height,
    at[1] + share * height,
    at[2] + lean[1] * share * share * height,
  ];
  for (let piece = 0; piece < pieces; piece++) {
    builder.bar(
      "matte",
      piece % 2 === 0 ? desert.palmTrunk : desert.palmTrunkDark,
      pointAt(piece / pieces),
      pointAt((piece + 1) / pieces),
      0.26 - (piece / pieces) * 0.09,
      builder.isFar ? 5 : 8,
    );
  }
  const top = pointAt(1);
  const fronds = builder.isFar ? 5 : 9;
  for (let frond = 0; frond < fronds; frond++) {
    const angle = (frond / fronds) * Math.PI * 2 + turn;
    const reach = 1.25 + (frond % 2) * 0.25;
    const out = (distance: number, drop: number): Triple => [
      top[0] + Math.sin(angle) * distance,
      top[1] + drop,
      top[2] + Math.cos(angle) * distance,
    ];
    const colour = frond % 2 === 0 ? desert.frond : desert.frondDark;
    if (builder.isFar) {
      addSlab(builder, "matte", colour, top, out(reach, -0.45), 0.42, 0.04);
      continue;
    }
    const points = [
      out(0, 0.05),
      out(reach * 0.35, 0.2),
      out(reach * 0.7, 0.05),
      out(reach, -0.45),
    ];
    for (let piece = 0; piece < 3; piece++) {
      addSlab(
        builder,
        "matte",
        colour,
        points[piece],
        points[piece + 1],
        0.44 - piece * 0.12,
        0.035,
      );
    }
  }
  if (!builder.isFar) {
    [0, 2, 4].forEach((bunch) => {
      const angle = (bunch / 6) * Math.PI * 2 + turn + 0.4;
      builder.sphere(
        "matte",
        "#b5612a",
        0.13,
        [
          top[0] + Math.sin(angle) * 0.2,
          top[1] - 0.2,
          top[2] + Math.cos(angle) * 0.2,
        ],
        [1, 1.3, 1],
        8,
      );
    });
  }
};

/** A low, round desert bush, grey-green. */
export const addScrub = (
  builder: AttractionBuilder,
  at: Triple,
  size = 0.4,
  colour: string = desert.scrub,
): void => {
  builder.sphere(
    "matte",
    colour,
    size,
    [at[0], at[1] + size * 0.45, at[2]],
    [1.2, 0.7, 1],
    builder.isFar ? 6 : 10,
  );
  if (!builder.isFar) {
    builder.sphere(
      "matte",
      shade(colour, 1.15),
      size * 0.6,
      [at[0] + size * 0.5, at[1] + size * 0.5, at[2] - size * 0.2],
      [1, 0.75, 1],
      8,
    );
  }
};

/** A terracotta pot or amphora, as round as a lathe makes it. */
export const addPot = (
  builder: AttractionBuilder,
  at: Triple,
  size = 0.4,
  colour: string = desert.terracotta,
  isTall = false,
): void => {
  const profile: [number, number][] = isTall
    ? [
        [0.001, 0],
        [0.12, 0.02],
        [0.36, 0.35],
        [0.4, 0.6],
        [0.24, 0.92],
        [0.15, 1.05],
        [0.2, 1.12],
        [0.001, 1.12],
      ]
    : [
        [0.001, 0],
        [0.3, 0.02],
        [0.5, 0.3],
        [0.46, 0.6],
        [0.3, 0.75],
        [0.34, 0.82],
        [0.001, 0.82],
      ];
  builder.lathe(
    "matte",
    colour,
    profile.map(([radius, height]) => [radius * size, height * size]),
    at,
    "y",
    builder.isFar ? 6 : 12,
  );
  if (!builder.isFar && size >= 0.45) {
    builder.torus(
      "matte",
      shade(colour, 0.75),
      (isTall ? 0.38 : 0.48) * size,
      0.025 * size + 0.006,
      [at[0], at[1] + (isTall ? 0.55 : 0.4) * size, at[2]],
      "y",
      12,
    );
  }
};

export interface PersonLook {
  skin: string;
  top: string;
  bottom: string;
  hair: string;
  hat?: string;
}

/** A visitor, about as tall as the Character, facing +z on y = 0. */
export const buildPerson =
  ({ skin, top, bottom, hair, hat }: PersonLook) =>
  (builder: AttractionBuilder): void => {
    const sides = builder.isFar ? 5 : 8;
    [-0.09, 0.09].forEach((x) => {
      builder.cylinder("matte", bottom, {
        radius: 0.06,
        length: 0.46,
        at: [x, 0.25, 0],
        segments: sides,
      });
      builder.box(
        "paint",
        desert.darkTimber,
        [0.11, 0.06, 0.18],
        [x, 0.03, 0.03],
      );
    });
    builder.cylinder("matte", top, {
      radius: 0.15,
      radiusEnd: 0.18,
      length: 0.42,
      at: [0, 0.68, 0],
      segments: sides + 2,
    });
    [-1, 1].forEach((side) => {
      builder.bar(
        "matte",
        skin,
        [side * 0.2, 0.84, 0],
        [side * 0.25, 0.52, 0.06],
        0.08,
        sides,
      );
    });
    builder.sphere("matte", skin, 0.14, [0, 1.02, 0], [1, 1.05, 1], 9);
    builder.sphere("matte", hair, 0.145, [0, 1.06, -0.02], [1, 0.9, 1], 8);
    if (hat !== undefined) {
      builder.cylinder("matte", hat, {
        radius: 0.25,
        length: 0.02,
        at: [0, 1.13, 0],
        segments: sides + 4,
      });
      builder.cylinder("matte", hat, {
        radius: 0.13,
        radiusEnd: 0.11,
        length: 0.1,
        at: [0, 1.18, 0],
        segments: sides + 2,
      });
    }
    if (!builder.isFar) {
      [-0.05, 0.05].forEach((x) => {
        builder.sphere(
          "paint",
          desert.charcoal,
          0.017,
          [x, 1.04, 0.13],
          [1, 1, 1],
          5,
        );
      });
    }
  };

/** Where along a path of corners the Character is, walking it evenly. */
export const followPath = (
  corners: readonly Triple[],
  progress: number,
): LocalSpot => {
  const lengths = corners.slice(1).map((corner, index) => {
    const from = corners[index];
    return Math.hypot(
      corner[0] - from[0],
      corner[1] - from[1],
      corner[2] - from[2],
    );
  });
  const total = lengths.reduce((sum, length) => sum + length, 0);
  let left = Math.min(1, Math.max(0, progress)) * total;
  for (let index = 0; index < lengths.length; index++) {
    const from = corners[index];
    const to = corners[index + 1];
    if (left <= lengths[index] || index === lengths.length - 1) {
      const share =
        lengths[index] === 0 ? 0 : Math.min(1, left / lengths[index]);
      const heading =
        Math.hypot(to[0] - from[0], to[2] - from[2]) < 1e-6
          ? 0
          : Math.atan2(to[0] - from[0], to[2] - from[2]);
      return {
        x: from[0] + (to[0] - from[0]) * share,
        y: from[1] + (to[1] - from[1]) * share,
        z: from[2] + (to[2] - from[2]) * share,
        heading,
      };
    }
    left -= lengths[index];
  }
  const last = corners[corners.length - 1];
  return { x: last[0], y: last[1], z: last[2], heading: 0 };
};

/** Turns a local point about y by `turn`, then moves it to `at`. */
export const placeTurned = (
  at: Triple,
  turn: number,
  [x, y, z]: Triple,
): Triple => [
  at[0] + x * Math.cos(turn) + z * Math.sin(turn),
  at[1] + y,
  at[2] - x * Math.sin(turn) + z * Math.cos(turn),
];

export interface Knot {
  at: Triple;
  /** The cross-section's size here: [up, sideways]. */
  size: readonly [number, number];
}

/**
 * A smooth path through knots (Catmull-Rom), and the size at each of
 * its points, for sweeping bodies, necks and tails.
 */
export const listSmoothKnots = (
  knots: readonly Knot[],
  stepsPerSpan: number,
): { path: Triple[]; size: (share: number) => readonly [number, number] } => {
  const path: Triple[] = [];
  const sizes: (readonly [number, number])[] = [];
  const knotAt = (index: number) =>
    knots[Math.max(0, Math.min(knots.length - 1, index))];
  for (let span = 0; span < knots.length - 1; span++) {
    const p0 = knotAt(span - 1).at;
    const p1 = knotAt(span).at;
    const p2 = knotAt(span + 1).at;
    const p3 = knotAt(span + 2).at;
    const steps = span === knots.length - 2 ? stepsPerSpan + 1 : stepsPerSpan;
    for (let step = 0; step < steps; step++) {
      const t = step / stepsPerSpan;
      const t2 = t * t;
      const t3 = t2 * t;
      const along = (axis: 0 | 1 | 2) =>
        0.5 *
        (2 * p1[axis] +
          (-p0[axis] + p2[axis]) * t +
          (2 * p0[axis] - 5 * p1[axis] + 4 * p2[axis] - p3[axis]) * t2 +
          (-p0[axis] + 3 * p1[axis] - 3 * p2[axis] + p3[axis]) * t3);
      path.push([along(0), along(1), along(2)]);
      const from = knotAt(span).size;
      const to = knotAt(span + 1).size;
      sizes.push([
        from[0] + (to[0] - from[0]) * t,
        from[1] + (to[1] - from[1]) * t,
      ]);
    }
  }
  return {
    path,
    size: (share) =>
      sizes[Math.min(sizes.length - 1, Math.round(share * (sizes.length - 1)))],
  };
};
