import {
  CatmullRomCurve3,
  CylinderGeometry,
  Euler,
  ExtrudeGeometry,
  Matrix4,
  Path,
  PlaneGeometry,
  Quaternion,
  Shape,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";
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

const quarter = Math.PI / 2;

const steel = "#c3c9d0";
const darkSteel = "#7f8892";
const copper = "#d4843c";
const brass = "#d1a542";
const wireRed = "#d8352c";
const wireBlack = "#26262a";
const blackPlastic = "#2a2b2f";
const pcbGreen = "#2f7d4c";
const chipBlack = "#1d1e22";
const wood = "#ddb67f";
const darkWood = "#b9874f";
const camRed = "#df4a3a";

type Point = readonly [number, number];

interface Placement {
  at?: Triple;
  turn?: Triple;
  size?: Triple;
}

/** A flat outline given depth along z and centred on z = 0: gears, cams, frames. */
const slab = (
  outline: readonly Point[],
  depth: number,
  colour: string,
  { at, turn, size }: Placement = {},
  holes: readonly (readonly Point[])[] = [],
): ModelPart => {
  const shape = new Shape(outline.map(([x, y]) => new Vector2(x, y)));
  for (const hole of holes) {
    shape.holes.push(new Path(hole.map(([x, y]) => new Vector2(x, y))));
  }
  const geometry = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geometry.translate(0, 0, -depth / 2);
  return { geometry, colour, position: at, rotation: turn, scale: size };
};

/** A crisp-edged cylinder standing along y, for discs, cans and caps. */
const drum = (
  radius: number,
  length: number,
  colour: string,
  { at, turn, size }: Placement = {},
  sides = 16,
): ModelPart => ({
  geometry: new CylinderGeometry(radius, radius, length, sides, 1),
  colour,
  position: at,
  rotation: turn,
  scale: size,
});

/** A disc facing the camera, along z. */
const disc = (
  radius: number,
  thickness: number,
  colour: string,
  at: Triple,
  sides = 16,
): ModelPart =>
  drum(radius, thickness, colour, { at, turn: [quarter, 0, 0] }, sides);

/** A low-detail ring, cheaper than the shared one, for loops and bands. */
const hoop = (
  radius: number,
  thickness: number,
  colour: string,
  { at, turn, size }: Placement = {},
  arc = Math.PI * 2,
  segments = 14,
): ModelPart => ({
  geometry: new TorusGeometry(radius, thickness, 5, segments, arc),
  colour,
  position: at,
  rotation: turn,
  scale: size,
  isSmooth: true,
});

/** A wire, cord or rope bent through the given points. */
const tube = (
  points: readonly Triple[],
  radius: number,
  colour: string,
  segments = 16,
  sides = 6,
  closed = false,
): ModelPart => ({
  geometry: new TubeGeometry(
    new CatmullRomCurve3(
      points.map((point) => new Vector3(...point)),
      closed,
      "centripetal",
    ),
    segments,
    radius,
    sides,
    closed,
  ),
  colour,
  isSmooth: true,
});

/** A wire with its two ends rounded off, so it never shows a hollow end. */
const cappedTube = (
  points: readonly Triple[],
  radius: number,
  colour: string,
  segments = 16,
  sides = 6,
): ModelPart[] => {
  const first = points[0] ?? [0, 0, 0];
  const last = points[points.length - 1] ?? first;
  return [
    tube(points, radius, colour, segments, sides),
    blob([radius, radius, radius], colour, { at: first }, [6, 4]),
    blob([radius, radius, radius], colour, { at: last }, [6, 4]),
  ];
};

const partMatrix = ({ position, rotation, scale }: ModelPart): Matrix4 =>
  new Matrix4().compose(
    new Vector3(...(position ?? [0, 0, 0])),
    new Quaternion().setFromEuler(new Euler(...(rotation ?? [0, 0, 0]))),
    typeof scale === "number"
      ? new Vector3(scale, scale, scale)
      : new Vector3(...(scale ?? [1, 1, 1])),
  );

/** Moves and turns a group of parts as one, such as tilting a board to face the camera. */
const placed = (
  parts: readonly ModelPart[],
  at: Triple,
  turn: Triple = [0, 0, 0],
): ModelPart[] => {
  const group = new Matrix4().compose(
    new Vector3(...at),
    new Quaternion().setFromEuler(new Euler(...turn)),
    new Vector3(1, 1, 1),
  );
  return parts.map((part) => ({
    geometry: part.geometry.applyMatrix4(
      group.clone().multiply(partMatrix(part)),
    ),
    colour: part.colour,
    isSmooth: part.isSmooth,
  }));
};

const circlePoints = (
  centre: Point,
  radius: number,
  count: number,
  start = 0,
  arc = Math.PI * 2,
  stretch: Point = [1, 1],
): Point[] =>
  Array.from({ length: count }, (_, index) => {
    const angle =
      start + (arc * index) / (arc >= Math.PI * 2 ? count : count - 1);
    return [
      centre[0] + Math.cos(angle) * radius * stretch[0],
      centre[1] + Math.sin(angle) * radius * stretch[1],
    ] as const;
  });

/** The convex outline around a set of points, for a pear cam's smooth sides. */
const hull = (points: readonly Point[]): Point[] => {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Point, a: Point, b: Point) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: readonly Point[]) => {
    const kept: Point[] = [];
    for (const point of list) {
      while (
        kept.length >= 2 &&
        cross(
          kept[kept.length - 2] ?? point,
          kept[kept.length - 1] ?? point,
          point,
        ) <= 0
      ) {
        kept.pop();
      }
      kept.push(point);
    }
    kept.pop();
    return kept;
  };
  return [...half(sorted), ...half([...sorted].reverse())];
};

const roundedRect = (width: number, height: number, radius: number): Point[] =>
  (
    [
      [width / 2 - radius, height / 2 - radius, 0],
      [-width / 2 + radius, height / 2 - radius, quarter],
      [-width / 2 + radius, -height / 2 + radius, quarter * 2],
      [width / 2 - radius, -height / 2 + radius, quarter * 3],
    ] as const
  ).flatMap(([x, y, start]) => circlePoints([x, y], radius, 4, start, quarter));

/** A steady pseudo-random number from a position, so welded seams move together. */
const wobble = (x: number, y: number, z: number): number => {
  const value = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return value - Math.floor(value);
};

// ---------------------------------------------------------------- mechanisms

/**
 * A D&T cam toy: the cam on its axle at the front of a frame, and the
 * follower rod resting on top of it, rising through a guide in the top board.
 */
const camToy = (cam: ModelPart, contact: number): LabItemParts => {
  const axleY = 0.55;
  const footY = axleY + contact;
  const frame = "#e8cf9f";
  return {
    body: [
      block([1.1, 0.08, 0.55], frame, { at: [0, 0.04, -0.05] }),
      block([1.1, 1.3, 0.06], frame, { at: [0, 0.69, -0.3] }),
      block([1.1, 0.07, 0.55], frame, { at: [0, 1.31, -0.05] }),
      { ...cam, position: [0, axleY, 0] },
      drum(
        0.035,
        0.62,
        steel,
        { at: [0, axleY, -0.02], turn: [quarter, 0, 0] },
        10,
      ),
      // The crank handle that turns the axle.
      block([0.26, 0.06, 0.04], darkWood, { at: [0.1, axleY, 0.3] }),
      drum(
        0.03,
        0.14,
        wireRed,
        { at: [0.21, axleY, 0.38], turn: [quarter, 0, 0] },
        8,
      ),
      drum(0.09, 0.025, "#f4efe4", { at: [0, footY + 0.0125, 0] }, 14),
      drum(
        0.03,
        1.55 - footY,
        "#f4efe4",
        { at: [0, (footY + 1.55) / 2, 0] },
        8,
      ),
      drum(0.1, 0.03, "#f4efe4", { at: [0, 1.565, 0] }, 14),
    ],
  };
};

const eccentricCam = (): LabItemParts => {
  // The axle sits off the disc's centre, so the disc swings as it turns.
  const centre: Point = [0.09, -0.1];
  const radius = 0.3;
  return camToy(
    slab(circlePoints(centre, radius, 26), 0.1, camRed),
    centre[1] + Math.sqrt(radius ** 2 - centre[0] ** 2),
  );
};

const ovalCam = (): LabItemParts =>
  camToy(
    slab(
      circlePoints([0, 0], 1, 28, 0, Math.PI * 2, [0.36, 0.22]),
      0.1,
      camRed,
    ),
    0.22,
  );

const pearCam = (): LabItemParts => {
  const nose = -0.85;
  return camToy(
    slab(
      hull([
        ...circlePoints([0, 0], 0.24, 24),
        ...circlePoints([Math.cos(nose) * 0.3, Math.sin(nose) * 0.3], 0.07, 10),
      ]),
      0.1,
      camRed,
    ),
    0.24,
  );
};

const gear = (): LabItemParts => {
  const teeth = 12;
  const pitch = (Math.PI * 2) / teeth;
  const outline: Point[] = Array.from({ length: teeth }).flatMap(
    (_, index): Point[] =>
      [
        [0.4, -0.3],
        [0.5, -0.17],
        [0.5, 0.17],
        [0.4, 0.3],
      ].map(([radius = 0, offset = 0]) => {
        const angle = index * pitch + offset * pitch;
        return [Math.cos(angle) * radius, Math.sin(angle) * radius] as const;
      }),
  );
  const holes = [0, 1, 2, 3].map((index) =>
    circlePoints(
      [
        Math.cos(index * quarter + quarter / 2) * 0.25,
        Math.sin(index * quarter + quarter / 2) * 0.25,
      ],
      0.065,
      10,
    ),
  );
  const yellow = "#f3b324";
  return {
    body: [
      slab(outline, 0.16, yellow, { at: [0, 0.5, 0] }, holes),
      disc(0.15, 0.24, "#e09c17", [0, 0.5, 0], 16),
      disc(0.05, 0.5, steel, [0, 0.5, 0], 10),
    ],
  };
};

