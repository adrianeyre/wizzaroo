import {
  BufferGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  LatheGeometry,
  Euler,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Matrix4,
  Path,
  Quaternion,
  RingGeometry,
  Shape,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { ModelPart, Triple } from "../world-map-models.js";
import {
  block,
  blob,
  eyes,
  mirrored,
  rod,
  spike,
  taper,
  turned,
  type LabItemParts,
} from "./lab-item-parts.js";

// Each item faces +z and stands on y = 0, drawn about one unit across.
// Flat things (pages, pictures, panels) are drawn in the x-y plane facing
// +z, then leant back so the child sees their face.

const quarter = Math.PI / 2;
const tau = Math.PI * 2;

const wood = "#c98f55";
const darkWood = "#7a4a28";
const gold = "#e0b23c";
const steel = "#c4ccd4";
const darkSteel = "#6d747c";
const white = "#f7f6f1";
const cream = "#f3ecd8";
const ink = "#1d1d22";
const graphite = "#6e6e74";

interface Place {
  at?: Triple;
  turn?: Triple;
  size?: Triple;
}

type Flat = readonly (readonly [number, number])[];

const shaped = (
  geometry: BufferGeometry,
  colour: string,
  { at, turn, size }: Place = {},
  isSmooth = false,
): ModelPart => ({
  geometry,
  colour,
  position: at,
  rotation: turn,
  scale: size,
  isSmooth,
});

const toShape = (points: Flat): Shape =>
  new Shape(points.map(([x, y]) => new Vector2(x, y)));

const ellipsePoints = (
  [cx, cy]: readonly [number, number],
  [rx, ry]: readonly [number, number],
  count: number,
  start = 0,
): [number, number][] =>
  Array.from({ length: count }, (_, index) => {
    const angle = start + (index / count) * tau;
    return [cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)];
  });

/** A flat outline given thickness, centred on z = 0. */
const slab = (
  shape: Shape,
  depth: number,
  colour: string,
  place: Place = {},
  curveSegments = 8,
): ModelPart => {
  const geometry = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments,
  });
  geometry.translate(0, 0, -depth / 2);
  return shaped(geometry, colour, place);
};

/** A flat outline with soft, pillowy edges. */
const puffy = (
  shape: Shape,
  depth: number,
  bevel: number,
  colour: string,
  place: Place = {},
): ModelPart => {
  const geometry = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.8,
    bevelSegments: 2,
    curveSegments: 6,
  });
  geometry.translate(0, 0, -depth / 2);
  return shaped(geometry, colour, place);
};

const wire = (
  points: readonly Triple[],
  radius: number,
  colour: string,
  segments = 16,
  sides = 5,
  isClosed = false,
): ModelPart =>
  shaped(
    new TubeGeometry(
      new CatmullRomCurve3(
        points.map((point) => new Vector3(...point)),
        isClosed,
      ),
      segments,
      radius,
      sides,
      isClosed,
    ),
    colour,
    {},
    true,
  );

/** A cheap torus, for rims, rings and loops. */
const hoop = (
  radius: number,
  thickness: number,
  colour: string,
  place: Place = {},
  tubular = 12,
  radial = 4,
): ModelPart =>
  shaped(
    new TorusGeometry(radius, thickness, radial, tubular),
    colour,
    place,
    true,
  );

/** A lathe outline whose corners stay crisp. */
const crisp = (
  outline: Flat,
  colour: string,
  place: Place = {},
  sides = 18,
): ModelPart => ({ ...turned(outline, colour, place, sides), isSmooth: false });

/** A cylinder with flat facets, such as a hexagonal pencil. */
const faceted = (
  radius: number,
  length: number,
  sides: number,
  colour: string,
  place: Place = {},
): ModelPart =>
  shaped(
    new CylinderGeometry(radius, radius, length, sides, 1).toNonIndexed(),
    colour,
    place,
  );

const facing = (direction: Vector3, axis = new Vector3(0, 1, 0)): Triple => {
  const euler = new Euler().setFromQuaternion(
    new Quaternion().setFromUnitVectors(axis, direction.clone().normalize()),
  );
  return [euler.x, euler.y, euler.z];
};

/** A post running from one point to another, its radius at each end. */
const between = (
  from: Triple,
  to: Triple,
  [fromRadius, toRadius]: readonly [number, number],
  colour: string,
  sides = 8,
): ModelPart => {
  const start = new Vector3(...from);
  const end = new Vector3(...to);
  const direction = end.clone().sub(start);
  const middle = start.add(end).multiplyScalar(0.5);
  return taper(
    [toRadius, fromRadius],
    direction.length(),
    colour,
    {
      at: [middle.x, middle.y, middle.z],
      turn: facing(direction),
    },
    sides,
  );
};

/** A straight line drawn on a flat face, from one point to another. */
const stroke = (
  from: readonly [number, number],
  to: readonly [number, number],
  width: number,
  colour: string,
  z: number,
): ModelPart => {
  const across = to[0] - from[0];
  const up = to[1] - from[1];
  return block([Math.hypot(across, up) + width, width, width * 0.5], colour, {
    at: [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, z],
    turn: [0, 0, Math.atan2(up, across)],
  });
};

const strokes = (
  points: Flat,
  width: number,
  colour: string,
  z: number,
): ModelPart[] =>
  points
    .slice(1)
    .map((point, index) => stroke(points[index], point, width, colour, z));

/** Turns and moves a set of parts as one, about the origin. */
const placed = (
  parts: ModelPart[],
  turn: Triple,
  at: Triple = [0, 0, 0],
): ModelPart[] => {
  const move = new Matrix4().compose(
    new Vector3(...at),
    new Quaternion().setFromEuler(new Euler(...turn)),
    new Vector3(1, 1, 1),
  );
  return parts.map((part) => {
    const scale = part.scale ?? 1;
    const matrix = new Matrix4()
      .compose(
        new Vector3(...(part.position ?? [0, 0, 0])),
        new Quaternion().setFromEuler(
          new Euler(...(part.rotation ?? [0, 0, 0])),
        ),
        typeof scale === "number"
          ? new Vector3(scale, scale, scale)
          : new Vector3(...scale),
      )
      .premultiply(move);
    const position = new Vector3();
    const rotation = new Quaternion();
    const size = new Vector3();
    matrix.decompose(position, rotation, size);
    const euler = new Euler().setFromQuaternion(rotation);
    return {
      ...part,
      position: [position.x, position.y, position.z],
      rotation: [euler.x, euler.y, euler.z],
      scale: [size.x, size.y, size.z],
    };
  });
};

const blueprint = (): LabItemParts => {
  const paper = "#2c69b0";
  const roll = "#22568f";
  const grid = "#4f86c6";
  const line = "#eef5ff";
  const z = 0.009;
  const window = (x: number): ModelPart[] =>
    strokes(
      [
        [x - 0.06, 0.42],
        [x + 0.06, 0.42],
        [x + 0.06, 0.52],
        [x - 0.06, 0.52],
        [x - 0.06, 0.42],
      ],
      0.012,
      line,
      z,
    );
  return {
    body: placed(
      [
        block([1.1, 0.74, 0.012], paper, { at: [0, 0.45, 0] }),
        // The ends still curl from being rolled up.
        taper(
          [0.06, 0.06],
          1.1,
          roll,
          {
            at: [0, 0.08, 0.05],
            turn: [0, 0, quarter],
          },
          12,
        ),
        taper(
          [0.045, 0.045],
          1.1,
          roll,
          {
            at: [0, 0.82, -0.04],
            turn: [0, 0, quarter],
          },
          12,
        ),
        ...[-0.4, -0.2, 0.2, 0.4].map((x) =>
          block([0.006, 0.62, 0.004], grid, { at: [x, 0.45, 0.007] }),
        ),
        ...[0.3, 0.62].map((y) =>
          block([1.04, 0.006, 0.004], grid, { at: [0, y, 0.007] }),
        ),
        ...strokes(
          [
            [-0.28, 0.2],
            [0.28, 0.2],
            [0.28, 0.56],
            [-0.28, 0.56],
            [-0.28, 0.2],
          ],
          0.016,
          line,
          z,
        ),
        ...strokes(
          [
            [-0.34, 0.55],
            [0, 0.73],
            [0.34, 0.55],
          ],
          0.016,
          line,
          z,
        ),
        ...strokes(
          [
            [-0.05, 0.2],
            [-0.05, 0.36],
            [0.05, 0.36],
            [0.05, 0.2],
          ],
          0.012,
          line,
          z,
        ),
        ...window(-0.17),
        ...window(0.17),
        // A measuring line under the house, with end ticks.
        stroke([-0.28, 0.14], [0.28, 0.14], 0.008, line, z),
        stroke([-0.28, 0.12], [-0.28, 0.16], 0.008, line, z),
        stroke([0.28, 0.12], [0.28, 0.16], 0.008, line, z),
      ],
      [-0.45, 0, 0],
    ),
  };
};

const book = (): LabItemParts => {
  const cover = "#c0392b";
  const spine = "#a32d22";
  const edge = "#d8cdb2";
  return {
    body: placed(
      [
        block([0.66, 0.9, 0.03], cover, { at: [0.01, 0.45, 0.1] }),
        block([0.66, 0.9, 0.03], cover, { at: [0.01, 0.45, -0.1] }),
        taper(
          [0.115, 0.115],
          0.9,
          spine,
          {
            at: [-0.32, 0.45, 0],
            size: [0.45, 1, 1],
          },
          12,
        ),
        block([0.63, 0.86, 0.17], cream, { at: [0.015, 0.45, 0] }),
        ...[-0.05, 0, 0.05].map((z) =>
          block([0.004, 0.84, 0.01], edge, { at: [0.332, 0.45, z] }),
        ),
        ...[-0.05, 0, 0.05].map((z) =>
          block([0.6, 0.004, 0.01], edge, { at: [0.02, 0.882, z] }),
        ),
        ...strokes(
          [
            [-0.2, 0.12],
            [0.26, 0.12],
            [0.26, 0.78],
            [-0.2, 0.78],
            [-0.2, 0.12],
          ],
          0.018,
          gold,
          0.117,
        ),
        block([0.12, 0.12, 0.01], gold, {
          at: [0.03, 0.45, 0.117],
          turn: [0, 0, quarter / 2],
        }),
        ...[0.15, 0.75].map((y) =>
          block([0.02, 0.03, 0.2], gold, { at: [-0.37, y, 0] }),
        ),
      ],
      [0, -0.45, 0],
    ),
  };
};

// Six-dot braille cells, as bit patterns of dots 1–6.
const brailleCells = [
  1, 3, 9, 25, 17, 11, 27, 19, 10, 26, 5, 7, 13, 29, 21, 15, 31, 23, 14, 30,
];

const braillePage = (): LabItemParts => {
  const page = "#f4efe1";
  const dot = "#cdbf9f";
  const dots = brailleCells.flatMap((cell, index) => {
    const x = -0.24 + (index % 4) * 0.16;
    const y = 0.82 - Math.floor(index / 4) * 0.16;
    return Array.from({ length: 6 }, (_, bit) => bit)
      .filter((bit) => (cell & (1 << bit)) !== 0)
      .map((bit) =>
        blob(
          [0.02, 0.02, 0.014],
          dot,
          { at: [x + (bit < 3 ? 0 : 0.045), y - (bit % 3) * 0.045, 0.01] },
          [5, 3],
        ),
      );
  });
  return {
    body: placed(
      [block([0.72, 0.96, 0.016], page, { at: [0, 0.48, 0] }), ...dots],
      [-0.2, 0, 0],
    ),
  };
};

