import {
  BoxGeometry,
  CatmullRomCurve3,
  ConeGeometry,
  CylinderGeometry,
  Euler,
  ExtrudeGeometry,
  LatheGeometry,
  Matrix4,
  Quaternion,
  Shape,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
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

// Each item faces +z and stands on y = 0, roughly one unit tall.

const quarter = Math.PI / 2;
const turnFull = Math.PI * 2;

interface Placement {
  at?: Triple;
  turn?: Triple;
  size?: Triple;
}

type Outline = readonly (readonly [number, number])[];

const leafGreen = "#4f9a3a";
const stemGreen = "#6aa443";
const stalkBrown = "#6b4a2a";
const terracotta = "#c0653a";
const soilBrown = "#4a3222";
const silver = "#e6eaf0";
const plateWhite = "#f2f0ea";
const cherryRed = "#c4142a";

const random = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
};

const part = (
  geometry: BufferGeometry,
  colour: string,
  { at, turn, size }: Placement = {},
  extras: Pick<ModelPart, "isSmooth" | "roughen"> = {},
): ModelPart => ({
  geometry,
  colour,
  position: at,
  rotation: turn,
  scale: size,
  ...extras,
});

const smooth = { isSmooth: true } as const;

/** Moves every vertex of a geometry, for bending, rippling and ribbing. */
const reshape = (
  geometry: BufferGeometry,
  move: (point: Vector3) => void,
): BufferGeometry => {
  const positions = geometry.getAttribute("position");
  const point = new Vector3();
  for (let index = 0; index < positions.count; index++) {
    point.fromBufferAttribute(positions, index);
    move(point);
    positions.setXYZ(index, point.x, point.y, point.z);
  }
  geometry.computeVertexNormals();
  return geometry;
};

/** Ridges running up the y axis, as on a cactus, a pumpkin or a pod. */
const ribs =
  (count: number, depth: number) =>
  (point: Vector3): void => {
    const push = 1 + depth * Math.cos(count * Math.atan2(point.z, point.x));
    point.x *= push;
    point.z *= push;
  };

const softBox = (size: Triple, round: number, segments = 4): BufferGeometry =>
  reshape(
    new BoxGeometry(size[0], size[1], size[2], segments, segments, segments),
    (point) => {
      const inner = new Vector3(
        Math.max(-size[0] / 2 + round, Math.min(size[0] / 2 - round, point.x)),
        Math.max(-size[1] / 2 + round, Math.min(size[1] / 2 - round, point.y)),
        Math.max(-size[2] / 2 + round, Math.min(size[2] / 2 - round, point.z)),
      );
      const offset = point.clone().sub(inner);
      if (offset.length() > 0) {
        point.copy(inner.add(offset.setLength(round)));
      }
    },
  );

/** Turns a surface's faces inwards, for the inside of a tube or a cup. */
const insideOut = (geometry: BufferGeometry): BufferGeometry => {
  const index = geometry.getIndex();
  if (index !== null) {
    for (let corner = 0; corner < index.count; corner += 3) {
      const first = index.getX(corner);
      index.setX(corner, index.getX(corner + 2));
      index.setX(corner + 2, first);
    }
  }
  return geometry;
};

const matrixOf = ({
  at = [0, 0, 0],
  turn = [0, 0, 0],
  size = [1, 1, 1],
}: Placement): Matrix4 =>
  new Matrix4().compose(
    new Vector3(...at),
    new Quaternion().setFromEuler(new Euler(...turn)),
    new Vector3(...size),
  );

/** Places a set of parts drawn round their own origin as one unit. */
const grouped = (parts: ModelPart[], placement: Placement): ModelPart[] => {
  const outer = matrixOf(placement);
  return parts.map(({ position, rotation, scale, ...rest }) => {
    const own = matrixOf({
      at: position,
      turn: rotation,
      size: typeof scale === "number" ? [scale, scale, scale] : scale,
    });
    rest.geometry.applyMatrix4(new Matrix4().multiplyMatrices(outer, own));
    return rest;
  });
};

const yUp = new Vector3(0, 1, 0);

/** The turn that points a part's +y along a direction. */
const facing = (direction: Triple): Triple => {
  const euler = new Euler().setFromQuaternion(
    new Quaternion().setFromUnitVectors(
      yUp,
      new Vector3(...direction).normalize(),
    ),
  );
  return [euler.x, euler.y, euler.z];
};

/** A flat outline given thickness, centred on z = 0 and facing +z. */
const slab = (
  shape: Shape,
  depth: number,
  colour: string,
  placement: Placement = {},
  bevel = 0,
  curveSegments = 4,
): ModelPart => {
  const geometry = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments,
  });
  geometry.translate(0, 0, -depth / 2);
  return part(geometry, colour, placement);
};

/** A pointed leaf growing up +y from its base at the origin. */
const leafShape = (length: number, width: number, bend = 0): Shape => {
  const shape = new Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(width, length * 0.4, bend, length);
  shape.quadraticCurveTo(-width, length * 0.4, 0, 0);
  return shape;
};

const leaf = (
  length: number,
  width: number,
  colour: string,
  placement: Placement,
  bend = 0,
): ModelPart => slab(leafShape(length, width, bend), 0.012, colour, placement);

/** A tube following a smooth curve through the points. */
const tube = (
  points: Triple[],
  radius: number,
  colour: string,
  segments = 8,
  sides = 5,
): ModelPart =>
  part(
    new TubeGeometry(
      new CatmullRomCurve3(points.map((point) => new Vector3(...point))),
      segments,
      radius,
      sides,
      false,
    ),
    colour,
    {},
    smooth,
  );

const lathe = (outline: Outline, sides: number): LatheGeometry =>
  new LatheGeometry(
    outline.map(([across, up]) => new Vector2(across, up)),
    sides,
  );

/** The radius of a lathe outline at a height, for placing things on it. */
const radiusAt = (outline: Outline, height: number): number => {
  for (let index = 1; index < outline.length; index++) {
    const [r0, y0] = outline[index - 1] ?? [0, 0];
    const [r1, y1] = outline[index] ?? [0, 0];
    if ((height - y0) * (height - y1) <= 0 && y0 !== y1) {
      return r0 + ((r1 - r0) * (height - y0)) / (y1 - y0);
    }
  }
  return 0;
};

/** A point on an upright ellipsoid's surface and the way it faces. */
const onDome = (
  radii: Triple,
  centre: Triple,
  around: number,
  rise: number,
): { at: Triple; turn: Triple } => {
  const normal: Triple = [
    (Math.cos(rise) * Math.sin(around)) / radii[0],
    Math.sin(rise) / radii[1],
    (Math.cos(rise) * Math.cos(around)) / radii[2],
  ];
  return {
    at: [
      centre[0] + radii[0] * Math.cos(rise) * Math.sin(around),
      centre[1] + radii[1] * Math.sin(rise),
      centre[2] + radii[2] * Math.cos(rise) * Math.cos(around),
    ],
    turn: facing(normal),
  };
};

/** A bowl with a foot, its inside showing down to `floor`. */
const bowl = (
  radius: number,
  height: number,
  colour: string,
  floor = 0.6,
  sides = 18,
): ModelPart =>
  turned(
    [
      [0.001, 0],
      [radius * 0.42, 0],
      [radius * 0.44, height * 0.1],
      [radius * 0.78, height * 0.32],
      [radius * 0.96, height * 0.72],
      [radius, height],
      [radius * 0.94, height * 1.01],
      [radius * 0.9, height * 0.75],
      [radius * 0.72, height * floor],
      [0.001, height * floor],
    ],
    colour,
    {},
    sides,
  );

/** A heap of food rising from a bowl's rim to a rounded top. */
const mound = (
  radius: number,
  rim: number,
  hump: number,
  colour: string,
  roughen = 0,
): ModelPart => ({
  ...turned(
    [
      [radius, rim - 0.02],
      [radius * 0.82, rim + hump * 0.45],
      [radius * 0.55, rim + hump * 0.82],
      [radius * 0.25, rim + hump * 0.98],
      [0, rim + hump],
    ],
    colour,
    {},
    16,
  ),
  ...(roughen > 0 ? { roughen } : {}),
});

/** Where a point on a mound's surface sits. */
const onMound = (
  radius: number,
  rim: number,
  hump: number,
  distance: number,
  around: number,
): Triple => [
  radius * distance * Math.sin(around),
  rim + hump * (1 - distance * distance) + 0.005,
  radius * distance * Math.cos(around),
];

const terracottaPot = (radius: number, height: number): ModelPart[] => [
  turned(
    [
      [0.001, 0],
      [radius * 0.78, 0],
      [radius * 0.92, height * 0.78],
      [radius * 1.05, height * 0.8],
      [radius * 1.06, height],
      [radius * 0.9, height],
      [radius * 0.88, height * 0.9],
      [0.001, height * 0.9],
    ],
    terracotta,
    {},
    16,
  ),
  taper([radius * 0.9, radius * 0.9], 0.02, soilBrown, {
    at: [0, height * 0.93, 0],
  }),
];

const spoon = (placement: Placement): ModelPart[] =>
  grouped(
    [
      taper([0.018, 0.026], 0.55, silver, { at: [0, 0.28, 0] }, 6),
      blob([0.07, 0.1, 0.03], silver, { at: [0, -0.04, 0] }, [8, 6]),
    ],
    placement,
  );

// --- Fruit -------------------------------------------------------------

const appleOutline: Outline = [
  [0, 0.05],
  [0.2, 0],
  [0.38, 0.1],
  [0.47, 0.3],
  [0.45, 0.52],
  [0.36, 0.68],
  [0.18, 0.72],
  [0.04, 0.64],
  [0, 0.62],
];

const appleBody = (colour: string, sides = 20): ModelPart[] => [
  turned(appleOutline, colour, {}, sides),
  rod(0.018, 0.12, stalkBrown, { at: [0.02, 0.72, 0], turn: [0, 0, -0.25] }, 5),
];

const apple = (): LabItemParts => ({
  body: [
    ...appleBody("#c8202a"),
    leaf(0.26, 0.17, leafGreen, {
      at: [0.04, 0.73, 0],
      turn: [-0.5, 0.3, -1.1],
    }),
    blob([0.03, 0.05, 0.015], "#ffffff", { at: [-0.22, 0.52, 0.36] }, [5, 4]),
  ],
});

const banana = (): LabItemParts => {
  const bendRadius = 0.75;
  const bend = (point: Vector3): void => {
    const angle = (point.y - 0.5) / bendRadius;
    const out = bendRadius + point.x;
    point.set(
      out * Math.sin(angle),
      bendRadius - out * Math.cos(angle),
      point.z,
    );
  };
  const piece = (outline: Outline, colour: string): ModelPart =>
    part(reshape(lathe(outline, 7), bend), colour, {}, smooth);
  return {
    body: [
      piece(
        [
          [0.02, 0.0],
          [0.05, 0.03],
          [0.09, 0.12],
          [0.11, 0.32],
          [0.115, 0.55],
          [0.1, 0.76],
          [0.065, 0.9],
          [0.032, 0.97],
        ],
        "#f6d43a",
      ),
      piece(
        [
          [0.034, 0.95],
          [0.03, 1.06],
          [0.034, 1.1],
          [0, 1.11],
        ],
        "#8a7a2c",
      ),
      piece(
        [
          [0, -0.02],
          [0.035, -0.01],
          [0.05, 0.02],
          [0.052, 0.035],
        ],
        "#3b2a1a",
      ),
      // The green blush near the stalk of a just-ripe banana.
      piece(
        [
          [0.086, 0.8],
          [0.06, 0.92],
          [0.035, 0.98],
        ],
        "#b8c43a",
      ),
    ],
  };
};

const cherry = (): LabItemParts => {
  const fruit = (x: number, z: number): ModelPart[] => [
    blob([0.2, 0.19, 0.2], cherryRed, { at: [x, 0.2, z] }),
    blob([0.04, 0.03, 0.04], "#7a0a18", { at: [x, 0.385, z] }, [6, 4]),
    blob(
      [0.035, 0.06, 0.02],
      "#ff8a8a",
      { at: [x - 0.08, 0.27, z + 0.17] },
      [5, 4],
    ),
  ];
  return {
    body: [
      ...fruit(-0.2, 0.05),
      ...fruit(0.21, -0.03),
      tube(
        [
          [-0.2, 0.38, 0.05],
          [-0.14, 0.6, 0.03],
          [-0.03, 0.82, 0],
          [0.02, 0.9, 0],
        ],
        0.014,
        "#5f7a2a",
      ),
      tube(
        [
          [0.21, 0.37, -0.03],
          [0.18, 0.6, -0.02],
          [0.08, 0.82, 0],
          [0.02, 0.9, 0],
        ],
        0.014,
        "#5f7a2a",
      ),
      leaf(0.3, 0.2, leafGreen, {
        at: [0.02, 0.89, 0],
        turn: [0.4, 0.4, -1.2],
      }),
    ],
  };
};