const lever = (): LabItemParts => {
  const pivotX = -0.3;
  return {
    body: [
      slab(
        [
          [-0.17, 0],
          [0.17, 0],
          [0, 0.3],
        ],
        0.36,
        "#d64f3f",
        { at: [pivotX, 0, 0] },
      ),
      block([1.7, 0.06, 0.28], wood, { at: [0, 0.33, 0] }),
      ...[-0.06, 0.06].map((z) =>
        block([1.66, 0.004, 0.01], darkWood, { at: [0.02, 0.362, z] }),
      ),
      block([0.32, 0.3, 0.3], "#4f86d6", { at: [-0.66, 0.51, 0] }),
      block([0.34, 0.05, 0.32], "#3c6fbd", { at: [-0.66, 0.66, 0] }),
    ],
  };
};

const pulley = (): LabItemParts => {
  const wheelY = 0.95;
  const groove = 0.335;
  const ropeColour = "#d8b878";
  const arc = Array.from({ length: 9 }, (_, index): Triple => {
    const angle = Math.PI - (index * Math.PI) / 8;
    return [Math.cos(angle) * groove, wheelY + Math.sin(angle) * groove, 0];
  });
  return {
    body: [
      turned(
        [
          [0.06, -0.1],
          [0.38, -0.1],
          [0.42, -0.08],
          [0.35, -0.03],
          [0.33, 0],
          [0.35, 0.03],
          [0.42, 0.08],
          [0.38, 0.1],
          [0.06, 0.1],
        ],
        "#3f7fd0",
        { at: [0, wheelY, 0], turn: [quarter, 0, 0] },
        20,
      ),
      disc(0.07, 0.34, steel, [0, wheelY, 0], 10),
      ...[-0.15, 0.15].map((z) =>
        block([0.13, 0.62, 0.03], darkSteel, { at: [0, wheelY + 0.25, z] }),
      ),
      block([0.13, 0.05, 0.33], darkSteel, { at: [0, wheelY + 0.58, 0] }),
      drum(0.025, 0.14, darkSteel, { at: [0, wheelY + 0.66, 0] }, 8),
      hoop(0.09, 0.025, darkSteel, { at: [0, wheelY + 0.8, 0] }),
      tube(
        [
          [-groove, 0.12, 0],
          [-groove, wheelY - 0.2, 0],
          ...arc,
          [groove, wheelY - 0.2, 0],
          [groove, 0.42, 0],
        ],
        0.028,
        ropeColour,
        40,
        6,
      ),
      blob([0.05, 0.05, 0.05], ropeColour, { at: [-groove, 0.1, 0] }, [6, 4]),
      // The load tied to the rope.
      block([0.26, 0.24, 0.24], "#8c6a46", { at: [groove, 0.28, 0] }),
      hoop(0.04, 0.012, darkSteel, { at: [groove, 0.43, 0] }),
    ],
  };
};

const balanceScale = (): LabItemParts => {
  const beamY = 1.0;
  const panY = 0.42;
  return {
    body: [
      turned(
        [
          [0, 0],
          [0.32, 0],
          [0.33, 0.04],
          [0.28, 0.08],
          [0.06, 0.1],
          [0, 0.1],
        ],
        "#5b3b26",
      ),
      drum(0.035, 0.92, brass, { at: [0, 0.54, 0] }, 10),
      block([1.4, 0.05, 0.06], brass, { at: [0, beamY, 0] }),
      blob([0.07, 0.07, 0.05], brass, { at: [0, beamY, 0] }, [10, 7]),
      // The pointer hangs straight down when the arms are level.
      spike(0.025, 0.28, brass, {
        at: [0, beamY - 0.16, 0.04],
        turn: [Math.PI, 0, 0],
      }),
      ...mirrored((side) => [
        blob(
          [0.03, 0.03, 0.03],
          brass,
          { at: [0.68 * side, beamY, 0] },
          [6, 4],
        ),
        ...[0, 1, 2].map((index) => {
          const angle = (index * Math.PI * 2) / 3 + 0.4;
          return tube(
            [
              [0.68 * side, beamY, 0],
              [
                0.68 * side + Math.cos(angle) * 0.2,
                panY + 0.04,
                Math.sin(angle) * 0.2,
              ],
            ],
            0.006,
            "#8a8f96",
            1,
            4,
          );
        }),
        turned(
          [
            [0, 0],
            [0.12, 0],
            [0.2, 0.04],
            [0.23, 0.07],
            [0.21, 0.07],
            [0, 0.03],
          ],
          brass,
          { at: [0.68 * side, panY - 0.03, 0] },
        ),
      ]),
    ],
  };
};

// -------------------------------------------------------------- components

const battery = (length: number, flip: 1 | -1, at: Triple): ModelPart[] => [
  drum(0.12, length, "#2b55a6", { at, turn: [0, 0, quarter] }, 14),
  drum(
    0.12,
    length * 0.2,
    steel,
    {
      at: [at[0] - flip * length * 0.42, at[1], at[2]],
      turn: [0, 0, quarter],
    },
    14,
  ),
  drum(
    0.045,
    0.06,
    steel,
    {
      at: [at[0] + flip * (length / 2 + 0.02), at[1], at[2]],
      turn: [0, 0, quarter],
    },
    8,
  ),
];

const batteryPack = (): LabItemParts => {
  const holder = "#26272b";
  const tray: ModelPart[] = [
    block([1.0, 0.04, 0.6], holder, { at: [0, 0.02, 0] }),
    ...mirrored((side) => [
      block([1.0, 0.16, 0.04], holder, { at: [0, 0.08, 0.28 * side] }),
      block([0.04, 0.16, 0.6], holder, { at: [0.48 * side, 0.08, 0] }),
      drum(
        0.06,
        0.02,
        steel,
        { at: [0.45 * side, 0.15, 0.13 * side], turn: [0, 0, quarter] },
        8,
      ),
    ]),
    ...battery(0.82, 1, [0, 0.15, 0.13]),
    ...battery(0.82, -1, [0, 0.15, -0.13]),
    ...cappedTube(
      [
        [-0.5, 0.1, 0.08],
        [-0.66, 0.1, 0.12],
        [-0.8, 0.05, 0.28],
        [-0.92, 0.04, 0.42],
      ],
      0.022,
      wireRed,
      14,
      6,
    ),
    ...cappedTube(
      [
        [-0.5, 0.1, -0.02],
        [-0.7, 0.08, 0.0],
        [-0.86, 0.04, 0.12],
        [-0.98, 0.03, 0.22],
      ],
      0.022,
      wireBlack,
      14,
      6,
    ),
  ];
  return { body: placed(tray, [0, 0, 0], [0.85, 0, 0]) };
};

const buzzer = (): LabItemParts => ({
  body: [
    ...placed(
      [
        turned(
          [
            [0, 0],
            [0.32, 0],
            [0.33, 0.02],
            [0.33, 0.27],
            [0.3, 0.31],
            [0.07, 0.32],
            [0.06, 0.28],
            [0, 0.28],
          ],
          "#232428",
          {},
          20,
        ),
        // The little sound hole in the middle of the top.
        drum(0.06, 0.005, "#0b0b0d", { at: [0, 0.282, 0] }, 12),
      ],
      [0, 0.12, 0],
      [0.45, 0, 0],
    ),
    ...cappedTube(
      [
        [-0.12, 0.14, 0.18],
        [-0.2, 0.05, 0.4],
        [-0.32, 0.03, 0.62],
      ],
      0.022,
      wireRed,
      10,
      6,
    ),
    ...cappedTube(
      [
        [0.12, 0.14, 0.18],
        [0.2, 0.05, 0.4],
        [0.3, 0.03, 0.62],
      ],
      0.022,
      wireBlack,
      10,
      6,
    ),
  ],
});

const chip = (
  width: number,
  depth: number,
  at: Triple,
  legsPerSide: number,
  allSides = false,
): ModelPart[] => {
  const legs = (length: number, count: number) =>
    Array.from(
      { length: count },
      (_, index) => (index - (count - 1) / 2) * (length / count),
    );
  return [
    block([width, 0.05, depth], chipBlack, { at }),
    blob(
      [0.02, 0.006, 0.02],
      "#3a3b40",
      {
        at: [at[0] - width * 0.35, at[1] + 0.026, at[2] - depth * 0.3],
      },
      [6, 3],
    ),
    ...[-1, 1].flatMap((side) =>
      legs(width, legsPerSide).map((x) =>
        block([0.025, 0.02, 0.05], steel, {
          at: [at[0] + x, at[1] - 0.015, at[2] + side * (depth / 2 + 0.02)],
        }),
      ),
    ),
    ...(allSides
      ? [-1, 1].flatMap((side) =>
          legs(depth, legsPerSide).map((z) =>
            block([0.05, 0.02, 0.025], steel, {
              at: [at[0] + side * (width / 2 + 0.02), at[1] - 0.015, at[2] + z],
            }),
          ),
        )
      : []),
  ];
};