const brayer = (): LabItemParts => {
  const rubber = "#222227";
  return {
    body: [
      taper(
        [0.16, 0.16],
        0.62,
        rubber,
        {
          at: [0, 0.16, 0],
          turn: [0, 0, quarter],
        },
        16,
      ),
      ...mirrored((side) => [
        blob(
          [0.02, 0.04, 0.04],
          darkSteel,
          { at: [0.33 * side, 0.16, 0] },
          [6, 4],
        ),
        wire(
          [
            [0.34 * side, 0.16, 0],
            [0.35 * side, 0.32, -0.08],
            [0.2 * side, 0.4, -0.16],
            [0, 0.42, -0.2],
          ],
          0.018,
          steel,
          10,
          5,
        ),
      ]),
      between([0, 0.42, -0.2], [0, 0.5, -0.32], [0.025, 0.025], steel, 6),
      between([0, 0.48, -0.29], [0, 0.72, -0.66], [0.05, 0.06], wood, 10),
      blob([0.06, 0.06, 0.06], wood, { at: [0, 0.72, -0.66] }, [8, 6]),
      blob([0.055, 0.03, 0.055], darkSteel, { at: [0, 0.49, -0.3] }, [8, 5]),
    ],
  };
};

const charcoalStick = (): LabItemParts => {
  const charcoal = "#2a2725";
  const snapped = "#4a4541";
  const paper = "#f3efe4";
  const stick = (points: Triple[]): ModelPart[] => [
    { ...wire(points, 0.045, charcoal, 10, 6), roughen: 0.12 },
    blob([0.044, 0.044, 0.044], snapped, { at: points[0] }, [6, 4]),
    blob(
      [0.044, 0.044, 0.044],
      snapped,
      { at: points[points.length - 1] },
      [6, 4],
    ),
  ];
  return {
    body: [
      ...placed(
        [
          block([0.7, 0.5, 0.01], paper, { at: [0, 0.25, 0] }),
          // A bold, smudgy line drawn with it.
          {
            ...wire(
              [
                [-0.26, 0.12, 0.01],
                [-0.12, 0.34, 0.01],
                [0.02, 0.16, 0.01],
                [0.14, 0.36, 0.01],
                [0.26, 0.2, 0.01],
              ],
              0.03,
              "#3a3735",
              20,
              4,
            ),
            scale: [1, 1, 0.4],
          },
        ],
        [-0.35, 0, 0],
        [0, 0, -0.15],
      ),
      ...stick([
        [-0.46, 0.035, 0.18],
        [-0.15, 0.04, 0.2],
        [0.15, 0.035, 0.22],
        [0.46, 0.045, 0.27],
      ]),
      ...stick([
        [-0.3, 0.035, 0.42],
        [-0.05, 0.06, 0.36],
        [0.2, 0.095, 0.28],
      ]),
      ...[
        [0.3, 0.012, 0.4],
        [0.36, 0.01, 0.36],
        [-0.38, 0.01, 0.34],
      ].map(([x, y, z]) =>
        blob([0.016, 0.012, 0.014], charcoal, { at: [x, y, z] }, [5, 3]),
      ),
    ],
  };
};

/** A mark pressed into the surface of an egg-shaped lump. */
const onLump = (
  centre: Triple,
  radii: Triple,
  direction: Triple,
  mark: Triple,
  colour: string,
): ModelPart => {
  const dir = new Vector3(...direction).normalize();
  const point = new Vector3(
    dir.x * radii[0],
    dir.y * radii[1],
    dir.z * radii[2],
  );
  const normal = new Vector3(
    dir.x / radii[0],
    dir.y / radii[1],
    dir.z / radii[2],
  ).normalize();
  return blob(
    mark,
    colour,
    {
      at: [
        centre[0] + point.x * 0.98,
        centre[1] + point.y * 0.98,
        centre[2] + point.z * 0.98,
      ],
      turn: facing(normal, new Vector3(0, 0, 1)),
    },
    [8, 5],
  );
};

const clay = (): LabItemParts => {
  const lump = "#958676";
  const dent = "#7f7264";
  const centre: Triple = [0, 0.27, 0];
  const radii: Triple = [0.42, 0.28, 0.35];
  return {
    body: [
      { ...blob(radii, lump, { at: centre }), roughen: 0.14 },
      ...(
        [
          [0.2, 0.6, 0.6],
          [-0.35, 0.5, 0.55],
          [0.6, 0.3, 0.3],
          [-0.1, 0.9, -0.2],
        ] as const
      ).map((direction) =>
        onLump(centre, radii, [...direction], [0.07, 0.05, 0.014], dent),
      ),
      {
        ...blob([0.12, 0.1, 0.11], lump, { at: [0.45, 0.09, 0.22] }, [8, 6]),
        roughen: 0.15,
      },
    ],
  };
};

const leafPoints = (length: number, width: number): [number, number][] =>
  Array.from({ length: 20 }, (_, index): [number, number] => {
    const angle = (index / 20) * tau;
    return [
      length * Math.cos(angle),
      width * Math.sin(angle) * (1 - 0.35 * Math.cos(angle) ** 2),
    ];
  });

/** Half of a pointed spindle, lying along x with its open side up. */
const hullHalf = (
  length: number,
  width: number,
  colour: string,
  isInside: boolean,
): ModelPart => {
  const outline = Array.from({ length: 13 }, (_, index) => {
    const u = index / 6 - 1;
    return new Vector2(width * (1 - u * u) ** 0.7, length * u);
  });
  return shaped(
    new LatheGeometry(isInside ? outline.reverse() : outline, 10, 0, Math.PI),
    colour,
    { turn: [0, 0, -quarter], size: [0.9, 1, 1] },
    true,
  );
};

const clayBoat = (): LabItemParts => {
  const clayGrey = "#8f8b85";
  const rim = toShape(leafPoints(0.5, 0.2));
  rim.holes.push(
    new Path(leafPoints(0.43, 0.16).map(([x, y]) => new Vector2(x, y))),
  );
  return {
    body: placed(
      [
        { ...hullHalf(0.5, 0.2, clayGrey, false), roughen: 0.03 },
        hullHalf(0.43, 0.16, "#75716b", true),
        slab(rim, 0.02, clayGrey, { turn: [-quarter, 0, 0] }),
      ],
      [0.35, 0, 0],
      [0, 0.18, 0],
    ),
  };
};

const clayPot = (): LabItemParts => {
  const terracotta = "#b9633a";
  return {
    body: placed(
      [
        {
          ...turned(
            [
              [0, 0],
              [0.2, 0],
              [0.29, 0.06],
              [0.35, 0.18],
              [0.35, 0.3],
              [0.32, 0.4],
              [0.3, 0.43],
              [0.27, 0.42],
              [0.29, 0.36],
              [0.31, 0.28],
              [0.3, 0.18],
              [0.24, 0.09],
              [0.15, 0.06],
              [0, 0.06],
            ],
            terracotta,
            {},
            20,
          ),
          roughen: 0.03,
        },
        blob([0.22, 0.015, 0.22], "#8c4526", { at: [0, 0.07, 0] }, [10, 4]),
        ...[0.3, 2.4, 4.2].map((angle) =>
          blob(
            [0.06, 0.045, 0.015],
            "#a05530",
            {
              at: [0.35 * Math.sin(angle), 0.22, 0.35 * Math.cos(angle)],
              turn: [0, angle, 0],
            },
            [8, 5],
          ),
        ),
      ],
      [0.35, 0, 0],
    ),
  };
};

const comic = (): LabItemParts => {
  const cover = "#ffd23f";
  const band = "#e63946";
  const skin = "#f2c29b";
  const suit = "#2f6fdb";
  const z = 0.014;
  const bubble = toShape([...ellipsePoints([0.13, 0.5], [0.13, 0.08], 16)]);
  const tail = toShape([
    [0.06, 0.46],
    [0.12, 0.44],
    [0.02, 0.37],
  ]);
  const burst = toShape(
    Array.from({ length: 16 }, (_, index): [number, number] => {
      const angle = (index / 16) * tau;
      const radius = index % 2 === 0 ? 0.13 : 0.07;
      return [0.18 + radius * Math.cos(angle), 0.12 + radius * Math.sin(angle)];
    }),
  );
  return {
    body: placed(
      [
        block([0.62, 0.88, 0.02], white, { at: [0, 0.44, 0] }),
        block([0.62, 0.88, 0.006], cover, { at: [0.002, 0.44, 0.012] }),
        block([0.6, 0.16, 0.006], band, { at: [0.002, 0.79, z] }),
        ...[-0.2, -0.06, 0.08].map((x) =>
          block([0.1, 0.07, 0.004], "#ffffff", { at: [x, 0.79, z + 0.004] }),
        ),
        // The hero on the cover.
        blob([0.15, 0.12, 0.02], suit, { at: [-0.12, 0.13, z] }, [10, 6]),
        blob([0.11, 0.12, 0.025], skin, { at: [-0.12, 0.36, z + 0.006] }),
        block([0.2, 0.05, 0.006], ink, { at: [-0.12, 0.39, z + 0.03] }),
        ...mirrored((side) =>
          blob(
            [0.018, 0.014, 0.01],
            "#ffffff",
            {
              at: [-0.12 + 0.045 * side, 0.39, z + 0.034],
            },
            [6, 4],
          ),
        ),
        wire(
          [
            [-0.17, 0.32, z + 0.032],
            [-0.12, 0.29, z + 0.034],
            [-0.07, 0.32, z + 0.032],
          ],
          0.008,
          "#8a2b2b",
          8,
          4,
        ),
        slab(bubble, 0.008, "#ffffff", { at: [0, 0, z] }),
        slab(tail, 0.008, "#ffffff", { at: [0, 0, z] }),
        slab(burst, 0.008, "#ff7a1a", { at: [0, 0, z] }),
      ],
      [-0.2, 0, 0],
    ),
  };
};

const easel = (): LabItemParts => ({
  body: [
    ...mirrored((side) =>
      between(
        [0.34 * side, 0, 0.1],
        [0.07 * side, 1.3, -0.06],
        [0.03, 0.025],
        wood,
        6,
      ),
    ),
    between([0, 0, -0.6], [0, 1.25, -0.1], [0.028, 0.024], wood, 6),
    between([0, 0.45, 0.04], [0, 1.36, -0.07], [0.025, 0.022], wood, 6),
    block([0.6, 0.04, 0.03], wood, { at: [0, 0.3, 0.07] }),
    block([0.86, 0.035, 0.13], darkWood, { at: [0, 0.43, 0.1] }),
    block([0.86, 0.05, 0.015], darkWood, { at: [0, 0.46, 0.165] }),
    block([0.76, 0.58, 0.04], "#fdfdf9", {
      at: [0, 0.74, 0.07],
      turn: [-0.12, 0, 0],
    }),
    block([0.12, 0.05, 0.1], darkWood, {
      at: [0, 1.05, 0.04],
      turn: [-0.12, 0, 0],
    }),
  ],
});