const orange = (): LabItemParts => ({
  body: [
    {
      ...blob([0.46, 0.43, 0.46], "#f58a1c", { at: [0, 0.43, 0] }, [16, 10]),
      roughen: 0.03,
    },
    blob([0.06, 0.1, 0.02], "#ffc27a", { at: [-0.2, 0.6, 0.36] }, [5, 4]),
    ...[0, 1, 2, 3, 4].map((index) =>
      spike(0.022, 0.07, "#5f7f2a", {
        at: [
          0.035 * Math.sin((index * turnFull) / 5),
          0.86,
          0.035 * Math.cos((index * turnFull) / 5),
        ],
        turn: [
          1.3 * Math.cos((index * turnFull) / 5),
          0,
          -1.3 * Math.sin((index * turnFull) / 5),
        ],
        size: [1, 1, 0.3],
      }),
    ),
    rod(0.016, 0.06, stalkBrown, { at: [0, 0.89, 0] }, 5),
    leaf(0.3, 0.2, leafGreen, { at: [0.02, 0.88, 0], turn: [-0.5, 0.2, -1.2] }),
  ],
});

const strawberryOutline: Outline = [
  [0, 0],
  [0.06, 0.03],
  [0.15, 0.15],
  [0.23, 0.34],
  [0.26, 0.48],
  [0.22, 0.6],
  [0.12, 0.65],
  [0, 0.66],
];

const strawberry = (): LabItemParts => {
  const seeds: ModelPart[] = [];
  for (let row = 0; row < 5; row++) {
    const height = 0.08 + row * 0.11;
    const radius = radiusAt(strawberryOutline, height);
    const count = Math.max(3, Math.round(radius * 30));
    for (let index = 0; index < count; index++) {
      const around = ((index + (row % 2) * 0.5) * turnFull) / count;
      seeds.push(
        blob(
          [0.014, 0.022, 0.01],
          "#f4d76a",
          {
            at: [radius * Math.sin(around), height, radius * Math.cos(around)],
            turn: [0, around, 0],
          },
          [4, 3],
        ),
      );
    }
  }
  return {
    body: [
      turned(strawberryOutline, "#d81e2e", {}, 16),
      ...seeds,
      ...[0, 1, 2, 3, 4, 5].map((index) => {
        const around = (index * turnFull) / 6;
        return spike(0.06, 0.2, "#3f8f2e", {
          at: [0.09 * Math.sin(around), 0.65, 0.09 * Math.cos(around)],
          turn: [1.75 * Math.cos(around), 0, -1.75 * Math.sin(around)],
          size: [1, 1, 0.22],
        });
      }),
      rod(0.02, 0.12, "#4f8a2c", { at: [0, 0.74, 0], turn: [0, 0, 0.2] }, 5),
    ],
  };
};

const pear = (colour: string): ModelPart[] => [
  turned(
    [
      [0, 0.02],
      [0.17, 0],
      [0.27, 0.12],
      [0.25, 0.28],
      [0.16, 0.42],
      [0.12, 0.56],
      [0.06, 0.64],
      [0, 0.64],
    ],
    colour,
    {},
    12,
  ),
  rod(0.015, 0.1, stalkBrown, { at: [0.01, 0.68, 0], turn: [0, 0, -0.3] }, 5),
];

const grapeBunch = (colour: string): ModelPart[] => {
  const grapes: ModelPart[] = [];
  const rows = [4, 3, 3, 2, 1];
  rows.forEach((count, row) => {
    for (let index = 0; index < count; index++) {
      const around = ((index + row * 0.5) * turnFull) / count;
      const spread = count === 1 ? 0 : 0.03 + count * 0.022;
      grapes.push(
        blob(
          [0.055, 0.06, 0.055],
          colour,
          {
            at: [
              spread * Math.sin(around),
              -row * 0.075,
              spread * Math.cos(around),
            ],
          },
          [6, 4],
        ),
      );
    }
  });
  return [
    ...grapes,
    rod(0.012, 0.1, stalkBrown, { at: [0, 0.08, 0], turn: [0, 0, 0.4] }, 4),
  ];
};

const fruitBowl = (): LabItemParts => ({
  body: [
    bowl(0.58, 0.32, "#e9dcc4", 0.6, 16),
    ...grouped(pear("#d9cf52"), {
      at: [0.14, 0.22, -0.2],
      turn: [-0.15, 0, -0.15],
      size: [0.8, 0.8, 0.8],
    }),
    ...grouped(appleBody("#c8202a", 10), {
      at: [-0.2, 0.2, -0.14],
      turn: [-0.2, 0, 0.2],
      size: [0.62, 0.62, 0.62],
    }),
    ...grouped(appleBody("#8cc43a", 10), {
      at: [0.24, 0.17, 0.14],
      turn: [0.25, 0, -0.3],
      size: [0.6, 0.6, 0.6],
    }),
    ...grouped(appleBody("#c8202a", 10), {
      at: [-0.06, 0.15, 0.2],
      turn: [0.3, 0, 0.1],
      size: [0.6, 0.6, 0.6],
    }),
    // A bunch of grapes hanging over the front of the rim.
    ...grouped(grapeBunch("#6b2a6e"), {
      at: [-0.4, 0.44, 0.2],
      turn: [0.5, 0, 0.5],
    }),
  ],
});

const raisin = (): LabItemParts => {
  const next = random(7);
  const shades = ["#4a2320", "#5b2a26", "#3e1b1a", "#6b3328"];
  const spots: Triple[] = [
    [0, 0.26, 0],
    [-0.12, 0.18, 0.06],
    [0.12, 0.18, 0.05],
    [0, 0.18, -0.1],
    [0.02, 0.17, 0.13],
    [-0.24, 0.1, 0.0],
    [0.24, 0.1, -0.02],
    [-0.14, 0.1, 0.18],
    [0.14, 0.1, 0.2],
    [0.0, 0.1, 0.25],
    [-0.12, 0.1, -0.18],
    [0.13, 0.1, -0.16],
    [0.34, 0.08, 0.14],
    [-0.32, 0.08, 0.18],
  ];
  return {
    body: [
      taper([0.5, 0.36], 0.06, plateWhite, { at: [0, 0.03, 0] }, 20),
      ...spots.map((at, index) => ({
        ...blob(
          [0.08, 0.05, 0.06],
          shades[index % shades.length] ?? "#4a2320",
          { at, turn: [next() * 3, next() * 3, next() * 3] },
          [7, 5],
        ),
        roughen: 0.45,
      })),
    ],
  };
};

// --- Vegetables --------------------------------------------------------

const asparagus = (): LabItemParts => {
  const spears: [number, number, number][] = [
    [0, 0, 1],
    [0.09, 0.02, 0.96],
    [-0.09, 0.02, 0.98],
    [0.05, 0.08, 0.93],
    [-0.04, 0.08, 1.02],
    [0.05, -0.07, 0.97],
    [-0.05, -0.07, 0.95],
  ];
  return {
    body: [
      ...spears.flatMap(([x, z, height]): ModelPart[] => [
        taper([0.035, 0.042], height * 0.75, "#6aa33c", {
          at: [x, height * 0.425, z],
        }),
        taper([0.042, 0.044], height * 0.12, "#d6d9a8", {
          at: [x, height * 0.06, z],
        }),
        blob(
          [0.046, 0.1, 0.046],
          "#5d7f34",
          { at: [x, height * 0.86, z] },
          [7, 5],
        ),
        blob(
          [0.03, 0.05, 0.03],
          "#7a5a6e",
          { at: [x, height * 0.93, z] },
          [6, 4],
        ),
        ...[0.45, 0.65].map((up) =>
          spike(
            0.022,
            0.06,
            "#86a84a",
            {
              at: [x + 0.036, height * up, z + 0.012],
              turn: [0, 0, -0.35],
            },
            4,
          ),
        ),
      ]),
      taper([0.175, 0.175], 0.06, "#7a3aa0", { at: [0, 0.3, 0] }, 16),
    ],
  };
};

const brusselsSprout = (): LabItemParts => {
  const shell = (
    phiStart: number,
    thetaStart: number,
    colour: string,
    radius = 0.335,
  ): ModelPart =>
    part(
      new SphereGeometry(radius, 9, 6, phiStart, 1.7, thetaStart, 1.5),
      colour,
      { at: [0, 0.34, 0] },
      smooth,
    );
  return {
    body: [
      blob([0.31, 0.31, 0.31], "#b4d870", { at: [0, 0.34, 0] }),
      shell(0.2, 1.0, "#6aa63a", 0.345),
      shell(2.3, 1.1, "#5e9a34", 0.345),
      shell(4.4, 0.95, "#74b042", 0.345),
      shell(1.3, 0.55, "#8cc450"),
      shell(3.4, 0.6, "#86c04c"),
      shell(5.4, 0.5, "#8cc450"),
      taper([0.08, 0.07], 0.07, "#e3e6b4", { at: [0, 0.035, 0] }),
    ],
  };
};

const carrotOutline: Outline = [
  [0, 0],
  [0.03, 0.06],
  [0.08, 0.25],
  [0.13, 0.55],
  [0.16, 0.78],
  [0.155, 0.86],
  [0.09, 0.9],
  [0, 0.91],
];

const carrot = (): LabItemParts => ({
  body: [
    turned(carrotOutline, "#ee7a1a", {}, 14),
    // The faint rings round a carrot's skin.
    ...[0.2, 0.32, 0.45, 0.58, 0.7, 0.8].map((height, index) => {
      const radius = radiusAt(carrotOutline, height);
      const around = index * 2.3;
      return blob(
        [radius * 0.55, 0.008, 0.02],
        "#c85e12",
        {
          at: [radius * Math.sin(around), height, radius * Math.cos(around)],
          turn: [0, around + quarter, 0],
        },
        [6, 3],
      );
    }),
    ...[-0.5, -0.2, 0.15, 0.45, 0].flatMap((lean, index): ModelPart[] => {
      const yaw = index * 1.3;
      const tip: Triple = [
        Math.sin(lean) * 0.45 * Math.cos(yaw) * 1.4,
        0.9 + Math.cos(lean) * 0.45,
        Math.sin(lean) * 0.45 * Math.sin(yaw),
      ];
      return [
        tube(
          [
            [0, 0.88, 0],
            [tip[0] * 0.4, 0.88 + (tip[1] - 0.88) * 0.5, tip[2] * 0.4],
            tip,
          ],
          0.012,
          "#4f9a2f",
          6,
          4,
        ),
        ...[0.45, 0.7, 1].map((along) =>
          blob(
            [0.1, 0.05, 0.04],
            "#3f8a2a",
            {
              at: [
                tip[0] * along,
                0.88 + (tip[1] - 0.88) * along,
                tip[2] * along,
              ],
              turn: [0, yaw, lean + 0.6],
            },
            [6, 4],
          ),
        ),
      ];
    }),
  ],
});