const circuitBoard = (): LabItemParts => {
  const top = 0.045;
  const track = (from: Point, to: Point): ModelPart => {
    const dx = to[0] - from[0];
    const dz = to[1] - from[1];
    return block([Math.hypot(dx, dz) + 0.02, 0.006, 0.02], copper, {
      at: [(from[0] + to[0]) / 2, top, (from[1] + to[1]) / 2],
      turn: [0, -Math.atan2(dz, dx), 0],
    });
  };
  const pad = (x: number, z: number) =>
    drum(0.03, 0.01, "#e2c26a", { at: [x, top, z] }, 8);
  const board: ModelPart[] = [
    block([1.2, 0.05, 0.85], pcbGreen, { at: [0, 0.02, 0] }),
    ...chip(0.34, 0.18, [-0.22, 0.09, -0.12], 6),
    ...chip(0.22, 0.14, [0.3, 0.085, 0.18], 4),
    track([-0.5, 0.3], [-0.2, 0.3]),
    track([-0.2, 0.3], [-0.2, 0.08]),
    track([-0.5, -0.3], [-0.5, 0.3]),
    track([0.0, 0.3], [0.12, 0.18]),
    track([0.3, -0.05], [0.3, -0.3]),
    track([0.3, -0.3], [0.5, -0.3]),
    track([0.12, -0.12], [0.3, -0.05]),
    track([-0.05, -0.3], [0.2, -0.3]),
    ...[
      [-0.5, 0.3],
      [-0.5, -0.3],
      [0.0, 0.3],
      [0.5, -0.3],
      [-0.05, -0.3],
      [0.2, -0.3],
      [0.12, -0.12],
    ].map(([x = 0, z = 0]) => pad(x, z)),
    // A striped resistor and a blue capacitor.
    rod(
      0.035,
      0.16,
      "#e5cfa0",
      { at: [0.1, 0.085, 0.3], turn: [0, 0, quarter] },
      8,
    ),
    ...[0.05, 0.1, 0.15].map((x, index) =>
      drum(
        0.04,
        0.018,
        ["#9a5b2a", "#1d1d1d", "#d6352b"][index] ?? wireRed,
        {
          at: [x, 0.085, 0.3],
          turn: [0, 0, quarter],
        },
        8,
      ),
    ),
    drum(0.07, 0.16, "#2c63c4", { at: [0.42, 0.12, -0.12] }, 12),
    drum(0.072, 0.01, "#c7ccd2", { at: [0.42, 0.205, -0.12] }, 12),
    ...[
      [-0.54, -0.37],
      [0.54, -0.37],
      [-0.54, 0.37],
      [0.54, 0.37],
    ].map(([x = 0, z = 0]) =>
      drum(0.035, 0.012, "#e2c26a", { at: [x, top, z] }, 10),
    ),
  ];
  return { body: placed(board, [0, 0, 0], [1.05, 0, 0]) };
};

const microcontroller = (): LabItemParts => {
  const top = 0.045;
  const board: ModelPart[] = [
    block([1.1, 0.05, 0.75], "#1f4f9a", { at: [0, 0.02, 0] }),
    ...chip(0.26, 0.26, [0.0, 0.08, 0.0], 5, true),
    // The USB socket on its top edge.
    block([0.2, 0.08, 0.14], steel, { at: [-0.3, 0.085, -0.33] }),
    block([0.14, 0.03, 0.02], "#2a2b2f", { at: [-0.3, 0.085, -0.4] }),
    // A row of header pins along the bottom edge.
    block([0.9, 0.08, 0.08], chipBlack, { at: [0, 0.085, 0.3] }),
    ...Array.from({ length: 10 }, (_, index) =>
      block([0.03, 0.12, 0.03], brass, {
        at: [-0.405 + index * 0.09, 0.15, 0.3],
      }),
    ),
    // A reset button, a crystal and a tiny status light.
    block([0.1, 0.04, 0.1], "#cfd3d8", { at: [0.38, 0.06, -0.22] }),
    drum(0.03, 0.03, chipBlack, { at: [0.38, 0.09, -0.22] }, 10),
    blob([0.07, 0.03, 0.035], steel, { at: [0.3, 0.06, 0.05] }, [10, 5]),
    block([0.05, 0.03, 0.03], "#e8e2d0", { at: [-0.4, 0.06, 0.05] }),
    ...[
      [-0.5, -0.32],
      [0.5, -0.32],
    ].map(([x = 0, z = 0]) =>
      drum(0.04, 0.012, "#e2c26a", { at: [x, top, z] }, 10),
    ),
  ];
  return { body: placed(board, [0, 0, 0], [1.05, 0, 0]) };
};

const led = (): LabItemParts => ({
  body: [
    drum(0.012, 0.62, steel, { at: [0.05, 0.31, 0] }, 6),
    drum(0.012, 0.5, steel, { at: [-0.05, 0.37, 0] }, 6),
    // The anvil and post that can be seen through the dome.
    block([0.06, 0.12, 0.03], "#9da4ac", { at: [-0.04, 0.7, 0] }),
    block([0.02, 0.1, 0.02], "#9da4ac", { at: [0.045, 0.69, 0] }),
  ],
  glass: [
    turned(
      [
        [0, 0.6],
        [0.17, 0.6],
        [0.17, 0.64],
        [0.14, 0.64],
        [0.14, 0.88],
        [0.12, 0.96],
        [0.07, 1.01],
        [0, 1.025],
      ],
      "#d8363a",
      {},
      18,
    ),
  ],
});

const lightSensor = (): LabItemParts => {
  const faceY = 0.82;
  const rows = 5;
  // The wavy track of light-sensitive material that zigzags across its face.
  const track = Array.from({ length: rows * 2 }, (_, index): Triple => {
    const row = Math.floor(index / 2);
    const right = (index + row) % 2 === 0;
    return [right ? 0.14 : -0.14, faceY + 0.13 - row * 0.065, 0.045];
  });
  return {
    body: [
      disc(0.22, 0.07, "#efe7d6", [0, faceY, 0], 20),
      ...cappedTube(track, 0.014, "#c4532c", 40, 4),
      ...[-0.07, 0.07].map((x) =>
        drum(0.012, 0.7, steel, { at: [x, faceY - 0.48, -0.01] }, 6),
      ),
    ],
    glass: [
      blob([0.21, 0.21, 0.02], "#fff6e0", { at: [0, faceY, 0.04] }, [12, 6]),
    ],
  };
};

const motionSensor = (): LabItemParts => {
  const dome: ModelPart = {
    geometry: new SphereGeometry(1, 8, 4, 0, Math.PI * 2, 0, quarter),
    colour: "#f6f6f2",
    position: [0, 0, 0.06],
    rotation: [quarter, 0, 0],
    scale: [0.21, 0.19, 0.21],
  };
  const sensor: ModelPart[] = [
    block([0.62, 0.62, 0.04], pcbGreen, {}),
    block([0.48, 0.48, 0.08], "#f1f1ec", { at: [0, 0, 0.04] }),
    dome,
    ...[-0.12, 0.12].map((x) =>
      block([0.09, 0.09, 0.06], "#f08a24", { at: [x, -0.24, -0.05] }),
    ),
    ...[-0.1, 0, 0.1].map((x) =>
      drum(0.014, 0.3, brass, { at: [x, -0.42, -0.02] }, 6),
    ),
  ];
  return { body: placed(sensor, [0, 0.57, 0], [-0.2, 0, 0]) };
};

const motor = (): LabItemParts => {
  const axleY = 0.25;
  const can = "#c7ccd2";
  return {
    body: [
      drum(
        0.25,
        0.6,
        can,
        { at: [0, axleY, 0], turn: [0, 0, quarter], size: [1, 1, 0.82] },
        20,
      ),
      drum(
        0.2,
        0.02,
        darkSteel,
        { at: [0.305, axleY, 0], turn: [0, 0, quarter], size: [1, 1, 0.82] },
        20,
      ),
      drum(
        0.07,
        0.06,
        brass,
        { at: [0.33, axleY, 0], turn: [0, 0, quarter] },
        12,
      ),
      drum(
        0.02,
        0.3,
        steel,
        { at: [0.49, axleY, 0], turn: [0, 0, quarter] },
        8,
      ),
      // The plastic back cap and its two brass terminals.
      drum(
        0.235,
        0.12,
        "#2c2c30",
        { at: [-0.35, axleY, 0], turn: [0, 0, quarter], size: [1, 1, 0.8] },
        20,
      ),
      ...mirrored((side) => [
        block([0.12, 0.04, 0.07], brass, {
          at: [-0.44, axleY + side * 0.13, 0],
        }),
        drum(
          0.018,
          0.045,
          "#3a3a3a",
          { at: [-0.47, axleY + side * 0.13, 0] },
          6,
        ),
      ]),
      ...[-0.08, 0.08].map((z) =>
        block([0.05, 0.03, 0.03], "#525860", { at: [0.31, axleY + 0.12, z] }),
      ),
    ],
  };
};

const pushSwitch = (): LabItemParts => ({
  body: [
    block([0.95, 0.08, 0.6], "#e7d3ad", { at: [0, 0.04, 0] }),
    block([0.42, 0.22, 0.42], blackPlastic, { at: [0, 0.19, 0] }),
    drum(0.17, 0.05, steel, { at: [0, 0.325, 0] }, 18),
    turned(
      [
        [0, 0.33],
        [0.13, 0.33],
        [0.13, 0.43],
        [0.1, 0.47],
        [0, 0.48],
      ],
      "#e2392f",
      {},
      18,
    ),
    ...mirrored((side) => [
      drum(0.05, 0.03, steel, { at: [0.36 * side, 0.095, 0.12] }, 10),
      block([0.06, 0.006, 0.012], "#8a9098", {
        at: [0.36 * side, 0.112, 0.12],
      }),
    ]),
    ...cappedTube(
      [
        [0.36, 0.12, 0.12],
        [0.44, 0.14, 0.26],
        [0.5, 0.1, 0.42],
      ],
      0.02,
      wireRed,
      8,
      6,
    ),
    ...cappedTube(
      [
        [-0.36, 0.12, 0.12],
        [-0.44, 0.14, 0.26],
        [-0.5, 0.1, 0.42],
      ],
      0.02,
      wireBlack,
      8,
      6,
    ),
  ],
});

const temperatureSensor = (): LabItemParts => ({
  body: [
    ...placed(
      [
        drum(0.045, 0.55, steel, { at: [0, 0.275, 0] }, 12),
        blob([0.045, 0.05, 0.045], steel, { at: [0, 0, 0] }, [10, 5]),
        drum(0.055, 0.16, wireBlack, { at: [0, 0.6, 0] }, 12),
      ],
      [0.35, 0.18, 0.1],
      [0, 0, 0.85],
    ),
    ...cappedTube(
      [
        [-0.05, 0.66, 0.1],
        [-0.25, 0.8, 0.05],
        [-0.45, 0.62, -0.05],
        [-0.35, 0.38, 0],
        [-0.12, 0.42, 0.05],
        [-0.15, 0.2, 0.08],
        [-0.42, 0.08, 0.1],
      ],
      0.025,
      wireBlack,
      40,
      6,
    ),
    block([0.16, 0.08, 0.1], blackPlastic, { at: [-0.5, 0.06, 0.1] }),
    ...[-0.03, 0, 0.03].map((z) =>
      block([0.06, 0.012, 0.012], brass, { at: [-0.6, 0.06, 0.1 + z] }),
    ),
  ],
});