const mosaic = (): LabItemParts => {
  const size = 7;
  const cell = 0.14;
  const ringColours = ["#24406e", "#efe3c4", "#c0532e", "#e0b23c"];
  const tiles = Array.from({ length: size * size }, (_, index) => {
    const column = index % size;
    const row = Math.floor(index / size);
    const ring = Math.min(column, row, size - 1 - column, size - 1 - row);
    const colour =
      ring === 1 && (column + row) % 2 === 0 ? "#d9a441" : ringColours[ring];
    return block([cell * 0.84, cell * 0.84, 0.035], colour, {
      at: [
        (column - (size - 1) / 2) * cell,
        0.5 + (row - (size - 1) / 2) * cell,
        0.03,
      ],
      turn: [0, 0, ((index * 7) % 5) * 0.02 - 0.04],
    });
  });
  return {
    body: placed(
      [
        block([size * cell + 0.04, size * cell + 0.04, 0.05], "#a19f98", {
          at: [0, 0.5, 0],
        }),
        ...tiles,
      ],
      [-0.2, 0, 0],
    ),
  };
};

const palettePoints = (): [number, number][] =>
  Array.from({ length: 32 }, (_, index) => {
    const angle = (index / 32) * tau;
    const notch = 1 - 0.3 * Math.exp(-(((angle - 3.6) / 0.28) ** 2));
    return [0.56 * notch * Math.cos(angle), 0.4 * notch * Math.sin(angle)];
  });

const paintPalette = (): LabItemParts => {
  const board = toShape(palettePoints());
  board.holes.push(new Path().absarc(-0.3, 0.06, 0.07, 0, tau, true));
  const paint = (x: number, y: number, colour: string): ModelPart =>
    blob([0.085, 0.07, 0.04], colour, { at: [x, y, 0.025] }, [10, 6]);
  return {
    body: placed(
      [
        slab(board, 0.04, "#c99a62", {}, 10),
        paint(-0.02, 0.24, "#d62828"),
        paint(0.24, 0.2, "#f7c815"),
        paint(0.38, -0.04, "#1f5fd1"),
        paint(0.2, -0.24, "#fbfbf7"),
      ],
      [-0.55, 0, 0.15],
      [0, 0.4, 0],
    ),
  };
};

const paintbrush = (): LabItemParts => ({
  body: placed(
    [
      taper(
        [0.045, 0.024],
        0.8,
        wood,
        {
          at: [-0.2, 0, 0],
          turn: [0, 0, -quarter],
        },
        10,
      ),
      blob([0.024, 0.024, 0.024], wood, { at: [-0.6, 0, 0] }, [6, 4]),
      taper(
        [0.042, 0.048],
        0.18,
        steel,
        {
          at: [0.29, 0, 0],
          turn: [0, 0, -quarter],
        },
        12,
      ),
      taper(
        [0.05, 0.05],
        0.015,
        darkSteel,
        {
          at: [0.26, 0, 0],
          turn: [0, 0, -quarter],
        },
        12,
      ),
      turned(
        [
          [0, 0],
          [0.042, 0],
          [0.05, 0.07],
          [0.044, 0.15],
          [0.022, 0.23],
          [0, 0.26],
        ],
        "#4a3424",
        { at: [0.37, 0, 0], turn: [0, 0, -quarter] },
        10,
      ),
    ],
    [0, 0.35, 0],
    [0, 0.05, 0],
  ),
});

const paper = (): LabItemParts => {
  const sheet = toShape([
    [-0.35, 0],
    [0.35, 0],
    [0.35, 0.8],
    [0.2, 0.95],
    [-0.35, 0.95],
  ]);
  const flap = toShape([
    [0.2, 0.95],
    [0.35, 0.8],
    [0.2, 0.8],
  ]);
  return {
    body: placed(
      [
        slab(sheet, 0.008, white),
        slab(flap, 0.008, "#e4e3dc", { at: [0, 0, 0.012] }),
        between(
          [0.2, 0.95, 0.008],
          [0.35, 0.8, 0.008],
          [0.012, 0.012],
          "#ecebe4",
          6,
        ),
      ],
      [-0.25, 0, 0],
    ),
  };
};

const pen = (): LabItemParts => {
  const blue = "#1f4fc4";
  return {
    body: placed(
      [
        taper(
          [0.012, 0.012],
          0.72,
          "#2c56d6",
          {
            at: [0.02, 0, 0],
            turn: [0, 0, -quarter],
          },
          6,
        ),
        taper(
          [0.012, 0.04],
          0.14,
          "#e8eaee",
          {
            at: [0.42, 0, 0],
            turn: [0, 0, -quarter],
          },
          12,
        ),
        spike(
          0.012,
          0.05,
          steel,
          {
            at: [0.515, 0, 0],
            turn: [0, 0, -quarter],
          },
          8,
        ),
        blob([0.006, 0.006, 0.006], darkSteel, { at: [0.54, 0, 0] }, [5, 3]),
        // The cap is pushed on over the back end.
        taper(
          [0.046, 0.046],
          0.3,
          blue,
          {
            at: [-0.3, 0, 0],
            turn: [0, 0, -quarter],
          },
          14,
        ),
        blob([0.046, 0.046, 0.046], blue, { at: [-0.45, 0, 0] }, [10, 6]),
        block([0.26, 0.016, 0.026], blue, { at: [-0.29, 0.056, 0] }),
        block([0.03, 0.03, 0.026], blue, { at: [-0.41, 0.045, 0] }),
        blob([0.018, 0.012, 0.016], blue, { at: [-0.16, 0.058, 0] }, [6, 4]),
      ],
      [0, 0.35, 0],
      [0, 0.05, 0],
    ),
    glass: placed(
      [
        taper(
          [0.04, 0.04],
          0.58,
          "#e9f1fb",
          {
            at: [0.06, 0, 0],
            turn: [0, 0, -quarter],
          },
          12,
        ),
      ],
      [0, 0.35, 0],
      [0, 0.05, 0],
    ),
  };
};

const pencil = (): LabItemParts => ({
  body: placed(
    [
      faceted(0.05, 0.76, 6, "#f2c12e", {
        at: [0.02, 0, 0],
        turn: [0, 0, -quarter],
      }),
      taper(
        [0.016, 0.05],
        0.14,
        "#e7c29a",
        {
          at: [0.47, 0, 0],
          turn: [0, 0, -quarter],
        },
        12,
      ),
      spike(
        0.016,
        0.05,
        "#3d3d42",
        {
          at: [0.565, 0, 0],
          turn: [0, 0, -quarter],
        },
        8,
      ),
      taper(
        [0.053, 0.053],
        0.08,
        steel,
        {
          at: [-0.4, 0, 0],
          turn: [0, 0, -quarter],
        },
        14,
      ),
      ...[-0.38, -0.42].map((x) =>
        taper(
          [0.055, 0.055],
          0.012,
          darkSteel,
          {
            at: [x, 0, 0],
            turn: [0, 0, -quarter],
          },
          14,
        ),
      ),
      taper(
        [0.05, 0.05],
        0.06,
        "#f29aa6",
        {
          at: [-0.47, 0, 0],
          turn: [0, 0, -quarter],
        },
        14,
      ),
      blob([0.025, 0.05, 0.05], "#f29aa6", { at: [-0.5, 0, 0] }, [10, 6]),
    ],
    [0, 0.35, 0],
    [0, 0.055, 0],
  ),
});

const pencilCase = (): LabItemParts => {
  const fabric = "#2f9e9a";
  const zip = "#1d5f5c";
  return {
    body: [
      shaped(
        new RoundedBoxGeometry(0.9, 0.3, 0.32, 3, 0.12),
        fabric,
        { at: [0, 0.15, 0] },
        true,
      ),
      block([0.7, 0.012, 0.06], zip, { at: [0, 0.302, 0] }),
      block([0.68, 0.016, 0.02], "#b8c0c4", { at: [0, 0.308, 0] }),
      block([0.06, 0.02, 0.05], steel, { at: [0.26, 0.315, 0.02] }),
      block([0.03, 0.09, 0.012], steel, {
        at: [0.26, 0.28, 0.07],
        turn: [-0.5, 0, 0],
      }),
      block([0.035, 0.03, 0.014], "#e04f5f", {
        at: [0.26, 0.225, 0.1],
        turn: [-0.5, 0, 0],
      }),
      block([0.02, 0.08, 0.06], zip, { at: [-0.46, 0.17, 0] }),
    ],
  };
};

const pencilPot = (): LabItemParts => {
  const card = "#c49a6c";
  return {
    body: placed(
      [
        turned(
          [
            [0, 0],
            [0.21, 0],
            [0.22, 0.02],
            [0.22, 0.6],
            [0.215, 0.62],
            [0.205, 0.6],
            [0.205, 0.05],
            [0.19, 0.04],
            [0, 0.04],
          ],
          card,
          {},
          20,
        ),
        ...(
          [
            [0.16, "#e25d4f"],
            [0.46, "#3f86d9"],
          ] as const
        ).map(([y, colour]) =>
          turned(
            [
              [0.219, y - 0.035],
              [0.224, y - 0.03],
              [0.224, y + 0.03],
              [0.219, y + 0.035],
            ],
            colour,
            {},
            20,
          ),
        ),
      ],
      [0.25, 0, 0],
    ),
  };
};

const pencilSharpener = (): LabItemParts => {
  const metal = "#aab2ba";
  const profile = toShape([
    [-0.3, 0],
    [0.3, 0],
    [0.3, 0.24],
    [-0.3, 0.34],
  ]);
  return {
    body: [
      slab(profile, 0.46, metal, { turn: [0, quarter, 0] }),
      taper(
        [0.09, 0.09],
        0.012,
        "#2b2c30",
        {
          at: [0, 0.17, 0.302],
          turn: [quarter, 0, 0],
        },
        14,
      ),
      spike(
        0.075,
        0.1,
        "#141416",
        {
          at: [0, 0.17, 0.26],
          turn: [-quarter, 0, 0],
        },
        12,
      ),
      hoop(0.095, 0.012, "#d3d9df", { at: [0, 0.17, 0.302] }, 14),
      // The steel blade screwed to the top.
      block([0.3, 0.014, 0.4], "#dfe7ee", {
        at: [0.04, 0.3, 0],
        turn: [0.165, 0, 0],
      }),
      block([0.3, 0.016, 0.02], "#8f9aa4", {
        at: [0.04, 0.27, 0.2],
        turn: [0.165, 0, 0],
      }),
      taper(
        [0.04, 0.04],
        0.02,
        darkSteel,
        {
          at: [0.04, 0.31, -0.06],
          turn: [0.165, 0, 0],
        },
        10,
      ),
      block([0.06, 0.008, 0.008], "#3a3d42", {
        at: [0.04, 0.322, -0.06],
        turn: [0.165, 0.6, 0],
      }),
      ...mirrored((side) =>
        [0.06, 0.12, 0.18].map((y) =>
          block([0.006, 0.012, 0.52], "#7f8891", { at: [0.231 * side, y, 0] }),
        ),
      ).flat(),
    ],
  };
};

