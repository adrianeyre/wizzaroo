import {
  BufferGeometry,
  CatmullRomCurve3,
  ConeGeometry,
  Float32BufferAttribute,
  Vector3,
} from "three";
import {
  shade,
  type AttractionBuilder,
  type AttractionFinish,
  type Triple,
} from "../attractions/attraction-kit.js";

/**
 * The Lava Flume's shapes: a water slide dressed up as a volcano, its
 * winding trough running with glowing orange "lava" that is really
 * just water, lit from underneath.
 */

export const flumeColours = {
  basalt: "#2e2726",
  basaltEdge: "#4a3f3b",
  basaltLight: "#5d514b",
  ash: "#8a7f76",
  ashPad: "#4d403a",
  lining: "#8a2c16",
  lava: "#ff8c1a",
  lavaDeep: "#e8461c",
  lavaWhite: "#ffd166",
  lavaWater: "#ff9a4a",
  foam: "#ffe0c0",
  bronze: "#b0773a",
  darkBronze: "#7a4f26",
  roofTile: "#8a3f24",
  stripe: "#2b2523",
  white: "#f4f1ea",
  towelBlue: "#3d8fc4",
  towelYellow: "#f2c53d",
  leaf: "#3f6b34",
  poker: "#e8461c",
  pokerTip: "#ffcc4d",
} as const;

/* ------------------------------------------------------------------ */
/* The volcano and its spiral stair                                    */
/* ------------------------------------------------------------------ */

export const volcanoAt = { x: -3.4, z: -3.6 };
export const craterFloor = 3.4;

/** The volcano's outside, as [radius, height] from its foot to its rim. */
export const volcanoProfile: readonly (readonly [number, number])[] = [
  [2.5, 0],
  [2.45, 0.3],
  [2.2, 1.0],
  [1.85, 1.8],
  [1.45, 2.6],
  [1.14, 3.25],
  [1.1, 3.48],
];

/** How wide the volcano is at a height, from its profile. */
export const findVolcanoRadius = (height: number): number => {
  for (let index = 1; index < volcanoProfile.length; index++) {
    const [radius, top] = volcanoProfile[index];
    const [lowRadius, bottom] = volcanoProfile[index - 1];
    if (height <= top) {
      const share = (height - bottom) / (top - bottom);
      return lowRadius + (radius - lowRadius) * Math.max(0, share);
    }
  }
  return volcanoProfile[volcanoProfile.length - 1][0];
};

/** The stair winds from the front round the back, climbing to the crater. */
export const stairFrom = 0.6;
export const stairSweep = 4.08;
export const stairSteps = 24;
export const stairWidth = 0.66;

export const findStairSpot = (
  share: number,
  out = 0.3,
): { x: number; y: number; z: number; angle: number } => {
  const angle = stairFrom - share * stairSweep;
  const y = share * craterFloor;
  const radius = findVolcanoRadius(y) + out;
  return {
    x: volcanoAt.x + Math.sin(angle) * radius,
    y,
    z: volcanoAt.z + Math.cos(angle) * radius,
    angle,
  };
};

/* ------------------------------------------------------------------ */
/* The flume's path                                                    */
/* ------------------------------------------------------------------ */

export const poolAt = { x: 3.2, z: 2.2 };
export const poolRadius = 2.0;
export const poolRim = 0.45;
export const poolWater = 0.32;

export const flumeCurve = new CatmullRomCurve3(
  [
    new Vector3(volcanoAt.x + 0.7, craterFloor - 0.02, volcanoAt.z),
    new Vector3(-1.7, 3.2, -4.15),
    new Vector3(-0.4, 2.95, -4.7),
    new Vector3(1.8, 2.55, -4.3),
    new Vector3(2.9, 2.15, -2.6),
    new Vector3(1.8, 1.7, -1.3),
    new Vector3(0.4, 1.3, -0.4),
    new Vector3(0.35, 0.92, 0.95),
    new Vector3(1.6, 0.56, 1.9),
  ],
  false,
  "centripetal",
);

/** Where the flume tips its riders out, over the pool. */
export const flumeEnd = flumeCurve.getPointAt(1);

/**
 * Sweeps a cross-section [across, up] along the flume, so its trough,
 * lining and running water follow every bend. Walking the section from
 * one side to the other with "up" growing on the left wall keeps every
 * face turned outwards.
 */