const electricCable = (): LabItemParts => {
  const end: Triple = [0.1, 0.3, 0];
  const cores: [string, number, number][] = [
    ["#7a4a24", 0.05, 0.03],
    ["#2d5fb8", -0.045, 0.03],
    ["#80b23a", 0, -0.05],
  ];
  return {
    body: [
      ...cappedTube(
        [[-0.75, 0.12, -0.2], [-0.45, 0.18, -0.05], [-0.15, 0.29, 0], end],
        0.1,
        "#f08a24",
        24,
        10,
      ),
      // The cut face of the coloured coating.
      disc(0.095, 0.02, "#d27218", [end[0] + 0.005, end[1], end[2]], 12),
      ...cores.flatMap(([colour, dy, dz]): ModelPart[] => {
        const coreEnd: Triple = [
          end[0] + 0.2,
          end[1] + dy * 2.2,
          end[2] + dz * 2.2,
        ];
        return [
          tube(
            [
              [end[0] - 0.05, end[1] + dy, end[2] + dz],
              [end[0] + 0.1, end[1] + dy * 1.4, end[2] + dz * 1.4],
              coreEnd,
            ],
            0.035,
            colour,
            6,
            7,
          ),
          disc(0.034, 0.01, colour, coreEnd, 8),
          ...[-1, 0, 1].map((spread) =>
            tube(
              [
                [coreEnd[0] - 0.01, coreEnd[1] + spread * 0.012, coreEnd[2]],
                [
                  coreEnd[0] + 0.12,
                  coreEnd[1] + dy * 0.6 + spread * 0.03,
                  coreEnd[2] + dz * 0.6 + spread * 0.01,
                ],
              ],
              0.01,
              copper,
              1,
              4,
            ),
          ),
        ];
      }),
    ],
  };
};

const insulatedWire = (): LabItemParts => ({
  body: [
    tube(
      [
        [-0.55, 0.2, 0],
        [-0.4, 0.2, 0],
        [-0.1, 0.36, 0.06],
        [0.15, 0.3, 0],
        [0.4, 0.42, 0],
        [0.55, 0.42, 0],
      ],
      0.045,
      wireRed,
      30,
      8,
    ),
    // The stripped copper ends, poking out of the cut coating.
    ...[
      [-0.55, 0.2, -1],
      [0.55, 0.42, 1],
    ].flatMap(([x = 0, y = 0, side = 1]) => [
      drum(0.045, 0.02, "#b82a22", { at: [x, y, 0], turn: [0, 0, quarter] }, 8),
      rod(
        0.022,
        0.12,
        copper,
        { at: [x + side * 0.08, y, 0], turn: [0, 0, quarter] },
        6,
      ),
    ]),
  ],
});

const hookAndLoopTape = (): LabItemParts => {
  const loopColour = "#e6e0d2";
  const hookColour = "#34373e";
  const thickness = 0.03;
  const width = 0.28;
  const segment = 0.2;
  const fuzz: ModelPart[] = [0.06, 0.18, 0.3, 0.42, 0.54].flatMap((x, row) =>
    [-0.09, 0, 0.09].map((z, index) =>
      blob(
        [0.04, 0.022, 0.04],
        "#c9c0ab",
        {
          at: [x + ((row + index) % 2) * 0.04, thickness / 2, z],
        },
        [5, 3],
      ),
    ),
  );
  // The hooked strip peels back off the fuzzy one, bit by bit.
  let start: Point = [0, thickness * 1.5];
  const peeled = [0.45, 0.95, 1.45].flatMap((angle): ModelPart[] => {
    const direction: Point = [Math.cos(angle), Math.sin(angle)];
    const centre: Triple = [
      start[0] + direction[0] * (segment / 2),
      start[1] + direction[1] * (segment / 2),
      0,
    ];
    start = [
      start[0] + direction[0] * segment,
      start[1] + direction[1] * segment,
    ];
    const under: Point = [direction[1], -direction[0]];
    return [
      block([segment + 0.012, thickness, width], hookColour, {
        at: centre,
        turn: [0, 0, angle],
      }),
      ...[-0.09, 0, 0.09].flatMap((z) =>
        [-0.05, 0.05].map((along) =>
          spike(
            0.022,
            0.06,
            "#6a707b",
            {
              at: [
                centre[0] + under[0] * 0.04 + direction[0] * along,
                centre[1] + under[1] * 0.04 + direction[1] * along,
                z,
              ],
              turn: [0, 0, angle + Math.PI],
            },
            4,
          ),
        ),
      ),
    ];
  });
  return {
    body: placed(
      [
        block([1.2, thickness, width], loopColour, { at: [0, 0, 0] }),
        block([0.6, thickness, width], hookColour, {
          at: [-0.3, thickness, 0],
        }),
        ...fuzz,
        ...peeled,
      ],
      [0, 0.3, 0],
      [0.75, 0, 0],
    ),
  };
};

const steadyHandGame = (): LabItemParts => {
  const wire: Triple[] = [
    [-0.62, 0.34, 0],
    [-0.52, 0.55, 0],
    [-0.36, 0.78, 0],
    [-0.2, 0.56, 0],
    [0, 0.42, 0],
    [0.18, 0.64, 0],
    [0.34, 0.82, 0],
    [0.5, 0.56, 0],
    [0.62, 0.34, 0],
  ];
  return {
    body: [
      block([1.5, 0.12, 0.42], wood, { at: [0, 0.06, 0] }),
      ...mirrored((side) =>
        block([0.09, 0.24, 0.09], darkWood, { at: [0.62 * side, 0.22, 0] }),
      ),
      tube(wire, 0.018, "#d7a24c", 48, 5),
      // The wand: a loop around the wire on a handle, joined to the base by its lead.
      hoop(0.075, 0.012, steel, { at: [0, 0.42, 0], turn: [0, quarter, 0] }),
      drum(0.012, 0.16, steel, { at: [0, 0.57, 0] }, 6),
      rod(0.04, 0.24, "#2f6fd1", { at: [0, 0.78, 0] }, 10),
      ...cappedTube(
        [
          [0, 0.93, 0],
          [0.12, 1.02, 0.08],
          [0.42, 0.95, 0.18],
          [0.66, 0.5, 0.2],
          [0.6, 0.14, 0.16],
        ],
        0.015,
        wireBlack,
        24,
        5,
      ),
      block([0.12, 0.05, 0.08], blackPlastic, { at: [0.6, 0.14, 0.16] }),
    ],
  };
};

// -------------------------------------------------------------- tools

const benchHook = (): LabItemParts => {
  const board: ModelPart[] = [
    block([1.0, 0.05, 0.62], wood, {}),
    // The stop the wood is pushed against, and the lip that hooks over the bench.
    block([0.72, 0.1, 0.1], darkWood, { at: [-0.14, 0.075, -0.26] }),
    block([0.98, 0.1, 0.1], darkWood, { at: [0, -0.075, 0.26] }),
    ...[-0.16, 0, 0.12].map((z, index) =>
      block([0.86 - index * 0.1, 0.004, 0.008], "#b88a52", {
        at: [0.05 - index * 0.04, 0.026, z],
      }),
    ),
  ];
  return { body: placed(board, [0, 0, 0], [0.6, 0, 0]) };
};

const craftKnife = (): LabItemParts => {
  const knife: ModelPart[] = [
    rod(0.05, 0.72, "#f2c21b", { at: [-0.4, 0, 0], turn: [0, 0, quarter] }, 10),
    ...[-0.52, -0.44, -0.36, -0.28].map((x) =>
      drum(
        0.056,
        0.04,
        "#2c2c30",
        { at: [x, 0, 0], turn: [0, 0, quarter] },
        10,
      ),
    ),
    taper(
      [0.035, 0.055],
      0.12,
      steel,
      { at: [0.04, 0, 0], turn: [0, 0, quarter] },
      10,
    ),
    slab(
      [
        [0, -0.035],
        [0.08, -0.035],
        [0.3, 0.04],
        [0, 0.04],
      ],
      0.012,
      "#dfe4ea",
      { at: [0.09, 0.0, 0] },
    ),
  ];
  return { body: placed(knife, [0, 0.3, 0], [0, 0, 0.22]) };
};

const dowel = (): LabItemParts => {
  const length = 1.0;
  const stick: ModelPart[] = [
    drum(0.08, length, "#dcb27a", { at: [0, 0, 0] }, 14),
    drum(0.081, 0.004, "#c99a5b", { at: [0, -length / 2 - 0.001, 0] }, 14),
    // The splintery sawn end.
    ...[0, 1, 2, 3, 4].map((index) => {
      const angle = index * 1.3;
      return spike(
        0.03,
        0.05 + (index % 2) * 0.03,
        "#e6c290",
        {
          at: [
            Math.cos(angle) * 0.055,
            length / 2 + 0.02,
            Math.sin(angle) * 0.055,
          ],
          turn: [0.25 * Math.sin(angle), 0, -0.25 * Math.cos(angle)],
        },
        4,
      );
    }),
    blob([0.08, 0.02, 0.08], "#e0bb86", { at: [0, length / 2, 0] }, [8, 4]),
    ...[-0.2, 0.15].map((y) =>
      block([0.004, 0.22, 0.01], "#c49a64", { at: [0.02, y, 0.079] }),
    ),
  ];
  return { body: placed(stick, [0, 0.4, 0], [0, 0, -1.1]) };
};