const celery = (): LabItemParts => {
  const shape = new Shape();
  const radius = 0.13;
  for (let step = 0; step <= 12; step++) {
    const angle = Math.PI + (step * Math.PI) / 12;
    const out = radius * (1 + 0.06 * Math.cos(12 * angle));
    const x = out * Math.cos(angle);
    const y = out * Math.sin(angle) * 0.75;
    if (step === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  }
  shape.quadraticCurveTo(0, -0.06, -radius, 0);
  const stalk = new ExtrudeGeometry(shape, {
    depth: 0.8,
    bevelEnabled: false,
    curveSegments: 4,
  });
  return {
    body: [
      part(stalk, "#a9d064", { turn: [-quarter, 0, 0] }),
      ...[
        [0, 0.25, 0, 0.05],
        [-0.5, 0.2, -0.04, 0.0],
        [0.55, 0.22, 0.04, 0.02],
        [-0.15, 0.3, 0.02, 0.06],
        [0.25, 0.27, 0.0, -0.06],
      ].flatMap(([lean = 0, length = 0, x = 0, z = 0]): ModelPart[] => {
        const top: Triple = [
          x + Math.sin(lean) * length,
          0.78 + Math.cos(lean) * length,
          z,
        ];
        return [
          tube([[x, 0.76, z], top], 0.014, "#8cc050", 2, 4),
          leaf(0.26, 0.26, "#4a9a2e", { at: top, turn: [0.2, 0, -lean] }),
          leaf(0.19, 0.2, "#3f8a2a", {
            at: top,
            turn: [0.2, 0, -lean - 0.9],
          }),
          leaf(0.19, 0.2, "#3f8a2a", {
            at: top,
            turn: [0.2, 0, -lean + 0.9],
          }),
        ];
      }),
    ],
  };
};

const onionOutline: Outline = [
  [0, 0.03],
  [0.14, 0],
  [0.3, 0.1],
  [0.36, 0.26],
  [0.33, 0.42],
  [0.22, 0.55],
  [0.08, 0.64],
  [0.035, 0.72],
  [0, 0.74],
];

const onion = (): LabItemParts => ({
  body: [
    part(
      reshape(lathe(onionOutline, 20), ribs(10, 0.025)),
      "#b8662c",
      {},
      smooth,
    ),
    // The dry papery neck and the tuft of roots.
    spike(
      0.04,
      0.14,
      "#c99a5e",
      { at: [0.01, 0.78, 0], turn: [0, 0, -0.15] },
      6,
    ),
    ...[-0.6, -0.2, 0.2, 0.6].map((tilt) =>
      tube(
        [
          [0, 0.01, 0],
          [Math.sin(tilt) * 0.06, -0.03, 0.02],
          [Math.sin(tilt) * 0.1, -0.06, 0.04],
        ],
        0.008,
        "#e6d4b0",
        3,
        3,
      ),
    ),
    // Half an onion beside it, showing its white rings.
    ...grouped(
      [
        turned(
          [
            [0, 0],
            [0.14, 0],
            [0.25, 0.07],
            [0.28, 0.17],
          ],
          "#b8662c",
          {},
          16,
        ),
        taper([0.28, 0.28], 0.02, "#f6efe0", { at: [0, 0.18, 0] }, 16),
        taper([0.215, 0.215], 0.02, "#dfe0b8", { at: [0, 0.184, 0] }, 16),
        taper([0.2, 0.2], 0.02, "#f6efe0", { at: [0, 0.188, 0] }, 16),
        taper([0.135, 0.135], 0.02, "#dfe0b8", { at: [0, 0.192, 0] }, 16),
        taper([0.12, 0.12], 0.02, "#f6efe0", { at: [0, 0.196, 0] }, 16),
        taper([0.05, 0.05], 0.02, "#dfe0b8", { at: [0, 0.2, 0] }, 10),
      ],
      { at: [0.42, 0.1, 0.32], turn: [0.9, 0, 0] },
    ),
  ],
});

const potatoBody = (seed: number): ModelPart[] => {
  const next = random(seed);
  return [
    {
      ...blob([0.42, 0.27, 0.3], "#c49a62", { at: [0, 0.27, 0] }, [14, 9]),
      roughen: 0.22,
    },
    ...[0, 1, 2, 3, 4].map((index) => {
      const around = index * 1.3 + next();
      const rise = (next() - 0.4) * 1.2;
      const { at, turn } = onDome(
        [0.4, 0.26, 0.29],
        [0, 0.27, 0],
        around,
        rise,
      );
      return blob([0.03, 0.012, 0.02], "#7a5634", { at, turn }, [5, 3]);
    }),
  ];
};

const potato = (): LabItemParts => ({
  body: [
    ...potatoBody(3),
    ...[0.2, 1.4, 2.6, 3.9, 5].map((around, index) => {
      const { at, turn } = onDome(
        [0.41, 0.265, 0.295],
        [0, 0.27, 0],
        around,
        0.5 - index * 0.2,
      );
      return blob([0.04, 0.008, 0.03], "#a57a48", { at, turn }, [5, 3]);
    }),
  ],
});

const bagOfPotatoes = (): LabItemParts => {
  const sack: Outline = [
    [0.001, 0],
    [0.32, 0],
    [0.41, 0.07],
    [0.43, 0.26],
    [0.39, 0.5],
    [0.31, 0.66],
    [0.35, 0.73],
    [0.41, 0.8],
    [0.37, 0.82],
    [0.33, 0.76],
    [0.28, 0.72],
    [0.001, 0.66],
  ];
  return {
    body: [
      {
        ...part(reshape(lathe(sack, 20), ribs(9, 0.06)), "#b8935a", {}, smooth),
        roughen: 0.07,
      },
      // The twine tied round the sack's neck.
      taper([0.325, 0.325], 0.025, "#6e4f28", { at: [0, 0.665, 0] }, 16),
      blob([0.05, 0.035, 0.03], "#6e4f28", { at: [0.1, 0.66, 0.3] }, [6, 4]),
      ...grouped(potatoBody(5), {
        at: [-0.1, 0.63, 0.05],
        turn: [0.3, 0.4, 0.2],
        size: [0.5, 0.55, 0.5],
      }),
      ...grouped(potatoBody(9), {
        at: [0.12, 0.62, 0.08],
        turn: [0.2, -0.5, -0.3],
        size: [0.45, 0.5, 0.45],
      }),
      ...grouped(potatoBody(11), {
        at: [0.0, 0.66, -0.12],
        turn: [-0.2, 1.4, 0.1],
        size: [0.5, 0.55, 0.5],
      }),
    ],
  };
};

const spinach = (): LabItemParts => {
  const spinachLeaf = (colour: string): ModelPart[] => [
    slab(leafShape(0.42, 0.42), 0.014, colour, { at: [0, 0.1, 0] }),
    tube(
      [
        [0, -0.02, 0.008],
        [0, 0.2, 0.01],
        [0, 0.42, 0.008],
      ],
      0.008,
      "#9cc870",
      4,
      3,
    ),
    rod(0.012, 0.12, "#8cbf60", { at: [0, 0.03, 0] }, 4),
  ];
  const leaves: [number, number, number, string][] = [
    [0, 0, -0.5, "#2f6b2a"],
    [-0.9, 0.1, -0.35, "#3a7a30"],
    [0.9, -0.1, -0.35, "#2b6226"],
    [-0.45, 0.6, -0.9, "#357a2e"],
    [0.5, -0.5, -0.9, "#2f6b2a"],
    [-1.5, 1.2, -1.2, "#3f8434"],
    [1.4, -1.1, -1.2, "#357a2e"],
  ];
  return {
    body: [
      taper([0.55, 0.42], 0.05, plateWhite, { at: [0, 0.025, 0] }, 20),
      ...leaves.flatMap(([lean, yaw, tilt, colour], index) =>
        grouped(spinachLeaf(colour), {
          at: [
            lean * 0.08,
            0.08 + index * 0.005,
            -0.05 + Math.abs(lean) * 0.05,
          ],
          turn: [tilt + 0.3, yaw, -lean * 0.8],
        }),
      ),
    ],
  };
};

const turnipOutline: Outline = [
  [0, -0.18],
  [0.012, -0.12],
  [0.05, 0],
  [0.2, 0.08],
  [0.3, 0.2],
  [0.32, 0.32],
  [0.26, 0.45],
  [0.13, 0.52],
  [0, 0.53],
];

const turnip = (): LabItemParts => ({
  body: [
    turned(turnipOutline, "#f3eee4", {}, 16),
    turned(
      [
        [0.318, 0.24],
        [0.326, 0.32],
        [0.266, 0.455],
        [0.133, 0.527],
        [0, 0.54],
      ],
      "#c98abf",
      {},
      16,
    ),
    turned(
      [
        [0.33, 0.29],
        [0.27, 0.46],
        [0.135, 0.532],
        [0, 0.545],
      ],
      "#7e2f72",
      {},
      16,
    ),
    ...[-0.55, -0.2, 0.15, 0.5, 0.0].flatMap((lean, index): ModelPart[] => {
      const yaw = index * 1.25;
      const placement: Placement = {
        at: [0, 0.52, 0],
        turn: [0, yaw, 0],
      };
      return grouped(
        [
          rod(
            0.018,
            0.2,
            "#8e4a7e",
            {
              at: [Math.sin(lean) * 0.12, 0.12, 0],
              turn: [0, 0, -lean],
            },
            5,
          ),
          leaf(
            0.42,
            0.34,
            index % 2 === 0 ? "#4f8f34" : "#5c9c3a",
            {
              at: [Math.sin(lean) * 0.22, 0.22, 0],
              turn: [0.15, 0, -lean],
            },
            0.03,
          ),
        ],
        placement,
      );
    }),
  ],
});

// --- Plants ------------------------------------------------------------

const beanPlant = (): LabItemParts => ({
  body: [
    ...terracottaPot(0.22, 0.34),
    tube(
      [
        [0, 0.32, 0],
        [0.02, 0.5, 0.01],
        [-0.02, 0.72, 0],
        [0.01, 0.95, 0.01],
      ],
      0.018,
      "#8bbf55",
      8,
      5,
    ),
    // The two fat seed leaves the bean opened into.
    ...mirrored((side) =>
      blob(
        [0.06, 0.03, 0.04],
        "#b7cf6a",
        {
          at: [0.05 * side, 0.44, 0.01],
          turn: [0, 0, -0.4 * side],
        },
        [8, 5],
      ),
    ),
    ...[
      [0.6, 1],
      [0.6, -1],
      [0.8, 1],
      [0.8, -1],
    ].map(([height = 0, side = 1]) =>
      leaf(0.26, 0.24, height > 0.7 ? "#5aa640" : leafGreen, {
        at: [0, height, 0.01],
        turn: [0.35, side * 0.4, -side * (height > 0.7 ? 0.8 : 1.15)],
      }),
    ),
    leaf(0.12, 0.1, "#7cc050", { at: [0.01, 0.94, 0], turn: [0.2, 0, 0.4] }),
    leaf(0.1, 0.09, "#7cc050", { at: [0.01, 0.94, 0], turn: [0.2, 0, -0.5] }),
  ],
});

const cactus = (): LabItemParts => {
  const green = "#3f8a4a";
  const spines: ModelPart[] = [];
  const addSpines = (
    centre: [number, number],
    radius: number,
    from: number,
    to: number,
    step: number,
  ): void => {
    for (let rib = 0; rib < 8; rib++) {
      const around = (rib * turnFull) / 8 + 0.2;
      for (
        let height = from + (rib % 2) * step * 0.5;
        height < to;
        height += step
      ) {
        spines.push(
          spike(
            0.012,
            0.07,
            "#f4f0dc",
            {
              at: [
                centre[0] + (radius + 0.03) * Math.cos(around),
                height,
                centre[1] + (radius + 0.03) * Math.sin(around),
              ],
              turn: [0, -around, -quarter],
            },
            3,
          ),
        );
      }
    }
  };
  const column = (radius: number, length: number, at: Triple): ModelPart => ({
    ...part(
      reshape(
        new CylinderGeometry(radius, radius, length, 16, 3, true),
        ribs(8, 0.12),
      ),
      green,
      { at },
      smooth,
    ),
  });
  const top = (radius: number, at: Triple): ModelPart =>
    part(
      reshape(
        new SphereGeometry(radius, 16, 4, 0, turnFull, 0, quarter),
        ribs(8, 0.12),
      ),
      green,
      { at, turn: [0, 0.2, 0] },
      smooth,
    );
  addSpines([0, 0], 0.17, 0.44, 1.18, 0.19);
  addSpines([0.32, 0], 0.1, 0.78, 1.0, 0.13);
  addSpines([-0.3, 0], 0.09, 0.62, 0.8, 0.13);
  return {
    body: [
      ...terracottaPot(0.3, 0.38),
      column(0.17, 0.85, [0, 0.77, 0]),
      top(0.17, [0, 1.195, 0]),
      // The two arms, each bending up from the stem.
      rod(0.09, 0.18, green, { at: [0.2, 0.68, 0], turn: [0, 0, quarter] }, 8),
      column(0.1, 0.3, [0.32, 0.85, 0]),
      top(0.1, [0.32, 1.0, 0]),
      blob([0.1, 0.1, 0.1], green, { at: [0.32, 0.7, 0] }, [8, 5]),
      rod(0.08, 0.16, green, { at: [-0.2, 0.55, 0], turn: [0, 0, quarter] }, 8),
      column(0.09, 0.2, [-0.3, 0.7, 0]),
      top(0.09, [-0.3, 0.8, 0]),
      blob([0.09, 0.09, 0.09], green, { at: [-0.3, 0.58, 0] }, [8, 5]),
      ...spines,
      ...[
        [0.14, 0.18],
        [-0.17, 0.1],
        [0.04, -0.2],
      ].map(([x = 0, z = 0]) =>
        blob([0.04, 0.025, 0.035], "#d9cbb0", { at: [x, 0.355, z] }, [6, 4]),
      ),
    ],
  };
};

const stemTo = (top: Triple, colour = stemGreen, radius = 0.016): ModelPart =>
  tube(
    [
      [0, 0, 0],
      [top[0] * 0.3, top[1] * 0.5, top[2] * 0.2],
      [top[0] * 0.8, top[1] * 0.85, top[2] * 0.6],
      top,
    ],
    radius,
    colour,
    8,
    5,
  );

const grassTuft = (): ModelPart[] => [
  blob([0.16, 0.05, 0.14], "#5a4028", { at: [0, 0.0, 0] }, [10, 5]),
  ...[-0.5, -0.2, 0.25, 0.55].map((lean, index) =>
    leaf(0.22, 0.05, "#5aa040", {
      at: [Math.sin(lean) * 0.08, 0.02, (index % 2) * 0.05 - 0.02],
      turn: [0, index, -lean],
    }),
  ),
];

const daffodil = (): LabItemParts => {
  const flower: ModelPart[] = [
    ...[0, 1, 2, 3, 4, 5].map((index) => {
      const around = (index * turnFull) / 6 + 0.26;
      return blob(
        [0.07, 0.13, 0.016],
        "#fbe46a",
        {
          at: [0.12 * Math.sin(around), 0.12 * Math.cos(around), 0],
          turn: [0, 0, -around],
        },
        [7, 5],
      );
    }),
    // The trumpet, with an inside so its mouth looks open.
    part(
      reshape(
        lathe(
          [
            [0.03, 0],
            [0.06, 0.02],
            [0.065, 0.1],
            [0.11, 0.17],
            [0.1, 0.175],
            [0.055, 0.11],
            [0.045, 0.04],
            [0, 0.035],
          ],
          20,
        ),
        (point) => {
          if (point.y > 0.13) {
            ribs(10, 0.1)(point);
          }
        },
      ),
      "#f4a312",
      { turn: [quarter, 0, 0] },
      smooth,
    ),
    blob([0.045, 0.045, 0.06], "#6f9a3a", { at: [0, 0, -0.05] }, [8, 5]),
    spike(
      0.03,
      0.12,
      "#c9b07a",
      { at: [0, 0.07, -0.08], turn: [-0.6, 0, 0] },
      5,
    ),
  ];
  return {
    body: [
      ...grassTuft(),
      stemTo([0.0, 0.84, 0.02], "#5c9a3a", 0.02),
      tube(
        [
          [0, 0.84, 0.02],
          [0, 0.9, 0.05],
          [0, 0.9, 0.1],
        ],
        0.02,
        "#5c9a3a",
        3,
        5,
      ),
      ...[-0.25, 0.2, 0.05].map((lean, index) =>
        slab(
          leafShape(0.7 - index * 0.08, 0.09, 0.06 * Math.sign(lean)),
          0.014,
          "#4f8f3a",
          {
            at: [index * 0.03 - 0.03, 0.02, -0.02 + index * 0.02],
            turn: [0, index * 0.9, -lean],
          },
        ),
      ),
      ...grouped(flower, {
        at: [0, 0.88, 0.16],
        turn: [-0.15, 0, 0],
        size: [1.45, 1.45, 1.45],
      }),
    ],
  };
};

const daisy = (): LabItemParts => {
  const head: ModelPart[] = [
    ...Array.from({ length: 16 }, (_, index) => {
      const around = (index * turnFull) / 16;
      return blob(
        [0.032, 0.11, 0.012],
        "#fbfbf6",
        {
          at: [0.12 * Math.sin(around), 0.12 * Math.cos(around), -0.005],
          turn: [0, 0, -around],
        },
        [6, 4],
      );
    }),
    blob([0.075, 0.075, 0.04], "#f5c518", { at: [0, 0, 0.02] }, [10, 6]),
    blob([0.1, 0.1, 0.02], "#5c9a3a", { at: [0, 0, -0.025] }, [8, 4]),
  ];
  return {
    body: [
      ...grassTuft(),
      stemTo([0.03, 0.78, 0.04], "#5c9a3a", 0.016),
      ...[0, 1.6, 3.2, 4.6].map((yaw) =>
        slab(
          (() => {
            const shape = new Shape();
            shape.moveTo(0, 0);
            shape.quadraticCurveTo(0.02, 0.1, 0.06, 0.16);
            shape.quadraticCurveTo(0, 0.26, -0.06, 0.16);
            shape.quadraticCurveTo(-0.02, 0.1, 0, 0);
            return shape;
          })(),
          0.012,
          "#4f9a3a",
          { at: [0, 0.03, 0], turn: [0, yaw, -1.1] },
        ),
      ),
      ...grouped(head, { at: [0.03, 0.8, 0.05], turn: [-0.25, 0, 0] }),
    ],
  };
};

const fern = (): LabItemParts => {
  const frond = (length: number, colour: string): ModelPart[] => {
    const at = (t: number): Triple => [
      0,
      length * (1.3 * t - 0.8 * t * t),
      length * 0.7 * t,
    ];
    const parts: ModelPart[] = [
      tube(
        [0, 0.25, 0.5, 0.75, 1].map((t) => at(t)),
        0.012,
        "#5f8a30",
        8,
        3,
      ),
    ];
    for (let pair = 1; pair <= 10; pair++) {
      const t = pair / 11;
      const reach = 0.26 * length * (1 - t) ** 0.7 + 0.025;
      const [x, y, z] = at(t);
      parts.push(
        ...mirrored((side) =>
          spike(
            0.04 * length,
            reach,
            colour,
            {
              at: [x + (side * reach) / 2, y - reach * 0.1, z],
              turn: [0, 0, -side * (quarter + 0.2)],
              size: [1, 1, 0.25],
            },
            3,
          ),
        ),
      );
    }
    return parts;
  };
  const fronds: [number, number, string][] = [
    [0, 0.85, "#3f8f3a"],
    [1.1, 0.75, "#3a8436"],
    [2.2, 0.82, "#45963e"],
    [3.2, 0.78, "#3f8f3a"],
    [4.2, 0.8, "#3a8436"],
    [5.2, 0.74, "#45963e"],
  ];
  const spiral: Triple[] = Array.from({ length: 10 }, (_, index) => {
    const angle = index * 0.6;
    const radius = 0.07 * (1 - index / 12);
    return [
      0,
      0.36 + radius * Math.sin(angle),
      0.06 - radius * Math.cos(angle),
    ];
  });
  return {
    body: [
      blob([0.2, 0.08, 0.2], "#4a3424", { at: [0, 0.02, 0] }, [10, 5]),
      ...fronds.flatMap(([yaw, length, colour]) =>
        grouped(frond(length, colour), { at: [0, 0.05, 0], turn: [0, yaw, 0] }),
      ),
      // A young frond still curled up like a fiddle's head.
      tube([[0, 0.04, 0], [0, 0.24, 0.04], ...spiral], 0.016, "#6aa83c", 16, 4),
    ],
  };
};

const flowerBulb = (): LabItemParts => {
  const bulbOutline: Outline = [
    [0, 0.05],
    [0.14, 0.03],
    [0.26, 0.1],
    [0.3, 0.24],
    [0.26, 0.42],
    [0.15, 0.58],
    [0.05, 0.72],
    [0.015, 0.82],
    [0, 0.84],
  ];
  return {
    body: [
      part(
        reshape(lathe(bulbOutline, 18), ribs(9, 0.035)),
        "#b98a5a",
        {},
        smooth,
      ),
      blob([0.15, 0.035, 0.15], "#d8c7a0", { at: [0, 0.05, 0] }, [10, 4]),
      // A patch where the papery skin has flaked off.
      blob(
        [0.09, 0.12, 0.03],
        "#e6d3a8",
        { at: [0.13, 0.28, 0.23], turn: [0, 0.5, 0] },
        [6, 5],
      ),
      ...Array.from({ length: 9 }, (_, index) => {
        const around = (index * turnFull) / 9;
        const reach = 0.1 + (index % 3) * 0.03;
        return tube(
          [
            [0.06 * Math.sin(around), 0.04, 0.06 * Math.cos(around)],
            [
              (0.06 + reach * 0.5) * Math.sin(around),
              -0.02,
              (0.06 + reach * 0.5) * Math.cos(around),
            ],
            [
              (0.06 + reach) * Math.sin(around + 0.3),
              -0.1 - (index % 2) * 0.03,
              (0.06 + reach) * Math.cos(around + 0.3),
            ],
          ],
          0.01,
          "#efe3c4",
          4,
          3,
        );
      }),
    ],
  };
};

const geraniumLeaf = (radius: number): ModelPart[] => {
  const outline = (size: number): Shape => {
    const shape = new Shape();
    shape.moveTo(0, size * 0.15);
    for (let step = 0; step <= 36; step++) {
      const angle = -quarter + 0.25 + (step * (turnFull - 0.5)) / 36;
      const out = size * (1 + 0.07 * Math.cos(9 * angle));
      shape.lineTo(out * Math.cos(angle), out * Math.sin(angle) + size);
    }
    shape.lineTo(0, size * 0.15);
    return shape;
  };
  const zone = new Shape();
  zone.absarc(0, radius, radius * 0.7, 0, turnFull, false);
  const hole = new Shape();
  hole.absarc(0, radius, radius * 0.5, 0, turnFull, true);
  zone.holes.push(hole);
  return [
    slab(outline(radius), 0.014, "#5fa443"),
    // The darker horseshoe band across a geranium's leaf.
    slab(zone, 0.016, "#4d8a36", { at: [0, 0, 0.002] }, 0, 8),
    blob([0.015, 0.015, 0.008], "#4d8a36", { at: [0, radius, 0.01] }, [4, 3]),
  ];
};

const geraniumCutting = (): LabItemParts => {
  const nodes: Triple[] = [
    [0, 0.05, 0],
    [0.01, 0.3, 0],
    [-0.01, 0.55, 0],
    [0, 0.78, 0],
  ];
  return {
    body: [
      tube(nodes, 0.03, "#7aa04a", 8, 6),
      // The slanted cut end.
      blob(
        [0.032, 0.02, 0.032],
        "#cfe0a0",
        { at: [0, 0.04, 0], turn: [0.4, 0, 0] },
        [6, 4],
      ),
      ...nodes
        .slice(1)
        .map((at) => blob([0.04, 0.032, 0.04], "#6b8f40", { at }, [8, 5])),
      ...nodes
        .slice(1, 3)
        .map((at) =>
          spike(
            0.02,
            0.05,
            "#a8784a",
            { at: [at[0] + 0.03, at[1] + 0.01, at[2]], turn: [0, 0, -0.6] },
            4,
          ),
        ),
      tube(
        [
          [0.01, 0.3, 0],
          [0.14, 0.36, 0.03],
          [0.24, 0.4, 0.06],
        ],
        0.013,
        "#7aa04a",
        4,
        4,
      ),
      ...grouped(geraniumLeaf(0.19), {
        at: [0.24, 0.38, 0.07],
        turn: [-0.6, 0.35, -0.75],
      }),
      tube(
        [
          [-0.01, 0.55, 0],
          [-0.14, 0.6, 0.03],
          [-0.24, 0.64, 0.06],
        ],
        0.013,
        "#7aa04a",
        4,
        4,
      ),
      ...grouped(geraniumLeaf(0.2), {
        at: [-0.24, 0.62, 0.07],
        turn: [-0.6, -0.35, 0.75],
      }),
      ...grouped(geraniumLeaf(0.15), {
        at: [0, 0.78, 0.03],
        turn: [-0.6, 0, 0],
      }),
    ],
  };
};

const hollyLeaf = (): LabItemParts => {
  const length = 0.9;
  const width = 0.24;
  const spines = 5;
  const shape = new Shape();
  shape.moveTo(0, 0);
  for (const side of [1, -1]) {
    const steps = Array.from({ length: spines }, (_, index) =>
      side === 1 ? index : spines - 1 - index,
    );
    for (const index of steps) {
      const valley = (index + 0.5) / (spines + 0.5);
      const point = (index + 1) / (spines + 0.5);
      const half = (t: number): number =>
        width * Math.sin(Math.PI * Math.min(t, 0.92)) ** 0.7;
      if (side === 1) {
        shape.lineTo(side * half(valley) * 0.75, length * valley);
        shape.lineTo(side * half(point) * 1.12, length * point);
      } else {
        shape.lineTo(side * half(point) * 1.12, length * point);
        shape.lineTo(side * half(valley) * 0.75, length * valley);
      }
    }
    if (side === 1) {
      shape.lineTo(0, length + 0.08);
    }
  }
  shape.lineTo(0, 0);
  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.025,
    bevelEnabled: false,
  });
  geometry.translate(0, 0, -0.0125);
  // The edges buckle up and down between spines.
  reshape(geometry, (point) => {
    point.z +=
      0.07 *
      Math.sin((point.y / length) * Math.PI * (spines + 0.5) * 2) *
      (Math.abs(point.x) / width);
  });
  return {
    body: grouped(
      [
        part(geometry, "#1f5e2a"),
        tube(
          [
            [0, -0.08, 0.016],
            [0, 0.4, 0.018],
            [0, length, 0.016],
          ],
          0.012,
          "#8fbf6a",
          6,
          4,
        ),
        blob(
          [0.08, 0.2, 0.01],
          "#3e8a48",
          { at: [-0.07, 0.5, 0.014], turn: [0, 0, 0.1] },
          [6, 4],
        ),
        ...[
          [-0.06, -0.07],
          [0.05, -0.08],
          [0, -0.13],
        ].map(([x = 0, y = 0]) =>
          blob([0.055, 0.055, 0.055], "#d4182a", { at: [x, y, 0.04] }, [8, 6]),
        ),
      ],
      { at: [0, 0.2, 0], turn: [-0.3, 0, 0.15] },
    ),
  };
};