const printingBlock = (): LabItemParts => {
  const base = "#a8743f";
  const carved = "#dcae76";
  const z = 0.1;
  return {
    body: placed(
      [
        block([0.8, 0.6, 0.16], base, { at: [0, 0.3, 0] }),
        block([0.74, 0.54, 0.02], "#8e6033", { at: [0, 0.3, 0.085] }),
        ...strokes(
          [
            [-0.32, 0.06],
            [0.32, 0.06],
            [0.32, 0.54],
            [-0.32, 0.54],
            [-0.32, 0.06],
          ],
          0.035,
          carved,
          z,
        ),
        ...Array.from({ length: 6 }, (_, index) => {
          const angle = (index / 6) * tau;
          return blob(
            [0.1, 0.04, 0.02],
            carved,
            {
              at: [0.1 * Math.cos(angle), 0.3 + 0.1 * Math.sin(angle), z],
              turn: [0, 0, angle],
            },
            [8, 5],
          );
        }),
        blob(
          [0.045, 0.045, 0.022],
          carved,
          { at: [0, 0.3, z + 0.004] },
          [8, 5],
        ),
        ...[
          [-0.23, 0.15],
          [0.23, 0.15],
          [-0.23, 0.45],
          [0.23, 0.45],
        ].map(([x, y]) =>
          block([0.06, 0.06, 0.035], carved, {
            at: [x, y, z],
            turn: [0, 0, quarter / 2],
          }),
        ),
        // The knob you hold it by, on the back.
        turned(
          [
            [0, 0],
            [0.07, 0],
            [0.05, 0.06],
            [0.08, 0.12],
            [0, 0.14],
          ],
          wood,
          { at: [0, 0.3, -0.08], turn: [-quarter, 0, 0] },
          12,
        ),
      ],
      [-0.25, 0, 0],
    ),
  };
};

const printingPress = (): LabItemParts => {
  const frame = "#7a4b28";
  const dark = "#5a3519";
  const iron = "#3f4047";
  const helix: Triple[] = Array.from({ length: 22 }, (_, index) => {
    const angle = index * 0.9;
    return [
      0.055 * Math.cos(angle),
      0.68 + index * 0.012,
      0.055 * Math.sin(angle),
    ];
  });
  return {
    body: [
      block([1.0, 0.08, 0.6], dark, { at: [0, 0.04, 0] }),
      ...mirrored((side) =>
        block([0.1, 1.24, 0.14], frame, { at: [0.42 * side, 0.66, 0] }),
      ),
      block([1.04, 0.14, 0.18], frame, { at: [0, 1.32, 0] }),
      block([0.9, 0.12, 0.16], frame, { at: [0, 0.98, 0] }),
      rod(0.035, 0.38, iron, { at: [0, 0.78, 0] }, 8),
      wire(helix, 0.014, iron, 30, 4),
      between([0, 0.76, 0], [0.5, 0.76, 0.38], [0.022, 0.018], iron, 6),
      between([0.5, 0.76, 0.38], [0.52, 0.76, 0.58], [0.035, 0.04], wood, 8),
      block([0.5, 0.06, 0.36], iron, { at: [0, 0.56, 0] }),
      block([0.74, 0.06, 0.56], dark, { at: [0, 0.44, 0.04] }),
      block([0.44, 0.012, 0.32], white, { at: [0, 0.476, 0.06] }),
      ...mirrored((side) =>
        block([0.08, 0.36, 0.4], dark, { at: [0.28 * side, 0.24, 0.04] }),
      ),
    ],
  };
};

const sketchbook = (): LabItemParts => {
  const page = "#fbfaf4";
  const cover = "#26262b";
  const z = 0.01;
  const apple: Triple[] = Array.from({ length: 12 }, (_, index): Triple => {
    const angle = (index / 12) * tau;
    const dip = 1 - 0.18 * Math.exp(-(((angle - quarter) / 0.35) ** 2));
    return [
      0.15 * Math.cos(angle) * dip,
      0.05 + 0.14 * Math.sin(angle) * dip,
      z,
    ];
  });
  const flower: Triple[] = Array.from({ length: 20 }, (_, index): Triple => {
    const angle = (index / 20) * tau;
    const radius = 0.08 + 0.04 * Math.cos(angle * 5);
    return [radius * Math.cos(angle), 0.14 + radius * Math.sin(angle), z];
  });
  const leftPage: ModelPart[] = [
    block([0.56, 0.78, 0.012], page, {}),
    wire(apple, 0.007, graphite, 24, 3, true),
    wire(
      [
        [0, 0.17, z],
        [0.01, 0.23, z],
        [0.03, 0.27, z],
      ],
      0.007,
      graphite,
      6,
      3,
    ),
    ...[-0.12, -0.08, -0.04, 0, 0.04].map((x) =>
      stroke([x, -0.16], [x + 0.05, -0.12], 0.008, "#9a9aa0", z),
    ),
  ];
  const rightPage: ModelPart[] = [
    block([0.56, 0.78, 0.012], page, {}),
    wire(flower, 0.007, graphite, 30, 3, true),
    wire(
      [
        [0, 0.03, z],
        [0.01, -0.12, z],
        [-0.01, -0.28, z],
      ],
      0.007,
      graphite,
      6,
      3,
    ),
    stroke([0.005, -0.15], [0.09, -0.09], 0.008, graphite, z),
  ];
  return {
    body: placed(
      [
        ...placed(
          [
            block([0.6, 0.82, 0.02], cover, { at: [0, 0, -0.016] }),
            ...leftPage,
          ],
          [0, 0.12, 0],
          [-0.3, 0, 0],
        ),
        ...placed(
          [
            block([0.6, 0.82, 0.02], cover, { at: [0, 0, -0.016] }),
            ...rightPage,
          ],
          [0, -0.12, 0],
          [0.3, 0, 0],
        ),
        ...Array.from({ length: 9 }, (_, index) =>
          hoop(
            0.032,
            0.007,
            "#9aa1a8",
            {
              at: [0, -0.36 + index * 0.09, 0.0],
              turn: [quarter, 0, 0],
            },
            8,
            3,
          ),
        ),
      ],
      [-0.7, 0, 0],
      [0, 0.3, 0],
    ),
  };
};

const watercolourPaintBox = (): LabItemParts => {
  const tin = "#1f1f25";
  const colours = [
    "#d62828",
    "#f77f00",
    "#fcbf49",
    "#3a9b3a",
    "#1f5fd1",
    "#7b3fa0",
    "#f28ab2",
    "#8a5a2b",
    "#5bc0eb",
    "#9bd16a",
    "#2b2b2b",
    "#a4161a",
  ];
  const pans = colours.flatMap((colour, index) => {
    const x = -0.35 + (index % 6) * 0.14;
    const z = index < 6 ? -0.07 : 0.08;
    return [
      block([0.12, 0.03, 0.13], "#ffffff", { at: [x, 0.1, z] }),
      block([0.1, 0.02, 0.11], colour, { at: [x, 0.11, z] }),
    ];
  });
  return {
    body: placed(
      [
        block([0.9, 0.08, 0.42], tin, { at: [0, 0.04, 0] }),
        block([0.86, 0.02, 0.38], "#efefea", { at: [0, 0.085, 0] }),
        ...pans,
        block([0.9, 0.42, 0.03], tin, {
          at: [0, 0.283, -0.28],
          turn: [-0.25, 0, 0],
        }),
        block([0.84, 0.36, 0.01], "#f4f4ef", {
          at: [0, 0.285, -0.26],
          turn: [-0.25, 0, 0],
        }),
        // A little brush in the groove at the front.
        taper(
          [0.012, 0.012],
          0.5,
          "#c8372d",
          {
            at: [-0.08, 0.11, 0.18],
            turn: [0, 0, -quarter],
          },
          6,
        ),
        spike(
          0.015,
          0.07,
          ink,
          {
            at: [0.205, 0.11, 0.18],
            turn: [0, 0, -quarter],
          },
          6,
        ),
      ],
      [0.5, 0, 0],
    ),
  };
};

const folder = (): LabItemParts => {
  const back = toShape([
    [-0.45, 0],
    [0.45, 0],
    [0.45, 0.68],
    [0.42, 0.68],
    [0.38, 0.75],
    [0.1, 0.75],
    [0.06, 0.68],
    [-0.45, 0.68],
  ]);
  const notch = Array.from({ length: 7 }, (_, index): [number, number] => {
    const angle = (index / 6) * Math.PI;
    return [0.07 * Math.cos(angle), 0.62 - 0.05 * Math.sin(angle)];
  });
  const front = toShape([
    [-0.45, 0],
    [0.45, 0],
    [0.45, 0.62],
    ...notch,
    [-0.45, 0.62],
  ]);
  return {
    body: placed(
      [
        slab(back, 0.008, "#dcb977", { at: [0, 0, -0.008] }),
        slab(front, 0.008, "#ebcf94", { at: [0, 0, 0.008] }),
        taper(
          [0.012, 0.012],
          0.9,
          "#d6b16c",
          {
            at: [0, 0.004, 0],
            turn: [0, 0, quarter],
          },
          8,
        ),
      ],
      [-0.2, 0, 0],
    ),
  };
};

const calendar = (): LabItemParts => {
  const grid = "#c8c8c8";
  const z = 0.012;
  return {
    body: placed(
      [
        block([0.78, 0.98, 0.02], "#5a5a62", { at: [0, 0.49, -0.02] }),
        block([0.76, 0.9, 0.012], "#eeeeea", { at: [0.006, 0.45, -0.006] }),
        block([0.76, 0.9, 0.012], white, { at: [0, 0.45, 0.004] }),
        block([0.76, 0.18, 0.006], "#d94141", { at: [0, 0.8, z] }),
        block([0.18, 0.6, 0.004], "#fbe3e3", { at: [0.24, 0.38, z - 0.002] }),
        ...Array.from({ length: 8 }, (_, index) =>
          block([0.006, 0.6, 0.004], grid, {
            at: [-0.33 + index * (0.66 / 7), 0.38, z],
          }),
        ),
        ...Array.from({ length: 6 }, (_, index) =>
          block([0.66, 0.006, 0.004], grid, {
            at: [0, 0.08 + index * 0.12, z],
          }),
        ),
        ...Array.from({ length: 6 }, (_, index) =>
          hoop(
            0.026,
            0.006,
            "#9aa1a8",
            {
              at: [-0.3 + index * 0.12, 0.92, 0],
              turn: [0, quarter, 0],
            },
            8,
            3,
          ),
        ),
        wire(
          [
            [-0.06, 0.92, -0.02],
            [0, 1.04, -0.02],
            [0.06, 0.92, -0.02],
          ],
          0.007,
          "#9aa1a8",
          8,
          3,
        ),
      ],
      [-0.15, 0, 0],
    ),
  };
};

const atlas = (): LabItemParts => {
  const sea = "#8fc4e8";
  const green = "#6fb35a";
  const tan = "#d9c27a";
  const orange = "#e39a4f";
  const z = 0.036;
  const land = (
    x: number,
    y: number,
    rx: number,
    ry: number,
    colour: string,
    turn = 0,
  ): ModelPart =>
    blob(
      [rx, ry, 0.006],
      colour,
      { at: [x, y, z], turn: [0, 0, turn] },
      [10, 4],
    );
  const page = (side: -1 | 1, continents: ModelPart[]): ModelPart[] =>
    placed(
      [
        block([0.6, 0.82, 0.02], "#1f3a6b", { at: [0, 0, -0.04] }),
        block([0.56, 0.78, 0.06], cream, {}),
        block([0.5, 0.7, 0.004], sea, { at: [0, 0, 0.031] }),
        ...[-0.2, 0, 0.2].map((y) =>
          block([0.5, 0.004, 0.004], "#b9dcf2", { at: [0, y, 0.033] }),
        ),
        ...continents,
      ],
      [0, -0.12 * side, 0],
      [0.3 * side, 0, 0],
    );
  return {
    body: placed(
      [
        ...page(-1, [
          land(-0.04, 0.17, 0.14, 0.12, green, 0.4),
          land(0.05, 0.08, 0.06, 0.07, tan),
          land(0.06, -0.12, 0.07, 0.15, green, -0.3),
          land(0.02, -0.2, 0.04, 0.06, orange),
        ]),
        ...page(1, [
          land(-0.1, 0.2, 0.06, 0.06, green),
          land(-0.08, -0.05, 0.09, 0.15, tan, 0.15),
          land(-0.06, -0.08, 0.05, 0.07, orange),
          land(0.12, 0.16, 0.13, 0.1, green, -0.2),
          land(0.15, -0.2, 0.07, 0.05, orange),
        ]),
      ],
      [-0.75, 0, 0],
      [0, 0.3, 0],
    ),
  };
};