const gClamp = (): LabItemParts => {
  const frame = "#d8452f";
  const corner = (centre: Point, radius: number, start: number): Point[] =>
    circlePoints(centre, radius, 4, start, quarter);
  return {
    body: [
      slab(
        [
          [0.32, 0.62],
          ...corner([-0.2, 0.46], 0.16, quarter),
          ...corner([-0.2, -0.46], 0.16, Math.PI),
          [0.32, -0.62],
          [0.32, -0.46],
          [-0.12, -0.46],
          [-0.2, -0.38],
          [-0.2, 0.38],
          [-0.12, 0.46],
          [0.2, 0.46],
          [0.22, 0.4],
          [0.32, 0.4],
        ],
        0.16,
        frame,
        { at: [0, 0.9, 0] },
      ),
      // The screw, its swivel pad and its sliding bar handle.
      drum(0.04, 0.9, steel, { at: [0.25, 0.42, 0] }, 10),
      ...[0.06, 0.12, 0.18, 0.62, 0.68].map((y) =>
        drum(0.046, 0.02, darkSteel, { at: [0.25, y, 0] }, 10),
      ),
      drum(0.08, 0.04, steel, { at: [0.25, 0.89, 0] }, 14),
      drum(
        0.022,
        0.42,
        steel,
        { at: [0.25, 0.02, 0], turn: [0, 0, quarter] },
        8,
      ),
      ...mirrored((side) =>
        blob(
          [0.035, 0.035, 0.035],
          steel,
          { at: [0.25 + 0.21 * side, 0.02, 0] },
          [6, 4],
        ),
      ),
    ],
  };
};

const juniorHacksaw = (): LabItemParts => {
  const teeth = 26;
  const left = -0.47;
  const right = 0.5;
  const step = (right - left) / teeth;
  const blade: Point[] = [
    [left, 0.04],
    ...Array.from({ length: teeth }).flatMap((_, index): Point[] => [
      [right - index * step, -0.03],
      [right - (index + 0.5) * step, -0.05],
    ]),
    [left, -0.03],
  ];
  return {
    body: [
      tube(
        [
          [0.5, 0.0, 0],
          [0.5, 0.24, 0],
          [0.42, 0.38, 0],
          [0.1, 0.4, 0],
          [-0.3, 0.38, 0],
          [-0.43, 0.28, 0],
          [-0.47, 0.06, 0],
          [-0.49, -0.1, 0],
        ],
        0.024,
        steel,
        36,
        6,
      ),
      blob([0.03, 0.03, 0.03], steel, { at: [0.5, 0, 0] }, [6, 4]),
      tube(
        [
          [-0.48, -0.06, 0],
          [-0.51, -0.2, 0],
          [-0.56, -0.38, 0],
        ],
        0.055,
        "#d9412f",
        8,
        8,
      ),
      blob([0.058, 0.06, 0.058], "#d9412f", { at: [-0.56, -0.38, 0] }, [8, 5]),
      slab(blade, 0.012, "#7fa2c9", { at: [0, 0, 0] }),
      ...[left + 0.02, right - 0.02].map((x) =>
        disc(0.025, 0.04, darkSteel, [x, 0.0, 0], 8),
      ),
    ],
  };
};

const scissorsModel = (handle: string, opening: number): LabItemParts => {
  const tip: Point = [0.6, 0];
  const piece = (side: 1 | -1): ModelPart[] => {
    const loopCentre: Point = [-0.36, -side * 0.1];
    return [
      slab(
        [
          [-0.1, -0.05],
          ...circlePoints(tip, 0.05, 7, -quarter, Math.PI),
          [-0.1, 0.05],
        ],
        0.025,
        "#d7dde4",
        { at: [0, 0, side * 0.014] },
      ),
      slab(
        [
          [-0.05, -0.05],
          [-0.05, 0.05],
          [-0.22, -side * 0.06 + 0.05],
          [-0.22, -side * 0.06 - 0.05],
        ],
        0.07,
        handle,
        { at: [0, 0, side * 0.035] },
      ),
      slab(
        circlePoints(loopCentre, 1, 16, 0, Math.PI * 2, [0.19, 0.13]),
        0.07,
        handle,
        { at: [0, 0, side * 0.035] },
        [circlePoints(loopCentre, 1, 12, 0, Math.PI * 2, [0.12, 0.07])],
      ),
    ];
  };
  return {
    body: [
      ...placed(piece(1), [0, 0, 0], [0, 0, opening / 2]),
      ...placed(piece(-1), [0, 0, 0], [0, 0, -opening / 2]),
      disc(0.035, 0.08, darkSteel, [0, 0, 0], 10),
    ],
  };
};

const glueBottle = (): LabItemParts => ({
  body: [
    turned(
      [
        [0, 0],
        [0.2, 0],
        [0.22, 0.03],
        [0.22, 0.55],
        [0.18, 0.66],
        [0.09, 0.72],
        [0, 0.73],
      ],
      "#f7f6f0",
    ),
    // A blank coloured label band.
    turned(
      [
        [0.222, 0.2],
        [0.226, 0.21],
        [0.226, 0.44],
        [0.222, 0.45],
      ],
      "#4a8ad8",
    ),
    turned(
      [
        [0, 0.7],
        [0.1, 0.7],
        [0.1, 0.8],
        [0.06, 0.84],
        [0.022, 0.98],
        [0, 0.99],
      ],
      "#f08a24",
      {},
      14,
    ),
    // The wet puddle of glue squeezed out beside it.
    {
      ...blob(
        [0.17, 0.045, 0.13],
        "#fbfbf6",
        { at: [0.42, 0.02, 0.1] },
        [12, 6],
      ),
      roughen: 0.18,
    },
    blob([0.06, 0.04, 0.06], "#fbfbf6", { at: [0.4, 0.05, 0.08] }, [8, 5]),
  ],
  glass: [
    blob([0.05, 0.01, 0.03], "#ffffff", { at: [0.38, 0.065, 0.14] }, [8, 4]),
  ],
});

const glueGun = (): LabItemParts => {
  const casing = "#3f7fcf";
  return {
    body: [
      slab(
        [
          [-0.5, 0.5],
          [-0.46, 0.64],
          [0.3, 0.66],
          [0.37, 0.6],
          [0.37, 0.46],
          [0.3, 0.4],
          [-0.1, 0.4],
          [-0.22, 0.0],
          [-0.47, 0.0],
          [-0.36, 0.38],
          [-0.48, 0.42],
        ],
        0.22,
        casing,
      ),
      slab(
        [
          [-0.06, 0.39],
          [0.02, 0.39],
          [-0.02, 0.2],
          [-0.1, 0.22],
        ],
        0.1,
        "#2b2c30",
      ),
      drum(
        0.06,
        0.08,
        darkSteel,
        { at: [0.41, 0.53, 0], turn: [0, 0, quarter] },
        12,
      ),
      spike(
        0.055,
        0.17,
        steel,
        { at: [0.53, 0.53, 0], turn: [0, 0, -quarter] },
        12,
      ),
      ...cappedTube(
        [
          [-0.33, 0.02, 0],
          [-0.33, -0.08, 0.08],
          [-0.15, -0.1, 0.25],
        ],
        0.022,
        wireBlack,
        8,
        5,
      ),
    ],
    glass: [
      rod(
        0.05,
        0.28,
        "#f4f2e8",
        { at: [-0.62, 0.54, 0], turn: [0, 0, quarter] },
        10,
      ),
    ],
  };
};

const sandpaper = (): LabItemParts => {
  const width = 0.8;
  const height = 1.0;
  const fold = 0.2;
  const cutLine = width / 2 + height / 2 - fold;
  const grit = new PlaneGeometry(width, height, 10, 13);
  const positions = grit.getAttribute("position");
  for (let index = 0; index < positions.count; index++) {
    let x = positions.getX(index);
    let y = positions.getY(index);
    // Folds the top right corner back along a diagonal.
    if (x + y > cutLine) {
      const over = (x + y - cutLine) / 2;
      x -= over;
      y -= over;
    }
    positions.setXYZ(index, x, y, 0.012 + wobble(x, y, 1) * 0.014);
  }
  const backing: Point[] = [
    [-width / 2, -height / 2],
    [width / 2, -height / 2],
    [width / 2, height / 2 - fold],
    [width / 2 - fold, height / 2],
    [-width / 2, height / 2],
  ];
  const sheet: ModelPart[] = [
    { geometry: grit, colour: "#a6774a" },
    slab(backing, 0.02, "#efe3c6"),
    slab(
      [
        [width / 2, height / 2 - fold],
        [width / 2 - fold, height / 2],
        [width / 2 - fold, height / 2 - fold],
      ],
      0.012,
      "#efe3c6",
      { at: [0, 0, 0.035] },
    ),
    ...[
      [-0.25, 0.3],
      [0.1, 0.15],
      [-0.1, -0.2],
      [0.24, -0.33],
      [-0.28, -0.4],
      [0.02, 0.38],
      [0.28, 0.02],
      [-0.18, 0.02],
    ].map(([x = 0, y = 0]) =>
      blob([0.018, 0.018, 0.012], "#6e4a2a", { at: [x, y, 0.025] }, [5, 3]),
    ),
  ];
  return { body: placed(sheet, [0, 0.5, 0], [-0.3, 0, 0]) };
};