const log = (): LabItemParts => {
  const bark = reshape(
    new CylinderGeometry(0.3, 0.3, 1, 22, 3, false),
    (point) => {
      if (Math.abs(point.y) < 0.499) {
        ribs(11, 0.07)(point);
      }
    },
  );
  const rings: [number, string][] = [
    [0.285, "#e5c590"],
    [0.24, "#c99b5e"],
    [0.225, "#e8cb98"],
    [0.17, "#c99b5e"],
    [0.155, "#e8cb98"],
    [0.1, "#c99b5e"],
    [0.085, "#e8cb98"],
    [0.025, "#8a5a32"],
  ];
  return {
    body: grouped(
      [
        { ...part(bark, "#5e3f26"), roughen: 0.08 },
        ...rings.map(([radius, colour], index) =>
          taper(
            [radius, radius],
            0.01,
            colour,
            {
              at: [0, 0.502 + index * 0.003, 0],
            },
            18,
          ),
        ),
        taper([0.28, 0.28], 0.01, "#d9b77e", { at: [0, -0.502, 0] }, 18),
        // A knot where a branch once grew.
        blob([0.06, 0.08, 0.05], "#4a3020", { at: [0.29, 0.15, 0.05] }, [6, 5]),
      ],
      { at: [0, 0.3, 0], turn: [0, -0.7, -quarter] },
    ),
  };
};