const map = (): LabItemParts => {
  const land = "#b5d99c";
  const river = "#4d9be0";
  const road = "#e0533f";
  const lane = "#f2c230";
  const forest = "#3f8a3a";
  const width = 0.4;
  const fold = 0.35;
  const z = 0.008;
  const panelDetails: ModelPart[][] = [
    [
      ...strokes(
        [
          [-0.2, 0.55],
          [0, 0.5],
          [0.2, 0.45],
        ],
        0.035,
        river,
        z,
      ),
      ...strokes(
        [
          [-0.2, 0.2],
          [0.05, 0.3],
          [0.2, 0.32],
        ],
        0.022,
        road,
        z,
      ),
      ...[
        [-0.1, 0.68],
        [-0.04, 0.72],
        [0.02, 0.66],
      ].map(([x, y]) =>
        blob([0.03, 0.03, 0.01], forest, { at: [x, y, z] }, [6, 4]),
      ),
      // The scale bar, in black and white blocks.
      ...[0, 1, 2, 3].map((index) =>
        block([0.05, 0.02, 0.006], index % 2 === 0 ? ink : "#ffffff", {
          at: [-0.12 + index * 0.05, 0.07, z],
        }),
      ),
    ],
    [
      ...strokes(
        [
          [-0.2, 0.45],
          [0, 0.5],
          [0.2, 0.35],
        ],
        0.035,
        river,
        z,
      ),
      ...strokes(
        [
          [-0.2, 0.32],
          [0, 0.28],
          [0.2, 0.2],
        ],
        0.022,
        road,
        z,
      ),
      ...strokes(
        [
          [0, 0.28],
          [0.04, 0.6],
          [0.0, 0.78],
        ],
        0.016,
        lane,
        z,
      ),
      blob([0.07, 0.04, 0.01], river, { at: [-0.1, 0.65, z] }, [8, 4]),
      ...[
        [0.1, 0.12],
        [0.14, 0.08],
      ].map(([x, y]) =>
        block([0.03, 0.03, 0.01], "#8a5a4a", { at: [x, y, z] }),
      ),
    ],
    [
      ...strokes(
        [
          [-0.2, 0.35],
          [0, 0.28],
          [0.2, 0.22],
        ],
        0.035,
        river,
        z,
      ),
      ...strokes(
        [
          [-0.2, 0.2],
          [0, 0.52],
          [0.2, 0.6],
        ],
        0.022,
        road,
        z,
      ),
      ...[
        [0.1, 0.72],
        [0.15, 0.68],
      ].map(([x, y]) =>
        blob([0.03, 0.03, 0.01], forest, { at: [x, y, z] }, [6, 4]),
      ),
      // The key box in the corner, its symbols without words.
      block([0.16, 0.18, 0.006], "#ffffff", { at: [0.1, 0.12, z] }),
      ...[river, road, forest].flatMap((colour, index) => [
        block([0.025, 0.025, 0.006], colour, {
          at: [0.05, 0.17 - index * 0.05, z + 0.004],
        }),
        block([0.07, 0.008, 0.006], "#9a9a9a", {
          at: [0.12, 0.17 - index * 0.05, z + 0.004],
        }),
      ]),
    ],
  ];
  let start = new Vector3(-0.6, 0, 0);
  const panels = panelDetails.flatMap((details, index) => {
    const turn = index % 2 === 0 ? fold : -fold;
    const direction = new Vector3(Math.cos(turn), 0, -Math.sin(turn));
    const centre = start.clone().addScaledVector(direction, width / 2);
    start = start.clone().addScaledVector(direction, width);
    return placed(
      [block([width, 0.84, 0.008], land, { at: [0, 0.42, 0] }), ...details],
      [0, turn, 0],
      [centre.x, centre.y, centre.z],
    );
  });
  return { body: placed(panels, [-0.15, 0, 0]) };
};

const bagHandle = (
  x: number,
  z: number,
  top: number,
  rise: number,
  colour: string,
): ModelPart =>
  wire(
    [
      [-x, top - 0.02, z],
      [-x * 0.9, top + rise * 0.7, z],
      [0, top + rise, z],
      [x * 0.9, top + rise * 0.7, z],
      [x, top - 0.02, z],
    ],
    0.022,
    colour,
    14,
    5,
  );

const schoolBag = (): LabItemParts => {
  const navy = "#22427e";
  const trim = "#f2c230";
  return {
    body: [
      shaped(new RoundedBoxGeometry(0.85, 0.68, 0.14, 2, 0.04), navy, {
        at: [0, 0.34, 0],
      }),
      shaped(new RoundedBoxGeometry(0.85, 0.26, 0.03, 2, 0.012), "#2b4f93", {
        at: [0, 0.55, 0.08],
      }),
      block([0.85, 0.015, 0.035], trim, { at: [0, 0.42, 0.085] }),
      block([0.1, 0.06, 0.02], "#1a2f5c", { at: [0, 0.44, 0.1] }),
      block([0.3, 0.12, 0.012], white, { at: [-0.18, 0.2, 0.075] }),
      ...mirrored((side) => bagHandle(0.2, 0.045 * side, 0.68, 0.2, navy)),
    ],
  };
};

const toteBag = (): LabItemParts => {
  const canvas = "#efe6cf";
  return {
    body: [
      shaped(new RoundedBoxGeometry(0.7, 0.75, 0.06, 2, 0.02), canvas, {
        at: [0, 0.375, 0],
      }),
      block([0.7, 0.05, 0.065], "#e2d6b9", { at: [0, 0.71, 0] }),
      ...mirrored((side) =>
        bagHandle(0.17, 0.02 * side, 0.75, 0.45, "#ddd0b0"),
      ),
      // A simple printed flower on the front.
      ...Array.from({ length: 5 }, (_, index) => {
        const angle = (index / 5) * tau;
        return blob(
          [0.06, 0.06, 0.008],
          "#e86a4a",
          {
            at: [
              0.085 * Math.sin(angle),
              0.38 + 0.085 * Math.cos(angle),
              0.032,
            ],
          },
          [8, 4],
        );
      }),
      blob([0.045, 0.045, 0.01], "#f2c230", { at: [0, 0.38, 0.036] }, [8, 4]),
      stroke([0, 0.3], [0, 0.14], 0.02, "#4f9a4a", 0.032),
    ],
  };
};

const heartShape = (
  scale: number,
  [cx, cy]: readonly [number, number],
): Shape =>
  toShape(
    Array.from({ length: 20 }, (_, index): [number, number] => {
      const angle = (index / 20) * tau;
      const x = 16 * Math.sin(angle) ** 3;
      const y =
        13 * Math.cos(angle) -
        5 * Math.cos(2 * angle) -
        2 * Math.cos(3 * angle) -
        Math.cos(4 * angle);
      return [cx + (x / 16) * scale, cy + (y / 16) * scale];
    }),
  );

const purse = (): LabItemParts => {
  const pink = "#e86ca0";
  const outline = toShape([
    ...Array.from({ length: 13 }, (_, index): [number, number] => {
      const angle = (index / 12) * Math.PI;
      return [0.36 * Math.cos(angle), 0.3 - 0.3 * Math.sin(angle)];
    }),
    [-0.33, 0.48],
    [0.33, 0.48],
  ]);
  return {
    body: [
      puffy(outline, 0.08, 0.06, pink, { at: [0, 0.06, 0] }),
      wire(
        [
          [-0.36, 0.55, 0],
          [-0.2, 0.585, 0],
          [0, 0.595, 0],
          [0.2, 0.585, 0],
          [0.36, 0.55, 0],
        ],
        0.024,
        gold,
        14,
        6,
      ),
      // The kiss-lock clasp: two little balls that click past each other.
      blob([0.04, 0.04, 0.04], gold, { at: [-0.02, 0.65, 0.02] }, [8, 6]),
      blob([0.04, 0.04, 0.04], gold, { at: [0.02, 0.65, -0.02] }, [8, 6]),
      puffy(heartShape(0.09, [0, 0.3]), 0.01, 0.012, "#ffe3ee", {
        at: [0, 0.03, 0.105],
      }),
    ],
  };
};

const ball = (): LabItemParts => ({
  body: [
    blob([0.5, 0.5, 0.5], "#d9302c", { at: [0, 0.5, 0] }, [18, 12]),
    blob([0.03, 0.03, 0.03], "#a82320", { at: [0.25, 0.85, 0.25] }, [6, 4]),
  ],
});

const goldenRatio = (1 + Math.sqrt(5)) / 2;

const football = (): LabItemParts => {
  const corners: Triple[] = [
    [0, 1, goldenRatio],
    [0, 1, -goldenRatio],
    [0, -1, goldenRatio],
    [0, -1, -goldenRatio],
    [1, goldenRatio, 0],
    [1, -goldenRatio, 0],
    [-1, goldenRatio, 0],
    [-1, -goldenRatio, 0],
    [goldenRatio, 0, 1],
    [goldenRatio, 0, -1],
    [-goldenRatio, 0, 1],
    [-goldenRatio, 0, -1],
  ];
  return {
    body: [
      blob([0.5, 0.5, 0.5], "#fafafa", { at: [0, 0.5, 0] }, [16, 12]),
      // A black pentagon at each of an icosahedron's twelve corners.
      ...corners.map((corner) =>
        shaped(new SphereGeometry(0.505, 5, 2, 0, tau, 0, 0.31), "#1c1c1c", {
          at: [0, 0.5, 0],
          turn: facing(new Vector3(...corner)),
        }),
      ),
    ],
  };
};

const dice = (): LabItemParts => {
  const half = 0.4;
  const pip = 0.2;
  const faces: { axis: 0 | 1 | 2; sign: -1 | 1; spots: [number, number][] }[] =
    [
      { axis: 1, sign: 1, spots: [[0, 0]] },
      {
        axis: 1,
        sign: -1,
        spots: [
          [-1, -1],
          [-1, 0],
          [-1, 1],
          [1, -1],
          [1, 0],
          [1, 1],
        ],
      },
      {
        axis: 2,
        sign: 1,
        spots: [
          [-1, -1],
          [1, 1],
          [0, 0],
          [-1, 1],
          [1, -1],
        ],
      },
      {
        axis: 2,
        sign: -1,
        spots: [
          [-1, -1],
          [1, 1],
        ],
      },
      {
        axis: 0,
        sign: 1,
        spots: [
          [-1, -1],
          [0, 0],
          [1, 1],
        ],
      },
      {
        axis: 0,
        sign: -1,
        spots: [
          [-1, -1],
          [1, 1],
          [-1, 1],
          [1, -1],
        ],
      },
    ];
  const pips = faces.flatMap(({ axis, sign, spots }) =>
    spots.map(([a, b]) => {
      const at: Triple = [0, half, 0];
      const radii: Triple = [0.075, 0.075, 0.075];
      const [first, second] = ([0, 1, 2] as const).filter(
        (other) => other !== axis,
      );
      at[axis] += sign * half;
      at[first] += a * pip;
      at[second] += b * pip;
      radii[axis] = 0.02;
      return blob(radii, "#16161c", { at }, [8, 4]);
    }),
  );
  return {
    body: [
      shaped(new RoundedBoxGeometry(0.8, 0.8, 0.8, 2, 0.1), "#f8f8f4", {
        at: [0, half, 0],
      }),
      ...pips,
    ],
  };
};