const sewingMachine = (): LabItemParts => {
  const cream = "#f3efe6";
  const accent = "#e0557a";
  return {
    body: [
      block([1.5, 0.18, 0.6], cream, { at: [0, 0.09, 0] }),
      slab(
        [
          [0.35, 0.17],
          [0.66, 0.17],
          [0.66, 0.86],
          [0.58, 0.96],
          [-0.6, 0.96],
          [-0.7, 0.88],
          [-0.7, 0.48],
          [-0.42, 0.48],
          [-0.42, 0.7],
          [0.35, 0.7],
        ],
        0.34,
        cream,
        { at: [0, 0, -0.05] },
      ),
      block([1.0, 0.05, 0.01], accent, { at: [-0.04, 0.83, 0.125] }),
      // The handwheel on the right-hand side.
      drum(
        0.18,
        0.07,
        "#b9bec5",
        { at: [0.7, 0.72, -0.05], turn: [0, 0, quarter] },
        18,
      ),
      drum(
        0.06,
        0.08,
        "#8e949c",
        { at: [0.74, 0.72, -0.05], turn: [0, 0, quarter] },
        10,
      ),
      disc(0.07, 0.03, accent, [0.5, 0.45, 0.13], 14),
      // Needle and presser foot above the silver stitch plate.
      drum(0.02, 0.14, steel, { at: [-0.6, 0.42, 0.03] }, 6),
      spike(
        0.008,
        0.14,
        steel,
        { at: [-0.6, 0.29, 0.03], turn: [Math.PI, 0, 0] },
        4,
      ),
      block([0.12, 0.025, 0.12], steel, { at: [-0.54, 0.235, 0.03] }),
      block([0.28, 0.008, 0.2], steel, { at: [-0.58, 0.184, 0.03] }),
      // A reel of thread on top, threaded down to the needle.
      drum(0.012, 0.2, steel, { at: [0.25, 1.04, -0.05] }, 6),
      drum(0.08, 0.14, wireRed, { at: [0.25, 1.04, -0.05] }, 12),
      ...[0.965, 1.115].map((y) =>
        drum(0.095, 0.015, "#f5e2c0", { at: [0.25, y, -0.05] }, 12),
      ),
      tube(
        [
          [0.25, 1.06, 0.03],
          [-0.2, 1.0, 0.13],
          [-0.62, 0.92, 0.14],
          [-0.6, 0.55, 0.06],
          [-0.6, 0.32, 0.04],
        ],
        0.006,
        wireRed,
        20,
        3,
      ),
    ],
  };
};

const torch = (): LabItemParts => {
  const torchBody: ModelPart[] = [
    turned(
      [
        [0, 0],
        [0.12, 0],
        [0.135, 0.03],
        [0.135, 0.6],
        [0.16, 0.66],
        [0.22, 0.82],
        [0.23, 0.97],
        [0.2, 1.0],
        [0, 1.0],
      ],
      "#f2b81f",
      {},
      18,
    ),
    // Rubber grip rings round the handle.
    ...[0.15, 0.25, 0.35, 0.45].map((y) =>
      hoop(
        0.135,
        0.018,
        wireBlack,
        { at: [0, y, 0], turn: [quarter, 0, 0] },
        Math.PI * 2,
        16,
      ),
    ),
    drum(0.225, 0.04, wireBlack, { at: [0, 0.99, 0] }, 18),
    turned(
      [
        [0.04, 0.88],
        [0.19, 1.0],
        [0.04, 1.0],
      ],
      "#eef1f4",
      {},
      20,
    ),
    blob([0.04, 0.04, 0.04], "#c8ccd2", { at: [0, 0.97, 0] }, [6, 4]),
    block([0.07, 0.04, 0.1], blackPlastic, {
      at: [0.135, 0.6, 0],
      turn: [0, 0, -0.35],
    }),
  ];
  return {
    body: placed(torchBody, [-0.5, 0.235, 0], [0, 0, -quarter]),
    glass: placed(
      [drum(0.2, 0.02, "#e8f1ff", { at: [0, 1.0, 0] }, 18)],
      [-0.5, 0.235, 0],
      [0, 0, -quarter],
    ),
  };
};

// -------------------------------------------------------------- machines and gadgets

const printer3d = (): LabItemParts => {
  const frame = "#555b66";
  const orange = "#f08a24";
  return {
    body: [
      block([1.05, 0.14, 0.8], frame, { at: [0, 0.07, 0] }),
      block([0.75, 0.04, 0.6], "#2b3f6e", { at: [0, 0.2, 0.02] }),
      block([0.72, 0.012, 0.57], "#3b5592", { at: [0, 0.224, 0.02] }),
      ...mirrored((side) =>
        block([0.07, 1.05, 0.07], frame, { at: [0.48 * side, 0.66, -0.2] }),
      ),
      block([1.03, 0.07, 0.07], frame, { at: [0, 1.15, -0.2] }),
      // The gantry rails and the print head with its brass nozzle.
      ...[0.66, 0.76].map((y) =>
        drum(
          0.016,
          0.93,
          steel,
          { at: [0, y, -0.18], turn: [0, 0, quarter] },
          8,
        ),
      ),
      block([0.18, 0.2, 0.16], orange, { at: [0.08, 0.7, -0.1] }),
      disc(0.06, 0.02, "#1f2024", [0.08, 0.7, -0.015], 12),
      block([0.08, 0.06, 0.08], steel, { at: [0.08, 0.57, -0.1] }),
      spike(
        0.03,
        0.06,
        brass,
        { at: [0.08, 0.51, -0.1], turn: [Math.PI, 0, 0] },
        8,
      ),
      // A reel of filament on top, feeding the head.
      drum(
        0.03,
        0.18,
        frame,
        { at: [0, 1.32, -0.2], turn: [quarter, 0, 0] },
        8,
      ),
      disc(0.2, 0.14, orange, [0, 1.32, -0.2], 18),
      ...[-0.27, -0.13].map((z) => disc(0.22, 0.015, frame, [0, 1.32, z], 18)),
      tube(
        [
          [0.12, 1.3, -0.13],
          [0.24, 1.0, -0.05],
          [0.1, 0.82, -0.1],
        ],
        0.008,
        orange,
        12,
        3,
      ),
      // A little control screen and dial on the front of the base.
      block([0.22, 0.1, 0.02], "#1d2a3a", { at: [0.3, 0.07, 0.405] }),
      disc(0.035, 0.03, steel, [0.1, 0.07, 0.41], 10),
    ],
  };
};

const laserCutter = (): LabItemParts => {
  const casing = "#e6e8eb";
  // A side profile turned to run along x, so the lid slopes down to the front.
  const lidOutline: Point[] = [
    [-0.4, 0.45],
    [-0.4, 0.53],
    [0.4, 0.73],
    [0.4, 0.45],
  ];
  return {
    body: [
      block([1.2, 0.45, 0.8], casing, { at: [0, 0.225, 0] }),
      block([1.22, 0.06, 0.82], "#4a4e57", { at: [0, 0.03, 0] }),
      block([1.0, 0.02, 0.6], "#5f646d", { at: [-0.04, 0.455, 0] }),
      ...[-0.2, 0, 0.2].map((z) =>
        block([1.0, 0.004, 0.01], "#3d4048", { at: [-0.04, 0.466, z] }),
      ),
      block([1.0, 0.03, 0.04], "#3d4048", { at: [-0.04, 0.53, -0.05] }),
      block([0.08, 0.09, 0.08], "#3d4048", { at: [0.1, 0.51, -0.05] }),
      block([1.22, 0.04, 0.04], "#4a4e57", { at: [0, 0.73, -0.4] }),
      // Its control panel and buttons.
      block([0.26, 0.2, 0.02], "#30333a", { at: [0.4, 0.28, 0.405] }),
      block([0.18, 0.06, 0.01], "#1a2c40", { at: [0.4, 0.33, 0.415] }),
      ...[0.35, 0.45].map((x, index) =>
        disc(
          0.025,
          0.02,
          index === 0 ? "#4fa64f" : "#d8352c",
          [x, 0.23, 0.42],
          10,
        ),
      ),
      ...[-0.45, -0.35, -0.25].map((x) =>
        block([0.06, 0.18, 0.01], "#b8bcc3", { at: [x, 0.22, 0.405] }),
      ),
    ],
    glass: [
      slab(
        lidOutline.map(([z, y]) => [-z, y] as const),
        1.16,
        "#ff8f2a",
        { turn: [0, quarter, 0] },
      ),
    ],
  };
};

const camera = (): LabItemParts => {
  const black = "#2a2b2e";
  return {
    body: [
      slab(roundedRect(1.0, 0.62, 0.08), 0.38, black, { at: [0, 0.31, 0] }),
      block([0.3, 0.12, 0.3], black, { at: [-0.12, 0.66, -0.02] }),
      block([0.2, 0.08, 0.02], "#d9dde2", { at: [-0.3, 0.52, 0.2] }),
      // The chunky lens.
      disc(0.25, 0.06, steel, [0.06, 0.29, 0.21], 20),
      disc(0.22, 0.2, "#1b1c1f", [0.06, 0.29, 0.32], 20),
      disc(0.2, 0.03, "#8f959c", [0.06, 0.29, 0.43], 20),
      blob([0.15, 0.15, 0.04], "#142236", { at: [0.06, 0.29, 0.43] }, [14, 6]),
      blob([0.035, 0.035, 0.01], "#ffffff", { at: [0.0, 0.35, 0.47] }, [6, 4]),
      // The shutter button and a dial on top.
      drum(0.06, 0.05, "#d8352c", { at: [0.32, 0.645, 0.05] }, 12),
      drum(0.08, 0.05, steel, { at: [0.12, 0.645, -0.05] }, 14),
      block([0.12, 0.5, 0.06], "#3b3c40", { at: [0.42, 0.31, 0.2] }),
    ],
  };
};

const tablet = (): LabItemParts => {
  const device: ModelPart[] = [
    slab(roundedRect(0.9, 1.25, 0.08), 0.05, "#2d2f34"),
    slab(roundedRect(0.8, 1.13, 0.03), 0.056, "#121a28"),
    disc(0.012, 0.06, "#4a5060", [0, 0.592, 0], 8),
    block([0.04, 0.6, 0.05], "#2d2f34", {
      at: [0, 0.2, -0.17],
      turn: [-0.45, 0, 0],
    }),
  ];
  return {
    body: placed(device, [0, 0.63, 0], [-0.12, 0, 0]),
    glass: placed(
      [
        slab(
          [
            [-0.32, 0.5],
            [-0.12, 0.5],
            [0.3, -0.25],
            [0.1, -0.25],
          ],
          0.004,
          "#9fb6d8",
          { at: [0, 0, 0.032] },
        ),
      ],
      [0, 0.63, 0],
      [-0.12, 0, 0],
    ),
  };
};