const moss = (): LabItemParts => {
  const next = random(21);
  return {
    body: [
      {
        ...blob(
          [0.46, 0.22, 0.38],
          "#8a8a84",
          { at: [0.02, 0.15, -0.02] },
          [10, 6],
        ),
        roughen: 0.25,
      },
      {
        ...blob([0.42, 0.2, 0.36], "#5ea832", { at: [0, 0.26, 0.02] }, [14, 8]),
        roughen: 0.18,
      },
      ...Array.from({ length: 26 }, (_, index) => {
        const around = index * 2.4;
        const rise = 0.15 + next() * 1.2;
        const { at } = onDome([0.42, 0.2, 0.36], [0, 0.26, 0.02], around, rise);
        return blob(
          [0.05, 0.035, 0.05],
          index % 3 === 0 ? "#7cc444" : index % 3 === 1 ? "#4f9a2a" : "#6ab83a",
          { at },
          [5, 4],
        );
      }),
    ],
  };
};

const capDome = (radii: Triple, colour: string, at: Triple): ModelPart =>
  part(
    new SphereGeometry(1, 16, 6, 0, turnFull, 0, quarter * 1.1),
    colour,
    { at, size: radii },
    smooth,
  );

const mushroom = (): LabItemParts => ({
  body: grouped(
    [
      taper([0.11, 0.13], 0.44, "#f3eee4", { at: [0, 0.22, 0] }, 12),
      taper([0.16, 0.115], 0.05, "#ece4d6", { at: [0, 0.36, 0] }, 12),
      capDome([0.46, 0.3, 0.46], "#d6b892", [0, 0.44, 0]),
      // The pinky-brown gills under the cap.
      taper([0.12, 0.43], 0.06, "#9a6a5a", { at: [0, 0.43, 0] }, 18),
      blob([0.12, 0.06, 0.04], "#ead8bc", { at: [-0.15, 0.66, 0.22] }, [6, 4]),
    ],
    { turn: [-0.22, 0, 0] },
  ),
});

const toadstool = (): LabItemParts => {
  const capRadii: Triple = [0.42, 0.34, 0.42];
  const capAt: Triple = [0, 0.56, 0];
  const spots: [number, number, number][] = [
    [0, 1.2, 0.07],
    [0.9, 0.7, 0.06],
    [-0.8, 0.75, 0.06],
    [0.4, 0.3, 0.05],
    [-0.35, 0.28, 0.05],
    [1.9, 0.5, 0.06],
    [-1.9, 0.45, 0.06],
    [2.8, 0.8, 0.06],
    [3.6, 0.35, 0.05],
    [1.4, 1.05, 0.05],
    [-1.3, 1.1, 0.05],
  ];
  return {
    body: [
      blob([0.13, 0.08, 0.13], "#f4efe4", { at: [0, 0.07, 0] }, [10, 6]),
      taper([0.07, 0.1], 0.5, "#f8f4ea", { at: [0, 0.32, 0] }, 12),
      // The skirt hanging round the stalk.
      turned(
        [
          [0.07, 0.46],
          [0.12, 0.42],
          [0.14, 0.38],
        ],
        "#efe8da",
        {},
        14,
      ),
      capDome(capRadii, "#d4231c", capAt),
      taper([0.08, 0.4], 0.05, "#f4ecd8", { at: [0, 0.545, 0] }, 16),
      ...spots.map(([around, rise, radius]) => {
        const { at, turn } = onDome(capRadii, capAt, around, rise);
        return blob([radius, 0.018, radius], "#fbfaf4", { at, turn }, [7, 4]);
      }),
    ],
  };
};

const pineTree = (): LabItemParts => ({
  body: [
    taper([0.06, 0.09], 0.4, "#6b4a2f", { at: [0, 0.2, 0] }, 8),
    ...[0, 1, 2, 3, 4, 5, 6].map((tier) => ({
      ...spike(
        0.46 - tier * 0.058,
        0.42 - tier * 0.025,
        tier % 2 === 0 ? "#1f5a33" : "#28683b",
        { at: [0, 0.5 + tier * 0.2, 0], turn: [0, tier * 0.6, 0] },
        14,
      ),
      roughen: 0.25,
    })),
    spike(0.07, 0.2, "#317544", { at: [0, 1.78, 0] }, 8),
  ],
});

const sunflower = (): LabItemParts => {
  const head: ModelPart[] = [
    ...Array.from({ length: 30 }, (_, index) => {
      const back = index >= 15;
      const around = ((index % 15) * turnFull) / 15 + (back ? 0.21 : 0);
      const reach = 0.3;
      return spike(
        0.065,
        0.26,
        back ? "#f0a514" : "#fbcb22",
        {
          at: [
            reach * Math.sin(around),
            reach * Math.cos(around),
            back ? -0.02 : 0.005,
          ],
          turn: [0, 0, -around],
          size: [1, 1, 0.22],
        },
        6,
      );
    }),
    blob([0.2, 0.2, 0.06], "#5a3416", { at: [0, 0, 0.02] }, [14, 6]),
    blob([0.12, 0.12, 0.05], "#3e220e", { at: [0, 0, 0.05] }, [10, 5]),
    blob([0.2, 0.2, 0.07], "#4f8a2c", { at: [0, 0, -0.05] }, [10, 5]),
  ];
  return {
    body: [
      ...grassTuft(),
      stemTo([0, 1.15, 0.02], "#4f8a2c", 0.035),
      ...[
        [0.35, 1],
        [0.62, -1],
        [0.88, 1],
      ].map(([height = 0, side = 1]) =>
        leaf(0.34, 0.34, "#4a9032", {
          at: [0, height, 0.02],
          turn: [-0.5, side * 0.3, -side * 1.0],
        }),
      ),
      ...grouped(head, { at: [0, 1.22, 0.08], turn: [-0.2, 0, 0] }),
    ],
  };
};

const venusFlytrap = (): LabItemParts => {
  const lobe = (side: -1 | 1, open: number): ModelPart[] =>
    grouped(
      [
        blob(
          [0.1, 0.12, 0.02],
          "#6fae3a",
          { at: [side * 0.1, 0, -0.006] },
          [7, 4],
        ),
        blob(
          [0.085, 0.105, 0.014],
          "#d0262e",
          { at: [side * 0.095, 0, 0.01] },
          [7, 4],
        ),
        // The stiff bristles round the rim that close like teeth.
        ...Array.from({ length: 6 }, (_, index) => {
          const angle = -1.15 + (index * 2.3) / 5;
          const out: [number, number] = [
            side * Math.cos(angle),
            Math.sin(angle),
          ];
          return spike(
            0.008,
            0.09,
            "#b8dc7a",
            {
              at: [side * 0.1 + out[0] * 0.14, out[1] * 0.155, 0],
              turn: [0, 0, Math.atan2(-out[0], out[1])],
            },
            3,
          );
        }),
      ],
      { turn: [0, -side * open, 0] },
    );
  const trap = (open: number): ModelPart[] => [
    slab(leafShape(0.3, 0.12), 0.012, "#7ab846", { at: [0, -0.32, 0] }),
    ...lobe(-1, open),
    ...lobe(1, open),
  ];
  return {
    body: [
      ...terracottaPot(0.26, 0.3),
      {
        ...blob([0.23, 0.05, 0.23], "#6a8a3a", { at: [0, 0.29, 0] }, [10, 5]),
        roughen: 0.3,
      },
      ...[0.3, 1.9, 3.5, 5.0].flatMap((yaw, index) =>
        grouped(
          grouped(trap(0.7 + (index % 2) * 0.15), { turn: [0.25, 0, 0] }),
          {
            at: [0.24 * Math.sin(yaw), 0.62, 0.24 * Math.cos(yaw)],
            turn: [0, yaw, 0],
          },
        ),
      ),
    ],
  };
};

const wheat = (): LabItemParts => {
  const stalk = (height: number): ModelPart[] => {
    const grains: ModelPart[] = [];
    for (let index = 0; index < 10; index++) {
      const side = index % 2 === 0 ? 1 : -1;
      const up = height + 0.03 + index * 0.024;
      grains.push(
        blob(
          [0.032, 0.052, 0.026],
          "#d9a84a",
          {
            at: [side * 0.022, up, 0],
            turn: [0, 0, -side * 0.35],
          },
          [5, 3],
        ),
        spike(
          0.004,
          0.14,
          "#e6c27a",
          {
            at: [side * 0.05, up + 0.09, 0],
            turn: [0, 0, -side * 0.3],
          },
          3,
        ),
      );
    }
    return [
      taper([0.009, 0.012], height, "#d9b45a", { at: [0, height / 2, 0] }, 5),
      ...grains,
      blob(
        [0.02, 0.04, 0.02],
        "#d9a84a",
        { at: [0, height + 0.29, 0] },
        [5, 3],
      ),
    ];
  };
  return {
    body: [
      ...[
        [0, 0, 0.95],
        [-0.2, 0.6, 0.88],
        [0.2, -0.5, 0.9],
        [-0.36, 1.6, 0.8],
        [0.36, 2.6, 0.82],
      ].flatMap(([lean = 0, yaw = 0, height = 0]) =>
        grouped(stalk(height), { at: [0, 0, 0], turn: [0, yaw, lean] }),
      ),
      taper([0.035, 0.035], 0.04, "#8a5a2a", { at: [0, 0.32, 0] }, 10),
      ...mirrored((side) =>
        leaf(0.45, 0.05, "#c9a54e", {
          at: [side * 0.02, 0.15, 0.02],
          turn: [0, 0, -side * 0.35],
        }),
      ),
    ],
  };
};

// --- Bread, bakes and treats ---------------------------------------------

const bread = (): LabItemParts => ({
  body: [
    part(
      softBox([0.86, 0.36, 0.48], 0.07),
      "#dba55e",
      { at: [0, 0.18, 0] },
      smooth,
    ),
    // The domed top that rose up over the tin.
    blob([0.42, 0.22, 0.26], "#c4803a", { at: [0, 0.36, 0] }),
    blob([0.12, 0.05, 0.05], "#dda060", { at: [-0.2, 0.5, 0.18] }, [6, 4]),
    // The cut end, showing the soft crumb inside the crust.
    block([0.01, 0.3, 0.42], "#f6ead0", { at: [0.434, 0.18, 0] }),
    blob([0.006, 0.19, 0.23], "#f6ead0", { at: [0.434, 0.37, 0] }, [10, 6]),
  ],
});

const breadDough = (): LabItemParts => ({
  body: [
    bowl(0.5, 0.42, "#5b8fc9", 0.6, 20),
    taper([0.5, 0.5], 0.03, "#f3efe6", { at: [0, 0.415, 0] }, 20),
    blob([0.4, 0.26, 0.4], "#f3e2c0", { at: [0, 0.42, 0] }),
    blob([0.12, 0.06, 0.05], "#fff3dc", { at: [-0.12, 0.6, 0.22] }, [6, 4]),
  ],
});