const drum = (): LabItemParts => {
  const red = "#c62828";
  const chrome = "#d6dbe0";
  return {
    body: [
      taper([0.42, 0.42], 0.32, red, { at: [0, 0.2, 0] }, 24),
      taper([0.43, 0.43], 0.012, "#f5f2ea", { at: [0, 0.366, 0] }, 24),
      ...[0.37, 0.03].map((y) =>
        hoop(0.43, 0.018, chrome, { at: [0, y, 0], turn: [quarter, 0, 0] }, 24),
      ),
      ...Array.from({ length: 8 }, (_, index) => {
        const angle = (index / 8) * tau + 0.2;
        const x = Math.sin(angle);
        const z = Math.cos(angle);
        return [
          taper(
            [0.008, 0.008],
            0.34,
            chrome,
            { at: [0.44 * x, 0.2, 0.44 * z] },
            4,
          ),
          blob(
            [0.025, 0.06, 0.025],
            chrome,
            { at: [0.43 * x, 0.2, 0.43 * z] },
            [6, 4],
          ),
        ];
      }).flat(),
      // Two drumsticks resting across the skin.
      ...(
        [
          [
            [-0.42, 0.4, 0.22],
            [0.36, 0.39, -0.1],
          ],
          [
            [-0.3, 0.42, -0.24],
            [0.42, 0.41, 0.16],
          ],
        ] satisfies [Triple, Triple][]
      ).flatMap(([from, to]) => [
        between(from, to, [0.02, 0.012], "#e2c08a", 8),
        blob([0.02, 0.02, 0.02], "#e2c08a", { at: to }, [6, 4]),
      ]),
    ],
  };
};

const guitar = (): LabItemParts => {
  const top = "#e0ac63";
  const sides = "#8a4f25";
  const neck = "#7a4a26";
  const fretboard = "#2e1f17";
  const string = "#e8e8e8";
  const bout = (
    cy: number,
    rx: number,
    ry: number,
    grow: number,
    depth: number,
    colour: string,
    z: number,
  ): ModelPart =>
    slab(
      toShape(ellipsePoints([0, cy], [rx + grow, ry + grow], 24)),
      depth,
      colour,
      { at: [0, 0, z] },
    );
  return {
    body: placed(
      [
        bout(0.34, 0.31, 0.31, 0.012, 0.13, sides, 0),
        bout(0.72, 0.23, 0.22, 0.012, 0.13, sides, 0),
        bout(0.34, 0.31, 0.31, 0, 0.012, top, 0.07),
        bout(0.72, 0.23, 0.22, 0, 0.012, top, 0.07),
        slab(
          toShape(ellipsePoints([0, 0.62], [0.085, 0.085], 16)),
          0.012,
          "#1a120c",
          { at: [0, 0, 0.074] },
        ),
        hoop(0.1, 0.008, "#6b3a1a", { at: [0, 0.62, 0.078] }, 16, 3),
        block([0.22, 0.035, 0.025], fretboard, { at: [0, 0.3, 0.085] }),
        block([0.09, 0.62, 0.05], neck, { at: [0, 1.16, 0.04] }),
        block([0.085, 0.76, 0.014], fretboard, { at: [0, 1.09, 0.077] }),
        ...Array.from({ length: 9 }, (_, index) =>
          block([0.085, 0.006, 0.018], steel, {
            at: [0, 0.8 + index * 0.075, 0.08],
          }),
        ),
        block([0.085, 0.012, 0.02], cream, { at: [0, 1.47, 0.08] }),
        block([0.14, 0.24, 0.04], neck, {
          at: [0, 1.6, 0.03],
          turn: [-0.2, 0, 0],
        }),
        ...mirrored((side) =>
          [1.53, 1.6, 1.67].map((y) =>
            blob(
              [0.025, 0.018, 0.012],
              steel,
              { at: [0.1 * side, y, 0.02 - (y - 1.5) * 0.2] },
              [6, 4],
            ),
          ),
        ).flat(),
        ...Array.from({ length: 6 }, (_, index) => {
          const t = index / 5 - 0.5;
          return stroke(
            [t * 0.09, 0.3],
            [t * 0.06, 1.47],
            0.005,
            string,
            0.088,
          );
        }),
      ],
      [-0.12, 0, 0],
    ),
  };
};

const piano = (): LabItemParts => {
  const wood = "#4e2c1b";
  const panel = "#5e3622";
  const keyWidth = 0.075;
  const whiteKeys = Array.from({ length: 14 }, (_, index) =>
    block([keyWidth - 0.006, 0.035, 0.22], "#fbfbf6", {
      at: [(index - 6.5) * keyWidth, 0.565, 0.2],
    }),
  );
  const blackKeys = [0, 1, 3, 4, 5, 7, 8, 10, 11, 12].map((index) =>
    block([0.04, 0.04, 0.13], "#141414", {
      at: [(index - 6) * keyWidth, 0.6, 0.155],
    }),
  );
  return {
    body: [
      block([1.2, 1.1, 0.4], wood, { at: [0, 0.6, -0.1] }),
      block([1.26, 0.04, 0.44], panel, { at: [0, 1.17, -0.1] }),
      block([0.9, 0.36, 0.01], panel, { at: [0, 0.9, 0.105] }),
      block([0.8, 0.26, 0.01], panel, { at: [0, 0.24, 0.105] }),
      block([1.1, 0.06, 0.3], wood, { at: [0, 0.52, 0.18] }),
      ...mirrored((side) => [
        block([0.06, 0.16, 0.32], wood, { at: [0.57 * side, 0.6, 0.18] }),
        block([0.06, 0.48, 0.06], wood, { at: [0.55 * side, 0.25, 0.28] }),
        block([0.08, 0.04, 0.12], wood, { at: [0.55 * side, 0.02, 0.28] }),
      ]),
      block([1.08, 0.12, 0.04], wood, {
        at: [0, 0.66, 0.09],
        turn: [-0.2, 0, 0],
      }),
      ...whiteKeys,
      ...blackKeys,
      ...[-0.07, 0.07].map((x) =>
        block([0.04, 0.02, 0.1], gold, { at: [x, 0.06, 0.14] }),
      ),
    ],
  };
};

const handPuppet = (): LabItemParts => {
  const sleeve = "#3f7fd0";
  const fur = "#c8925a";
  const ear = "#7a4a2a";
  return {
    body: [
      taper(
        [0.2, 0.28],
        0.58,
        sleeve,
        { at: [0, 0.29, 0], size: [1, 1, 0.65] },
        16,
      ),
      taper(
        [0.285, 0.285],
        0.04,
        "#2e64b0",
        { at: [0, 0.02, 0], size: [1, 1, 0.65] },
        16,
      ),
      ...mirrored((side) => [
        rod(0.06, 0.12, sleeve, {
          at: [0.25 * side, 0.5, 0],
          turn: [0, 0, -1.1 * side],
        }),
        blob(
          [0.065, 0.065, 0.06],
          fur,
          { at: [0.34 * side, 0.56, 0.02] },
          [8, 6],
        ),
        blob(
          [0.07, 0.16, 0.04],
          ear,
          {
            at: [0.22 * side, 0.82, 0],
            turn: [0, 0, 0.35 * side],
          },
          [8, 6],
        ),
      ]),
      blob([0.24, 0.22, 0.19], fur, { at: [0, 0.82, 0] }),
      blob([0.12, 0.08, 0.08], cream, { at: [0, 0.76, 0.16] }, [10, 6]),
      blob([0.04, 0.03, 0.03], ink, { at: [0, 0.8, 0.24] }, [8, 5]),
      ...eyes([0.08, 0.9, 0.16], 0.03),
      wire(
        [
          [-0.07, 0.75, 0.215],
          [0, 0.71, 0.235],
          [0.07, 0.75, 0.215],
        ],
        0.009,
        "#7a2a2a",
        8,
        4,
      ),
      blob([0.03, 0.025, 0.015], "#f07b8f", { at: [0, 0.705, 0.23] }, [6, 4]),
    ],
  };
};

const sockPuppet = (): LabItemParts => {
  const sock = "#4caf7a";
  const stripe = "#f5f0e1";
  const button = (side: -1 | 1): ModelPart[] => [
    taper(
      [0.05, 0.05],
      0.02,
      "#2c2c34",
      {
        at: [0.08 * side, 0.74, 0.2],
        turn: [0.9, 0, 0],
      },
      12,
    ),
    ...[-1, 1].map((offset) =>
      blob(
        [0.009, 0.009, 0.006],
        "#8a8a96",
        {
          at: [0.08 * side + offset * 0.015, 0.756, 0.208],
        },
        [5, 3],
      ),
    ),
  ];
  return {
    body: [
      taper([0.17, 0.19], 0.5, sock, { at: [0, 0.25, -0.05] }, 14),
      ...[0.06, 0.16].map((y) =>
        taper([0.193, 0.193], 0.04, stripe, { at: [0, y, -0.05] }, 14),
      ),
      blob([0.19, 0.17, 0.2], sock, { at: [0, 0.56, -0.04] }),
      blob([0.19, 0.1, 0.27], sock, { at: [0, 0.66, 0.1] }),
      blob([0.17, 0.07, 0.24], sock, { at: [0, 0.5, 0.1] }),
      // The felt mouth between the two jaws.
      blob([0.165, 0.05, 0.22], "#d63a4a", { at: [0, 0.58, 0.14] }),
      ...mirrored(button),
    ],
  };
};

const teddyBear = (): LabItemParts => {
  const fur = "#a8713a";
  const light = "#e0b783";
  return {
    body: [
      blob([0.3, 0.33, 0.26], fur, { at: [0, 0.36, 0] }, [12, 8]),
      blob([0.19, 0.21, 0.1], light, { at: [0, 0.34, 0.18] }, [8, 6]),
      blob([0.24, 0.22, 0.21], fur, { at: [0, 0.82, 0.02] }, [12, 8]),
      blob([0.1, 0.075, 0.08], light, { at: [0, 0.77, 0.19] }, [8, 6]),
      blob([0.04, 0.03, 0.025], "#2a1a12", { at: [0, 0.8, 0.265] }, [6, 4]),
      rod(0.008, 0.03, "#2a1a12", { at: [0, 0.75, 0.268] }, 4),
      ...eyes([0.085, 0.88, 0.18], 0.028),
      ...mirrored((side) => [
        blob([0.085, 0.085, 0.05], fur, { at: [0.17 * side, 1.0, 0] }, [8, 5]),
        blob(
          [0.05, 0.05, 0.02],
          light,
          { at: [0.17 * side, 1.0, 0.04] },
          [6, 4],
        ),
        blob(
          [0.09, 0.19, 0.09],
          fur,
          { at: [0.29 * side, 0.42, 0.08], turn: [0.4, 0, 0.5 * side] },
          [8, 6],
        ),
        blob([0.11, 0.1, 0.2], fur, { at: [0.17 * side, 0.1, 0.2] }, [8, 6]),
        blob(
          [0.075, 0.075, 0.02],
          light,
          { at: [0.17 * side, 0.1, 0.395] },
          [8, 4],
        ),
        // The red bow at its neck.
        blob(
          [0.07, 0.045, 0.03],
          "#c62f3a",
          { at: [0.065 * side, 0.6, 0.2], turn: [0, 0, 0.3 * side] },
          [6, 4],
        ),
      ]),
      blob([0.03, 0.03, 0.025], "#c62f3a", { at: [0, 0.6, 0.22] }, [6, 4]),
    ],
  };
};