export const addSweep = (
  builder: AttractionBuilder,
  finish: AttractionFinish,
  colour: string,
  section: readonly (readonly [number, number])[],
  samples: number,
  from = 0,
  to = 1,
): void => {
  const positions: number[] = [];
  const indices: number[] = [];
  const upright = new Vector3(0, 1, 0);
  for (let index = 0; index <= samples; index++) {
    const share = from + ((to - from) * index) / samples;
    const point = flumeCurve.getPointAt(share);
    const tangent = flumeCurve.getTangentAt(share).normalize();
    const side = tangent.clone().cross(upright).normalize();
    const up = side.clone().cross(tangent).normalize();
    section.forEach(([across, rise]) => {
      positions.push(
        point.x + side.x * across + up.x * rise,
        point.y + side.y * across + up.y * rise,
        point.z + side.z * across + up.z * rise,
      );
    });
  }
  const around = section.length;
  for (let index = 0; index < samples; index++) {
    for (let corner = 0; corner < around - 1; corner++) {
      const a = index * around + corner;
      const b = (index + 1) * around + corner;
      const c = b + 1;
      const d = a + 1;
      indices.push(a, b, c, a, c, d);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  builder.add(finish, colour, geometry);
};

/* ------------------------------------------------------------------ */
/* Little things round about                                           */
/* ------------------------------------------------------------------ */

/** A clump of red-hot pokers, the flowers that look like flaming torches. */
export const addRedHotPokers = (
  builder: AttractionBuilder,
  [x, y, z]: Triple,
  size = 1,
): void => {
  const blades = builder.isFar ? 3 : 5;
  for (let blade = 0; blade < blades; blade++) {
    const angle = (blade / blades) * Math.PI * 2 + 0.3;
    const lean = 0.45 + (blade % 3) * 0.12;
    builder.add(
      "matte",
      blade % 2 === 0 ? flumeColours.leaf : shade(flumeColours.leaf, 1.2),
      new ConeGeometry(0.05 * size, 0.7 * size, 4)
        .translate(0, 0.35 * size, 0)
        .rotateX(lean)
        .rotateY(angle),
      { at: [x, y, z] },
      undefined,
    );
  }
  const stalks = builder.isFar ? 1 : 2;
  for (let stalk = 0; stalk < stalks; stalk++) {
    const angle = (stalk / stalks) * Math.PI * 2;
    const spread = stalk === 0 ? 0 : 0.14 * size;
    const height = (0.75 + (stalk % 3) * 0.14) * size;
    const tx = x + Math.sin(angle) * spread;
    const tz = z + Math.cos(angle) * spread;
    builder.cylinder("matte", shade(flumeColours.leaf, 1.3), {
      radius: 0.018 * size,
      length: height,
      at: [tx, y + height / 2, tz],
      segments: 4,
    });
    builder.cylinder("paint", flumeColours.poker, {
      radius: 0.07 * size,
      radiusEnd: 0.05 * size,
      length: 0.18 * size,
      at: [tx, y + height + 0.09 * size, tz],
      segments: 6,
    });
    builder.cylinder("paint", flumeColours.pokerTip, {
      radius: 0.075 * size,
      radiusEnd: 0.072 * size,
      length: 0.14 * size,
      at: [tx, y + height - 0.06 * size, tz],
      segments: 6,
    });
    builder.sphere(
      "paint",
      flumeColours.poker,
      0.05 * size,
      [tx, y + height + 0.19 * size, tz],
      [1, 1.4, 1],
      5,
    );
  }
};

/** A cluster of six-sided basalt columns, like the Giant's Causeway. */
export const addBasaltColumns = (
  builder: AttractionBuilder,
  [x, y, z]: Triple,
  heights: readonly number[],
): void => {
  heights.forEach((height, index) => {
    const angle = index * 2.1;
    const spread = index === 0 ? 0 : 0.36 + (index % 2) * 0.08;
    const cx = x + Math.sin(angle) * spread;
    const cz = z + Math.cos(angle) * spread;
    builder.cylinder(
      "matte",
      index % 2 === 0 ? flumeColours.basalt : flumeColours.basaltEdge,
      {
        radius: 0.21,
        length: height,
        at: [cx, y + height / 2, cz],
        segments: 6,
      },
    );
    if (!builder.isFar) {
      builder.cylinder("matte", flumeColours.basaltLight, {
        radius: 0.19,
        length: 0.02,
        at: [cx, y + height + 0.01, cz],
        segments: 6,
      });
    }
  });
};

/** A tall lifeguard's chair with a striped sunshade, facing -x. */
export const addLifeguardChair = (
  builder: AttractionBuilder,
  [x, y, z]: Triple,
): void => {
  const seat = 1.55;
  [-1, 1].forEach((sideX) => {
    [-1, 1].forEach((sideZ) => {
      builder.bar(
        "paint",
        flumeColours.basaltLight,
        [x + sideX * 0.42, y, z + sideZ * 0.42],
        [x + sideX * 0.24, y + seat, z + sideZ * 0.24],
        0.07,
        6,
      );
    });
  });
  if (!builder.isFar) {
    [0.45, 0.85, 1.25].forEach((up) => {
      const inset = 0.42 - (up / seat) * 0.18;
      builder.box(
        "paint",
        flumeColours.bronze,
        [0.05, 0.05, inset * 2],
        [x - inset, y + up, z],
      );
    });
  }
  builder.box(
    "paint",
    flumeColours.lavaDeep,
    [0.6, 0.08, 0.6],
    [x, y + seat + 0.04, z],
  );
  builder.box(
    "paint",
    flumeColours.lavaDeep,
    [0.08, 0.5, 0.6],
    [x + 0.28, y + seat + 0.3, z],
  );
  builder.cylinder("metal", flumeColours.bronze, {
    radius: 0.025,
    length: 1.2,
    at: [x + 0.2, y + seat + 0.6, z],
    segments: 6,
  });
  const shadeAt: Triple = [x + 0.2, y + seat + 1.2, z];
  const segments = builder.segments(12, 6);
  for (let panel = 0; panel < segments; panel++) {
    const angle = (panel / segments) * Math.PI * 2;
    builder.add(
      "matte",
      panel % 2 === 0 ? flumeColours.lava : flumeColours.white,
      new ConeGeometry(0.62, 0.3, 1, 1, true, angle, (Math.PI * 2) / segments),
      { at: shadeAt },
      undefined,
    );
  }
  builder.box(
    "paint",
    flumeColours.white,
    [0.36, 0.22, 0.03],
    [x - 0.28, y + seat - 0.35, z],
    [0, Math.PI / 2, 0],
  );
  builder.box(
    "paint",
    flumeColours.lavaDeep,
    [0.26, 0.05, 0.035],
    [x - 0.29, y + seat - 0.35, z],
    [0, Math.PI / 2, 0],
  );
};