const breadSlice = (scale: number): Shape => {
  const shape = new Shape();
  const at = (x: number, y: number): [number, number] => [
    x * scale,
    0.48 + (y - 0.48) * scale,
  ];
  shape.moveTo(...at(-0.4, 0));
  shape.lineTo(...at(0.4, 0));
  shape.lineTo(...at(0.4, 0.58));
  shape.bezierCurveTo(...at(0.6, 0.64), ...at(0.56, 0.98), ...at(0.2, 0.93));
  shape.quadraticCurveTo(...at(0, 0.99), ...at(-0.2, 0.93));
  shape.bezierCurveTo(...at(-0.56, 0.98), ...at(-0.6, 0.64), ...at(-0.4, 0.58));
  shape.lineTo(...at(-0.4, 0));
  return shape;
};

const slice = (
  crust: string,
  crumb: string,
  extras: ModelPart[],
): LabItemParts => ({
  body: grouped(
    [
      slab(breadSlice(1), 0.08, crust, {}, 0, 6),
      slab(breadSlice(0.88), 0.096, crumb, {}, 0, 6),
      ...extras,
    ],
    { turn: [-0.3, 0, 0] },
  ),
});

const breadHoles = (colour: string): ModelPart[] =>
  [
    [-0.2, 0.25],
    [0.15, 0.18],
    [0.05, 0.45],
    [-0.15, 0.62],
    [0.22, 0.58],
    [-0.02, 0.75],
    [0.25, 0.35],
  ].map(([x = 0, y = 0]) =>
    blob([0.025, 0.018, 0.006], colour, { at: [x, y, 0.05] }, [5, 3]),
  );

const sliceOfBread = (): LabItemParts =>
  slice("#c98a3e", "#fff8e8", breadHoles("#eadcbc"));

const toast = (): LabItemParts =>
  slice("#8a4e1e", "#d99a48", [
    ...breadHoles("#b97a34"),
    ...[
      [-0.22, 0.4],
      [0.2, 0.7],
      [0.1, 0.12],
    ].map(([x = 0, y = 0]) =>
      blob([0.1, 0.07, 0.006], "#bd7a32", { at: [x, y, 0.05] }, [6, 4]),
    ),
    // A pat of butter melting on top.
    block([0.2, 0.16, 0.04], "#fbe38a", {
      at: [0.02, 0.48, 0.065],
      turn: [0, 0, 0.2],
    }),
    blob([0.14, 0.11, 0.008], "#f6d66a", { at: [0.02, 0.45, 0.052] }, [8, 4]),
  ]);

const cake = (): LabItemParts => {
  const icing = "#fbf7f0";
  return {
    body: [
      taper([0.62, 0.56], 0.04, plateWhite, { at: [0, 0.02, 0] }, 24),
      taper([0.45, 0.45], 0.2, "#e3b46a", { at: [0, 0.14, 0] }, 24),
      taper([0.452, 0.452], 0.04, "#c2283c", { at: [0, 0.26, 0] }, 24),
      taper([0.45, 0.45], 0.18, "#e3b46a", { at: [0, 0.37, 0] }, 24),
      taper([0.47, 0.47], 0.05, icing, { at: [0, 0.48, 0] }, 24),
      ...Array.from({ length: 11 }, (_, index) => {
        const around = (index * turnFull) / 11;
        const drop = 0.05 + (index % 3) * 0.03;
        return rod(
          0.035,
          drop,
          icing,
          {
            at: [
              0.45 * Math.sin(around),
              0.46 - drop / 2,
              0.45 * Math.cos(around),
            ],
          },
          6,
        );
      }),
      blob([0.12, 0.05, 0.12], icing, { at: [0, 0.52, 0] }, [10, 5]),
      blob([0.08, 0.08, 0.08], cherryRed, { at: [0, 0.62, 0] }, [10, 7]),
      blob(
        [0.015, 0.025, 0.01],
        "#ff9a9a",
        { at: [-0.035, 0.65, 0.07] },
        [4, 3],
      ),
      tube(
        [
          [0, 0.68, 0],
          [0.04, 0.78, -0.01],
          [0.09, 0.84, -0.02],
        ],
        0.01,
        "#5f7a2a",
        4,
        4,
      ),
    ],
  };
};

const cupcake = (): LabItemParts => {
  const helix: Triple[] = Array.from({ length: 26 }, (_, index) => {
    const t = index / 25;
    const angle = t * turnFull * 2.4;
    const radius = 0.25 * (1 - t * 0.85);
    return [
      radius * Math.sin(angle),
      0.46 + t * 0.32,
      radius * Math.cos(angle),
    ];
  });
  const sprinkleColours = ["#ff5a8a", "#4ac0f0", "#ffd23f", "#7ad06a"];
  return {
    body: [
      part(
        reshape(
          lathe(
            [
              [0.001, 0],
              [0.2, 0],
              [0.29, 0.36],
              [0.001, 0.36],
            ],
            32,
          ),
          ribs(16, 0.05),
        ),
        "#f4a6c0",
        {},
      ),
      blob([0.31, 0.12, 0.31], "#d99a4e", { at: [0, 0.37, 0] }),
      tube(helix, 0.075, "#fde6ef", 44, 6),
      spike(0.07, 0.12, "#fde6ef", { at: [0, 0.82, 0] }, 8),
      ...Array.from({ length: 9 }, (_, index) => {
        const point = helix[3 + index * 2] ?? [0, 0, 0];
        return block(
          [0.04, 0.012, 0.012],
          sprinkleColours[index % 4] ?? "#ff5a8a",
          {
            at: [point[0] * 1.3, point[1] + 0.06, point[2] * 1.3],
            turn: [index, index * 2, index * 3],
          },
        );
      }),
      blob([0.075, 0.075, 0.075], cherryRed, { at: [0, 0.9, 0] }, [10, 7]),
      blob(
        [0.014, 0.022, 0.01],
        "#ff9a9a",
        { at: [-0.032, 0.93, 0.065] },
        [4, 3],
      ),
      tube(
        [
          [0, 0.96, 0],
          [0.03, 1.04, 0],
          [0.07, 1.09, -0.01],
        ],
        0.01,
        "#5f7a2a",
        4,
        4,
      ),
    ],
  };
};

const chocolateBar = (): LabItemParts => {
  const chocolate = "#5a3220";
  const squares: ModelPart[] = [];
  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 3; column++) {
      squares.push(
        block([0.14, 0.14, 0.03], "#6e3d24", {
          at: [-0.16 + column * 0.16, 0.62 + row * 0.16, 0.035],
        }),
      );
    }
  }
  return {
    body: grouped(
      [
        block([0.5, 0.98, 0.05], chocolate, { at: [0, 0.49, 0] }),
        ...squares,
        block([0.54, 0.5, 0.1], "#6a2d8c", { at: [0, 0.25, 0] }),
        block([0.545, 0.06, 0.105], "#e8b830", { at: [0, 0.18, 0] }),
        // The silver foil peeling back above the wrapper.
        {
          ...part(
            reshape(new BoxGeometry(0.52, 0.12, 0.09, 6, 2, 1), (point) => {
              point.y += 0.025 * Math.sin(point.x * 40) * (point.y > 0 ? 1 : 0);
            }),
            "#d8dde3",
            { at: [0, 0.54, 0] },
          ),
        },
      ],
      { turn: [-0.2, 0, 0] },
    ),
  };
};

const croissant = (): LabItemParts => {
  const angles = [-1.05, -0.78, -0.42, 0, 0.42, 0.78, 1.05];
  const sizes = [0.45, 0.65, 0.85, 1, 0.85, 0.65, 0.45];
  const segments = angles.map((angle, index) => {
    const size = sizes[index] ?? 1;
    const colour =
      size < 0.5 ? "#b06a24" : index % 2 === 0 ? "#d48a2e" : "#e6aa4e";
    return blob(
      [0.14 * size, 0.17 * size, 0.25 * size],
      colour,
      {
        at: [0.4 * Math.sin(angle), 0.17 * size, -0.4 * Math.cos(angle) + 0.3],
        turn: [0, -angle, 0],
      },
      [10, 7],
    );
  });
  return {
    body: grouped(
      [
        ...segments,
        // The fine flaky ridges across the middle roll.
        ...[-0.07, 0.07].map((x) =>
          blob([0.012, 0.16, 0.22], "#c27a28", { at: [x, 0.17, -0.1] }, [6, 5]),
        ),
      ],
      { turn: [0.6, 0, 0] },
    ),
  };
};

const crisps = (): LabItemParts => {
  const bag = reshape(new BoxGeometry(0.6, 0.8, 0.24, 6, 8, 1), (point) => {
    const across = Math.min(1, Math.abs(point.x) / 0.3);
    const up = Math.min(1, Math.abs(point.y) / 0.4);
    point.z *= Math.sqrt(Math.max(0, 1 - across ** 4)) * (1 - up ** 6) + 0.04;
  });
  const crisp = (placement: Placement): ModelPart =>
    part(
      reshape(new SphereGeometry(1, 8, 5), (point) => {
        point.z += 0.25 * Math.sin(point.x * 5) * Math.cos(point.y * 3);
      }),
      "#f2c14e",
      { ...placement, size: [0.12, 0.1, 0.02] },
      smooth,
    );
  const crimp = (y: number): ModelPart[] => [
    block([0.62, 0.08, 0.025], "#b81d26", { at: [0, y, 0] }),
    ...Array.from({ length: 9 }, (_, index) =>
      block([0.012, 0.08, 0.03], "#8f141c", {
        at: [-0.28 + index * 0.07, y, 0],
      }),
    ),
  ];
  return {
    body: [
      part(bag, "#d8282f", { at: [0, 0.48, 0] }, smooth),
      ...crimp(0.89),
      ...crimp(0.07),
      // A picture of a crisp on the front of the bag.
      blob([0.17, 0.14, 0.03], "#f7e27a", { at: [0, 0.48, 0.115] }, [10, 6]),
      crisp({ at: [0, 0.48, 0.14], turn: [0, 0, 0.3] }),
      blob(
        [0.2, 0.05, 0.03],
        "#ffffff",
        { at: [0, 0.72, 0.1], turn: [-0.3, 0, 0] },
        [8, 4],
      ),
      crisp({ at: [0.24, 0.07, 0.24], turn: [-0.9, 0, 0.4] }),
      crisp({ at: [-0.2, 0.06, 0.26], turn: [-1.0, 0.5, -0.3] }),
    ],
  };
};

const hotChocolate = (): LabItemParts => {
  const steam = (x: number, z: number, lean: number): ModelPart =>
    tube(
      [
        [x, 0.72, z],
        [x + 0.05 * lean, 0.84, z],
        [x - 0.04 * lean, 0.96, z],
        [x + 0.03 * lean, 1.08, z],
      ],
      0.022,
      "#ffffff",
      10,
      5,
    );
  return {
    body: [
      turned(
        [
          [0.001, 0],
          [0.25, 0],
          [0.27, 0.02],
          [0.28, 0.52],
          [0.25, 0.53],
          [0.24, 0.46],
          [0.001, 0.46],
        ],
        "#c8343a",
        {},
        20,
      ),
      part(
        new TorusGeometry(0.13, 0.035, 6, 12, Math.PI * 1.1),
        "#c8343a",
        {
          at: [0.28, 0.27, 0],
          turn: [0, 0, -quarter - 0.15],
        },
        smooth,
      ),
      taper([0.245, 0.245], 0.02, "#6b3a22", { at: [0, 0.47, 0] }, 18),
      taper([0.283, 0.283], 0.06, "#f4e8d8", { at: [0, 0.3, 0] }, 20),
      blob([0.22, 0.1, 0.22], "#fffaf0", { at: [0, 0.52, 0] }),
      blob([0.15, 0.08, 0.15], "#fffaf0", { at: [0.02, 0.61, 0] }, [10, 6]),
      spike(
        0.08,
        0.12,
        "#fffaf0",
        { at: [0.03, 0.7, 0], turn: [0, 0, -0.3] },
        8,
      ),
      // A dusting of cocoa on the cream.
      ...(
        [
          [0.08, 0.6, 0.1],
          [-0.08, 0.59, 0.11],
          [0.12, 0.55, -0.05],
          [-0.02, 0.66, 0.08],
          [0.15, 0.56, 0.07],
        ] satisfies Triple[]
      ).map((at) => blob([0.016, 0.008, 0.016], "#7a4426", { at }, [5, 3])),
    ],
    glass: [steam(-0.12, 0, 1), steam(0.13, -0.05, -1), steam(0.0, -0.12, 1)],
  };
};