const rattle = (): LabItemParts => ({
  body: placed(
    [
      blob([0.22, 0.22, 0.22], "#ffcf3f", { at: [0, 0.66, 0] }, [14, 10]),
      hoop(
        0.222,
        0.025,
        "#e2445c",
        { at: [0, 0.66, 0], turn: [quarter, 0, 0] },
        18,
      ),
      ...[
        [0.5, 0.75],
        [2.1, 0.8],
        [3.7, 0.72],
        [5.2, 0.78],
        [1.3, 0.55],
        [2.9, 0.55],
        [4.5, 0.55],
        [6.0, 0.55],
      ].map(([angle, y], index) => {
        const lift = y - 0.66;
        const out = Math.sqrt(0.22 ** 2 - lift ** 2);
        const direction = new Vector3(
          out * Math.sin(angle),
          lift,
          out * Math.cos(angle),
        );
        return blob(
          [0.035, 0.035, 0.012],
          index % 2 === 0 ? "#3f9be0" : "#46b36b",
          {
            at: [direction.x, y, direction.z],
            turn: facing(direction, new Vector3(0, 0, 1)),
          },
          [8, 4],
        );
      }),
      taper([0.05, 0.07], 0.06, "#e2445c", { at: [0, 0.43, 0] }, 12),
      rod(0.04, 0.26, "#f48fb1", { at: [0, 0.27, 0] }, 10),
      blob([0.075, 0.075, 0.075], "#e2445c", { at: [0, 0.08, 0] }, [10, 7]),
    ],
    [0, 0, 0.12],
  ),
});

const monster = (): LabItemParts => {
  const purple = "#7b3fb5";
  const belly = "#a77ad6";
  const horn = "#f2e6c8";
  return {
    body: [
      {
        ...blob([0.42, 0.45, 0.36], purple, { at: [0, 0.52, 0] }),
        roughen: 0.12,
      },
      blob([0.25, 0.27, 0.1], belly, { at: [0, 0.42, 0.27] }, [10, 7]),
      ...mirrored((side) => [
        spike(
          0.06,
          0.24,
          horn,
          {
            at: [0.2 * side, 1.02, -0.02],
            turn: [0, 0, -0.45 * side],
          },
          8,
        ),
        blob(
          [0.1, 0.11, 0.06],
          "#ffffff",
          { at: [0.13 * side, 0.74, 0.3] },
          [10, 7],
        ),
        blob(
          [0.045, 0.05, 0.03],
          ink,
          { at: [0.12 * side, 0.73, 0.35] },
          [8, 5],
        ),
        blob(
          [0.014, 0.014, 0.01],
          "#ffffff",
          { at: [0.105 * side, 0.75, 0.38] },
          [5, 3],
        ),
        // Low, slanted brows give it its friendly-scary scowl.
        blob(
          [0.1, 0.025, 0.03],
          "#4e2478",
          {
            at: [0.13 * side, 0.87, 0.31],
            turn: [0, 0, 0.35 * side],
          },
          [8, 4],
        ),
        rod(0.06, 0.18, purple, {
          at: [0.4 * side, 0.45, 0.06],
          turn: [0.3, 0, 0.6 * side],
        }),
        blob(
          [0.12, 0.08, 0.15],
          purple,
          { at: [0.18 * side, 0.07, 0.08] },
          [8, 6],
        ),
        ...[-0.05, 0, 0.05].map((x) =>
          spike(
            0.018,
            0.05,
            horn,
            {
              at: [0.18 * side + x, 0.05, 0.24],
              turn: [quarter, 0, 0],
            },
            5,
          ),
        ),
        spike(
          0.04,
          0.1,
          purple,
          {
            at: [0.08 * side, 1.0, 0.05],
            turn: [0.3, 0, -0.2 * side],
          },
          6,
        ),
      ]),
      blob([0.18, 0.06, 0.05], "#2a0f3a", { at: [0, 0.58, 0.32] }, [10, 5]),
      ...mirrored((side) =>
        spike(
          0.022,
          0.06,
          "#ffffff",
          {
            at: [0.08 * side, 0.55, 0.36],
            turn: [Math.PI, 0, 0],
          },
          6,
        ),
      ),
    ],
  };
};

const marble = (): LabItemParts => {
  // The twisted coloured vanes inside a cat's-eye marble.
  const vane = (turn: number, colour: string): ModelPart =>
    shaped(
      new TubeGeometry(
        new CatmullRomCurve3(
          Array.from({ length: 6 }, (_, index) => {
            const t = index / 5 - 0.5;
            const twist = turn + t * 2.2;
            return new Vector3(
              t * 0.78,
              0.5 + 0.1 * Math.sin(twist),
              0.1 * Math.cos(twist),
            );
          }),
        ),
        16,
        0.06,
        6,
      ),
      colour,
      { size: [1, 1, 0.45] },
      true,
    );
  return {
    body: [vane(0, "#1f6fd1"), vane(2.1, "#f28c28"), vane(4.2, "#e8f3ff")],
    glass: [blob([0.5, 0.5, 0.5], "#eef9ff", { at: [0, 0.5, 0] }, [18, 12])],
  };
};

const crown = (): LabItemParts => {
  const points = Array.from({ length: 5 }, (_, index) => (index / 5) * tau);
  const jewels = ["#d62839", "#2a6fd6", "#2fa35a"];
  return {
    body: [
      crisp(
        [
          [0.37, 0],
          [0.4, 0],
          [0.4, 0],
          [0.4, 0.22],
          [0.4, 0.22],
          [0.37, 0.22],
          [0.37, 0.22],
          [0.37, 0],
        ],
        gold,
        {},
        20,
      ),
      blob([0.36, 0.28, 0.36], "#a3152a", { at: [0, 0.14, 0] }, [10, 7]),
      blob([0.04, 0.04, 0.04], gold, { at: [0, 0.43, 0] }, [8, 6]),
      ...[0.02, 0.2].map((y) =>
        hoop(
          0.4,
          0.018,
          "#f0c550",
          { at: [0, y, 0], turn: [quarter, 0, 0] },
          16,
        ),
      ),
      ...points.flatMap((angle) => [
        spike(
          0.13,
          0.3,
          gold,
          {
            at: [0.385 * Math.sin(angle), 0.37, 0.385 * Math.cos(angle)],
            turn: [0, angle, 0],
            size: [1, 1, 0.25],
          },
          8,
        ),
        blob(
          [0.04, 0.04, 0.04],
          "#f0c550",
          {
            at: [0.385 * Math.sin(angle), 0.53, 0.385 * Math.cos(angle)],
          },
          [6, 5],
        ),
      ]),
      ...Array.from({ length: 10 }, (_, index) => {
        const angle = (index / 10) * tau + tau / 20;
        return blob(
          [0.04, 0.05, 0.02],
          jewels[index % 3],
          {
            at: [0.405 * Math.sin(angle), 0.11, 0.405 * Math.cos(angle)],
            turn: [0, angle, 0],
          },
          [6, 4],
        );
      }),
    ],
  };
};

const starShape = (outer: number, inner: number): Shape =>
  toShape(
    Array.from({ length: 10 }, (_, index): [number, number] => {
      const angle = quarter + (index / 10) * tau;
      const radius = index % 2 === 0 ? outer : inner;
      return [radius * Math.cos(angle), radius * Math.sin(angle)];
    }),
  );

const star = (): LabItemParts => ({
  body: placed(
    [puffy(starShape(0.5, 0.21), 0.06, 0.07, "#ffd83a", { at: [0, 0.42, 0] })],
    [-0.3, 0, 0],
  ),
});

const playDough = (): LabItemParts => {
  const dough = "#ff5a8a";
  return {
    body: [
      {
        ...blob(
          [0.36, 0.35, 0.36],
          dough,
          { at: [-0.18, 0.35, 0.05] },
          [14, 10],
        ),
        roughen: 0.05,
      },
      taper([0.22, 0.2], 0.34, "#ffd23f", { at: [0.42, 0.17, -0.15] }, 16),
      taper([0.235, 0.235], 0.07, dough, { at: [0.42, 0.37, -0.15] }, 16),
    ],
  };
};

const tennisSeam = (radius: number, centre: Triple): Triple[] =>
  Array.from({ length: 24 }, (_, index): Triple => {
    const t = (index / 24) * tau;
    const point = new Vector3(
      Math.cos(t) + 0.3 * Math.cos(3 * t),
      Math.sin(t) - 0.3 * Math.sin(3 * t),
      1.1 * Math.sin(2 * t),
    ).setLength(radius);
    return [centre[0] + point.x, centre[1] + point.y, centre[2] + point.z];
  });

