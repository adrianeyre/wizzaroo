import {
  BoxGeometry,
  CatmullRomCurve3,
  ConeGeometry,
  CylinderGeometry,
  Euler,
  ExtrudeGeometry,
  LatheGeometry,
  Path,
  Quaternion,
  Shape,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";
import type { ModelPart, Triple } from "../world-map-models.js";
import {
  blob,
  block,
  mirrored,
  rod,
  spike,
  taper,
  turned,
  type LabItemParts,
} from "./lab-item-parts.js";

// Each place or vehicle faces +z and stands on y = 0, about one unit tall
// or long. Vehicles drive towards +z.

type Point = readonly [number, number];
type Outline = readonly Point[];

interface Place {
  at?: Triple;
  turn?: Triple;
  size?: Triple;
}

const quarter = Math.PI / 2;
const upward = new Vector3(0, 1, 0);
const across = new Vector3(1, 0, 0);

const toTriple = (quaternion: Quaternion): Triple => {
  const euler = new Euler().setFromQuaternion(quaternion);
  return [euler.x, euler.y, euler.z];
};

/** The turn that points a shape's +y axis along `direction`. */
const pointing = (direction: Vector3): Triple =>
  toTriple(
    new Quaternion().setFromUnitVectors(upward, direction.clone().normalize()),
  );

/** Tips a shape about x first, then turns it about y to face `face`. */
const tipThenFace = (tip: number, face: number): Triple =>
  toTriple(
    new Quaternion()
      .setFromAxisAngle(upward, face)
      .multiply(new Quaternion().setFromAxisAngle(across, tip)),
  );

const midpoint = (from: Triple, to: Triple): Triple => [
  (from[0] + to[0]) / 2,
  (from[1] + to[1]) / 2,
  (from[2] + to[2]) / 2,
];

/** A straight bar between two points, for girders, struts, spokes and strings. */
const strut = (
  from: Triple,
  to: Triple,
  radius: number,
  colour: string,
  sides = 4,
  toRadius = radius,
): ModelPart => {
  const span = new Vector3(...to).sub(new Vector3(...from));
  return {
    geometry: new CylinderGeometry(
      toRadius,
      radius,
      span.length(),
      sides,
      1,
      true,
    ),
    colour,
    position: midpoint(from, to),
    rotation: pointing(span),
  };
};

/** A rounded rod between two points, for arms, legs and handles. */
const limb = (
  from: Triple,
  to: Triple,
  radius: number,
  colour: string,
  sides = 6,
): ModelPart => {
  const span = new Vector3(...to).sub(new Vector3(...from));
  return rod(
    radius,
    span.length(),
    colour,
    { at: midpoint(from, to), turn: pointing(span) },
    sides,
  );
};

/** A flat outline drawn in x/y and pushed out along z, centred on its depth. */
const slab = (
  outline: Outline,
  depth: number,
  colour: string,
  { at, turn, size }: Place = {},
  holes: readonly Outline[] = [],
  bevel = 0,
): ModelPart => {
  const shape = new Shape(outline.map(([x, y]) => new Vector2(x, y)));
  shape.holes = holes.map(
    (hole) => new Path(hole.map(([x, y]) => new Vector2(x, y))),
  );
  const core = depth - bevel * 2;
  const geometry = new ExtrudeGeometry(shape, {
    depth: core,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 4,
  });
  geometry.translate(0, 0, -core / 2);
  return { geometry, colour, position: at, rotation: turn, scale: size };
};

/** A side view of a vehicle body, given as [along, up] and given its width. */
const sideProfile = (
  outline: Outline,
  width: number,
  colour: string,
  bevel = 0,
  at: Triple = [0, 0, 0],
): ModelPart =>
  slab(outline, width, colour, { at, turn: [0, -quarter, 0] }, [], bevel);

const arcPoints = (
  centre: Point,
  radii: Point,
  from: number,
  to: number,
  steps: number,
): Point[] =>
  Array.from({ length: steps + 1 }, (_, index) => {
    const angle = from + ((to - from) * index) / steps;
    return [
      centre[0] + radii[0] * Math.cos(angle),
      centre[1] + radii[1] * Math.sin(angle),
    ] as const;
  });

/** A doorway or window outline: straight sides and a round top. */
const archOutline = (width: number, height: number, steps = 6): Outline => [
  [-width / 2, 0],
  [width / 2, 0],
  ...arcPoints([0, height], [width / 2, width / 2], 0, Math.PI, steps),
];

/** A gothic window outline: straight sides and a pointed top. */
const lancetOutline = (width: number, height: number): Outline => [
  [-width / 2, 0],
  [width / 2, 0],
  [width / 2, height],
  [width * 0.32, height + width * 0.42],
  [0, height + width * 0.62],
  [-width * 0.32, height + width * 0.42],
  [-width / 2, height],
];

const starOutline = (outer: number, inner: number): Outline =>
  Array.from({ length: 10 }, (_, index) => {
    const angle = quarter + (index * Math.PI) / 5;
    const radius = index % 2 === 0 ? outer : inner;
    return [radius * Math.cos(angle), radius * Math.sin(angle)] as const;
  });

/** A smooth tube along a curve, for chains, ropes and arches. */
const tube = (
  points: readonly Triple[],
  radius: number,
  colour: string,
  segments = 12,
  sides = 4,
): ModelPart => ({
  geometry: new TubeGeometry(
    new CatmullRomCurve3(points.map((point) => new Vector3(...point))),
    segments,
    radius,
    sides,
    false,
  ),
  colour,
  isSmooth: true,
});

/**
 * A thin sheet facing +z whose surface is pushed along z by `bend`, given
 * how far across (0–1) and up (0–1) each point is: billowing sails and
 * waving flags.
 */
const cloth = (
  width: number,
  height: number,
  thickness: number,
  colour: string,
  { at, turn }: Place,
  bend: (along: number, up: number) => number,
  segments: Point = [6, 4],
): ModelPart => {
  const geometry = new BoxGeometry(
    width,
    height,
    thickness,
    segments[0],
    segments[1],
    1,
  );
  const positions = geometry.getAttribute("position");
  for (let index = 0; index < positions.count; index++) {
    positions.setZ(
      index,
      positions.getZ(index) +
        bend(
          positions.getX(index) / width + 0.5,
          positions.getY(index) / height + 0.5,
        ),
    );
  }
  return { geometry, colour, position: at, rotation: turn, isSmooth: true };
};

/** A wheel or a clock face: a short cylinder whose axle runs along x or z. */
const disc = (
  radius: number,
  width: number,
  colour: string,
  at: Triple,
  axle: "x" | "z" = "x",
  sides = 14,
): ModelPart =>
  taper(
    [radius, radius],
    width,
    colour,
    {
      at,
      turn: axle === "x" ? [0, 0, quarter] : [quarter, 0, 0],
    },
    sides,
  );

/** A rugged cone for mountains and peaks, with rows the roughening can move. */
const peak = (
  radius: number,
  height: number,
  colour: string,
  at: Triple,
  roughen: number,
  sides = 12,
  rows = 4,
): ModelPart => ({
  geometry: new ConeGeometry(radius, height, sides, rows),
  colour,
  position: [at[0], at[1] + height / 2, at[2]],
  roughen,
});

/**
 * Two roof planes meeting at a ridge, the ridge running along x (or z),
 * eaves overhanging the walls a little.
 */
const roofPlanes = (
  halfSpan: number,
  rise: number,
  length: number,
  colour: string,
  base: Triple,
  alongZ = false,
  overhang = 0.05,
  thickness = 0.035,
): ModelPart[] => {
  const angle = Math.atan2(rise, halfSpan);
  const slope = Math.hypot(halfSpan, rise) + overhang;
  const up =
    base[1] +
    rise -
    (slope / 2) * Math.sin(angle) +
    (thickness / 2) * Math.cos(angle);
  const out = (slope / 2) * Math.cos(angle) + (thickness / 2) * Math.sin(angle);
  return [-1, 1].map((side) =>
    alongZ
      ? block([slope, thickness, length], colour, {
          at: [base[0] + side * out, up, base[2]],
          turn: [0, 0, -side * angle],
        })
      : block([length, thickness, slope], colour, {
          at: [base[0], up, base[2] + side * out],
          turn: [side * angle, 0, 0],
        }),
  );
};

/** The triangle of wall filling a pitched roof's end. */
const gable = (
  halfSpan: number,
  rise: number,
  length: number,
  colour: string,
  at: Triple,
  alongZ = false,
): ModelPart =>
  slab(
    [
      [-halfSpan, 0],
      [halfSpan, 0],
      [0, rise],
    ],
    length,
    colour,
    { at, turn: alongZ ? [0, 0, 0] : [0, quarter, 0] },
  );

/** A framed window pane; `facing` turns it from +z about y. */
const pane = (
  width: number,
  height: number,
  at: Triple,
  frame: string,
  glazing = paneBlue,
  facing = 0,
): ModelPart[] => [
  block([width + 0.025, height + 0.025, 0.012], frame, {
    at,
    turn: [0, facing, 0],
  }),
  block([width, height, 0.02], glazing, { at, turn: [0, facing, 0] }),
];

/**
 * A lattice section from a square at `bottom` to one at `top`, each
 * [height, half width]: four corner girders and a cross on every face.
 */
const truss = (
  bottom: Point,
  top: Point,
  colour: string,
  girder: number,
  brace: number,
  centres: readonly [Point, Point] = [
    [0, 0],
    [0, 0],
  ],
): ModelPart[] => {
  const corner = ([up, half]: Point, sx: number, sz: number): Triple => {
    const [cx, cz] = up === bottom[0] ? centres[0] : centres[1];
    return [cx + sx * half, up, cz + sz * half];
  };
  const corners: Point[] = [
    [1, 1],
    [1, -1],
    [-1, -1],
    [-1, 1],
  ];
  return corners.flatMap(([sx, sz], index) => {
    const [nx, nz] = corners[(index + 1) % 4] ?? [1, 1];
    return [
      strut(corner(bottom, sx, sz), corner(top, sx, sz), girder, colour),
      strut(corner(bottom, sx, sz), corner(top, nx, nz), brace, colour, 3),
      strut(corner(bottom, nx, nz), corner(top, sx, sz), brace, colour, 3),
    ];
  });
};

const shaft = (
  levels: readonly Point[],
  colour: string,
  girder: number,
  brace: number,
): ModelPart[] =>
  levels
    .slice(1)
    .flatMap((top, index) =>
      truss(levels[index] ?? top, top, colour, girder, brace),
    );

/** Points [x, z] round a circle, for rings of columns and battlements. */
const around = (count: number, radius: number, offset = 0): Point[] =>
  Array.from({ length: count }, (_, index) => {
    const angle = offset + (index / count) * Math.PI * 2;
    return [radius * Math.sin(angle), radius * Math.cos(angle)] as const;
  });

const paneBlue = "#36506b";
const darkGlass = "#26313d";
const glassBlue = "#bfe2f2";
const chrome = "#c9ced3";
const tyreBlack = "#1d1d20";
const grass = "#6da544";
const water = "#5aa9d6";
const white = "#f3f3ef";

// ---------------------------------------------------------------- Statues

const angelOfTheNorth = (): LabItemParts => {
  const rust = "#8b4a2b";
  const darkRust = "#6e3820";
  // Gormley's wings are plates as wide as a jumbo jet's, tipped slightly forward.
  const wing: Outline = [
    [0.07, 0.6],
    [1.3, 0.66],
    [1.33, 0.7],
    [1.33, 0.78],
    [1.3, 0.8],
    [0.07, 0.82],
  ];
  return {
    body: [
      blob([0.55, 0.07, 0.4], grass, { at: [0, 0, 0] }, [12, 6]),
      block([0.18, 0.06, 0.14], "#9a958c", { at: [0, 0.03, 0] }),
      ...mirrored((side) => [
        taper(
          [0.04, 0.05],
          0.42,
          rust,
          {
            at: [0.045 * side, 0.27, 0],
            size: [1, 1, 0.9],
          },
          6,
        ),
        block([0.07, 0.03, 0.12], rust, { at: [0.045 * side, 0.075, 0.02] }),
      ]),
      blob([0.1, 0.1, 0.07], rust, { at: [0, 0.5, 0] }, [10, 7]),
      taper(
        [0.11, 0.085],
        0.28,
        rust,
        {
          at: [0, 0.66, 0],
          size: [1, 1, 0.65],
        },
        8,
      ),
      taper([0.03, 0.035], 0.06, rust, { at: [0, 0.83, 0] }, 6),
      blob([0.055, 0.07, 0.06], rust, { at: [0, 0.9, 0.005] }, [10, 7]),
      ...mirrored((side) => [
        slab(
          wing.map(([x, y]) => [x * side, y] as const),
          0.035,
          rust,
          { turn: [0, -0.07 * side, 0] },
        ),
        // The upright ribs that stiffen the back of each wing.
        ...[0.25, 0.45, 0.65, 0.85, 1.05, 1.22].map((x) =>
          block([0.018, 0.17, 0.02], darkRust, {
            at: [x * side, 0.71, -0.03 + x * 0.07],
            turn: [0, -0.07 * side, 0],
          }),
        ),
      ]),
      ...[0.4, 0.55, 0.7].map((y) =>
        block([0.2, 0.012, 0.1], darkRust, { at: [0, y, 0] }),
      ),
    ],
  };
};

const davidStatue = (): LabItemParts => {
  const marble = "#efebe3";
  const vein = "#d6cfc1";
  return {
    body: [
      block([0.36, 0.06, 0.32], vein, { at: [0, 0.03, 0] }),
      block([0.3, 0.26, 0.26], "#e3ddd2", { at: [0, 0.19, 0] }),
      block([0.36, 0.04, 0.32], vein, { at: [0, 0.34, 0] }),
      // He stands with his weight on his right leg, his left knee bent forward.
      limb([-0.05, 0.38, 0], [-0.05, 0.63, -0.01], 0.034, marble),
      limb([0.06, 0.37, 0.05], [0.08, 0.5, 0.06], 0.03, marble),
      limb([0.08, 0.5, 0.06], [0.055, 0.63, 0], 0.034, marble),
      blob([0.035, 0.02, 0.055], marble, { at: [-0.05, 0.37, 0.02] }, [8, 5]),
      blob([0.035, 0.02, 0.055], marble, { at: [0.07, 0.37, 0.07] }, [8, 5]),
      blob(
        [0.1, 0.07, 0.065],
        marble,
        {
          at: [0, 0.65, 0],
          turn: [0, 0, 0.08],
        },
        [10, 7],
      ),
      blob(
        [0.105, 0.14, 0.07],
        marble,
        {
          at: [0, 0.77, 0],
          turn: [0, 0, -0.06],
        },
        [10, 7],
      ),
      blob([0.12, 0.045, 0.065], marble, {
        at: [0, 0.865, -0.005],
        turn: [0, 0, -0.08],
      }),
      taper([0.025, 0.03], 0.06, marble, { at: [0, 0.9, 0] }, 6),
      blob([0.045, 0.055, 0.05], marble, {
        at: [0.005, 0.96, 0.01],
        turn: [0, 0.5, 0],
      }),
      // His curls.
      ...[
        [0, 1.005, -0.005],
        [0.03, 0.99, -0.02],
        [-0.03, 0.99, -0.02],
        [0.02, 0.985, 0.025],
        [-0.025, 0.98, 0.02],
        [0, 0.97, -0.04],
      ].map(([x, y, z]) =>
        blob([0.024, 0.022, 0.024], "#e6e0d4", { at: [x, y, z] }, [5, 4]),
      ),
      limb([-0.12, 0.85, 0], [-0.135, 0.72, 0], 0.024, marble),
      limb([-0.135, 0.72, 0], [-0.125, 0.6, 0.02], 0.021, marble),
      blob(
        [0.026, 0.032, 0.026],
        marble,
        { at: [-0.125, 0.58, 0.025] },
        [8, 5],
      ),
      limb([0.12, 0.855, 0], [0.165, 0.76, 0.03], 0.024, marble),
      limb([0.165, 0.76, 0.03], [0.1, 0.87, 0.06], 0.021, marble),
      blob(
        [0.024, 0.026, 0.024],
        marble,
        { at: [0.095, 0.885, 0.065] },
        [8, 5],
      ),
      // The sling: over his left shoulder and down his back to his right hand.
      tube(
        [
          [0.095, 0.885, 0.07],
          [0.1, 0.905, 0.01],
          [0.06, 0.85, -0.07],
          [-0.04, 0.72, -0.08],
          [-0.11, 0.62, -0.03],
          [-0.125, 0.58, 0.02],
        ],
        0.009,
        "#c9a77c",
        14,
        4,
      ),
    ],
  };
};

const theThinker = (): LabItemParts => {
  const bronze = "#4b4a37";
  const stone = "#9d9990";
  return {
    body: [
      block([0.46, 0.12, 0.56], "#8c887f", { at: [0, 0.06, 0.04] }),
      block([0.4, 0.22, 0.32], stone, { at: [0, 0.23, -0.06] }),
      blob([0.13, 0.08, 0.1], bronze, { at: [0, 0.38, -0.06] }),
      ...mirrored((side) => [
        limb(
          [0.07 * side, 0.38, -0.04],
          [0.085 * side, 0.41, 0.17],
          0.052,
          bronze,
        ),
        limb(
          [0.085 * side, 0.41, 0.17],
          [0.08 * side, 0.16, 0.2],
          0.042,
          bronze,
        ),
        blob(
          [0.045, 0.03, 0.075],
          bronze,
          { at: [0.08 * side, 0.14, 0.24] },
          [8, 5],
        ),
      ]),
      blob([0.14, 0.17, 0.1], bronze, {
        at: [0, 0.51, 0],
        turn: [0.55, 0, 0.1],
      }),
      blob([0.155, 0.06, 0.09], bronze, {
        at: [0, 0.6, 0.07],
        turn: [0.55, 0, 0.1],
      }),
      limb([0, 0.6, 0.08], [0, 0.64, 0.13], 0.035, bronze),
      blob(
        [0.058, 0.066, 0.062],
        bronze,
        { at: [0, 0.665, 0.16], turn: [0.5, 0, 0] },
        [10, 7],
      ),
      blob([0.06, 0.04, 0.058], "#3f3e2e", { at: [0, 0.71, 0.145] }, [8, 5]),
      // His right elbow rests on his left knee, his chin on the back of his hand.
      limb([-0.15, 0.59, 0.06], [0.05, 0.43, 0.18], 0.038, bronze),
      limb([0.05, 0.43, 0.18], [0.01, 0.57, 0.2], 0.032, bronze),
      blob([0.038, 0.032, 0.042], bronze, { at: [0.005, 0.59, 0.205] }, [8, 5]),
      limb([0.155, 0.59, 0.05], [0.185, 0.46, 0.1], 0.036, bronze),
      limb([0.185, 0.46, 0.1], [0.12, 0.42, 0.25], 0.03, bronze),
      blob([0.035, 0.042, 0.03], bronze, { at: [0.11, 0.385, 0.27] }, [8, 5]),
    ],
  };
};

// -------------------------------------------------------------- Landmarks

const eiffelTower = (): LabItemParts => {
  const iron = "#7b5a3f";
  const deck = "#9a7a5a";
  // Each leg is its own lattice column, leaning in to meet the others.
  const legs = mirrored((sx) =>
    mirrored((sz) => [
      ...truss([0, 0.05], [0.09, 0.036], iron, 0.009, 0.005, [
        [sx * 0.17, sz * 0.17],
        [sx * 0.135, sz * 0.135],
      ]),
      ...truss([0.09, 0.036], [0.175, 0.026], iron, 0.009, 0.005, [
        [sx * 0.135, sz * 0.135],
        [sx * 0.1, sz * 0.1],
      ]),
    ]),
  );
  return {
    body: [
      ...legs,
      // The great arches between the legs, one on each side.
      ...[0, 1, 2, 3].map((index) => {
        const angle = (index * Math.PI) / 2;
        const points: Triple[] = arcPoints(
          [0, 0.03],
          [0.115, 0.11],
          0,
          Math.PI,
          8,
        ).map(([x, y]) => [
          x * Math.cos(angle) + 0.13 * Math.sin(angle),
          y,
          -x * Math.sin(angle) + 0.13 * Math.cos(angle),
        ]);
        return tube(points, 0.009, iron, 10, 4);
      }),
      block([0.28, 0.025, 0.28], iron, { at: [0, 0.185, 0] }),
      block([0.3, 0.01, 0.3], deck, { at: [0, 0.2, 0] }),
      ...shaft(
        [
          [0.19, 0.1],
          [0.29, 0.078],
          [0.39, 0.058],
          [0.52, 0.043],
          [0.66, 0.031],
          [0.8, 0.022],
          [0.9, 0.016],
        ],
        iron,
        0.008,
        0.004,
      ),
      block([0.15, 0.02, 0.15], iron, { at: [0, 0.39, 0] }),
      block([0.16, 0.008, 0.16], deck, { at: [0, 0.403, 0] }),
      block([0.05, 0.035, 0.05], iron, { at: [0, 0.915, 0] }),
      taper([0.012, 0.022], 0.035, iron, { at: [0, 0.95, 0] }, 6),
      taper([0.002, 0.006], 0.06, iron, { at: [0, 0.995, 0] }, 4),
    ],
  };
};

const electricityPylon = (): LabItemParts => {
  const steel = "#9aa2a8";
  const insulator = "#5d6e5c";
  const arm = (y: number, reach: number, half: number): ModelPart[] =>
    mirrored((side) => [
      strut([side * half, y, half], [side * reach, y, 0], 0.005, steel),
      strut([side * half, y, -half], [side * reach, y, 0], 0.005, steel),
      strut([side * half, y + 0.06, 0], [side * reach, y, 0], 0.005, steel),
      strut(
        [side * reach, y, 0],
        [side * reach, y - 0.07, 0],
        0.003,
        "#3b3f43",
        3,
      ),
      ...[0.02, 0.04, 0.06].map((drop) =>
        taper(
          [0.012, 0.012],
          0.008,
          insulator,
          {
            at: [side * reach, y - drop, 0],
          },
          6,
        ),
      ),
    ]);
  return {
    body: [
      ...mirrored((sx) =>
        mirrored((sz) =>
          block([0.05, 0.03, 0.05], "#b9b4aa", {
            at: [sx * 0.16, 0.015, sz * 0.16],
          }),
        ),
      ),
      ...shaft(
        [
          [0.02, 0.16],
          [0.18, 0.12],
          [0.33, 0.09],
          [0.48, 0.065],
          [0.62, 0.052],
          [0.76, 0.044],
          [0.88, 0.036],
        ],
        steel,
        0.008,
        0.004,
      ),
      ...[0.18, 0.33].map((y) => {
        const half = y < 0.2 ? 0.12 : 0.09;
        return block([half * 2, 0.01, half * 2], steel, { at: [0, y, 0] });
      }),
      ...arm(0.48, 0.28, 0.065),
      ...arm(0.62, 0.34, 0.052),
      ...arm(0.76, 0.26, 0.044),
      strut([0.036, 0.88, 0.036], [0, 1.0, 0], 0.006, steel),
      strut([-0.036, 0.88, -0.036], [0, 1.0, 0], 0.006, steel),
      strut([0.036, 0.88, -0.036], [0, 1.0, 0], 0.006, steel),
      strut([-0.036, 0.88, 0.036], [0, 1.0, 0], 0.006, steel),
    ],
  };
};

const theShard = (): LabItemParts => {
  const facetColours = ["#9cc4de", "#b9d8ec", "#86b0cc", "#a9cde4"];
  const apothem = 0.2;
  const width = 2 * apothem * Math.tan(Math.PI / 8);
  // Each glass face stops at its own height and stays apart, so the top is splintered.
  const heights = [0.97, 0.88, 1.0, 0.91, 0.95, 0.86, 0.99, 0.9];
  return {
    body: [
      block([0.5, 0.04, 0.5], "#8d9196", { at: [0, 0.02, 0] }),
      {
        ...peak(0.19, 0.8, "#5d7a90", [0, 0.04, 0], 0, 8, 1),
        rotation: [0, Math.PI / 8, 0],
      },
      ...heights.map((height, index) => {
        const facing = (index * Math.PI) / 4;
        const inward = apothem - 0.03;
        const length = Math.hypot(height, inward);
        const tip = Math.atan2(inward, height);
        return slab(
          [
            [-width / 2, 0],
            [width / 2, 0],
            [0.012, length],
            [-0.012, length],
          ],
          0.012,
          facetColours[index % facetColours.length] ?? "#9cc4de",
          {
            at: [apothem * Math.sin(facing), 0.04, apothem * Math.cos(facing)],
            turn: tipThenFace(-tip, facing),
          },
        );
      }),
    ],
  };
};

const sagradaFamilia = (): LabItemParts => {
  const stone = "#c9b48c";
  const shadow = "#a8926a";
  const profile: Outline = [
    [1, 0],
    [0.97, 0.3],
    [0.85, 0.55],
    [0.6, 0.78],
    [0.3, 0.93],
    [0, 1],
  ];
  const widthAt = (t: number): number => {
    const next = profile.findIndex(([, up]) => up >= t);
    const [r1, t1] = profile[next] ?? [0, 1];
    const [r0, t0] = profile[next - 1] ?? [1, 0];
    return t1 === t0 ? r1 : r0 + ((r1 - r0) * (t - t0)) / (t1 - t0);
  };
  const spire = (
    x: number,
    z: number,
    base: number,
    height: number,
    radius: number,
  ): ModelPart => ({
    ...turned(
      profile.map(([across, up]) => [across * radius, up * height] as const),
      stone,
      { at: [x, base, z] },
      7,
    ),
    roughen: 0.12,
  });
  const mosaic = ["#e2b33c", "#c8443a", "#f2efe6", "#e2b33c"];
  const bellTowers: Point[] = [
    [-0.27, 0.85],
    [-0.1, 1.0],
    [0.1, 1.0],
    [0.27, 0.85],
  ];
  const radius = 0.052;
  return {
    body: [
      block([0.76, 0.2, 1.1], stone, { at: [0, 0.1, 0] }),
      block([0.5, 0.12, 0.9], shadow, { at: [0, 0.26, 0] }),
      ...mirrored((side) =>
        bellTowers.flatMap(([x, height], index) => [
          spire(x, side * 0.45, 0.15, height, radius),
          blob(
            [0.026, 0.04, 0.026],
            mosaic[index] ?? "#e2b33c",
            { at: [x, 0.15 + height + 0.025, side * 0.45] },
            [6, 4],
          ),
        ]),
      ),
      spire(0, -0.05, 0.3, 1.15, 0.085),
      spire(-0.2, -0.14, 0.3, 0.7, 0.06),
      spire(0.2, -0.14, 0.3, 0.7, 0.06),
      block([0.012, 0.08, 0.012], white, { at: [0, 1.48, -0.05] }),
      block([0.06, 0.012, 0.012], white, { at: [0, 1.49, -0.05] }),
      block([0.012, 0.012, 0.06], white, { at: [0, 1.49, -0.05] }),
      // The green cypress tree over the Nativity doorway.
      spike(0.045, 0.2, "#4f8a3c", { at: [0, 0.3, 0.56] }, 6),
      ...[-0.18, 0, 0.18].map((x) =>
        slab(archOutline(0.1, 0.06, 4), 0.02, "#3a2f24", { at: [x, 0, 0.55] }),
      ),
      // Dark openings up the front bell towers, like a honeycomb.
      ...bellTowers.flatMap(([x, height]) =>
        [0.25, 0.4, 0.55, 0.7].map((t) =>
          block([0.018, 0.028, 0.02], "#4d3f2c", {
            at: [x, 0.15 + height * t, 0.45 + radius * widthAt(t) - 0.002],
          }),
        ),
      ),
    ],
  };
};

const stPaulsCathedral = (): LabItemParts => {
  const portland = "#e6dfcf";
  const shade = "#cfc6b2";
  const lead = "#8c969b";
  const gold = "#e0b43f";
  return {
    body: [
      block([0.44, 0.3, 1.1], portland, { at: [0, 0.15, -0.05] }),
      block([1.0, 0.3, 0.36], portland, { at: [0, 0.15, -0.12] }),
      block([0.34, 0.1, 0.95], shade, { at: [0, 0.35, -0.05] }),
      block([0.8, 0.1, 0.28], shade, { at: [0, 0.35, -0.12] }),
      // The drum, ringed by columns, under the great dome.
      taper([0.24, 0.24], 0.06, portland, { at: [0, 0.43, -0.12] }, 18),
      taper([0.2, 0.2], 0.14, shade, { at: [0, 0.53, -0.12] }, 16),
      ...around(16, 0.235).map(([x, z]) =>
        strut([x, 0.46, z - 0.12], [x, 0.59, z - 0.12], 0.01, portland, 5),
      ),
      taper([0.25, 0.25], 0.025, portland, { at: [0, 0.6, -0.12] }, 18),
      taper([0.205, 0.205], 0.07, portland, { at: [0, 0.645, -0.12] }, 16),
      turned(
        [
          [0.215, 0],
          [0.21, 0.06],
          [0.19, 0.12],
          [0.15, 0.18],
          [0.09, 0.225],
          [0.03, 0.245],
          [0, 0.25],
        ],
        lead,
        { at: [0, 0.68, -0.12] },
        16,
      ),
      taper([0.035, 0.04], 0.09, portland, { at: [0, 0.97, -0.12] }, 8),
      blob([0.04, 0.03, 0.04], lead, { at: [0, 1.02, -0.12] }, [8, 5]),
      taper([0.004, 0.01], 0.05, gold, { at: [0, 1.06, -0.12] }, 5),
      blob([0.016, 0.016, 0.016], gold, { at: [0, 1.09, -0.12] }, [6, 4]),
      block([0.005, 0.04, 0.005], gold, { at: [0, 1.12, -0.12] }),
      block([0.025, 0.005, 0.005], gold, { at: [0, 1.125, -0.12] }),
      // The west front: a two-tier portico between two towers.
      block([0.72, 0.36, 0.1], portland, { at: [0, 0.18, 0.5] }),
      ...[-0.15, -0.09, -0.03, 0.03, 0.09, 0.15].map((x) =>
        strut([x, 0.02, 0.585], [x, 0.17, 0.585], 0.014, white, 6),
      ),
      block([0.36, 0.025, 0.06], portland, { at: [0, 0.18, 0.575] }),
      ...[-0.12, -0.04, 0.04, 0.12].map((x) =>
        strut([x, 0.19, 0.575], [x, 0.31, 0.575], 0.012, white, 6),
      ),
      block([0.34, 0.02, 0.06], portland, { at: [0, 0.32, 0.57] }),
      gable(0.18, 0.08, 0.05, shade, [0, 0.33, 0.57], true),
      block([0.36, 0.02, 0.1], portland, { at: [0, 0.01, 0.6] }),
      ...mirrored((side) => [
        block([0.14, 0.1, 0.14], portland, { at: [side * 0.29, 0.41, 0.5] }),
        taper(
          [0.055, 0.06],
          0.1,
          portland,
          { at: [side * 0.29, 0.51, 0.5] },
          10,
        ),
        ...around(6, 0.065).map(([x, z]) =>
          strut(
            [side * 0.29 + x, 0.46, 0.5 + z],
            [side * 0.29 + x, 0.56, 0.5 + z],
            0.008,
            white,
            4,
          ),
        ),
        blob(
          [0.05, 0.06, 0.05],
          portland,
          { at: [side * 0.29, 0.58, 0.5] },
          [8, 6],
        ),
        spike(0.02, 0.07, gold, { at: [side * 0.29, 0.66, 0.5] }, 6),
        ...[0.08, 0.22].map((y) =>
          slab(archOutline(0.05, 0.05, 3), 0.01, "#545b63", {
            at: [side * 0.29, y, 0.555],
          }),
        ),
      ]),
    ],
  };
};

const cliftonSuspensionBridge = (): LabItemParts => {
  const sandstone = "#d4bb8f";
  const rock = "#8a7d6b";
  const iron = "#2f3236";
  const deckY = 0.6;
  const towerX = 0.84;
  const towerTop = deckY + 0.42;
  const sag = (x: number): number =>
    deckY + 0.04 + (towerTop - 0.02 - deckY - 0.04) * (x / towerX) ** 2;
  const tower: Outline = [
    [-0.09, 0],
    [0.09, 0],
    [0.07, towerTop - deckY + 0.06],
    [-0.07, towerTop - deckY + 0.06],
  ];
  return {
    body: [
      ...mirrored((side) => [
        block([0.44, deckY, 0.6], rock, { at: [side * 1.02, deckY / 2, 0] }),
        block([0.46, 0.03, 0.62], side > 0 ? "#4e7d38" : grass, {
          at: [side * 1.02, deckY + 0.005, 0],
        }),
        // Ledges of rock down the gorge's sides.
        ...[0.12, 0.3, 0.46].map((y, index) =>
          block([0.05, 0.08, 0.56], index === 1 ? "#776b5b" : "#958873", {
            at: [side * (0.8 + index * 0.012), y, 0],
          }),
        ),
        slab(
          tower,
          0.1,
          sandstone,
          { at: [side * towerX, deckY - 0.06, 0], turn: [0, quarter, 0] },
          [archOutline(0.08, 0.17, 5).map(([x, y]) => [x, y + 0.06] as const)],
        ),
        block([0.11, 0.025, 0.2], "#b0936a", {
          at: [side * towerX, towerTop + 0.01, 0],
        }),
      ]),
      ...[1.16, 1.0, 0.92].map((x, index) =>
        blob(
          [0.07, 0.08, 0.07],
          "#3f6e2f",
          { at: [x, deckY + 0.07, -0.18 + index * 0.16] },
          [8, 5],
        ),
      ),
      block([2.0, 0.025, 0.2], "#3f4448", { at: [0, deckY, 0] }),
      ...mirrored((sz) => [
        block([1.68, 0.025, 0.008], "#6b7176", {
          at: [0, deckY + 0.03, sz * 0.1],
        }),
        tube(
          Array.from({ length: 13 }, (_, index): Triple => {
            const x = -towerX + (index / 12) * towerX * 2;
            return [x, sag(x), sz * 0.08];
          }),
          0.009,
          iron,
          20,
          4,
        ),
        ...mirrored((sx) =>
          strut(
            [sx * towerX, towerTop - 0.02, sz * 0.08],
            [sx * 1.15, deckY, sz * 0.08],
            0.008,
            iron,
          ),
        ),
        ...Array.from({ length: 11 }, (_, index) => {
          const x = -0.7 + index * 0.14;
          return strut(
            [x, deckY, sz * 0.08],
            [x, sag(x), sz * 0.08],
            0.003,
            iron,
            3,
          );
        }),
      ]),
      block([1.6, 0.03, 0.6], "#6e8a5c", { at: [0, 0.015, 0] }),
    ],
    glass: [block([1.6, 0.02, 0.2], water, { at: [0, 0.035, 0] })],
  };
};

const crystalPalace = (): LabItemParts => {
  const iron = "#e9eef2";
  const vault = (
    radius: number,
    length: number,
    at: Triple,
    alongZ: boolean,
  ): ModelPart => ({
    geometry: new CylinderGeometry(
      radius,
      radius,
      length,
      12,
      1,
      true,
      alongZ ? quarter : 0,
      Math.PI,
    ),
    colour: glassBlue,
    position: at,
    rotation: alongZ ? [quarter, 0, 0] : [0, 0, quarter],
  });
  const ribs = (radius: number, at: Triple, alongZ: boolean): ModelPart =>
    tube(
      arcPoints([0, 0], [radius, radius], 0, Math.PI, 8).map(([x, y]) =>
        alongZ ? [at[0] + x, at[1] + y, at[2]] : [at[0], at[1] + y, at[2] + x],
      ),
      0.006,
      iron,
      8,
      3,
    );
  return {
    body: [
      block([2.1, 0.04, 0.72], "#b5aa96", { at: [0, 0.02, 0] }),
      ...[-0.9, -0.6, -0.3, 0.3, 0.6, 0.9].flatMap((x) => [
        block([0.012, 0.22, 0.012], iron, { at: [x, 0.15, 0.3] }),
        block([0.012, 0.18, 0.012], iron, { at: [x, 0.35, 0.2] }),
        ribs(0.2, [x, 0.44, 0], false),
      ]),
      ...[0.26, 0.44].map((y) =>
        block([2.0, 0.012, 0.012], iron, { at: [0, y, y < 0.3 ? 0.3 : 0.2] }),
      ),
      ...[-0.15, 0, 0.15].map((x) =>
        block([0.012, 0.5, 0.012], iron, { at: [x, 0.29, 0.46] }),
      ),
      block([0.5, 0.012, 0.012], iron, { at: [0, 0.3, 0.46] }),
      ribs(0.25, [0, 0.54, 0.46], true),
      ribs(0.25, [0, 0.54, -0.46], true),
      ribs(0.25, [0, 0.54, 0.15], true),
      ribs(0.25, [0, 0.54, -0.15], true),
      ...arcPoints([0, 0.54], [0.25, 0.25], 0.35, Math.PI - 0.35, 4).map(
        ([x, y]) => strut([0, 0.54, 0.465], [x, y, 0.465], 0.004, iron, 3),
      ),
      // The elm trees the hall was built around, seen through the glass.
      ...[-0.1, 0.12].map((x) =>
        blob([0.11, 0.14, 0.11], "#4f8a3c", { at: [x, 0.3, 0.05] }, [8, 6]),
      ),
      ...[-0.1, 0.12].map((x) =>
        strut([x, 0.04, 0.05], [x, 0.2, 0.05], 0.015, "#6b4a2e", 5),
      ),
    ],
    glass: [
      block([2.0, 0.22, 0.6], glassBlue, { at: [0, 0.15, 0] }),
      block([1.9, 0.18, 0.4], glassBlue, { at: [0, 0.35, 0] }),
      vault(0.2, 1.9, [0, 0.44, 0], false),
      block([0.5, 0.5, 0.92], glassBlue, { at: [0, 0.29, 0] }),
      vault(0.25, 0.92, [0, 0.54, 0], true),
      slab(arcPoints([0, 0], [0.25, 0.25], 0, Math.PI, 8), 0.02, glassBlue, {
        at: [0, 0.54, 0.46],
      }),
      slab(arcPoints([0, 0], [0.25, 0.25], 0, Math.PI, 8), 0.02, glassBlue, {
        at: [0, 0.54, -0.46],
      }),
      ...mirrored((side) =>
        slab(arcPoints([0, 0], [0.2, 0.2], 0, Math.PI, 6), 0.02, glassBlue, {
          at: [side * 0.95, 0.44, 0],
          turn: [0, quarter, 0],
        }),
      ),
    ],
  };
};

const fallingwater = (): LabItemParts => {
  const concrete = "#ede3c4";
  const stone = "#9b8a6f";
  const cherokeeRed = "#a03a2a";
  const glazing = (size: Triple, at: Triple): ModelPart[] => [
    block(size, darkGlass, { at }),
    ...[-0.35, -0.12, 0.12, 0.35].map((t) =>
      size[0] >= size[2]
        ? block([0.01, size[1], size[2] + 0.01], cherokeeRed, {
            at: [at[0] + size[0] * t, at[1], at[2]],
          })
        : block([size[0] + 0.01, size[1], 0.01], cherokeeRed, {
            at: [at[0], at[1], at[2] + size[2] * t],
          }),
    ),
  ];
  const boulder = (radii: Triple, at: Triple): ModelPart => ({
    ...blob(radii, "#7f776a", { at }, [8, 6]),
    roughen: 0.3,
  });
  return {
    body: [
      {
        ...blob(
          [0.75, 0.24, 0.36],
          "#7f776a",
          { at: [0, 0.12, -0.25] },
          [10, 7],
        ),
        roughen: 0.25,
      },
      boulder([0.22, 0.1, 0.15], [-0.45, 0.05, 0.3]),
      boulder([0.22, 0.09, 0.15], [0.42, 0.05, 0.35]),
      boulder([0.12, 0.06, 0.1], [0.12, 0.03, 0.55]),
      block([0.6, 0.2, 0.4], stone, { at: [-0.05, 0.3, -0.25] }),
      ...glazing([0.6, 0.1, 0.3], [0, 0.36, 0.02]),
      // The terraces jut out over the falls, each one crossing the one below.
      block([1.0, 0.08, 0.5], concrete, { at: [0, 0.45, 0.12] }),
      ...glazing([0.4, 0.12, 0.4], [0.15, 0.55, -0.08]),
      block([0.44, 0.08, 0.85], concrete, { at: [0.22, 0.65, -0.02] }),
      ...glazing([0.3, 0.1, 0.3], [-0.15, 0.74, -0.18]),
      block([0.42, 0.07, 0.36], concrete, { at: [-0.15, 0.82, -0.18] }),
      block([0.14, 0.92, 0.14], stone, { at: [-0.32, 0.5, -0.34] }),
      ...[0.55, 0.7, 0.85].map((y) =>
        block([0.15, 0.012, 0.15], "#86775e", { at: [-0.32, y, -0.34] }),
      ),
      // The waterfall pouring off the ledge beneath the house.
      cloth(
        0.42,
        0.28,
        0.03,
        "#d3ecf8",
        { at: [0.02, 0.17, 0.13] },
        (_, up) => (1 - up) * 0.06,
        [3, 3],
      ),
      ...[-0.14, 0, 0.14].map((x) =>
        blob([0.07, 0.035, 0.05], white, { at: [x, 0.04, 0.22] }, [6, 4]),
      ),
    ],
    glass: [block([1.4, 0.03, 0.6], water, { at: [0, 0.015, 0.45] })],
  };
};

const londonAquaticsCentre = (): LabItemParts => {
  // The roof is a long wave: low at both ends, swelling in the middle.
  const roof = new BoxGeometry(2.2, 0.04, 0.9, 14, 1, 6);
  const positions = roof.getAttribute("position");
  for (let index = 0; index < positions.count; index++) {
    const along = Math.min(1, Math.max(0, positions.getX(index) / 2.2 + 0.5));
    const side = positions.getZ(index) / 0.45;
    const swell = Math.max(0, Math.sin(Math.PI * along ** 0.85)) ** 1.3;
    positions.setY(
      index,
      positions.getY(index) + 0.03 + 0.34 * swell * (1 - 0.35 * side * side),
    );
  }
  return {
    body: [
      block([1.7, 0.08, 0.9], "#bfbab0", { at: [0, 0.04, 0] }),
      {
        geometry: roof,
        colour: "#c9cfd4",
        position: [0, 0.05, 0],
        isSmooth: true,
      },
      ...mirrored((side) =>
        block([0.06, 0.08, 0.5], "#8f949a", { at: [side * 1.05, 0.06, 0] }),
      ),
      block([1.1, 0.02, 0.4], "#2f8fd0", { at: [0, 0.09, 0.05] }),
      ...[-0.45, -0.15, 0.15, 0.45].map((x) =>
        block([0.012, 0.18, 0.012], "#e6e9ec", { at: [x, 0.17, 0.32] }),
      ),
      ...[-0.15, 0, 0.15].map((z) =>
        block([1.1, 0.004, 0.012], white, { at: [0, 0.101, z] }),
      ),
    ],
    glass: [block([1.3, 0.22, 0.64], glassBlue, { at: [0, 0.19, 0] })],
  };
};

const parthenon = (): LabItemParts => {
  const marble = "#ebe3cf";
  const weathered = "#d8cdb3";
  const columnHeight = 0.36;
  const column = (x: number, z: number, height = columnHeight): ModelPart[] => [
    strut([x, 0.09, z], [x, 0.09 + height, z], 0.034, marble, 8, 0.029),
    ...(height === columnHeight
      ? [
          block([0.08, 0.02, 0.08], weathered, {
            at: [x, 0.09 + height + 0.01, z],
          }),
        ]
      : []),
  ];
  const front = [-0.42, -0.3, -0.18, -0.06, 0.06, 0.18, 0.3, 0.42];
  const sideZ = [
    -0.6, -0.48, -0.36, -0.24, -0.12, 0, 0.12, 0.24, 0.36, 0.48, 0.6,
  ];
  // A few columns on the far side are broken, as the real temple is a ruin.
  const broken = new Map([
    [3, 0.12],
    [4, 0],
    [6, 0.2],
  ]);
  return {
    body: [
      block([1.06, 0.03, 1.5], "#cfc3a6", { at: [0, 0.015, 0] }),
      block([1.0, 0.03, 1.44], weathered, { at: [0, 0.045, 0] }),
      block([0.94, 0.03, 1.38], marble, { at: [0, 0.075, 0] }),
      ...front.flatMap((x) => [...column(x, 0.66), ...column(x, -0.66)]),
      ...sideZ.slice(1, -1).flatMap((z) => column(-0.42, z)),
      ...sideZ.slice(1, -1).flatMap((z, index) => {
        const height = broken.get(index);
        if (height === undefined) {
          return column(0.42, z);
        }
        return height === 0 ? [] : column(0.42, z, height);
      }),
      block([0.94, 0.05, 0.1], marble, { at: [0, 0.485, 0.66] }),
      block([0.94, 0.05, 0.1], marble, { at: [0, 0.485, -0.66] }),
      block([0.1, 0.05, 1.42], marble, { at: [-0.42, 0.485, 0] }),
      block([0.1, 0.05, 0.55], marble, { at: [0.42, 0.485, 0.44] }),
      block([0.1, 0.05, 0.25], marble, { at: [0.42, 0.485, -0.58] }),
      gable(0.48, 0.13, 0.1, marble, [0, 0.51, 0.66], true),
      slab(
        [
          [-0.48, 0],
          [0.1, 0],
          [0.0, 0.1],
          [-0.15, 0.09],
        ],
        0.08,
        weathered,
        { at: [0, 0.51, -0.66] },
      ),
      // A carved frieze of darker panels along the front.
      ...[-0.36, -0.18, 0, 0.18, 0.36].map((x) =>
        block([0.06, 0.03, 0.01], "#c8bc9f", { at: [x, 0.485, 0.715] }),
      ),
      ...[
        [0.62, 0.03, 0.2],
        [0.58, 0.025, -0.1],
      ].map(([x, y, z]) =>
        block([0.07, 0.05, 0.06], weathered, {
          at: [x, y, z],
          turn: [0.1, 0.5, 0.2],
        }),
      ),
    ],
  };
};

const pyramid = (): LabItemParts => {
  const sand = "#e4c88d";
  const courses = (
    count: number,
    size: number,
    height: number,
    at: Triple,
  ): ModelPart[] =>
    Array.from({ length: count }, (_, index) => {
      const width = size * (1 - index / count);
      const step = height / count;
      return block(
        [width, step, width],
        index % 2 === 0 ? "#d6b373" : "#cba765",
        {
          at: [at[0], at[1] + step * (index + 0.5), at[2]],
        },
      );
    });
  return {
    body: [
      {
        ...blob([0.95, 0.05, 0.85], sand, { at: [0, 0, 0] }, [12, 6]),
        roughen: 0.4,
      },
      ...courses(9, 1.0, 0.68, [0.05, 0.02, 0.05]),
      {
        ...spike(0.08, 0.1, "#e0c27f", { at: [0.05, 0.75, 0.05] }, 4),
        rotation: [0, Math.PI / 4, 0],
      },
      ...courses(5, 0.45, 0.3, [-0.55, 0.0, -0.45]),
      {
        ...spike(0.07, 0.07, "#e0c27f", { at: [-0.55, 0.33, -0.45] }, 4),
        rotation: [0, Math.PI / 4, 0],
      },
      ...[
        [0.6, 0.02, 0.55],
        [-0.65, 0.02, 0.4],
      ].map(([x, y, z]) =>
        blob([0.22, 0.06, 0.12], sand, { at: [x, y, z] }, [8, 5]),
      ),
    ],
  };
};

// --------------------------------------------------------- Bridges & paths

const stoneColours = ["#a9a196", "#9b9388", "#b4ac9f"];

const archBridge = (): LabItemParts => {
  const stone = "#a9a196";
  const span = 0.42;
  const outline: Outline = [
    [-0.9, -0.05],
    [-span, -0.05],
    ...arcPoints([0, -0.05], [span, 0.42], Math.PI, 0, 12),
    [0.9, -0.05],
    [0.9, 0.42],
    [-0.9, 0.42],
  ];
  return {
    body: [
      slab(outline, 0.36, stone),
      // The wedge-shaped stones that ring the arch.
      ...arcPoints(
        [0, -0.05],
        [span + 0.035, 0.455],
        Math.PI * 0.97,
        Math.PI * 0.03,
        10,
      ).flatMap(([x, y], index) =>
        mirrored((side) =>
          block([0.05, 0.075, 0.02], stoneColours[index % 3] ?? stone, {
            at: [x, y, side * 0.185],
            turn: [0, 0, Math.atan2(y + 0.05, (x * 0.42) / 0.455) - quarter],
          }),
        ),
      ),
      ...mirrored((side) =>
        block([1.8, 0.07, 0.04], "#8e877c", { at: [0, 0.455, side * 0.16] }),
      ),
      block([1.8, 0.012, 0.28], "#6e6a64", { at: [0, 0.426, 0] }),
      ...mirrored((side) =>
        block([0.4, 0.1, 0.7], grass, { at: [side * 0.8, -0.1, 0] }),
      ),
    ],
    glass: [block([1.2, 0.02, 0.7], water, { at: [0, -0.04, 0] })],
  };
};

const beamBridge = (): LabItemParts => {
  const wood = "#a8743f";
  return {
    body: [
      block([1.6, 0.06, 0.34], wood, { at: [0, 0.43, 0] }),
      ...[-0.6, -0.36, -0.12, 0.12, 0.36, 0.6].map((x) =>
        block([0.006, 0.062, 0.345], "#8a5e31", { at: [x, 0.43, 0] }),
      ),
      ...mirrored((side) => [
        block([0.16, 0.4, 0.3], "#9d958a", { at: [side * 0.62, 0.2, 0] }),
        block([0.2, 0.02, 0.34], "#8a8378", { at: [side * 0.62, 0.39, 0] }),
      ]),
      block([1.8, 0.03, 0.6], grass, { at: [0, 0.015, 0] }),
      block([0.9, 0.012, 0.6], water, { at: [0, 0.035, 0] }),
    ],
  };
};

const bridge = (): LabItemParts => {
  const stone = "#b1a896";
  // A humpbacked stone bridge, its road rising over the stream.
  const top = arcPoints(
    [0, -0.6],
    [0.9, 0.98],
    Math.PI * 0.22,
    Math.PI * 0.78,
    10,
  );
  const outline: Outline = [
    [-0.75, -0.02],
    [-0.28, -0.02],
    ...arcPoints([0, -0.02], [0.28, 0.24], Math.PI, 0, 10),
    [0.75, -0.02],
    ...top.map(([x, y]) => [x * (0.75 / 0.69), y] as const),
  ];
  return {
    body: [
      slab(outline, 0.32, stone),
      ...[
        [-0.5, 0.1],
        [0.45, 0.16],
        [-0.35, 0.26],
        [0.3, 0.05],
        [0.55, 0.02],
        [-0.55, 0.0],
      ].flatMap(([x, y]) =>
        mirrored((side) =>
          block([0.09, 0.05, 0.01], y > 0.1 ? "#9b9388" : "#c0b8aa", {
            at: [x, y, side * 0.162],
          }),
        ),
      ),
      ...mirrored((side) =>
        tube(
          top.map(([x, y]): Triple => [
            x * (0.75 / 0.69),
            y + 0.04,
            side * 0.14,
          ]),
          0.025,
          "#9a9182",
          12,
          4,
        ),
      ),
      ...mirrored((side) =>
        block([0.5, 0.12, 0.9], grass, { at: [side * 0.85, -0.06, 0] }),
      ),
      block([1.2, 0.06, 0.9], "#7b6a52", { at: [0, -0.09, 0] }),
    ],
    glass: [block([1.2, 0.02, 0.9], water, { at: [0, -0.05, 0] })],
  };
};

const railwayTrack = (): LabItemParts => {
  const steel = "#8f969c";
  const shine = "#cfd4d8";
  const length = 1.1;
  return {
    body: [
      slab(
        [
          [-0.42, 0],
          [0.42, 0],
          [0.32, 0.08],
          [-0.32, 0.08],
        ],
        length,
        "#8a8274",
      ),
      ...[-0.45, -0.27, -0.09, 0.09, 0.27, 0.45].flatMap((z) => [
        block([0.56, 0.04, 0.1], "#6e4d33", { at: [0, 0.1, z] }),
        ...mirrored((side) =>
          block([0.05, 0.025, 0.08], "#3d3d3f", { at: [side * 0.16, 0.13, z] }),
        ),
      ]),
      ...mirrored((side) => [
        block([0.06, 0.012, length], steel, { at: [side * 0.16, 0.126, 0] }),
        block([0.014, 0.035, length], steel, { at: [side * 0.16, 0.15, 0] }),
        block([0.034, 0.022, length], shine, { at: [side * 0.16, 0.176, 0] }),
      ]),
      ...[
        [0.36, 0.08, -0.3],
        [-0.37, 0.07, 0.2],
        [0.33, 0.07, 0.4],
        [-0.34, 0.08, -0.45],
        [0.05, 0.085, -0.15],
        [-0.04, 0.085, 0.4],
      ].map(([x, y, z]) =>
        blob([0.025, 0.018, 0.025], "#9c9486", { at: [x, y, z] }, [5, 4]),
      ),
    ],
  };
};

const labyrinth = (): LabItemParts => {
  const cells = 6;
  const size = 0.17;
  const tilt = 0.45;
  // A fixed maze, carved once by a seeded random walk so it never changes.
  let seed = 7;
  const random = (): number => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const open = new Set<string>();
  const seen = new Set<string>(["0,0"]);
  const stack: Point[] = [[0, 0]];
  while (stack.length > 0) {
    const [cx, cy] = stack[stack.length - 1] ?? [0, 0];
    const next = (
      [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const
    )
      .map(([dx, dy]) => [cx + dx, cy + dy] as const)
      .filter(
        ([x, y]) =>
          x >= 0 &&
          y >= 0 &&
          x < cells &&
          y < cells &&
          !seen.has([x, y].join(",")),
      );
    if (next.length === 0) {
      stack.pop();
      continue;
    }
    const [nx, ny] = next[Math.floor(random() * next.length)] ?? [0, 0];
    seen.add([nx, ny].join(","));
    open.add(
      [Math.min(cx, nx), Math.min(cy, ny), nx === cx ? "south" : "east"].join(
        ",",
      ),
    );
    stack.push([nx, ny]);
  }
  const half = (cells * size) / 2;
  const walls: [Point, Point][] = [];
  for (let line = 0; line <= cells; line++) {
    for (const vertical of [false, true]) {
      let start: number | undefined;
      for (let step = 0; step <= cells; step++) {
        const isWall =
          step < cells &&
          (line === 0 || line === cells
            ? !(line === cells && !vertical && step === 2)
            : !open.has(
                vertical
                  ? [line - 1, step, "east"].join(",")
                  : [step, line - 1, "south"].join(","),
              ));
        if (isWall && start === undefined) {
          start = step;
        } else if (!isWall && start !== undefined) {
          walls.push(
            vertical
              ? [
                  [line, start],
                  [line, step],
                ]
              : [
                  [start, line],
                  [step, line],
                ],
          );
          start = undefined;
        }
      }
    }
  }
  const tipped = ([x, y, z]: Triple): Triple => [
    x,
    y * Math.cos(tilt) - z * Math.sin(tilt),
    y * Math.sin(tilt) + z * Math.cos(tilt),
  ];
  const wallHeight = 0.08;
  return {
    body: [
      block([cells * size + 0.08, 0.03, cells * size + 0.08], "#8fae5e", {
        at: tipped([0, -0.015, 0]),
        turn: [tilt, 0, 0],
      }),
      ...walls.map(([[x0, z0], [x1, z1]]) =>
        block(
          [
            Math.abs(x1 - x0) * size + 0.03,
            wallHeight,
            Math.abs(z1 - z0) * size + 0.03,
          ],
          "#c3b593",
          {
            at: tipped([
              ((x0 + x1) / 2) * size - half,
              wallHeight / 2,
              ((z0 + z1) / 2) * size - half,
            ]),
            turn: [tilt, 0, 0],
          },
        ),
      ),
      ...walls.map(([[x0, z0], [x1, z1]]) =>
        block(
          [
            Math.abs(x1 - x0) * size + 0.034,
            0.012,
            Math.abs(z1 - z0) * size + 0.034,
          ],
          "#d8cba8",
          {
            at: tipped([
              ((x0 + x1) / 2) * size - half,
              wallHeight,
              ((z0 + z1) / 2) * size - half,
            ]),
            turn: [tilt, 0, 0],
          },
        ),
      ),
    ],
  };
};

const mountain = (): LabItemParts => {
  const rock = "#7d766d";
  const darkRock = "#6a635b";
  const snow = "#f4f7fa";
  return {
    body: [
      peak(0.55, 1.0, rock, [0, 0, 0], 0.18, 12, 5),
      peak(0.4, 0.62, darkRock, [0.38, 0, -0.12], 0.2, 10, 4),
      peak(0.36, 0.5, darkRock, [-0.4, 0, 0.1], 0.2, 10, 4),
      peak(0.2, 0.33, snow, [0, 0.69, 0], 0.15, 12, 3),
      peak(0.13, 0.17, snow, [0.38, 0.47, -0.12], 0.15, 10, 2),
      peak(0.11, 0.13, snow, [-0.4, 0.39, 0.1], 0.15, 10, 2),
      {
        ...blob([0.85, 0.08, 0.6], "#6f9a4a", { at: [0, 0, 0] }, [12, 6]),
        roughen: 0.3,
      },
    ],
  };
};

const cave = (): LabItemParts => {
  const rock = "#82796c";
  const darkRock = "#6c645a";
  return {
    body: [
      {
        ...blob([0.62, 0.5, 0.45], rock, { at: [0, 0.22, -0.05] }),
        roughen: 0.25,
      },
      {
        ...blob([0.3, 0.3, 0.3], darkRock, { at: [0.45, 0.15, 0.1] }, [10, 7]),
        roughen: 0.3,
      },
      {
        ...blob(
          [0.26, 0.24, 0.26],
          darkRock,
          { at: [-0.45, 0.12, 0.12] },
          [10, 7],
        ),
        roughen: 0.3,
      },
      // The dark mouth, framed by boulders so it reads as a way in.
      slab(archOutline(0.42, 0.2, 8), 0.12, "#121214", { at: [0, 0, 0.44] }),
      {
        ...blob([0.12, 0.32, 0.13], rock, { at: [0.3, 0.17, 0.44] }, [8, 6]),
        roughen: 0.3,
      },
      {
        ...blob([0.12, 0.3, 0.13], rock, { at: [-0.3, 0.16, 0.44] }, [8, 6]),
        roughen: 0.3,
      },
      {
        ...blob([0.34, 0.1, 0.15], rock, { at: [0, 0.47, 0.43] }, [8, 6]),
        roughen: 0.3,
      },
      ...[-0.08, 0.02, 0.1].map((x, index) =>
        spike(
          0.02,
          0.07 + index * 0.02,
          "#9b9184",
          { at: [x, 0.36 - index * 0.01, 0.48], turn: [Math.PI, 0, 0] },
          5,
        ),
      ),
      ...[
        [-0.2, 0.62, -0.05],
        [0.15, 0.68, -0.1],
        [0.35, 0.45, 0.15],
      ].map(([x, y, z]) =>
        blob([0.16, 0.05, 0.14], "#5f8a3c", { at: [x, y, z] }, [8, 5]),
      ),
      {
        ...blob([0.8, 0.04, 0.65], "#7a9a52", { at: [0, 0, 0.05] }, [12, 6]),
        roughen: 0.2,
      },
    ],
  };
};

// -------------------------------------------------------------- Buildings

const house = (): LabItemParts => {
  const wall = "#f1e3c6";
  const roofRed = "#c0392b";
  const frame = white;
  return {
    body: [
      block([1.0, 0.76, 0.66], wall, { at: [0, 0.38, 0] }),
      gable(0.33, 0.34, 0.98, wall, [0, 0.76, 0]),
      ...roofPlanes(0.33, 0.34, 1.1, roofRed, [0, 0.76, 0]),
      block([0.12, 0.3, 0.12], "#a0533a", { at: [0.3, 1.0, -0.1] }),
      block([0.14, 0.03, 0.14], "#8a4630", { at: [0.3, 1.16, -0.1] }),
      block([0.18, 0.32, 0.03], "#2f6fb0", { at: [0, 0.16, 0.335] }),
      blob(
        [0.014, 0.014, 0.014],
        "#e0b43f",
        { at: [0.055, 0.16, 0.355] },
        [6, 4],
      ),
      block([0.28, 0.025, 0.08], "#a7a39b", { at: [0, 0.012, 0.37] }),
      ...[
        [-0.3, 0.2],
        [0.3, 0.2],
        [-0.3, 0.55],
        [0.3, 0.55],
        [0, 0.55],
      ].flatMap(([x, y]) => [
        ...pane(0.18, 0.18, [x, y, 0.335], frame),
        block([0.012, 0.18, 0.026], frame, { at: [x, y, 0.335] }),
        block([0.18, 0.012, 0.026], frame, { at: [x, y, 0.335] }),
      ]),
      ...mirrored((side) =>
        pane(0.16, 0.16, [side * 0.5, 0.55, 0], frame, paneBlue, quarter),
      ),
      ...mirrored((side) =>
        pane(0.16, 0.16, [side * 0.5, 0.2, -0.1], frame, paneBlue, quarter),
      ),
      block([1.1, 0.02, 0.8], grass, { at: [0, -0.01, 0.06] }),
    ],
  };
};

const church = (): LabItemParts => {
  const stone = "#bdb5a6";
  const slate = "#5c6168";
  const stained = "#3f6aa0";
  return {
    body: [
      block([0.44, 0.36, 0.9], stone, { at: [0, 0.18, -0.2] }),
      gable(0.22, 0.24, 0.88, stone, [0, 0.36, -0.2], true),
      ...roofPlanes(0.22, 0.24, 0.94, slate, [0, 0.36, -0.2], true),
      block([0.26, 0.66, 0.26], stone, { at: [0, 0.33, 0.33] }),
      block([0.29, 0.04, 0.29], "#a9a191", { at: [0, 0.68, 0.33] }),
      {
        ...spike(0.19, 0.5, slate, { at: [0, 0.95, 0.33] }, 4),
        rotation: [0, Math.PI / 4, 0],
      },
      block([0.016, 0.1, 0.016], "#e0b43f", { at: [0, 1.24, 0.33] }),
      block([0.06, 0.016, 0.016], "#e0b43f", { at: [0, 1.25, 0.33] }),
      slab(archOutline(0.12, 0.13, 6), 0.03, "#6b4226", { at: [0, 0, 0.46] }),
      slab(lancetOutline(0.07, 0.08), 0.02, stained, { at: [0, 0.4, 0.46] }),
      ...mirrored((side) =>
        slab(lancetOutline(0.06, 0.07), 0.02, stained, {
          at: [side * 0.13, 0.52, 0.33],
          turn: [0, quarter, 0],
        }),
      ),
      ...[-0.5, -0.28, -0.06].flatMap((z) =>
        mirrored((side) =>
          slab(lancetOutline(0.07, 0.1), 0.02, stained, {
            at: [side * 0.22, 0.1, z],
            turn: [0, quarter, 0],
          }),
        ),
      ),
      block([0.8, 0.02, 1.2], grass, { at: [0, -0.01, -0.05] }),
      block([0.14, 0.022, 0.25], "#a7a39b", { at: [0, 0.0, 0.58] }),
    ],
  };
};

const castle = (): LabItemParts => {
  const stone = "#a6a197";
  const dark = "#8a857c";
  const wall = (length: number, at: Triple, alongZ: boolean): ModelPart[] => {
    const count = Math.round(length / 0.1);
    return [
      block(alongZ ? [0.08, 0.34, length] : [length, 0.34, 0.08], stone, {
        at,
      }),
      ...Array.from({ length: count }, (_, index) => {
        const offset = -length / 2 + (index + 0.5) * (length / count);
        return block([0.05, 0.05, 0.05], dark, {
          at: alongZ
            ? [at[0], 0.365, at[2] + offset]
            : [at[0] + offset, 0.365, at[2]],
        });
      }).filter((_, index) => index % 2 === 0),
    ];
  };
  const tower = (x: number, z: number): ModelPart[] => [
    taper([0.13, 0.14], 0.56, stone, { at: [x, 0.28, z] }, 12),
    taper([0.155, 0.15], 0.06, dark, { at: [x, 0.59, z] }, 12),
    ...around(6, 0.13).map(([dx, dz]) =>
      block([0.06, 0.06, 0.06], dark, { at: [x + dx, 0.65, z + dz] }),
    ),
    slab(archOutline(0.035, 0.04, 3), 0.02, "#2a2a2e", {
      at: [x, 0.38, z + 0.135],
    }),
    strut([x, 0.62, z], [x, 0.82, z], 0.006, "#5a4a3a", 4),
    cloth(
      0.1,
      0.06,
      0.006,
      "#c0392b",
      { at: [x + 0.05, 0.79, z] },
      (along) => Math.sin(along * 5) * 0.012,
      [4, 1],
    ),
  ];
  return {
    body: [
      ...wall(0.7, [0, 0.17, 0.32], false),
      ...wall(0.7, [0, 0.17, -0.32], false),
      ...wall(0.6, [-0.38, 0.17, 0], true),
      ...wall(0.6, [0.38, 0.17, 0], true),
      ...tower(-0.4, 0.32),
      ...tower(0.4, 0.32),
      slab(archOutline(0.16, 0.12, 6), 0.1, "#6b4226", { at: [0, 0, 0.33] }),
      ...[-0.05, 0, 0.05].map((x) =>
        block([0.008, 0.18, 0.012], "#2f2f33", { at: [x, 0.1, 0.385] }),
      ),
      ...[0.06, 0.13].map((y) =>
        block([0.16, 0.008, 0.012], "#2f2f33", { at: [0, y, 0.385] }),
      ),
      block([1.1, 0.02, 0.9], grass, { at: [0, -0.01, 0] }),
    ],
  };
};

const tower = (): LabItemParts => {
  const stone = "#a8a195";
  const dark = "#8c857a";
  return {
    body: [
      taper([0.19, 0.22], 0.9, stone, { at: [0, 0.45, 0] }, 14),
      taper([0.24, 0.2], 0.08, dark, { at: [0, 0.92, 0] }, 14),
      taper([0.24, 0.24], 0.04, stone, { at: [0, 0.98, 0] }, 14),
      ...around(8, 0.22).map(([x, z]) =>
        block([0.07, 0.08, 0.06], stone, {
          at: [x, 1.04, z],
          turn: [0, Math.atan2(x, z), 0],
        }),
      ),
      slab(archOutline(0.12, 0.12, 6), 0.06, "#6b4226", { at: [0, 0, 0.2] }),
      slab(archOutline(0.05, 0.05, 4), 0.04, "#25252a", {
        at: [0.0, 0.76, 0.195],
      }),
      slab(archOutline(0.035, 0.035, 3), 0.04, "#25252a", {
        at: [0.13, 0.42, 0.155],
        turn: [0, 0.7, 0],
      }),
      slab(archOutline(0.035, 0.035, 3), 0.04, "#25252a", {
        at: [-0.15, 0.58, 0.13],
        turn: [0, -0.85, 0],
      }),
      // Stones that stand out of the wall.
      ...[
        [0.2, 0.3, 0.6],
        [-0.6, 0.18, 0.8],
        [1.6, 0.55, 0.2],
        [2.4, 0.7, 0.4],
        [-1.2, 0.5, 0.3],
        [0.9, 0.85, 0.1],
      ].map(([angle, y]) => {
        const radius = 0.215 - y * 0.03;
        return block([0.07, 0.035, 0.02], dark, {
          at: [radius * Math.sin(angle), y, radius * Math.cos(angle)],
          turn: [0, angle, 0],
        });
      }),
      ...[
        [0.18, 0.06, 0.12],
        [-0.12, 0.05, 0.17],
      ].map(([x, y, z]) =>
        blob([0.09, 0.08, 0.06], "#4f8a3c", { at: [x, y, z] }, [8, 5]),
      ),
      block([0.7, 0.02, 0.7], grass, { at: [0, -0.01, 0] }),
    ],
  };
};

const factory = (): LabItemParts => {
  const brick = "#9c4a33";
  const darkBrick = "#7e3a28";
  return {
    body: [
      block([1.1, 0.42, 0.5], brick, { at: [0, 0.21, 0] }),
      // A saw-tooth roof of north lights.
      ...[-0.41, -0.14, 0.13, 0.41].slice(0, 4).map((x) =>
        slab(
          [
            [-0.135, 0],
            [0.135, 0],
            [0.135, 0.14],
          ],
          0.5,
          "#5d6268",
          { at: [x, 0.42, 0] },
        ),
      ),
      ...[-0.41, -0.14, 0.13, 0.41].map((x) =>
        block([0.008, 0.11, 0.48], darkGlass, { at: [x + 0.13, 0.49, 0] }),
      ),
      ...[0.1, 0.27].flatMap((y) =>
        [-0.42, -0.25, -0.08, 0.08, 0.25, 0.42].map((x) =>
          slab(archOutline(0.08, 0.06, 4), 0.02, "#2a3440", {
            at: [x, y, 0.25],
          }),
        ),
      ),
      ...[0.1, 0.27].map((y) =>
        block([1.1, 0.012, 0.03], "#d9c9a8", { at: [0, y - 0.005, 0.255] }),
      ),
      taper([0.06, 0.09], 1.1, brick, { at: [0.62, 0.55, -0.1] }, 10),
      taper([0.075, 0.075], 0.05, darkBrick, { at: [0.62, 1.08, -0.1] }, 10),
      taper([0.072, 0.072], 0.03, darkBrick, { at: [0.62, 0.75, -0.1] }, 10),
      block([0.18, 0.2, 0.03], "#5a3a28", { at: [-0.35, 0.1, 0.26] }),
      block([1.5, 0.02, 0.8], "#9a9590", { at: [0.1, -0.01, 0] }),
    ],
  };
};

const school = (): LabItemParts => {
  const brick = "#b5563c";
  const slate = "#5b6470";
  const trim = "#f2ede2";
  return {
    body: [
      block([1.2, 0.5, 0.5], brick, { at: [0, 0.25, 0] }),
      gable(0.25, 0.2, 1.18, brick, [0, 0.5, 0]),
      ...roofPlanes(0.25, 0.2, 1.28, slate, [0, 0.5, 0]),
      block([0.34, 0.62, 0.14], brick, { at: [0, 0.31, 0.3] }),
      gable(0.17, 0.16, 0.14, brick, [0, 0.62, 0.3], true),
      ...roofPlanes(0.17, 0.16, 0.18, slate, [0, 0.62, 0.3], true, 0.03),
      // The clock in the gable, its hands both at twelve.
      disc(0.075, 0.02, trim, [0, 0.55, 0.375], "z", 16),
      ...[0, quarter, Math.PI, Math.PI * 1.5].map((angle) =>
        block([0.012, 0.012, 0.01], "#2a2a2a", {
          at: [0.06 * Math.sin(angle), 0.55 + 0.06 * Math.cos(angle), 0.388],
        }),
      ),
      block([0.008, 0.055, 0.008], "#1f1f1f", { at: [0, 0.578, 0.39] }),
      block([0.012, 0.04, 0.008], "#1f1f1f", { at: [0, 0.57, 0.392] }),
      block([0.2, 0.24, 0.02], "#2a6fae", { at: [0, 0.12, 0.37] }),
      block([0.006, 0.24, 0.024], trim, { at: [0, 0.12, 0.37] }),
      slab(archOutline(0.24, 0.24, 6), 0.012, trim, { at: [0, 0, 0.365] }),
      ...[-0.47, -0.3, 0.3, 0.47].flatMap((x) => [
        ...pane(0.11, 0.17, [x, 0.14, 0.25], trim),
        ...pane(0.11, 0.13, [x, 0.36, 0.25], trim),
      ]),
      ...mirrored((side) =>
        pane(0.12, 0.16, [side * 0.6, 0.3, 0], trim, paneBlue, quarter),
      ),
      // A little bell turret on the ridge.
      block([0.1, 0.1, 0.1], trim, { at: [-0.35, 0.73, 0] }),
      {
        ...spike(0.09, 0.1, slate, { at: [-0.35, 0.83, 0] }, 4),
        rotation: [0, Math.PI / 4, 0],
      },
      blob([0.025, 0.03, 0.025], "#d4a63a", { at: [-0.35, 0.72, 0] }, [6, 4]),
      block([1.4, 0.02, 0.8], "#8f8a84", { at: [0, -0.01, 0.1] }),
    ],
  };
};

const hotel = (): LabItemParts => {
  const facade = "#ece0c8";
  const floors = 7;
  const height = 1.05;
  const width = 0.66;
  const depth = 0.44;
  const floorHeight = (height - 0.15) / floors;
  return {
    body: [
      block([width, height, depth], facade, { at: [0, height / 2, 0] }),
      block([width + 0.04, 0.04, depth + 0.04], "#c9b998", {
        at: [0, height + 0.02, 0],
      }),
      ...Array.from({ length: floors }, (_, floor) => {
        const y = 0.2 + floor * floorHeight + floorHeight * 0.4;
        return [
          block([width - 0.06, floorHeight * 0.55, depth + 0.01], darkGlass, {
            at: [0, y, 0],
          }),
          block([width + 0.01, floorHeight * 0.55, depth - 0.06], darkGlass, {
            at: [0, y, 0],
          }),
          block([width - 0.04, 0.012, 0.05], white, {
            at: [0, y - floorHeight * 0.3, depth / 2 + 0.02],
          }),
        ];
      }).flat(),
      ...[-0.18, 0, 0.18].flatMap((x) => [
        block([0.025, height - 0.2, depth + 0.015], facade, {
          at: [x, 0.2 + (height - 0.2) / 2, 0],
        }),
      ]),
      ...[-0.11, 0.11].map((z) =>
        block([width + 0.015, height - 0.2, 0.025], facade, {
          at: [0, 0.2 + (height - 0.2) / 2, z],
        }),
      ),
      block([0.44, 0.15, 0.02], darkGlass, { at: [0, 0.08, depth / 2] }),
      // The red entrance canopy, held up on brass poles.
      block([0.3, 0.025, 0.24], "#a3262a", { at: [0, 0.18, depth / 2 + 0.1] }),
      ...mirrored((side) =>
        strut(
          [side * 0.13, 0, depth / 2 + 0.2],
          [side * 0.13, 0.17, depth / 2 + 0.2],
          0.006,
          "#d4a63a",
          5,
        ),
      ),
      // A blue sign along the roof edge, lit with gold stars instead of a name.
      block([0.5, 0.1, 0.02], "#1f3e74", {
        at: [0, height + 0.09, depth / 2 - 0.02],
      }),
      ...[-0.18, -0.09, 0, 0.09, 0.18].map((x) =>
        slab(starOutline(0.035, 0.015), 0.012, "#f2c230", {
          at: [x, height + 0.09, depth / 2 - 0.005],
        }),
      ),
      ...mirrored((side) => [
        strut(
          [side * 0.3, 0, depth / 2 + 0.18],
          [side * 0.3, 0.42, depth / 2 + 0.18],
          0.005,
          chrome,
          4,
        ),
        cloth(
          0.1,
          0.06,
          0.005,
          side > 0 ? "#2f7d4f" : "#c8443a",
          { at: [side * 0.3 + 0.05, 0.38, depth / 2 + 0.18] },
          (along) => Math.sin(along * 5) * 0.01,
          [4, 1],
        ),
      ]),
      block([0.9, 0.02, 0.8], "#9a9590", { at: [0, -0.01, 0.15] }),
    ],
  };
};

const greenhouse = (): LabItemParts => {
  const frame = "#f0f2ee";
  const brick = "#a5573e";
  const halfSpan = 0.26;
  const wallTop = 0.52;
  return {
    body: [
      block([0.86, 0.12, 0.54], brick, { at: [0, 0.06, 0] }),
      ...mirrored((sx) =>
        mirrored((sz) =>
          block([0.022, 0.4, 0.022], frame, {
            at: [sx * 0.42, 0.32, sz * 0.26],
          }),
        ),
      ),
      ...[-0.21, 0, 0.21].flatMap((x) =>
        mirrored((sz) =>
          block([0.014, 0.4, 0.014], frame, { at: [x, 0.32, sz * 0.26] }),
        ),
      ),
      ...mirrored((sz) =>
        block([0.86, 0.02, 0.02], frame, { at: [0, wallTop, sz * 0.26] }),
      ),
      block([0.88, 0.02, 0.02], frame, { at: [0, wallTop + 0.18, 0] }),
      ...[-0.42, -0.21, 0, 0.21, 0.42].flatMap((x) =>
        roofPlanes(
          halfSpan,
          0.18,
          0.014,
          frame,
          [x, wallTop, 0],
          false,
          0.01,
          0.018,
        ),
      ),
      block([0.016, 0.38, 0.12], frame, { at: [0.43, 0.31, 0] }),
      // Tomato plants growing inside.
      ...[-0.25, 0, 0.25].flatMap((x) => [
        taper([0.04, 0.03], 0.06, "#b5633a", { at: [x, 0.15, 0.08] }, 8),
        blob([0.07, 0.12, 0.06], "#4f8a3c", { at: [x, 0.28, 0.08] }, [8, 6]),
        blob(
          [0.018, 0.018, 0.018],
          "#d2382c",
          { at: [x + 0.04, 0.26, 0.13] },
          [5, 4],
        ),
        blob(
          [0.018, 0.018, 0.018],
          "#d2382c",
          { at: [x - 0.03, 0.31, 0.13] },
          [5, 4],
        ),
      ]),
      block([1.0, 0.02, 0.7], grass, { at: [0, -0.01, 0] }),
    ],
    glass: [
      block([0.84, 0.4, 0.5], glassBlue, { at: [0, 0.32, 0] }),
      gable(halfSpan - 0.01, 0.17, 0.84, glassBlue, [0, wallTop, 0]),
    ],
  };
};

const gardenBench = (): LabItemParts => {
  const wood = "#a06e3f";
  const darkWood = "#7f5530";
  const back = 0.22;
  const backZ = (y: number): number => -0.15 - (y - 0.4) * Math.tan(back);
  return {
    body: [
      ...[0.1, 0.03, -0.04, -0.11].map((z) =>
        block([1.0, 0.025, 0.06], wood, { at: [0, 0.4, z] }),
      ),
      ...[0.52, 0.62, 0.72].map((y) =>
        block([1.0, 0.06, 0.022], wood, {
          at: [0, y, backZ(y)],
          turn: [-back, 0, 0],
        }),
      ),
      ...mirrored((side) => [
        block([0.05, 0.4, 0.05], darkWood, { at: [side * 0.45, 0.2, 0.11] }),
        block([0.05, 0.4, 0.05], darkWood, { at: [side * 0.45, 0.2, -0.14] }),
        block([0.05, 0.46, 0.04], darkWood, {
          at: [side * 0.45, 0.62, backZ(0.62) - 0.03],
          turn: [-back, 0, 0],
        }),
        block([0.05, 0.04, 0.3], darkWood, { at: [side * 0.45, 0.37, -0.015] }),
        block([0.07, 0.035, 0.36], wood, { at: [side * 0.47, 0.6, 0] }),
        block([0.04, 0.22, 0.04], darkWood, { at: [side * 0.47, 0.49, 0.13] }),
      ]),
      block([0.95, 0.04, 0.04], darkWood, { at: [0, 0.1, -0.02] }),
    ],
  };
};

const gardenFence = (): LabItemParts => {
  const board = ["#8b5a33", "#7d4f2c", "#94613a"];
  return {
    body: [
      ...Array.from({ length: 11 }, (_, index) =>
        block([0.1, 0.62, 0.02], board[index % 3] ?? "#8b5a33", {
          at: [-0.5 + index * 0.1, 0.39, index % 2 === 0 ? 0.01 : 0],
        }),
      ),
      block([1.08, 0.04, 0.035], "#6e4426", { at: [0, 0.72, 0.005] }),
      block([1.08, 0.08, 0.03], "#7a7066", { at: [0, 0.06, 0.005] }),
      ...[0.25, 0.55].map((y) =>
        block([1.08, 0.06, 0.03], "#6e4426", { at: [0, y, -0.025] }),
      ),
      ...mirrored((side) => [
        block([0.08, 0.82, 0.08], "#6a4224", { at: [side * 0.58, 0.41, 0] }),
        block([0.1, 0.03, 0.1], "#5a381e", { at: [side * 0.58, 0.835, 0] }),
      ]),
      block([1.4, 0.03, 0.4], grass, { at: [0, 0.0, 0] }),
    ],
  };
};

const flagpole = (): LabItemParts => {
  const rope = "#d9cfb8";
  return {
    body: [
      block([0.16, 0.05, 0.16], "#a9a59d", { at: [0, 0.025, 0] }),
      taper([0.012, 0.018], 1.0, white, { at: [0, 0.55, 0] }, 8),
      blob([0.025, 0.025, 0.025], "#e0b43f", { at: [0, 1.07, 0] }, [8, 6]),
      // The little pulley the rope runs over at the top.
      disc(0.016, 0.01, "#8a8f94", [0.022, 1.035, 0], "z", 8),
      cloth(
        0.36,
        0.22,
        0.008,
        "#d63a3a",
        { at: [0.2, 0.92, 0] },
        (along) => Math.sin(along * 7) * 0.025 * along,
        [8, 1],
      ),
      strut([0.03, 1.03, 0.004], [0.026, 0.24, 0.004], 0.0025, rope, 3),
      strut([0.024, 0.81, -0.004], [0.026, 0.24, -0.004], 0.0025, rope, 3),
      block([0.012, 0.05, 0.02], "#6b7076", { at: [0.022, 0.24, 0] }),
    ],
  };
};

// --------------------------------------------------------------- Vehicles

/** A tyre with a coloured hub, its axle along x. */
const roadWheel = (
  radius: number,
  width: number,
  hub: string,
  at: Triple,
): ModelPart[] => [
  disc(radius, width, tyreBlack, at, "x", 14),
  disc(radius * 0.55, width + 0.01, hub, at, "x", 10),
  disc(radius * 0.18, width + 0.02, "#7d8287", at, "x", 6),
];

const axles = (
  z: readonly number[],
  track: number,
  radius: number,
  width: number,
  hub: string,
): ModelPart[] =>
  z.flatMap((along) =>
    mirrored((side) =>
      roadWheel(radius, width, hub, [side * track, radius, along]),
    ),
  );

const taxi = (): LabItemParts => {
  const black = "#1c1c1f";
  const width = 0.46;
  return {
    body: [
      sideProfile(
        [
          [-0.52, 0.08],
          [0.52, 0.08],
          [0.54, 0.25],
          [0.48, 0.34],
          [0.22, 0.37],
          [0.12, 0.62],
          [-0.4, 0.64],
          [-0.5, 0.42],
        ],
        width,
        black,
        0.03,
      ),
      sideProfile(
        [
          [0.17, 0.4],
          [0.1, 0.58],
          [-0.38, 0.6],
          [-0.46, 0.42],
        ],
        width + 0.07,
        darkGlass,
      ),
      ...[-0.02, -0.24].map((z) =>
        block([width + 0.08, 0.22, 0.04], black, { at: [0, 0.5, z] }),
      ),
      block([0.38, 0.2, 0.02], darkGlass, {
        at: [0, 0.5, 0.18],
        turn: [-0.4, 0, 0],
      }),
      block([0.2, 0.06, 0.07], "#f2c230", { at: [0, 0.68, 0.06] }),
      block([0.24, 0.12, 0.03], chrome, { at: [0, 0.24, 0.545] }),
      ...[0.2, 0.24, 0.28].map((y) =>
        block([0.22, 0.006, 0.035], "#55595d", { at: [0, y, 0.548] }),
      ),
      ...mirrored((side) => [
        blob(
          [0.05, 0.05, 0.03],
          "#fff6d5",
          { at: [side * 0.17, 0.3, 0.52] },
          [8, 6],
        ),
        block([0.05, 0.008, 0.02], chrome, {
          at: [side * (width / 2 + 0.04), 0.42, 0.05],
        }),
      ]),
      block([0.5, 0.05, 0.04], chrome, { at: [0, 0.12, 0.57] }),
      block([0.5, 0.05, 0.04], chrome, { at: [0, 0.12, -0.55] }),
      ...axles([0.33, -0.33], width / 2 - 0.01, 0.12, 0.08, chrome),
    ],
  };
};

const coach = (): LabItemParts => {
  const paint = "#f4f4f1";
  const stripe = "#2a68b0";
  const width = 0.5;
  return {
    body: [
      sideProfile(
        [
          [-0.95, 0.08],
          [0.95, 0.08],
          [0.97, 0.5],
          [0.9, 0.7],
          [-0.94, 0.7],
          [-0.97, 0.55],
        ],
        width,
        paint,
        0.025,
      ),
      sideProfile(
        [
          [0.82, 0.42],
          [0.8, 0.64],
          [-0.88, 0.64],
          [-0.88, 0.42],
        ],
        width + 0.05,
        darkGlass,
      ),
      ...[0.5, 0.18, -0.14, -0.46].map((z) =>
        block([width + 0.06, 0.22, 0.03], paint, { at: [0, 0.53, z] }),
      ),
      block([width - 0.04, 0.4, 0.02], darkGlass, {
        at: [0, 0.45, 0.965],
        turn: [-0.12, 0, 0],
      }),
      sideProfile(
        [
          [0.95, 0.33],
          [0.95, 0.38],
          [-0.96, 0.38],
          [-0.96, 0.33],
        ],
        width + 0.055,
        stripe,
      ),
      // The luggage doors along the side, below the windows.
      ...[-0.4, -0.05, 0.3].flatMap((z) =>
        mirrored((side) =>
          block([0.012, 0.13, 0.3], "#d9dcde", {
            at: [side * (width / 2 + 0.025), 0.2, z],
          }),
        ),
      ),
      ...mirrored((side) => [
        blob(
          [0.04, 0.03, 0.02],
          "#fff6d5",
          { at: [side * 0.17, 0.2, 0.975] },
          [8, 5],
        ),
        strut(
          [side * 0.24, 0.62, 0.95],
          [side * 0.32, 0.56, 1.02],
          0.008,
          "#2a2a2e",
          4,
        ),
        block([0.025, 0.08, 0.04], "#2a2a2e", {
          at: [side * 0.32, 0.52, 1.02],
        }),
      ]),
      block([width + 0.02, 0.06, 0.04], "#55595d", { at: [0, 0.1, 0.97] }),
      ...axles([0.6, -0.48, -0.72], width / 2 - 0.01, 0.12, 0.08, chrome),
    ],
  };
};

const minibus = (): LabItemParts => {
  const paint = "#f6f6f3";
  const width = 0.48;
  return {
    body: [
      sideProfile(
        [
          [-0.56, 0.08],
          [0.56, 0.08],
          [0.58, 0.3],
          [0.5, 0.38],
          [0.36, 0.42],
          [0.26, 0.66],
          [-0.54, 0.68],
          [-0.58, 0.4],
        ],
        width,
        paint,
        0.03,
      ),
      sideProfile(
        [
          [0.3, 0.44],
          [0.22, 0.62],
          [-0.52, 0.63],
          [-0.54, 0.44],
        ],
        width + 0.07,
        darkGlass,
      ),
      ...[0.13, -0.07, -0.27].map((z) =>
        block([width + 0.08, 0.2, 0.03], paint, { at: [0, 0.53, z] }),
      ),
      block([0.4, 0.22, 0.02], darkGlass, {
        at: [0, 0.54, 0.31],
        turn: [-0.45, 0, 0],
      }),
      block([0.36, 0.18, 0.02], darkGlass, { at: [0, 0.52, -0.585] }),
      ...mirrored((side) => [
        block([0.006, 0.42, 0.006], "#b0b4b8", {
          at: [side * (width / 2 + 0.035), 0.33, -0.05],
        }),
        blob(
          [0.05, 0.035, 0.02],
          "#fff6d5",
          { at: [side * 0.16, 0.32, 0.585] },
          [8, 5],
        ),
        block([0.03, 0.06, 0.05], "#2a2a2e", {
          at: [side * (width / 2 + 0.05), 0.46, 0.3],
        }),
      ]),
      block([0.2, 0.06, 0.02], "#3a3d41", { at: [0, 0.3, 0.59] }),
      block([width + 0.03, 0.06, 0.05], "#55595d", { at: [0, 0.12, 0.57] }),
      block([width + 0.03, 0.06, 0.05], "#55595d", { at: [0, 0.12, -0.57] }),
      ...axles([0.34, -0.36], width / 2 - 0.01, 0.11, 0.08, chrome),
    ],
  };
};

const toyCar = (): LabItemParts => {
  const red = "#e03a2f";
  const width = 0.5;
  return {
    body: [
      sideProfile(
        [
          [-0.5, 0.14],
          [0.5, 0.14],
          [0.52, 0.3],
          [0.46, 0.36],
          [0.2, 0.38],
          [0.1, 0.6],
          [-0.28, 0.6],
          [-0.42, 0.38],
          [-0.52, 0.34],
        ],
        width,
        red,
        0.06,
      ),
      sideProfile(
        [
          [0.13, 0.4],
          [0.06, 0.56],
          [-0.25, 0.56],
          [-0.35, 0.4],
        ],
        width + 0.13,
        "#8fd0ee",
      ),
      block([width + 0.14, 0.18, 0.05], red, { at: [0, 0.48, -0.09] }),
      block([0.4, 0.2, 0.02], "#8fd0ee", {
        at: [0, 0.5, 0.18],
        turn: [-0.6, 0, 0],
      }),
      ...mirrored((side) =>
        blob(
          [0.06, 0.05, 0.03],
          "#fff3b0",
          { at: [side * 0.17, 0.3, 0.56] },
          [8, 6],
        ),
      ),
      ...axles([0.3, -0.3], width / 2 + 0.02, 0.15, 0.12, "#f2c230"),
    ],
  };
};

const train = (): LabItemParts => {
  const green = "#1f6b3a";
  const black = "#1d1d20";
  const red = "#c8322a";
  const brass = "#d4a63a";
  return {
    body: [
      block([0.38, 0.06, 1.1], black, { at: [0, 0.22, 0] }),
      block([0.44, 0.1, 0.05], red, { at: [0, 0.2, 0.575] }),
      ...mirrored((side) => [
        disc(0.03, 0.04, black, [side * 0.13, 0.2, 0.62], "z", 8),
        disc(0.045, 0.012, "#a5aaae", [side * 0.13, 0.2, 0.64], "z", 10),
        disc(0.07, 0.16, black, [side * 0.17, 0.27, 0.4], "z", 10),
      ]),
      { ...disc(0.16, 0.6, green, [0, 0.41, 0.12], "z", 16), isSmooth: true },
      ...[0.3, 0.05, -0.12].map((z) =>
        disc(0.165, 0.02, brass, [0, 0.41, z], "z", 16),
      ),
      disc(0.165, 0.14, black, [0, 0.41, 0.48], "z", 16),
      disc(0.13, 0.02, "#2b2b2f", [0, 0.41, 0.555], "z", 14),
      blob([0.025, 0.025, 0.015], "#a5aaae", { at: [0, 0.41, 0.57] }, [6, 4]),
      taper([0.07, 0.05], 0.16, black, { at: [0, 0.64, 0.47] }, 10),
      taper([0.085, 0.07], 0.04, "#b5652b", { at: [0, 0.73, 0.47] }, 10),
      blob([0.06, 0.06, 0.06], brass, { at: [0, 0.57, 0.12] }, [8, 6]),
      blob([0.04, 0.06, 0.05], brass, { at: [0, 0.57, -0.08] }, [8, 6]),
      block([0.44, 0.42, 0.32], green, { at: [0, 0.46, -0.38] }),
      block([0.5, 0.04, 0.4], black, { at: [0, 0.69, -0.38] }),
      ...mirrored((side) => [
        block([0.01, 0.12, 0.14], darkGlass, {
          at: [side * 0.22, 0.55, -0.38],
        }),
        block([0.1, 0.1, 0.01], darkGlass, { at: [side * 0.11, 0.56, -0.218] }),
        block([0.008, 0.02, 0.65], brass, { at: [side * 0.2, 0.29, 0.12] }),
      ]),
      // Six big red driving wheels, joined by a coupling rod on each side.
      ...[0.3, 0.0, -0.3].flatMap((z) =>
        mirrored((side) => [
          disc(0.13, 0.05, red, [side * 0.17, 0.13, z], "x", 14),
          disc(0.035, 0.07, "#a5aaae", [side * 0.17, 0.13, z], "x", 8),
        ]),
      ),
      ...mirrored((side) =>
        block([0.012, 0.025, 0.64], "#a5aaae", { at: [side * 0.21, 0.1, 0] }),
      ),
      block([0.04, 0.06, 0.04], "#f2efe6", { at: [0, 0.56, 0.56] }),
    ],
  };
};

const bikeFrame = (colour: string, thickness: number): ModelPart[] => {
  const rear: Triple = [0, 0.3, -0.36];
  const bottom: Triple = [0, 0.27, -0.02];
  const seat: Triple = [0, 0.64, -0.13];
  const headTop: Triple = [0, 0.62, 0.25];
  const headBottom: Triple = [0, 0.52, 0.28];
  const front: Triple = [0, 0.3, 0.36];
  return [
    strut(bottom, seat, thickness, colour, 8),
    strut(seat, headTop, thickness * 0.9, colour, 8),
    strut(bottom, headBottom, thickness * 1.1, colour, 8),
    strut(headBottom, [0, 0.65, 0.235], thickness * 1.2, colour, 8),
    ...mirrored((side) => [
      strut(
        [side * 0.035, rear[1], rear[2]],
        [side * 0.015, bottom[1], bottom[2]],
        thickness * 0.6,
        colour,
        6,
      ),
      strut(
        [side * 0.035, rear[1], rear[2]],
        [side * 0.012, seat[1] - 0.03, seat[2] + 0.01],
        thickness * 0.55,
        colour,
        6,
      ),
      strut(
        [side * 0.03, front[1], front[2]],
        [side * 0.02, headBottom[1], headBottom[2]],
        thickness * 0.65,
        colour,
        6,
      ),
    ]),
    disc(thickness * 1.3, 0.07, colour, bottom, "x", 10),
    block([0.07, 0.02, 0.05], colour, {
      at: [0, headBottom[1] - 0.005, headBottom[2]],
    }),
  ];
};

const spokedWheel = (
  radius: number,
  at: Triple,
  spokes: number,
  tyre: number,
  axle: "x" | "z",
): ModelPart[] => {
  const place = ([x, y, z]: Triple): Triple =>
    axle === "z"
      ? [at[0] + x, at[1] + y, at[2] + z]
      : [at[0] + z, at[1] + y, at[2] + x];
  const turn: Triple = axle === "z" ? [0, 0, 0] : [0, quarter, 0];
  return [
    {
      geometry: new TorusGeometry(radius, tyre, 5, 26),
      colour: tyreBlack,
      position: at,
      rotation: turn,
      isSmooth: true,
    },
    {
      geometry: new TorusGeometry(radius - tyre * 1.1, tyre * 0.35, 3, 26),
      colour: chrome,
      position: at,
      rotation: turn,
      isSmooth: true,
    },
    ...Array.from({ length: spokes }, (_, index) => {
      const angle = (index / spokes) * Math.PI * 2;
      const flange = (index % 2 === 0 ? 1 : -1) * tyre * 0.7;
      return strut(
        place([0, 0, flange]),
        place([
          (radius - tyre) * Math.cos(angle),
          (radius - tyre) * Math.sin(angle),
          0,
        ]),
        tyre * 0.09,
        "#b7bcc1",
        3,
      );
    }),
    disc(tyre * 0.9, tyre * 2.2, chrome, at, axle, 8),
  ];
};

const bicycle = (): LabItemParts => {
  const frame = "#2f7fc2";
  return {
    body: [
      ...bikeFrame(frame, 0.014),
      ...spokedWheel(0.28, [0, 0.3, -0.36], 12, 0.022, "x"),
      ...spokedWheel(0.28, [0, 0.3, 0.36], 12, 0.022, "x"),
      strut([0, 0.6, -0.12], [0, 0.7, -0.15], 0.008, chrome, 5),
      blob([0.04, 0.022, 0.08], "#222226", { at: [0, 0.71, -0.14] }, [8, 5]),
      strut([0, 0.64, 0.24], [0, 0.72, 0.22], 0.009, chrome, 5),
      strut([-0.2, 0.72, 0.2], [0.2, 0.72, 0.2], 0.009, chrome, 6),
      ...mirrored((side) => [
        strut(
          [side * 0.15, 0.72, 0.2],
          [side * 0.21, 0.72, 0.2],
          0.014,
          "#222226",
          6,
        ),
        strut(
          [side * 0.06, 0.27, -0.02],
          [side * 0.06, 0.27 - side * 0.09, -0.02 + side * 0.04],
          0.008,
          chrome,
          4,
        ),
        block([0.05, 0.015, 0.03], "#2a2a2e", {
          at: [side * 0.08, 0.27 - side * 0.09, -0.02 + side * 0.04],
        }),
      ]),
      disc(0.07, 0.008, "#8d9399", [0.035, 0.27, -0.02], "x", 14),
      strut([0.035, 0.34, -0.02], [0.035, 0.34, -0.36], 0.004, "#3a3a3e", 3),
      strut([0.035, 0.2, -0.02], [0.035, 0.26, -0.36], 0.004, "#3a3a3e", 3),
    ],
  };
};

const bikeFrameItem = (): LabItemParts => ({
  body: [
    ...bikeFrame("#e8731a", 0.022),
    strut([0, 0.64, -0.13], [0, 0.72, -0.16], 0.012, chrome, 8),
    ...mirrored((side) =>
      block([0.012, 0.04, 0.03], "#9aa0a6", { at: [side * 0.035, 0.3, -0.36] }),
    ),
    ...mirrored((side) =>
      block([0.012, 0.04, 0.03], "#9aa0a6", { at: [side * 0.03, 0.3, 0.36] }),
    ),
  ],
});

const wheel = (): LabItemParts => ({
  body: [
    ...spokedWheel(0.5, [0, 0.5, 0], 20, 0.04, "z"),
    taper(
      [0.06, 0.06],
      0.13,
      chrome,
      { at: [0, 0.5, 0], turn: [quarter, 0, 0] },
      12,
    ),
    block([0.012, 0.04, 0.012], "#9aa0a6", { at: [0, 0.94, 0] }),
  ],
});

const wrightFlyer = (): LabItemParts => {
  const fabric = "#efe6cf";
  const spruce = "#9b7a4f";
  const span = 1.22;
  const strutXs = [-0.55, -0.37, -0.19, 0.19, 0.37, 0.55];
  return {
    body: [
      block([span, 0.012, 0.2], fabric, { at: [0, 0.3, 0] }),
      block([span, 0.012, 0.2], fabric, { at: [0, 0.12, 0] }),
      ...[-0.5, -0.3, -0.1, 0.1, 0.3, 0.5].flatMap((x) => [
        block([0.006, 0.016, 0.2], "#d9ceb2", { at: [x, 0.302, 0] }),
      ]),
      ...strutXs.flatMap((x) => [
        strut([x, 0.12, 0.08], [x, 0.3, 0.08], 0.005, spruce, 4),
        strut([x, 0.12, -0.08], [x, 0.3, -0.08], 0.005, spruce, 4),
      ]),
      ...[0.04, -0.04].flatMap((x) => [
        strut([x, 0.12, 0.08], [x, 0.3, 0.08], 0.005, spruce, 4),
        strut([x, 0.12, -0.08], [x, 0.3, -0.08], 0.005, spruce, 4),
      ]),
      // The elevator out in front and the twin rudder behind.
      block([0.42, 0.008, 0.08], fabric, { at: [0, 0.22, 0.44] }),
      block([0.42, 0.008, 0.08], fabric, { at: [0, 0.15, 0.44] }),
      ...mirrored((side) => [
        strut(
          [side * 0.1, 0.15, 0.44],
          [side * 0.1, 0.22, 0.44],
          0.004,
          spruce,
          3,
        ),
        strut(
          [side * 0.06, 0.12, 0.08],
          [side * 0.08, 0.15, 0.42],
          0.004,
          spruce,
          3,
        ),
        strut(
          [side * 0.06, 0.3, 0.08],
          [side * 0.08, 0.22, 0.42],
          0.004,
          spruce,
          3,
        ),
        strut(
          [side * 0.06, 0.02, -0.06],
          [side * 0.08, 0.02, 0.5],
          0.006,
          spruce,
          4,
        ),
        strut(
          [side * 0.06, 0.02, 0.0],
          [side * 0.06, 0.12, 0.0],
          0.004,
          spruce,
          3,
        ),
        block([0.006, 0.17, 0.07], fabric, { at: [side * 0.04, 0.21, -0.48] }),
        strut(
          [side * 0.05, 0.12, -0.08],
          [side * 0.04, 0.14, -0.45],
          0.004,
          spruce,
          3,
        ),
        strut(
          [side * 0.05, 0.3, -0.08],
          [side * 0.04, 0.28, -0.45],
          0.004,
          spruce,
          3,
        ),
        strut(
          [side * 0.25, 0.21, -0.1],
          [side * 0.25, 0.21, -0.14],
          0.006,
          "#5a5048",
          4,
        ),
        block([0.035, 0.26, 0.012], "#c8a46c", {
          at: [side * 0.25, 0.21, -0.14],
          turn: [0, 0, side * 0.5],
        }),
      ]),
      block([0.08, 0.05, 0.06], "#4a4a4e", { at: [0.1, 0.15, -0.02] }),
      // The pilot, lying on the lower wing.
      blob(
        [0.03, 0.022, 0.08],
        "#3c3a36",
        { at: [-0.06, 0.143, 0.02] },
        [8, 5],
      ),
      blob([0.02, 0.02, 0.02], "#e0b896", { at: [-0.06, 0.15, 0.11] }, [6, 4]),
    ],
  };
};

const jetEngine = (): LabItemParts => {
  const casing = "#d2d6da";
  const titanium = "#6b737b";
  return {
    body: [
      {
        ...turned(
          [
            [0.28, -0.45],
            [0.28, 0.45],
            [0.3, 0.52],
            [0.33, 0.48],
            [0.34, 0.3],
            [0.31, -0.2],
            [0.27, -0.45],
            [0.28, -0.45],
          ],
          casing,
          { at: [0, 0.4, 0], turn: [quarter, 0, 0] },
          20,
        ),
        isSmooth: false,
      },
      disc(0.27, 0.02, "#2a2d31", [0, 0.4, 0.2], "z", 18),
      spike(
        0.08,
        0.14,
        "#eef0f2",
        { at: [0, 0.4, 0.33], turn: [quarter, 0, 0] },
        12,
      ),
      disc(0.08, 0.04, "#eef0f2", [0, 0.4, 0.25], "z", 12),
      // The fan blades, each twisted a little.
      ...Array.from({ length: 16 }, (_, index) => {
        const angle = (index / 16) * Math.PI * 2;
        return block([0.05, 0.2, 0.008], titanium, {
          at: [0.17 * Math.sin(angle), 0.4 + 0.17 * Math.cos(angle), 0.25],
          turn: toTriple(
            new Quaternion()
              .setFromAxisAngle(new Vector3(0, 0, 1), -angle)
              .multiply(new Quaternion().setFromAxisAngle(upward, 0.6)),
          ),
        });
      }),
      taper(
        [0.18, 0.14],
        0.12,
        "#8d949b",
        { at: [0, 0.4, -0.51], turn: [quarter, 0, 0] },
        14,
      ),
      spike(
        0.1,
        0.16,
        "#5d646b",
        { at: [0, 0.4, -0.63], turn: [-quarter, 0, 0] },
        12,
      ),
      ...[-0.25, 0.25].flatMap((z) => [
        block([0.12, 0.08, 0.06], "#e0b43f", { at: [0, 0.06, z] }),
        block([0.5, 0.03, 0.08], "#e0b43f", { at: [0, 0.015, z] }),
      ]),
    ],
  };
};

const boatHull = (
  length: number,
  beam: number,
  height: number,
  colour: string,
  bow = 0.35,
): ModelPart => {
  const half = beam / 2;
  // Drawn as a deck plan (x across, y towards the stern) and raised up.
  const outline: Outline = [
    [-half * 0.8, length / 2],
    [half * 0.8, length / 2],
    [half, length * 0.15],
    ...arcPoints(
      [0, -length * (0.5 - bow)],
      [half, length * bow],
      0,
      -quarter,
      5,
    ).slice(1),
    ...arcPoints(
      [0, -length * (0.5 - bow)],
      [half, length * bow],
      -quarter,
      -Math.PI,
      5,
    ).slice(1),
    [-half, length * 0.15],
  ];
  return slab(
    outline,
    height,
    colour,
    { at: [0, height / 2, 0], turn: [-quarter, 0, 0] },
    [],
    Math.min(0.03, height / 4),
  );
};

const boat = (): LabItemParts => ({
  body: [
    boatHull(0.9, 0.36, 0.2, "#d7392f"),
    { ...boatHull(0.92, 0.37, 0.03, white), position: [0, 0.2, 0] },
    { ...boatHull(0.8, 0.3, 0.02, "#c99a5b"), position: [0, 0.22, 0.01] },
    strut([0, 0.2, 0.05], [0, 1.0, 0.05], 0.012, "#7a5230", 6),
    strut([0, 0.3, 0.05], [0, 0.3, -0.38], 0.008, "#7a5230", 5),
    slab(
      [
        [0, 0],
        [0.42, 0],
        [0, 0.66],
      ],
      0.01,
      white,
      { at: [0, 0.31, 0.04], turn: [0, quarter, 0] },
    ),
    slab(
      [
        [0, 0],
        [0.3, 0],
        [0, 0.5],
      ],
      0.01,
      "#f2c230",
      { at: [0, 0.27, 0.07], turn: [0, -quarter, 0] },
    ),
    cloth(
      0.09,
      0.05,
      0.005,
      "#2f7fc2",
      { at: [0, 1.0, 0.0], turn: [0, quarter, 0] },
      (along) => Math.sin(along * 5) * 0.008,
      [3, 1],
    ),
  ],
});

const modelBoat = (): LabItemParts => {
  const hullBlue = "#24508a";
  return {
    body: [
      { ...boatHull(1.0, 0.32, 0.18, hullBlue, 0.4), position: [0, 0.16, 0] },
      { ...boatHull(1.01, 0.325, 0.04, white, 0.4), position: [0, 0.34, 0] },
      block([0.2, 0.12, 0.3], white, { at: [0, 0.44, -0.08] }),
      block([0.22, 0.02, 0.34], "#c8443a", { at: [0, 0.51, -0.08] }),
      ...mirrored((side) =>
        [0, -0.12].map((z) =>
          block([0.01, 0.04, 0.06], darkGlass, { at: [side * 0.1, 0.45, z] }),
        ),
      ),
      block([0.16, 0.05, 0.01], darkGlass, { at: [0, 0.46, 0.07] }),
      // The propeller and rudder under the stern.
      strut([0, 0.18, -0.35], [0, 0.11, -0.55], 0.01, "#9aa0a6", 5),
      blob([0.03, 0.03, 0.04], "#d4a63a", { at: [0, 0.11, -0.56] }, [6, 4]),
      ...[0, 1, 2].map((index) => {
        const angle = (index / 3) * Math.PI * 2;
        return blob(
          [0.03, 0.065, 0.01],
          "#d4a63a",
          {
            at: [0.06 * Math.sin(angle), 0.11 + 0.06 * Math.cos(angle), -0.56],
            turn: [0.5, 0, -angle],
          },
          [6, 4],
        );
      }),
      block([0.01, 0.12, 0.07], "#9aa0a6", { at: [0, 0.14, -0.64] }),
      ...[-0.25, 0.2].map((z) =>
        block([0.3, 0.16, 0.04], "#b5844f", { at: [0, 0.08, z] }),
      ),
      block([0.36, 0.02, 0.6], "#a0703e", { at: [0, 0.01, -0.02] }),
    ],
  };
};

const ship = (): LabItemParts => {
  const wood = "#7a4a28";
  const darkWood = "#56331b";
  const sail = "#f6f1e3";
  const masts: [number, number, number][] = [
    [0.32, 0.95, 2],
    [0.0, 1.1, 3],
    [-0.32, 0.85, 2],
  ];
  return {
    body: [
      { ...boatHull(1.2, 0.36, 0.22, wood, 0.3), position: [0, 0.02, 0] },
      { ...boatHull(1.22, 0.37, 0.03, "#c9a24a", 0.3), position: [0, 0.18, 0] },
      block([0.34, 0.12, 0.22], darkWood, { at: [0, 0.3, -0.46] }),
      block([0.36, 0.02, 0.24], "#c9a24a", { at: [0, 0.36, -0.46] }),
      strut([0, 0.24, 0.55], [0, 0.4, 0.85], 0.01, darkWood, 5),
      ...mirrored((side) =>
        [-0.3, -0.15, 0, 0.15, 0.3].map((z) =>
          block([0.01, 0.03, 0.04], "#2a1d14", { at: [side * 0.18, 0.13, z] }),
        ),
      ),
      ...masts.flatMap(([z, height, sails]) => [
        strut([0, 0.2, z], [0, height, z], 0.012, darkWood, 6),
        ...Array.from({ length: sails }, (_, index) => {
          const top = height - 0.06 - index * 0.24;
          const width = 0.42 - index * -0.04 - (sails === 2 ? 0.06 : 0);
          return [
            strut(
              [-width / 2, top, z + 0.01],
              [width / 2, top, z + 0.01],
              0.006,
              darkWood,
              4,
            ),
            cloth(
              width - 0.02,
              0.2,
              0.01,
              sail,
              { at: [0, top - 0.11, z + 0.02] },
              (along, up) =>
                Math.sin(Math.PI * along) * (0.35 + 0.65 * (1 - up)) * 0.07,
              [5, 3],
            ),
          ];
        }).flat(),
        cloth(
          0.1,
          0.035,
          0.004,
          "#c8322a",
          { at: [0, height + 0.02, z - 0.05], turn: [0, quarter, 0] },
          (along) => Math.sin(along * 5) * 0.008,
          [3, 1],
        ),
        strut([0, height, z], [0, height + 0.04, z], 0.004, darkWood, 3),
      ]),
      slab(
        [
          [0, 0],
          [0.5, 0],
          [0, 0.55],
        ],
        0.008,
        sail,
        { at: [0, 0.3, 0.83], turn: [0, quarter, 0] },
      ),
    ],
  };
};

const steamship = (): LabItemParts => {
  const black = "#1b1c1f";
  const masts = [0.52, 0.32, 0.12, -0.1, -0.3, -0.5];
  return {
    body: [
      { ...boatHull(1.5, 0.28, 0.08, "#8a2f2a", 0.28), position: [0, 0, 0] },
      { ...boatHull(1.52, 0.285, 0.16, black, 0.28), position: [0, 0.07, 0] },
      { ...boatHull(1.53, 0.29, 0.02, white, 0.28), position: [0, 0.19, 0] },
      {
        ...boatHull(1.5, 0.27, 0.02, "#c9a477", 0.28),
        position: [0, 0.205, 0],
      },
      // The gilded stern carving and figurehead.
      block([0.22, 0.08, 0.02], "#d9ae45", { at: [0, 0.16, -0.755] }),
      blob([0.03, 0.04, 0.06], "#d9ae45", { at: [0, 0.18, 0.76] }, [6, 4]),
      strut([0, 0.2, 0.7], [0, 0.32, 0.95], 0.008, black, 5),
      taper([0.045, 0.045], 0.3, black, { at: [0, 0.36, 0.02] }, 12),
      taper([0.048, 0.048], 0.02, "#3a3b3f", { at: [0, 0.5, 0.02] }, 12),
      block([0.14, 0.05, 0.12], "#e8e1cf", { at: [0, 0.24, -0.4] }),
      ...masts.flatMap((z, index) => {
        const height = index === 0 || index === 5 ? 0.7 : 0.85;
        return [
          strut([0, 0.21, z], [0, height, z], 0.008, "#2b2420", 5),
          ...[height - 0.08, height - 0.28].map((y) =>
            strut([-0.12, y, z], [0.12, y, z], 0.008, "#f1ece0", 5),
          ),
        ];
      }),
      ...mirrored((side) =>
        strut([0, 0.85, 0.32], [side * 0.13, 0.21, 0.32], 0.0025, "#2b2420", 3),
      ),
    ],
  };
};

const parachute = (): LabItemParts => {
  const gores = 10;
  const shell: Outline = [
    [0.0, 0.86],
    [0.15, 0.84],
    [0.28, 0.78],
    [0.38, 0.69],
    [0.45, 0.59],
    [0.47, 0.54],
    [0.455, 0.545],
    [0.425, 0.6],
    [0.36, 0.68],
    [0.27, 0.76],
    [0.145, 0.82],
    [0.0, 0.84],
  ];
  return {
    body: [
      ...Array.from({ length: gores }, (_, index): ModelPart => ({
        geometry: new LatheGeometry(
          shell.map(([x, y]) => new Vector2(x, y)),
          3,
          (index / gores) * Math.PI * 2,
          (Math.PI * 2) / gores,
        ),
        colour: index % 2 === 0 ? "#e0463c" : "#f6f2e8",
        isSmooth: true,
      })),
      ...around(gores, 0.465).map(([x, z]) =>
        strut([x, 0.54, z], [0, 0.16, 0], 0.0025, "#555555", 3),
      ),
      block([0.12, 0.12, 0.12], "#b5844f", { at: [0, 0.08, 0] }),
      block([0.124, 0.124, 0.02], "#e8d9b0", { at: [0, 0.08, 0] }),
      block([0.02, 0.124, 0.124], "#e8d9b0", { at: [0, 0.08, 0] }),
    ],
  };
};

const seesaw = (): LabItemParts => {
  const plank = "#e5732c";
  const frame = "#2f6fb0";
  return {
    body: [
      block([1.5, 0.04, 0.16], plank, { at: [0, 0.36, 0] }),
      ...mirrored((side) => [
        block([0.16, 0.025, 0.15], "#2a2a2e", { at: [side * 0.62, 0.392, 0] }),
        strut(
          [side * 0.5, 0.38, -0.05],
          [side * 0.5, 0.52, -0.05],
          0.012,
          "#3a9a4a",
          6,
        ),
        strut(
          [side * 0.5, 0.38, 0.05],
          [side * 0.5, 0.52, 0.05],
          0.012,
          "#3a9a4a",
          6,
        ),
        strut(
          [side * 0.5, 0.52, -0.08],
          [side * 0.5, 0.52, 0.08],
          0.014,
          "#3a9a4a",
          6,
        ),
      ]),
      ...mirrored((side) => [
        strut(
          [0, 0.34, side * 0.11],
          [0.12, 0.0, side * 0.11],
          0.016,
          frame,
          6,
        ),
        strut(
          [0, 0.34, side * 0.11],
          [-0.12, 0.0, side * 0.11],
          0.016,
          frame,
          6,
        ),
      ]),
      disc(0.03, 0.26, "#9aa0a6", [0, 0.335, 0], "z", 8),
      block([0.4, 0.02, 0.35], "#8a8f94", { at: [0, 0.01, 0] }),
    ],
  };
};

const oldTelevision = (): LabItemParts => {
  const walnut = "#7a4b2a";
  const darkWalnut = "#5c361d";
  return {
    body: [
      slab(
        [
          [-0.3, 0.12],
          [0.3, 0.12],
          [0.3, 0.86],
          [-0.3, 0.86],
        ],
        0.36,
        walnut,
        {},
        [],
        0.03,
      ),
      // The small round screen, dark because the set is switched off.
      disc(0.15, 0.03, "#d0b070", [0, 0.64, 0.19], "z", 20),
      blob([0.13, 0.13, 0.03], "#3a4842", { at: [0, 0.64, 0.2] }, [14, 8]),
      blob(
        [0.03, 0.025, 0.008],
        "#6a7a72",
        { at: [-0.05, 0.69, 0.226] },
        [6, 4],
      ),
      block([0.44, 0.2, 0.02], "#d8c79c", { at: [0, 0.3, 0.19] }),
      ...[-0.15, -0.075, 0, 0.075, 0.15].map((x) =>
        block([0.018, 0.2, 0.03], darkWalnut, { at: [x, 0.3, 0.195] }),
      ),
      ...[-0.18, 0.18].map((x) =>
        disc(0.03, 0.03, "#efe4c8", [x, 0.47, 0.2], "z", 10),
      ),
      ...mirrored((sx) =>
        mirrored((sz) =>
          taper(
            [0.02, 0.014],
            0.12,
            darkWalnut,
            { at: [sx * 0.24, 0.06, sz * 0.12] },
            6,
          ),
        ),
      ),
    ],
  };
};

const catsEye = (): LabItemParts => {
  const iron = "#6f6b64";
  return {
    body: [
      block([1.0, 0.06, 0.8], "#45474b", { at: [0, 0.03, 0] }),
      slab(
        [
          [-0.34, 0],
          [0.34, 0],
          [0.28, 0.06],
          [-0.28, 0.06],
        ],
        0.3,
        iron,
        { at: [0, 0.06, 0] },
      ),
      blob([0.22, 0.13, 0.13], "#232325", { at: [0, 0.1, 0] }, [12, 7]),
      // Two glass beads on each face, in metal cups, catching the light.
      ...mirrored((face) =>
        mirrored((side) => [
          disc(0.042, 0.03, chrome, [side * 0.08, 0.135, face * 0.1], "z", 10),
          blob(
            [0.034, 0.034, 0.02],
            "#f1efe4",
            { at: [side * 0.08, 0.135, face * 0.115] },
            [8, 6],
          ),
          blob(
            [0.01, 0.01, 0.004],
            white,
            { at: [side * 0.08 + 0.012, 0.148, face * 0.133] },
            [4, 3],
          ),
        ]),
      ),
    ],
  };
};

const windscreenWiper = (): LabItemParts => {
  const red = "#c8322a";
  const rubber = "#1b1b1e";
  const width = 0.84;
  const base: Point = [0.08, 0.39];
  const top: Point = [-0.25, 0.66];
  const tilt = Math.atan2(top[1] - base[1], base[0] - top[0]);
  const reach = Math.hypot(top[1] - base[1], base[0] - top[0]);
  const lean: Triple = [tilt - quarter, 0, 0];
  const onGlass = (x: number, up: number, out = 0): Triple => [
    x,
    base[1] + up * Math.sin(tilt) + out * Math.cos(tilt),
    base[0] - up * Math.cos(tilt) + out * Math.sin(tilt),
  ];
  // A pair of wipers parked along the bottom of the windscreen.
  const wiper = (pivot: number): ModelPart[] => {
    const sweep = 0.22;
    const arm = 0.34;
    return [
      disc(0.025, 0.03, rubber, onGlass(pivot, 0.03, 0.01), "z", 8),
      strut(
        onGlass(pivot, 0.03, 0.025),
        onGlass(
          pivot + arm * Math.cos(sweep),
          0.03 + arm * Math.sin(sweep),
          0.025,
        ),
        0.013,
        rubber,
        6,
      ),
      block([0.34, 0.03, 0.03], rubber, {
        at: onGlass(
          pivot + arm * Math.cos(sweep) * 0.75,
          0.03 + arm * Math.sin(sweep) * 0.75,
          0.018,
        ),
        turn: [tilt - quarter, 0, sweep],
      }),
      block([0.34, 0.01, 0.012], "#4a4a50", {
        at: onGlass(
          pivot + arm * Math.cos(sweep) * 0.75,
          0.03 + arm * Math.sin(sweep) * 0.75,
          0.006,
        ),
        turn: [tilt - quarter, 0, sweep],
      }),
    ];
  };
  return {
    body: [
      sideProfile(
        [
          [-0.5, 0.1],
          [0.56, 0.1],
          [0.58, 0.27],
          [0.5, 0.34],
          [0.1, 0.39],
          [-0.5, 0.41],
        ],
        width,
        red,
        0.03,
      ),
      sideProfile(
        [
          [0.06, 0.4],
          [-0.24, 0.65],
          [-0.46, 0.65],
          [-0.5, 0.4],
        ],
        width - 0.04,
        darkGlass,
      ),
      block([width - 0.02, 0.035, 0.3], red, { at: [0, 0.675, -0.37] }),
      block([width - 0.06, 0.012, reach], "#a9d3ea", {
        at: onGlass(0, reach / 2, -0.002),
        turn: [tilt, 0, 0],
      }),
      ...mirrored((side) => [
        block([0.035, reach + 0.02, 0.03], red, {
          at: onGlass(side * (width / 2 - 0.02), reach / 2),
          turn: lean,
        }),
        blob(
          [0.06, 0.045, 0.03],
          "#fff6d5",
          { at: [side * 0.3, 0.27, 0.57] },
          [8, 6],
        ),
      ]),
      block([width - 0.04, 0.03, 0.03], rubber, {
        at: onGlass(0, 0.0, 0.0),
        turn: lean,
      }),
      block([0.3, 0.06, 0.02], "#2a2a2e", { at: [0, 0.22, 0.585] }),
      block([width + 0.03, 0.06, 0.05], "#55595d", { at: [0, 0.13, 0.58] }),
      ...wiper(-0.36),
      ...wiper(0.02),
      ...axles([0.32, -0.32], width / 2 - 0.01, 0.12, 0.08, chrome),
    ],
  };
};

const redTelephoneBox = (): LabItemParts => {
  const red = "#c8102e";
  const half = 0.18;
  const faces = [0, quarter, Math.PI, -quarter];
  const onFace = (
    facing: number,
    side: number,
    up: number,
    out: number,
  ): Triple => [
    side * Math.cos(facing) + out * Math.sin(facing),
    up,
    -side * Math.sin(facing) + out * Math.cos(facing),
  ];
  // The K6's curved top: two arched roofs crossing.
  const arch: Outline = [
    [-0.2, 0],
    [0.2, 0],
    [0.2, 0.02],
    [0.12, 0.058],
    [0, 0.072],
    [-0.12, 0.058],
    [-0.2, 0.02],
  ];
  return {
    body: [
      block([0.46, 0.04, 0.46], "#a9a59d", { at: [0, 0.02, 0] }),
      block([0.38, 0.12, 0.38], red, { at: [0, 0.1, 0] }),
      ...mirrored((sx) =>
        mirrored((sz) =>
          block([0.05, 0.66, 0.05], red, {
            at: [sx * 0.165, 0.49, sz * 0.165],
          }),
        ),
      ),
      ...faces.flatMap((facing) => [
        ...[-0.045, 0.045].map((side) =>
          block([0.012, 0.62, 0.016], red, {
            at: onFace(facing, side, 0.47, half - 0.01),
            turn: [0, facing, 0],
          }),
        ),
        ...Array.from({ length: 7 }, (_, index) =>
          block([0.28, 0.012, 0.016], red, {
            at: onFace(facing, 0, 0.17 + ((index + 1) * 0.6) / 8, half - 0.01),
            turn: [0, facing, 0],
          }),
        ),
        // A blank white sign panel where the word would be.
        block([0.24, 0.045, 0.01], "#f4efe2", {
          at: onFace(facing, 0, 0.835, half + 0.012),
          turn: [0, facing, 0],
        }),
      ]),
      block([0.38, 0.1, 0.38], red, { at: [0, 0.83, 0] }),
      slab(arch, 0.4, red, { at: [0, 0.88, 0] }),
      slab(arch, 0.4, red, { at: [0, 0.88, 0], turn: [0, quarter, 0] }),
      blob([0.11, 0.04, 0.11], red, { at: [0, 0.94, 0] }, [10, 5]),
      block([0.012, 0.08, 0.02], "#2a2a2e", { at: [0.12, 0.47, half + 0.005] }),
      block([0.09, 0.11, 0.05], "#1f1f22", { at: [0, 0.52, -0.13] }),
    ],
    glass: faces.map((facing) =>
      block([0.28, 0.62, 0.01], "#dfe9ef", {
        at: onFace(facing, 0, 0.47, half - 0.015),
        turn: [0, facing, 0],
      }),
    ),
  };
};

export const placesTransportBuilders = {
  "angel-of-the-north": angelOfTheNorth,
  "arch-bridge": archBridge,
  "beam-bridge": beamBridge,
  bridge,
  castle,
  cave,
  church,
  "clifton-suspension-bridge": cliftonSuspensionBridge,
  "crystal-palace": crystalPalace,
  "david-statue": davidStatue,
  "eiffel-tower": eiffelTower,
  "electricity-pylon": electricityPylon,
  factory,
  fallingwater,
  flagpole,
  greenhouse,
  "garden-bench": gardenBench,
  "garden-fence": gardenFence,
  hotel,
  house,
  labyrinth,
  "london-aquatics-centre": londonAquaticsCentre,
  mountain,
  parthenon,
  pyramid,
  "red-telephone-box": redTelephoneBox,
  "sagrada-familia": sagradaFamilia,
  school,
  "st-pauls-cathedral": stPaulsCathedral,
  "the-shard": theShard,
  "the-thinker": theThinker,
  tower,
  "railway-track": railwayTrack,
  boat,
  "model-boat": modelBoat,
  ship,
  steamship,
  train,
  taxi,
  coach,
  minibus,
  "toy-car": toyCar,
  bicycle,
  "bike-frame": bikeFrameItem,
  wheel,
  "wright-flyer": wrightFlyer,
  "jet-engine": jetEngine,
  parachute,
  seesaw,
  "old-television": oldTelevision,
  "cats-eye": catsEye,
  "windscreen-wiper": windscreenWiper,
} satisfies Record<string, () => LabItemParts>;