const iceLolly = (): LabItemParts => {
  const rounded = (
    width: number,
    bottom: number,
    top: number,
    round: number,
  ): Shape => {
    const shape = new Shape();
    shape.moveTo(-width, bottom);
    shape.lineTo(width, bottom);
    shape.lineTo(width, top - round);
    shape.quadraticCurveTo(width, top, width - round, top);
    shape.lineTo(-width + round, top);
    shape.quadraticCurveTo(-width, top, -width, top - round);
    shape.lineTo(-width, bottom);
    return shape;
  };
  return {
    body: [
      slab(
        rounded(0.2, 0.28, 0.58, 0.02),
        0.12,
        "#f7b81e",
        { at: [0, 0, 0] },
        0.04,
        3,
      ),
      slab(
        rounded(0.2, 0.58, 1.0, 0.18),
        0.12,
        "#e3213a",
        { at: [0, 0, 0] },
        0.04,
        4,
      ),
      blob([0.04, 0.14, 0.02], "#ff8a95", { at: [-0.1, 0.8, 0.1] }, [5, 4]),
      block([0.08, 0.36, 0.035], "#e2c08a", { at: [0, 0.14, 0] }),
      blob([0.04, 0.03, 0.0175], "#e2c08a", { at: [0, -0.04, 0] }, [8, 4]),
    ],
  };
};

const sweet = (): LabItemParts => {
  const end = (side: -1 | 1): ModelPart[] => [
    taper(
      [0.05, 0.035],
      0.06,
      "#b81f6a",
      {
        at: [side * 0.23, 0.28, 0],
        turn: [0, 0, quarter],
      },
      8,
    ),
    part(new ConeGeometry(0.16, 0.18, 10).toNonIndexed(), "#d6287a", {
      at: [side * 0.34, 0.28, 0],
      turn: [0, 0, side * quarter],
      size: [1, 1, 0.55],
    }),
  ];
  return {
    body: [
      blob([0.22, 0.17, 0.16], "#d6287a", { at: [0, 0.28, 0] }),
      ...end(-1),
      ...end(1),
      // Bright stripes printed on the wrapper.
      ...[-0.11, 0, 0.11].map((x) =>
        blob(
          [0.03, 0.15, 0.05],
          "#ffd23f",
          { at: [x, 0.28, 0.12 - Math.abs(x) * 0.25], turn: [0, x * 3, 0.3] },
          [6, 5],
        ),
      ),
      blob([0.05, 0.03, 0.02], "#ffffff", { at: [-0.08, 0.4, 0.12] }, [5, 3]),
    ],
  };
};

const bacon = (): LabItemParts => {
  // Streaky bacon's bands of fat and lean, from one edge to the other.
  const bands: [number, string][] = [
    [0.05, "#f6e4d6"],
    [0.07, "#c9524c"],
    [0.025, "#f6e4d6"],
    [0.06, "#b8443f"],
    [0.03, "#f2d8c8"],
  ];
  const rasher = (placement: Placement): ModelPart[] => {
    let edge = -0.12;
    return grouped(
      bands.map(([width, colour]) => {
        const strip = new BoxGeometry(width + 0.004, 0.03, 1, 1, 1, 12);
        strip.translate(edge + width / 2, 0, 0);
        edge += width;
        return part(
          reshape(strip, (point) => {
            point.y += 0.05 * Math.sin(point.z * 11);
          }),
          colour,
        );
      }),
      placement,
    );
  };
  return {
    body: [
      ...rasher({ at: [-0.14, 0.45, 0], turn: [1.15, 0, 0.12] }),
      ...rasher({ at: [0.16, 0.45, 0.06], turn: [1.15, 0, -0.18] }),
    ],
  };
};

// --- Bowls, plates and packets -----------------------------------------

const tiltedBowl = (parts: ModelPart[], tilt = 0.32): ModelPart[] =>
  grouped(parts, { turn: [tilt, 0, 0] });

const couscous = (): LabItemParts => {
  const next = random(13);
  const grains = Array.from({ length: 34 }, (_, index) => {
    const at = onMound(
      0.47,
      0.34,
      0.2,
      Math.sqrt(next()) * 0.92,
      next() * turnFull,
    );
    const colour =
      index % 9 === 0
        ? "#4f9a2e"
        : index % 11 === 0
          ? "#d8452a"
          : index % 2 === 0
            ? "#f6d985"
            : "#d9ab4f";
    return blob([0.025, 0.02, 0.025], colour, { at }, [4, 3]);
  });
  return {
    body: tiltedBowl([
      bowl(0.5, 0.36, "#2f7fa8"),
      { ...mound(0.47, 0.34, 0.2, "#e9c46a"), roughen: 0.06 },
      ...grains,
    ]),
  };
};

const rice = (): LabItemParts => {
  const next = random(17);
  const grains = Array.from({ length: 44 }, () => {
    const at = onMound(
      0.47,
      0.34,
      0.24,
      Math.sqrt(next()) * 0.95,
      next() * turnFull,
    );
    return blob(
      [0.035, 0.014, 0.014],
      next() > 0.5 ? "#ffffff" : "#ece8dc",
      { at, turn: [next() * 0.6, next() * turnFull, next() * 0.6] },
      [4, 3],
    );
  });
  return {
    body: [
      ...tiltedBowl([
        bowl(0.5, 0.36, "#2f5fae"),
        taper([0.505, 0.5], 0.035, "#f4f2ec", { at: [0, 0.335, 0] }, 18),
        mound(0.47, 0.34, 0.24, "#f7f4ea"),
        ...grains,
      ]),
      ...mirrored((side) =>
        rod(
          0.014,
          1.0,
          "#8a5a32",
          {
            at: [side * 0.05 + 0.08, 0.56, -0.12],
            turn: [0, 0, quarter - 0.15 + side * 0.03],
          },
          5,
        ),
      ),
    ],
  };
};

const soup = (): LabItemParts => {
  const swirl: Triple[] = Array.from({ length: 14 }, (_, index) => {
    const angle = index * 0.6;
    const radius = 0.02 + index * 0.016;
    return [radius * Math.sin(angle), 0.312, radius * Math.cos(angle)];
  });
  return {
    body: tiltedBowl(
      [
        bowl(0.5, 0.34, "#f2efe6"),
        taper([0.46, 0.46], 0.02, "#ec8a2a", { at: [0, 0.3, 0] }, 20),
        tube(swirl, 0.014, "#fff4e2", 18, 4),
        ...[
          [0.25, 0.1],
          [-0.2, 0.2],
          [0.1, -0.28],
          [-0.28, -0.05],
          [0.18, 0.26],
        ].map(([x = 0, z = 0]) =>
          blob([0.025, 0.006, 0.018], "#3f8a2a", { at: [x, 0.312, z] }, [5, 3]),
        ),
        ...[
          [-0.12, 0.3],
          [0.28, -0.1],
          [-0.3, -0.18],
        ].map(([x = 0, z = 0], index) =>
          block([0.07, 0.05, 0.07], "#d9a04a", {
            at: [x, 0.32, z],
            turn: [0.2, index, 0.1],
          }),
        ),
        ...spoon({ at: [0.18, 0.42, -0.2], turn: [0.3, 0, -0.65] }),
      ],
      0.42,
    ),
  };
};

const sugar = (): LabItemParts => {
  const next = random(29);
  const crystals = Array.from({ length: 34 }, (_, index) => {
    const at = onMound(
      0.47,
      0.34,
      0.22,
      Math.sqrt(next()) * 0.95,
      next() * turnFull,
    );
    return block([0.03, 0.03, 0.03], index % 3 === 0 ? "#eef4ff" : "#ffffff", {
      at,
      turn: [next() * 3, next() * 3, next() * 3],
    });
  });
  return {
    body: tiltedBowl([
      bowl(0.5, 0.36, "#d24a3a"),
      { ...mound(0.47, 0.34, 0.22, "#f7f7f2"), roughen: 0.05 },
      ...crystals,
      ...spoon({ at: [0.2, 0.62, -0.05], turn: [0.1, 0, -0.75] }),
    ]),
  };
};

const pasta = (): LabItemParts => {
  const next = random(31);
  const penne = (placement: Placement): ModelPart[] => {
    const shear = (point: Vector3): void => {
      point.y += point.x * 0.8;
    };
    const outer = reshape(
      reshape(
        new CylinderGeometry(0.07, 0.07, 0.46, 16, 1, true),
        ribs(8, 0.07),
      ),
      shear,
    );
    const inner = reshape(
      new CylinderGeometry(0.05, 0.05, 0.46, 10, 1, true),
      shear,
    );
    return grouped(
      [
        part(outer, "#f2c45a", {}, smooth),
        part(insideOut(inner), "#d9a03e", {}, smooth),
      ],
      placement,
    );
  };
  const spots: Triple[] = [
    [0, 0.3, 0],
    [-0.2, 0.18, 0.1],
    [0.2, 0.18, 0.08],
    [0.02, 0.18, -0.16],
    [-0.04, 0.14, 0.24],
    [-0.32, 0.1, -0.08],
    [0.32, 0.1, -0.06],
    [0.18, 0.1, 0.28],
  ];
  return {
    body: [
      taper([0.55, 0.42], 0.05, plateWhite, { at: [0, 0.025, 0] }, 20),
      ...spots.flatMap((at, index) =>
        penne({
          at,
          turn: [
            quarter + (next() - 0.5) * 1.2,
            index * 0.9 + next(),
            (next() - 0.5) * 0.8,
          ],
        }),
      ),
    ],
  };
};

const pizza = (): LabItemParts => {
  const next = random(37);
  const pepperoni: [number, number][] = [
    [0, 0],
    [0.24, 0.1],
    [-0.22, 0.14],
    [0.05, 0.27],
    [-0.08, -0.25],
    [0.22, -0.18],
    [-0.28, -0.1],
    [0.3, 0.3 - 0.36],
  ];
  return {
    body: grouped(
      [
        taper([0.5, 0.48], 0.04, "#e8c27a", { at: [0, 0.02, 0] }, 24),
        part(
          new TorusGeometry(0.48, 0.055, 6, 26),
          "#d69a4e",
          {
            at: [0, 0.05, 0],
            turn: [quarter, 0, 0],
          },
          smooth,
        ),
        taper([0.44, 0.44], 0.02, "#c4321f", { at: [0, 0.045, 0] }, 24),
        ...Array.from({ length: 9 }, (_, index) => {
          const around = index * 0.7;
          const distance = 0.08 + (index % 3) * 0.1;
          return blob(
            [0.12 + next() * 0.05, 0.012, 0.1 + next() * 0.05],
            "#f6d679",
            {
              at: [
                distance * Math.sin(around),
                0.058,
                distance * Math.cos(around),
              ],
              turn: [0, around, 0],
            },
            [8, 3],
          );
        }),
        ...pepperoni.flatMap(([x, z]): ModelPart[] => [
          taper([0.065, 0.065], 0.02, "#a8282a", { at: [x, 0.072, z] }, 12),
          blob(
            [0.012, 0.004, 0.012],
            "#7a1418",
            { at: [x + 0.02, 0.083, z - 0.01] },
            [4, 3],
          ),
        ]),
        ...[
          [0.12, 0.12, 0.4],
          [-0.18, -0.02, 1.8],
          [0.14, -0.3, 3.2],
        ].map(([x = 0, z = 0, yaw = 0]) =>
          leaf(0.1, 0.08, "#2f8a2a", {
            at: [x, 0.085, z],
            turn: [-quarter, 0, yaw],
          }),
        ),
      ],
      { turn: [1.05, 0, 0] },
    ),
  };
};

const cheese = (): LabItemParts => {
  const shape = new Shape();
  shape.moveTo(0, 0);
  shape.absarc(0, 0, 0.9, -0.38, 0.38, false);
  shape.lineTo(0, 0);
  const wedge = new ExtrudeGeometry(shape, {
    depth: 0.4,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 1,
    curveSegments: 8,
  });
  const dents: Triple[] = [
    [0.45, 0.415, 0.05],
    [0.62, 0.415, -0.12],
    [0.3, 0.415, -0.04],
    [0.7, 0.415, 0.14],
  ];
  return {
    body: grouped(
      [
        part(wedge, "#f2b33d", { turn: [-quarter, 0, 0] }),
        // A darker band of rind along the curved back.
        part(
          new CylinderGeometry(
            0.915,
            0.915,
            0.41,
            10,
            1,
            true,
            quarter - 0.38,
            0.76,
          ),
          "#d9922a",
          { at: [0, 0.2, 0] },
        ),
        ...dents.map(([x, y, z]) =>
          blob([0.035, 0.008, 0.03], "#d99a2a", { at: [x, y, z] }, [6, 3]),
        ),
      ],
      { at: [-0.4, 0, 0], turn: [0.25, -0.6, 0] },
    ),
  };
};