const phoneStand = (): LabItemParts => {
  const lean = 0.32;
  const stand = "#d4a46a";
  const along: Triple = [0, Math.cos(lean), -Math.sin(lean)];
  const facing: Triple = [0, Math.sin(lean), Math.cos(lean)];
  const phoneCentre: Triple = [
    0,
    0.06 + 0.43 * along[1],
    0.12 + 0.43 * along[2],
  ];
  const behind = (distance: number, lift: number): Triple => [
    0,
    phoneCentre[1] - facing[1] * distance + along[1] * lift,
    phoneCentre[2] - facing[2] * distance + along[2] * lift,
  ];
  return {
    body: [
      block([0.62, 0.06, 0.6], stand, { at: [0, 0.03, 0] }),
      block([0.56, 0.12, 0.05], stand, { at: [0, 0.09, 0.2] }),
      block([0.56, 0.8, 0.05], stand, {
        at: behind(0.05, -0.05),
        turn: [-lean, 0, 0],
      }),
      slab(roundedRect(0.44, 0.86, 0.06), 0.04, "#2d2f34", {
        at: phoneCentre,
        turn: [-lean, 0, 0],
      }),
      slab(roundedRect(0.39, 0.78, 0.04), 0.046, "#121a28", {
        at: phoneCentre,
        turn: [-lean, 0, 0],
      }),
    ],
  };
};

const robot = (): LabItemParts => {
  const shell = "#5da2e6";
  const face = "#e8edf2";
  return {
    body: [
      block([0.62, 0.5, 0.44], shell, { at: [0, 0.5, 0] }),
      block([0.36, 0.2, 0.02], "#2c4a6e", { at: [0, 0.55, 0.225] }),
      ...[
        [-0.1, "#e2483d"],
        [0, "#f2c230"],
        [0.1, "#4fb35a"],
      ].map(([x, colour]) =>
        disc(0.035, 0.03, String(colour), [Number(x), 0.55, 0.24], 10),
      ),
      drum(0.08, 0.1, darkSteel, { at: [0, 0.79, 0] }, 10),
      block([0.52, 0.4, 0.42], face, { at: [0, 1.0, 0] }),
      block([0.42, 0.26, 0.02], "#2a3340", { at: [0, 1.02, 0.215] }),
      ...eyes([0.1, 1.05, 0.23], 0.05, "#6fe0ff"),
      ...[-0.06, 0, 0.06].map((x) =>
        block([0.03, 0.03, 0.01], "#6fe0ff", { at: [x, 0.94, 0.228] }),
      ),
      drum(0.015, 0.16, darkSteel, { at: [0, 1.28, 0] }, 6),
      blob([0.045, 0.045, 0.045], "#e2483d", { at: [0, 1.38, 0] }, [8, 6]),
      ...mirrored((side) => [
        disc(0.07, 0.05, darkSteel, [0.275 * side, 1.0, 0], 12),
        rod(
          0.04,
          0.26,
          shell,
          {
            at: [0.38 * side, 0.52, 0.04],
            turn: [0.2, 0, 0.25 * side],
          },
          8,
        ),
        blob(
          [0.07, 0.06, 0.06],
          darkSteel,
          { at: [0.42 * side, 0.34, 0.08] },
          [8, 6],
        ),
        drum(
          0.17,
          0.08,
          "#2b2c30",
          { at: [0.35 * side, 0.17, 0], turn: [0, 0, quarter] },
          16,
        ),
        drum(
          0.08,
          0.09,
          "#b8bec6",
          { at: [0.35 * side, 0.17, 0], turn: [0, 0, quarter] },
          10,
        ),
      ]),
    ],
  };
};

const periscope = (): LabItemParts => {
  const card = "#2f86c8";
  const edge = "#236ba3";
  const mirror = "#b9d4e6";
  // A slanted line on each elbow's side, where its 45° mirror sits inside.
  const mirrorLine = (y: number, z: number, turn: number) =>
    block([0.006, 0.34, 0.012], "#1b4f79", {
      at: [0.131, y, z],
      turn: [turn, 0, 0],
    });
  return {
    body: [
      block([0.26, 1.2, 0.26], card, { at: [0, 0.74, 0] }),
      block([0.26, 0.3, 0.52], card, { at: [0, 1.39, 0.13] }),
      block([0.26, 0.3, 0.52], card, { at: [0, 0.15, -0.13] }),
      block([0.2, 0.22, 0.01], edge, { at: [0, 1.39, 0.392] }),
      block([0.17, 0.19, 0.01], mirror, { at: [0, 1.39, 0.396] }),
      block([0.2, 0.22, 0.01], edge, { at: [0, 0.15, -0.392] }),
      block([0.17, 0.19, 0.01], mirror, { at: [0, 0.15, -0.396] }),
      mirrorLine(1.39, 0.0, quarter / 2),
      mirrorLine(0.15, 0.0, quarter / 2),
    ],
  };
};

// -------------------------------------------------------------- materials and measures

const ironNail = (): LabItemParts => {
  const nail: ModelPart[] = [
    drum(0.045, 0.95, "#b9bfc6", { at: [0, 0.6, 0] }, 12),
    drum(0.13, 0.035, "#c6ccd3", { at: [0, 1.09, 0] }, 16),
    spike(
      0.045,
      0.14,
      "#b9bfc6",
      { at: [0, 0.055, 0], turn: [Math.PI, 0, 0] },
      12,
    ),
    // A bright glint running down the clean shank.
    block([0.012, 0.85, 0.01], "#eef2f6", { at: [-0.012, 0.6, 0.04] }),
    ...[0.98, 1.0, 1.02].map((y) =>
      drum(0.048, 0.006, "#a4abb3", { at: [0, y, 0] }, 12),
    ),
  ];
  return { body: placed(nail, [0, 0, 0], [0, 0, -0.5]) };
};

const woodenBlock = (): LabItemParts => {
  const pale = "#ead1a2";
  const grain = "#c9a372";
  return {
    body: [
      block([0.8, 0.8, 0.8], pale, { at: [0, 0.4, 0] }),
      ...[0.2, 0.36, 0.55, 0.68].map((y, index) =>
        block([0.74, 0.012, 0.006], grain, {
          at: [0, y, 0.401],
          turn: [0, 0, (index % 2 === 0 ? 1 : -1) * 0.04],
        }),
      ),
      ...[-0.24, -0.04, 0.18, 0.3].map((z, index) =>
        block([0.74, 0.006, 0.012], grain, {
          at: [0, 0.801, z],
          turn: [0, (index % 2 === 0 ? 1 : -1) * 0.04, 0],
        }),
      ),
      // End-grain growth rings on the side.
      ...[0.22, 0.42, 0.62].map((radius) =>
        hoop(
          radius,
          0.008,
          grain,
          { at: [0.4, 0, -0.4], turn: [0, -quarter, 0] },
          quarter,
          8,
        ),
      ),
      blob([0.045, 0.03, 0.01], "#9c7246", { at: [0.18, 0.46, 0.4] }, [8, 4]),
    ],
  };
};

const rubberBand = (): LabItemParts => {
  const loop = Array.from({ length: 10 }, (_, index): Triple => {
    const angle = (index * Math.PI * 2) / 10;
    const radius = 0.42 + 0.05 * Math.sin(index * 2.3);
    return [
      Math.cos(angle) * radius * 1.15,
      Math.sin(angle) * radius * 0.8,
      0.04 * Math.sin(index * 1.7),
    ];
  });
  return {
    body: placed(
      [tube(loop, 0.035, "#e8553b", 50, 6, true)],
      [0, 0.4, 0],
      [-0.5, 0, 0],
    ),
  };
};

const paperClip = (): LabItemParts => {
  const bend = (
    centre: Point,
    radius: number,
    from: number,
    to: number,
  ): Triple[] =>
    Array.from({ length: 7 }, (_, index): Triple => {
      const angle = from + ((to - from) * index) / 6;
      return [
        centre[0] + Math.cos(angle) * radius,
        centre[1] + Math.sin(angle) * radius,
        0,
      ];
    });
  const path: Triple[] = [
    [0.4, 0.2, 0],
    ...bend([-0.38, 0], 0.2, quarter, quarter * 3),
    ...bend([0.42, -0.04], 0.16, -quarter, quarter),
    ...bend([-0.26, 0], 0.12, quarter, quarter * 3),
    [0.24, -0.12, 0],
  ];
  return {
    body: placed(
      cappedTube(path, 0.022, "#c9ced6", 72, 5),
      [0, 0.5, 0],
      [-0.25, 0, 0],
    ),
  };
};

const pipeCleaner = (): LabItemParts => {
  const points: Triple[] = [
    [-0.6, 0.1, 0],
    [-0.3, 0.28, 0.05],
    [0.05, 0.34, -0.02],
    [0.38, 0.27, 0.04],
    [0.62, 0.12, 0],
  ];
  const fuzz = new TubeGeometry(
    new CatmullRomCurve3(points.map((point) => new Vector3(...point))),
    56,
    0.042,
    8,
  );
  const positions = fuzz.getAttribute("position");
  const normals = fuzz.getAttribute("normal");
  // Pushes each point out a random amount for its fluffy, tufted surface.
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const push = 0.022 * wobble(x, y, z);
    positions.setXYZ(
      index,
      x + normals.getX(index) * push,
      y + normals.getY(index) * push,
      z + normals.getZ(index) * push,
    );
  }
  const pink = "#f2489a";
  return {
    body: [
      { geometry: fuzz, colour: pink, isSmooth: true },
      ...[points[0], points[points.length - 1]].map((at) => ({
        ...blob([0.052, 0.052, 0.052], pink, { at }, [7, 5]),
        roughen: 0.4,
      })),
    ],
  };
};