const tennisRacket = (): LabItemParts => {
  const frame = "#2a5bd7";
  const string = "#f2f2f2";
  const headY = 0.98;
  const rx = 0.24;
  const ry = 0.33;
  const z = 0;
  const ballCentre: Triple = [0.32, 0.11, 0.12];
  return {
    body: [
      hoop(
        0.3,
        0.025,
        frame,
        { at: [0, headY, 0], size: [rx / 0.3, ry / 0.3, 1] },
        24,
        5,
      ),
      ...[-3, -2, -1, 0, 1, 2, 3].map((index) => {
        const x = index * 0.06;
        const half = ry * Math.sqrt(1 - (x / rx) ** 2);
        return block([0.005, half * 2, 0.005], string, { at: [x, headY, z] });
      }),
      ...[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((index) => {
        const y = index * 0.07;
        const half = rx * Math.sqrt(1 - (y / ry) ** 2);
        return block([half * 2, 0.005, 0.005], string, {
          at: [0, headY + y, z],
        });
      }),
      ...mirrored((side) =>
        wire(
          [
            [0.15 * side, headY - 0.26, 0],
            [0.06 * side, 0.52, 0],
            [0.02 * side, 0.44, 0],
          ],
          0.022,
          frame,
          8,
          5,
        ),
      ),
      block([0.2, 0.03, 0.04], frame, { at: [0, headY - 0.32, 0] }),
      faceted(0.035, 0.4, 8, "#202024", { at: [0, 0.24, 0] }),
      taper([0.04, 0.04], 0.03, frame, { at: [0, 0.03, 0] }, 8),
      blob([0.11, 0.11, 0.11], "#d4e93a", { at: ballCentre }, [12, 8]),
      wire(tennisSeam(0.112, ballCentre), 0.008, "#f7f7ef", 32, 3, true),
    ],
  };
};

/** A ribbon strip, double-sided, following a path with a notched end. */
const ribbonStrip = (
  path: (t: number) => Vector3,
  across: Vector3,
  segments: number,
  colour: string,
): ModelPart => {
  const positions: number[] = [];
  const indices: number[] = [];
  const notch = 0.04;
  for (const face of [0, 1]) {
    const base = positions.length / 3;
    for (let step = 0; step <= segments; step++) {
      const t = step / segments;
      for (const row of [-1, 0, 1]) {
        const inset =
          row === 0 ? (step === 0 ? notch : step === segments ? -notch : 0) : 0;
        const point = path(t + inset).addScaledVector(across, row * 0.5);
        positions.push(point.x, point.y, point.z);
      }
    }
    for (let step = 0; step < segments; step++) {
      for (const row of [0, 1]) {
        const a = base + step * 3 + row;
        const b = a + 1;
        const c = a + 3;
        const d = c + 1;
        if (face === 0) {
          indices.push(a, c, b, b, c, d);
        } else {
          indices.push(a, b, c, b, d, c);
        }
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  return shaped(geometry, colour);
};

const ribbon = (): LabItemParts => ({
  body: [
    ribbonStrip(
      (t) =>
        new Vector3(
          -0.6 + 1.2 * t,
          0.1 + 0.18 * Math.sin(t * Math.PI) + 0.05 * Math.sin(t * tau * 2),
          0.22 * Math.sin(t * tau * 1.25),
        ),
      new Vector3(0, 0.2, -0.08),
      56,
      "#d81f3a",
    ),
  ],
});

/**
 * Drapes a point of a flat disc over a branch running along x: `along` is
 * the distance across the disc from the crest of the branch, `out` the
 * height off the disc's back. The front droops further in the middle, as
 * if melting.
 */
const drape = (
  x: number,
  along: number,
  out: number,
  [cy, radius, width]: readonly [number, number, number],
): Vector3 => {
  const melt =
    along > 0 ? along * (1 + 0.45 * Math.max(0, 1 - (x / width) ** 2)) : along;
  const bend = radius + out;
  const reach = (radius * Math.PI) / 2;
  if (Math.abs(melt) <= reach) {
    const angle = melt / radius;
    return new Vector3(x, cy + bend * Math.cos(angle), bend * Math.sin(angle));
  }
  return new Vector3(x, cy - (Math.abs(melt) - reach), Math.sign(melt) * bend);
};

const meltingClock = (): LabItemParts => {
  const branch: [number, number, number] = [0.62, 0.06, 0.3];
  const centre = 0.17;
  const face = 0.28;
  const draped = (
    radius: number,
    out: number,
    colour: string,
    flip: boolean,
  ): ModelPart => {
    const geometry = new RingGeometry(0.001, radius, 22, 7);
    const position = geometry.getAttribute("position");
    for (let index = 0; index < position.count; index++) {
      const x = position.getX(index) * (flip ? -1 : 1);
      const point = drape(x, centre - position.getY(index), out, branch);
      position.setXYZ(index, point.x, point.y, point.z);
    }
    return shaped(geometry, colour, {}, true);
  };
  const onFace = (x: number, y: number, out = 0.012): Triple => {
    const point = drape(x, centre - y, out, branch);
    return [point.x, point.y, point.z];
  };
  const ticks = Array.from({ length: 12 }, (_, index) => {
    const angle = (index / 12) * tau;
    return blob(
      [0.014, 0.014, 0.014],
      "#2a2a2a",
      {
        at: onFace(0.23 * Math.sin(angle), 0.23 * Math.cos(angle)),
      },
      [5, 3],
    );
  });
  const hand = (angle: number, length: number): ModelPart =>
    wire(
      Array.from({ length: 4 }, (_, index) =>
        onFace(
          Math.sin(angle) * length * (index / 3),
          Math.cos(angle) * length * (index / 3),
          0.014,
        ),
      ),
      0.008,
      "#2a2a2a",
      8,
      3,
    );
  return {
    body: [
      block([0.9, 0.12, 0.5], "#c9a46b", { at: [-0.1, 0.06, -0.05] }),
      between([-0.42, 0.1, -0.05], [-0.4, 0.66, 0], [0.07, 0.05], "#6b4a2f", 8),
      wire(
        [
          [-0.42, 0.6, 0],
          [-0.2, 0.63, 0],
          [0.1, 0.62, 0],
          [0.38, 0.6, 0],
          [0.5, 0.64, 0.02],
        ],
        0.045,
        "#6b4a2f",
        14,
        6,
      ),
      between(
        [-0.15, 0.62, 0],
        [-0.1, 0.78, -0.06],
        [0.025, 0.012],
        "#6b4a2f",
        5,
      ),
      draped(face, 0.012, "#eae3c9", false),
      draped(face + 0.025, 0.002, "#d9a93a", true),
      ...ticks,
      hand(0, 0.12),
      hand(1.2, 0.18),
      blob([0.02, 0.02, 0.02], "#2a2a2a", { at: onFace(0, 0, 0.016) }, [5, 3]),
      blob(
        [0.03, 0.03, 0.03],
        "#d9a93a",
        { at: onFace(0, face + 0.04, 0.0) },
        [6, 4],
      ),
    ],
  };
};

const monaLisa = (): LabItemParts => {
  const frame = "#6b4e1e";
  const gilt = "#c9a24a";
  const skin = "#d4ac6e";
  const hair = "#2f2214";
  const dress = "#2a261b";
  const sleeve = "#6a5126";
  const z = 0.012;
  return {
    body: placed(
      [
        block([0.58, 0.8, 0.01], "#6f7c5a", {}),
        block([0.58, 0.3, 0.006], "#a3a986", { at: [0, 0.25, 0.006] }),
        blob(
          [0.13, 0.05, 0.004],
          "#7b8a6a",
          { at: [-0.2, 0.12, 0.009] },
          [8, 4],
        ),
        blob(
          [0.13, 0.05, 0.004],
          "#7b8a6a",
          { at: [0.2, 0.16, 0.009] },
          [8, 4],
        ),
        wire(
          [
            [-0.27, 0.04, 0.01],
            [-0.2, -0.02, 0.01],
            [-0.24, -0.08, 0.01],
          ],
          0.008,
          "#9a7c4a",
          6,
          3,
        ),
        blob([0.27, 0.22, 0.012], dress, { at: [0, -0.3, z] }, [12, 6]),
        blob([0.07, 0.09, 0.01], skin, { at: [0, -0.1, z + 0.006] }, [8, 5]),
        blob([0.12, 0.17, 0.012], hair, { at: [0, 0.12, z] }, [10, 6]),
        blob([0.08, 0.105, 0.016], skin, { at: [0, 0.13, z + 0.008] }, [10, 6]),
        blob([0.1, 0.05, 0.014], hair, { at: [0, 0.23, z + 0.006] }, [8, 5]),
        ...mirrored((side) => [
          blob(
            [0.012, 0.007, 0.006],
            hair,
            { at: [0.03 * side, 0.15, z + 0.022] },
            [5, 3],
          ),
          blob(
            [0.11, 0.05, 0.01],
            sleeve,
            {
              at: [0.1 * side, -0.33, z + 0.01],
              turn: [0, 0, -0.25 * side],
            },
            [8, 5],
          ),
        ]),
        wire(
          [
            [-0.025, 0.09, z + 0.022],
            [0, 0.085, z + 0.024],
            [0.025, 0.093, z + 0.022],
          ],
          0.004,
          "#8a5a3a",
          6,
          3,
        ),
        // Her folded hands, one resting on the other.
        blob(
          [0.07, 0.035, 0.012],
          skin,
          { at: [-0.02, -0.33, z + 0.02], turn: [0, 0, 0.2] },
          [8, 5],
        ),
        blob(
          [0.07, 0.035, 0.012],
          "#dcb67c",
          { at: [0.03, -0.35, z + 0.026], turn: [0, 0, -0.15] },
          [8, 5],
        ),
        ...[
          [0, 0.44, 0.78, 0.1],
          [0, -0.44, 0.78, 0.1],
          [0.34, 0, 0.1, 0.98],
          [-0.34, 0, 0.1, 0.98],
        ].map(([x, y, width, height]) =>
          block([width, height, 0.07], frame, { at: [x, y, 0.01] }),
        ),
        ...[
          [0, 0.4, 0.6, 0.02],
          [0, -0.4, 0.6, 0.02],
          [0.3, 0, 0.02, 0.82],
          [-0.3, 0, 0.02, 0.82],
        ].map(([x, y, width, height]) =>
          block([width, height, 0.03], gilt, { at: [x, y, 0.03] }),
        ),
      ],
      [-0.12, 0, 0],
      [0, 0.49, 0],
    ),
  };
};

const swordInStone = (): LabItemParts => {
  const rock = "#8a8d90";
  const moss = "#6a8a3a";
  return {
    body: [
      { ...blob([0.48, 0.3, 0.4], rock, { at: [0, 0.26, 0] }), roughen: 0.25 },
      {
        ...blob(
          [0.22, 0.16, 0.2],
          "#7c7f82",
          { at: [0.36, 0.12, 0.12] },
          [10, 7],
        ),
        roughen: 0.3,
      },
      ...[
        [-0.25, 0.42, 0.22],
        [0.2, 0.5, 0.1],
        [-0.38, 0.2, 0.25],
      ].map(([x, y, zz]) =>
        blob(
          [0.1, 0.03, 0.08],
          moss,
          { at: [x, y, zz], turn: [0.5, 0, 0] },
          [8, 4],
        ),
      ),
      block([0.09, 0.6, 0.022], "#d5dde4", { at: [0, 0.78, 0.02] }),
      block([0.02, 0.5, 0.026], "#a9b3bc", { at: [0, 0.8, 0.02] }),
      block([0.36, 0.05, 0.06], gold, { at: [0, 1.1, 0.02] }),
      ...mirrored((side) =>
        blob(
          [0.035, 0.035, 0.035],
          gold,
          { at: [0.19 * side, 1.1, 0.02] },
          [8, 5],
        ),
      ),
      taper([0.026, 0.026], 0.2, "#6b3e22", { at: [0, 1.23, 0.02] }, 8),
      ...[1.17, 1.23, 1.29].map((y) =>
        taper([0.029, 0.029], 0.012, "#4d2b16", { at: [0, y, 0.02] }, 8),
      ),
      blob([0.045, 0.045, 0.045], gold, { at: [0, 1.36, 0.02] }, [8, 6]),
    ],
  };
};

export const artSchoolPlayBuilders = {
  blueprint,
  book,
  "braille-page": braillePage,
  brayer,
  "charcoal-stick": charcoalStick,
  clay,
  "clay-boat": clayBoat,
  "clay-pot": clayPot,
  comic,
  easel,
  mosaic,
  "paint-palette": paintPalette,
  paintbrush,
  paper,
  pen,
  pencil,
  "pencil-case": pencilCase,
  "pencil-pot": pencilPot,
  "pencil-sharpener": pencilSharpener,
  "printing-block": printingBlock,
  "printing-press": printingPress,
  sketchbook,
  "watercolour-paint-box": watercolourPaintBox,
  folder,
  calendar,
  atlas,
  map,
  "school-bag": schoolBag,
  "tote-bag": toteBag,
  purse,
  ball,
  football,
  dice,
  drum,
  guitar,
  piano,
  "hand-puppet": handPuppet,
  puppet: sockPuppet,
  "teddy-bear": teddyBear,
  rattle,
  monster,
  marble,
  crown,
  star,
  "play-dough": playDough,
  "tennis-racket": tennisRacket,
  ribbon,
  "melting-clock": meltingClock,
  "mona-lisa": monaLisa,
  "sword-in-stone": swordInStone,
} satisfies Record<string, () => LabItemParts>;