const cocoaPod = (): LabItemParts => {
  const podOutline: Outline = [
    [0, 0],
    [0.06, 0.05],
    [0.15, 0.2],
    [0.2, 0.4],
    [0.2, 0.56],
    [0.16, 0.76],
    [0.08, 0.92],
    [0, 0.98],
  ];
  const half = reshape(
    new LatheGeometry(
      podOutline.map(([across, up]) => new Vector2(across, up)),
      15,
      0,
      Math.PI,
    ),
    ribs(10, 0.09),
  );
  const beans = Array.from({ length: 8 }, (_, index) => {
    const up = 0.24 + (index >> 1) * 0.14;
    const side = index % 2 === 0 ? -1 : 1;
    return blob(
      [0.02, 0.065, 0.05],
      "#7a3e30",
      { at: [-0.01, up, side * 0.065] },
      [6, 4],
    );
  });
  return {
    body: [
      ...grouped(
        [
          part(
            reshape(lathe(podOutline, 30), ribs(10, 0.09)),
            "#e8a02a",
            {},
            smooth,
          ),
          spike(0.03, 0.08, stalkBrown, { at: [0, 0.99, 0] }, 6),
        ],
        { at: [0.1, 0, -0.15], turn: [0, 0, 0.35] },
      ),
      ...grouped(
        [
          part(half, "#d98a2a", {}, smooth),
          blob([0.02, 0.4, 0.16], "#f3ecd9", { at: [0, 0.48, 0] }, [10, 6]),
          ...beans,
        ],
        { at: [-0.25, 0.2, 0.3], turn: [0.9, 0.3, -quarter] },
      ),
    ],
  };
};

const jamJar = (): LabItemParts => {
  const jam: Outline = [
    [0.001, 0.0],
    [0.25, 0.0],
    [0.28, 0.04],
    [0.28, 0.56],
    [0.001, 0.56],
  ];
  return {
    body: [
      turned(jam, "#a50d26", {}, 20),
      ...[
        [0.5, 0.12],
        [1.2, 0.48],
        [-0.4, 0.5],
        [2.0, 0.2],
        [-1.4, 0.3],
        [-0.9, 0.08],
      ].map(([around = 0, up = 0]) =>
        blob(
          [0.05, 0.04, 0.02],
          "#6e0518",
          {
            at: [0.278 * Math.sin(around), up, 0.278 * Math.cos(around)],
            turn: [0, around, 0],
          },
          [6, 4],
        ),
      ),
      // The glint of light on the glass.
      blob(
        [0.025, 0.16, 0.01],
        "#ffd6dc",
        { at: [-0.16, 0.32, 0.23], turn: [0, -0.6, 0] },
        [5, 4],
      ),
      part(
        reshape(new CylinderGeometry(0.25, 0.25, 0.1, 24, 1), ribs(24, 0.02)),
        "#d9a92a",
        { at: [0, 0.77, 0] },
        smooth,
      ),
      taper([0.284, 0.284], 0.22, "#fbf4e4", { at: [0, 0.27, 0] }, 20),
      // The strawberry drawn on the label.
      blob([0.07, 0.08, 0.02], "#d81e2e", { at: [0, 0.25, 0.285] }, [8, 5]),
      blob([0.06, 0.02, 0.02], "#3f8f2e", { at: [0, 0.32, 0.283] }, [6, 3]),
    ],
    glass: [
      turned(
        [
          [0.284, 0.54],
          [0.284, 0.57],
          [0.245, 0.645],
          [0.235, 0.72],
        ],
        "#e8f4f8",
        {},
        20,
      ),
    ],
  };
};

const oliveOil = (): LabItemParts => {
  const bottle: Outline = [
    [0.001, 0],
    [0.17, 0],
    [0.18, 0.02],
    [0.18, 0.6],
    [0.14, 0.7],
    [0.06, 0.78],
    [0.055, 0.9],
    [0.065, 0.92],
    [0.065, 0.95],
    [0.001, 0.95],
  ];
  return {
    body: [
      turned(
        [
          [0.001, 0.02],
          [0.165, 0.02],
          [0.168, 0.6],
          [0.12, 0.69],
          [0.001, 0.69],
        ],
        "#c9b02a",
        {},
        16,
      ),
      taper([0.05, 0.045], 0.09, "#c39a6b", { at: [0, 0.98, 0] }, 10),
      // A sprig of olives lying in front of the bottle.
      tube(
        [
          [-0.28, 0.02, 0.24],
          [-0.1, 0.03, 0.27],
          [0.12, 0.02, 0.26],
        ],
        0.008,
        "#6b5a3a",
        4,
        3,
      ),
      ...[
        [-0.16, 0.25],
        [-0.04, 0.3],
        [0.07, 0.22],
      ].map(([x = 0, z = 0]) =>
        blob([0.05, 0.035, 0.035], "#7f9a2e", { at: [x, 0.04, z] }, [8, 5]),
      ),
      ...[
        [-0.24, 0.6],
        [0.0, -0.5],
        [0.14, 0.4],
      ].map(([x = 0, yaw = 0]) =>
        leaf(0.18, 0.05, "#8fa37a", {
          at: [x, 0.02, 0.27],
          turn: [-quarter + 0.3, 0, yaw + quarter],
        }),
      ),
    ],
    glass: [turned(bottle, "#d6e8c8", {}, 16)],
  };
};

const prawn = (): LabItemParts => {
  const centre: [number, number] = [0, 0.38];
  const arc = 0.24;
  const onArc = (angle: number, inset = 0): Triple => [
    centre[0] + (arc - inset) * Math.cos(angle),
    centre[1] + (arc - inset) * Math.sin(angle),
    0,
  ];
  const segments = [0.14, 0.13, 0.12, 0.105, 0.09, 0.075].map(
    (radius, index) => ({ angle: 2.2 - index * 0.53, radius }),
  );
  const headAngle = 2.85;
  const head = onArc(headAngle);
  const tailAngle = -0.85;
  const tail = onArc(tailAngle);
  return {
    body: [
      ...segments.flatMap(({ angle, radius }, index): ModelPart[] => [
        blob(
          [radius * 0.9, radius * 1.05, radius * 0.95],
          index % 2 === 0 ? "#f27a52" : "#f58e66",
          { at: onArc(angle), turn: [0, 0, angle] },
          [8, 6],
        ),
        // The pale stripe across each segment's back.
        blob(
          [radius * 0.25, radius * 0.6, radius * 0.9],
          "#fbd0bc",
          { at: onArc(angle, -radius * 0.75), turn: [0, 0, angle] },
          [6, 4],
        ),
      ]),
      blob(
        [0.2, 0.14, 0.13],
        "#ee6e48",
        { at: head, turn: [0, 0, headAngle + quarter] },
        [10, 7],
      ),
      spike(
        0.025,
        0.16,
        "#e8603c",
        {
          at: onArc(headAngle + 0.75, 0.02),
          turn: [0, 0, headAngle + Math.PI + 0.2],
        },
        5,
      ),
      ...mirrored((side) => [
        blob(
          [0.03, 0.03, 0.03],
          "#1a1414",
          { at: [head[0] - 0.04, head[1] - 0.06, side * 0.1] },
          [6, 4],
        ),
        tube(
          [
            [head[0] - 0.08, head[1] - 0.08, side * 0.06],
            [head[0] - 0.2, head[1] + 0.1, side * 0.09],
            [head[0] + 0.05, head[1] + 0.32, side * 0.1],
            [head[0] + 0.42, head[1] + 0.3, side * 0.1],
          ],
          0.007,
          "#e8603c",
          10,
          3,
        ),
      ]),
      // Little legs tucked inside the curl.
      ...segments.slice(0, 4).flatMap(({ angle, radius }) =>
        mirrored((side) => {
          const [x, y] = onArc(angle, radius * 0.9);
          return rod(
            0.012,
            0.07,
            "#f6a888",
            { at: [x, y, side * 0.05], turn: [0, 0, angle + quarter] },
            4,
          );
        }),
      ),
      ...[-0.45, 0, 0.45].map((spread) => {
        const away: [number, number] = [
          Math.sin(tailAngle),
          -Math.cos(tailAngle),
        ];
        return spike(
          0.06,
          0.2,
          spread === 0 ? "#d9502e" : "#e8603c",
          {
            at: [
              tail[0] + away[0] * 0.1,
              tail[1] + away[1] * 0.1,
              spread * 0.04,
            ],
            turn: [0, 0, Math.atan2(-away[0], away[1]) + spread],
            size: [1, 1, 0.3],
          },
          5,
        );
      }),
    ],
  };
};

const salmon = (): LabItemParts => {
  const shape = new Shape();
  shape.moveTo(-0.5, 0.04);
  shape.quadraticCurveTo(-0.45, 0.2, 0, 0.22);
  shape.quadraticCurveTo(0.4, 0.2, 0.5, 0.06);
  shape.quadraticCurveTo(0.52, -0.02, 0.45, -0.06);
  shape.quadraticCurveTo(0, -0.18, -0.45, -0.08);
  shape.quadraticCurveTo(-0.52, -0.04, -0.5, 0.04);
  return {
    body: grouped(
      [
        slab(shape, 0.06, "#9aa3ab", { at: [0, 0, -0.07] }, 0.02, 6),
        slab(shape, 0.12, "#f5845c", {}, 0.03, 6),
        // The white lines of fat across the fillet.
        ...[-0.36, -0.22, -0.08, 0.06, 0.2, 0.34].map((x) =>
          tube(
            [
              [x - 0.04, 0.16, 0.09],
              [x + 0.03, 0.04, 0.095],
              [x - 0.02, -0.1, 0.09],
            ],
            0.01,
            "#ffd9c4",
            4,
            3,
          ),
        ),
      ],
      { at: [0, 0.25, 0], turn: [-0.45, 0.2, 0] },
    ),
  };
};

const tofu = (): LabItemParts => {
  const white = "#f4efe2";
  const cube = (at: Triple, yaw: number): ModelPart =>
    part(
      softBox([0.15, 0.15, 0.15], 0.02),
      white,
      { at, turn: [0, yaw, 0] },
      smooth,
    );
  return {
    body: [
      block([1.0, 0.06, 0.7], "#c89a62", { at: [0, 0.03, 0] }),
      part(
        softBox([0.5, 0.34, 0.42], 0.03),
        white,
        { at: [-0.15, 0.23, -0.06] },
        smooth,
      ),
      cube([0.22, 0.135, 0.18], 0.3),
      cube([0.33, 0.135, -0.02], -0.2),
      cube([0.28, 0.285, 0.08], 0.7),
      // Faint cloth marks pressed into the top.
      ...[-0.3, -0.15, 0].map((x) =>
        block([0.01, 0.004, 0.38], "#e3dccb", { at: [x, 0.401, -0.06] }),
      ),
    ],
  };
};

const yoghurt = (): LabItemParts => {
  const foil = reshape(
    new CylinderGeometry(0.25, 0.25, 0.01, 18, 1),
    (point) => {
      point.y += 1.1 * (point.z + 0.25) ** 2;
    },
  );
  return {
    body: [
      turned(
        [
          [0.001, 0],
          [0.18, 0],
          [0.235, 0.45],
          [0.255, 0.46],
          [0.255, 0.49],
          [0.22, 0.49],
          [0.215, 0.44],
          [0.001, 0.44],
        ],
        "#f7f7f4",
        {},
        20,
      ),
      taper([0.2265, 0.2085], 0.16, "#f29ab8", { at: [0, 0.28, 0] }, 20),
      blob(
        [0.05, 0.05, 0.02],
        "#d81e2e",
        { at: [0, 0.28, 0.225], turn: [-0.12, 0, 0] },
        [8, 5],
      ),
      taper([0.215, 0.215], 0.02, "#fffdf3", { at: [0, 0.445, 0] }, 18),
      // The foil lid, peeled back and curling over the far rim.
      ...grouped([part(foil, "#d4d8de", { at: [0, 0, 0.25] })], {
        at: [0, 0.49, -0.25],
        turn: [-2.0, 0, 0],
      }),
    ],
  };
};

export const plantsFoodBuilders = {
  apple,
  asparagus,
  bacon,
  banana,
  "bean-plant": beanPlant,
  bread,
  "bread-dough": breadDough,
  "brussels-sprout": brusselsSprout,
  cactus,
  cake,
  carrot,
  celery,
  cheese,
  cherry,
  "chocolate-bar": chocolateBar,
  "cocoa-pod": cocoaPod,
  couscous,
  crisps,
  croissant,
  cupcake,
  daffodil,
  daisy,
  fern,
  "flower-bulb": flowerBulb,
  "fruit-bowl": fruitBowl,
  "geranium-cutting": geraniumCutting,
  "holly-leaf": hollyLeaf,
  "hot-chocolate": hotChocolate,
  "ice-lolly": iceLolly,
  "jam-jar": jamJar,
  log,
  moss,
  mushroom,
  "olive-oil": oliveOil,
  onion,
  orange,
  pasta,
  "pine-tree": pineTree,
  pizza,
  potato,
  "bag-of-potatoes": bagOfPotatoes,
  prawn,
  raisin,
  rice,
  salmon,
  "slice-of-bread": sliceOfBread,
  toast,
  soup,
  spinach,
  strawberry,
  sugar,
  sunflower,
  sweet,
  tofu,
  toadstool,
  turnip,
  "venus-flytrap": venusFlytrap,
  wheat,
  yoghurt,
} satisfies Record<string, () => LabItemParts>;