const corrugatedPlastic = (): LabItemParts => {
  const yellow = "#f2c418";
  const width = 1.2;
  const height = 0.8;
  const flutes = 18;
  const sign: ModelPart[] = [
    block([width, height, 0.014], yellow, { at: [0, 0, 0.033] }),
    block([width, height, 0.014], yellow, { at: [0, 0, -0.033] }),
    // The ribs between the two skins, seen as tiny tubes along the top edge.
    ...Array.from({ length: flutes + 1 }, (_, index) =>
      block([0.012, height, 0.06], "#d9ab0c", {
        at: [-width / 2 + 0.006 + (index * (width - 0.012)) / flutes, 0, 0],
      }),
    ),
    ...Array.from({ length: flutes }, (_, index) =>
      block([0.008, height - 0.02, 0.002], "#f7d655", {
        at: [-width / 2 + (index + 0.5) * (width / flutes), 0, 0.041],
      }),
    ),
    ...mirrored((side) =>
      drum(0.014, 0.55, steel, { at: [0.42 * side, -height / 2 - 0.2, 0] }, 6),
    ),
  ];
  return { body: placed(sign, [0, 0.9, 0], [-0.3, 0, 0]) };
};

const plasticSheet = (): LabItemParts => {
  const steps = 14;
  const thickness = 0.02;
  // Flat at the left, curling gently up towards the right-hand edge.
  const front = Array.from({ length: steps + 1 }, (_, index): Point => {
    const x = -0.5 + index / steps;
    return [x, 0.28 * ((x + 0.5) / 1) ** 3];
  });
  const outline: Point[] = [
    ...front.map(([x, z]) => [x, -z] as const),
    ...[...front].reverse().map(([x, z]) => [x, -z + thickness] as const),
  ];
  const height = 0.8;
  const rimColour = "#2f86d8";
  const rim = (y: number) =>
    tube(
      front.map(([x, z]): Triple => [x, y, z - thickness / 2]),
      0.012,
      rimColour,
      20,
      4,
    );
  return {
    body: placed(
      [rim(-height / 2), rim(height / 2)],
      [0, 0.45, 0],
      [-0.25, 0, 0],
    ),
    glass: placed(
      [slab(outline, height, "#66b3ff", { turn: [-quarter, 0, 0] })],
      [0, 0.45, 0],
      [-0.25, 0, 0],
    ),
  };
};

const cardboardBox = (): LabItemParts => {
  const brown = "#c6955c";
  const crease = "#946b3d";
  return {
    body: [
      block([1.0, 0.68, 0.74], brown, { at: [0, 0.34, 0] }),
      // The two top flaps folded down to meet in the middle.
      ...mirrored((side) =>
        block([0.98, 0.02, 0.36], "#cfa068", { at: [0, 0.69, 0.185 * side] }),
      ),
      block([0.98, 0.022, 0.012], "#7a5530", { at: [0, 0.69, 0] }),
      block([1.002, 0.008, 0.742], crease, { at: [0, 0.66, 0] }),
      // The glued joint up one corner.
      block([0.008, 0.66, 0.06], crease, { at: [0.502, 0.34, 0.33] }),
    ],
  };
};

const newtonMeter = (): LabItemParts => {
  const tubeTop = 1.3;
  const tubeBottom = 0.35;
  const red = "#d8352c";
  const springTop = 1.25;
  const springBottom = 0.92;
  const coils = 9;
  const spring = Array.from({ length: coils * 6 + 1 }, (_, index): Triple => {
    const angle = (index * Math.PI * 2) / 6;
    return [
      Math.cos(angle) * 0.05,
      springTop - ((springTop - springBottom) * index) / (coils * 6),
      Math.sin(angle) * 0.05,
    ];
  });
  return {
    body: [
      hoop(0.07, 0.016, steel, { at: [0, tubeTop + 0.16, 0] }),
      drum(0.11, 0.08, red, { at: [0, tubeTop + 0.04, 0] }, 16),
      drum(0.11, 0.06, red, { at: [0, tubeBottom - 0.03, 0] }, 16),
      tube(spring, 0.008, steel, 108, 4),
      drum(
        0.01,
        springBottom - 0.12,
        steel,
        { at: [0, (springBottom + 0.12) / 2, 0] },
        6,
      ),
      // The marker sits at the top of the scale: nothing hangs on the hook.
      drum(0.06, 0.02, red, { at: [0, springBottom, 0] }, 12),
      block([0.07, tubeTop - tubeBottom - 0.06, 0.006], "#f6f3e8", {
        at: [0, (tubeTop + tubeBottom) / 2, -0.07],
      }),
      ...Array.from({ length: 11 }, (_, index) =>
        block([index % 5 === 0 ? 0.06 : 0.035, 0.008, 0.006], "#2a2b2f", {
          at: [
            index % 5 === 0 ? 0 : -0.012,
            springBottom - index * 0.05,
            -0.065,
          ],
        }),
      ),
      hoop(0.06, 0.013, steel, { at: [0.0, 0.07, 0] }, Math.PI * 1.5),
    ],
    glass: [
      drum(
        0.1,
        tubeTop - tubeBottom,
        "#e4f2ff",
        { at: [0, (tubeTop + tubeBottom) / 2, 0] },
        16,
      ),
    ],
  };
};

const tapeMeasure = (): LabItemParts => {
  const yellow = "#f5c518";
  const tapeLength = 0.55;
  const ticks = 12;
  return {
    body: [
      slab(roundedRect(0.8, 0.8, 0.22), 0.34, yellow, { at: [0, 0.4, 0] }),
      disc(0.24, 0.36, "#2f3034", [0, 0.4, 0], 18),
      disc(0.08, 0.37, "#b9bfc6", [0, 0.4, 0], 12),
      block([0.18, 0.08, 0.12], "#2f3034", { at: [-0.12, 0.81, 0] }),
      block([0.2, 0.05, 0.3], "#2f3034", { at: [0.33, 0.07, 0] }),
      // The tape pulled a little way out, with its end hook.
      ...placed(
        [
          block([tapeLength, 0.008, 0.2], yellow, {
            at: [tapeLength / 2, 0, 0],
          }),
          ...Array.from({ length: ticks }, (_, index) =>
            block([0.008, 0.002, index % 4 === 0 ? 0.1 : 0.05], wireBlack, {
              at: [
                0.04 + index * 0.042,
                0.005,
                0.1 - (index % 4 === 0 ? 0.05 : 0.025),
              ],
            }),
          ),
          block([0.015, 0.07, 0.2], steel, { at: [tapeLength, -0.03, 0] }),
        ],
        [0.4, 0.05, 0],
        [0.6, 0, 0],
      ),
    ],
  };
};

const ruler = (): LabItemParts => {
  const length = 1.5;
  const tickSpacing = 1.44 / 30;
  const marks: ModelPart[] = Array.from({ length: 61 }, (_, index) => {
    const height = index % 10 === 0 ? 0.08 : index % 2 === 0 ? 0.055 : 0.03;
    return block([0.005, height, 0.004], "#24303f", {
      at: [-0.72 + (index * tickSpacing) / 2, 0.09 - height / 2, 0.016],
    });
  });
  return {
    body: placed(marks, [0, 0.3, 0], [-0.35, 0, 0]),
    glass: placed(
      [block([length, 0.2, 0.025], "#a9d6ff", { at: [0, 0, 0] })],
      [0, 0.3, 0],
      [-0.35, 0, 0],
    ),
  };
};

const kilogramWeight = (): LabItemParts => {
  const iron = "#3d3f43";
  return {
    body: [
      {
        ...turned(
          [
            [0, 0],
            [0.38, 0],
            [0.4, 0.04],
            [0.38, 0.1],
            [0.31, 0.3],
            [0.24, 0.48],
            [0.19, 0.58],
            [0.12, 0.62],
            [0, 0.63],
          ],
          iron,
          {},
          20,
        ),
        roughen: 0.03,
      },
      drum(0.07, 0.08, iron, { at: [0, 0.66, 0] }, 10),
      hoop(0.13, 0.035, "#4a4c51", { at: [0, 0.82, 0] }),
    ],
  };
};

export const toolsTechBuilders = {
  "3d-printer": printer3d,
  "battery-pack": batteryPack,
  "bench-hook": benchHook,
  buzzer,
  "circuit-board": circuitBoard,
  "craft-knife": craftKnife,
  dowel,
  "eccentric-cam": eccentricCam,
  "electric-cable": electricCable,
  "g-clamp": gClamp,
  gear,
  "glue-bottle": glueBottle,
  "glue-gun": glueGun,
  "hook-and-loop-tape": hookAndLoopTape,
  "insulated-wire": insulatedWire,
  "iron-nail": ironNail,
  "junior-hacksaw": juniorHacksaw,
  "laser-cutter": laserCutter,
  led,
  lever,
  "light-sensor": lightSensor,
  microcontroller,
  "motion-sensor": motionSensor,
  motor,
  "oval-cam": ovalCam,
  "pear-cam": pearCam,
  pulley,
  "push-switch": pushSwitch,
  sandpaper,
  scissors: () => scissorsModel("#2f6fd1", 0.3),
  "safety-scissors": () => scissorsModel("#4fb35a", 0.55),
  "sewing-machine": sewingMachine,
  "steady-hand-game": steadyHandGame,
  "temperature-sensor": temperatureSensor,
  torch,
  "wooden-block": woodenBlock,
  "rubber-band": rubberBand,
  "paper-clip": paperClip,
  "pipe-cleaner": pipeCleaner,
  "corrugated-plastic": corrugatedPlastic,
  "plastic-sheet": plasticSheet,
  "cardboard-box": cardboardBox,
  "newton-meter": newtonMeter,
  "tape-measure": tapeMeasure,
  ruler,
  "kilogram-weight": kilogramWeight,
  "balance-scale": balanceScale,
  periscope,
  camera,
  tablet,
  "phone-stand": phoneStand,
  robot,
} satisfies Record<string, () => LabItemParts>;
