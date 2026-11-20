import {
  BufferAttribute,
  BufferGeometry,
  LatheGeometry,
  Path,
  Shape,
  Vector2,
  Vector3,
  type ColorRepresentation,
} from "three";
import {
  VehicleBuilder,
  addBuffers,
  buildCoachSection,
  listBreaks,
  listEvenly,
  railHalfGauge,
  wheelTread,
  type Finish,
  type Paint,
  type TrainDetail,
  type TrainModel,
  type Triple,
} from "./train-kit.js";

type Point = readonly [number, number];

const appleGreen = "#457a27";
const liningBlack = "#121413";
const liningWhite = "#ecebe1";
const engineBlack = "#1c1e1d";
const smokeboxBlack = "#202221";
const bufferRed = "#a6241c";
const brass = "#c4a050";
const steel = "#8c9198";
const tyreBlack = "#25272a";
const frameBlack = "#1e2022";
const cabDark = "#151617";
const lampWhite = "#e2e0d8";

const teak = "#9b602d";
const teakDoor = "#8d5427";
const teakBeading = "#6b3c18";
const roofWhite = "#d3d0c7";
const ventGrey = "#a7a49b";
const underframeBlack = "#1f2123";

const runningPlateY = 1.02;
const boilerCentreY = 1.55;
const loPlateHalf = 0.72;

const hash = (a: number, b: number, c: number): number => {
  const value = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43_758.5453;
  return value - Math.floor(value);
};

const toSide = ([z, y]: Point): Vector2 => new Vector2(-z, y);
const toEnd = ([x, y]: Point): Vector2 => new Vector2(x, y);

const sideShape = (
  outline: readonly Point[],
  holes: readonly (readonly Point[])[] = [],
): Shape => {
  const shape = new Shape(outline.map(toSide));
  shape.holes.push(...holes.map((hole) => new Path(hole.map(toSide))));
  return shape;
};

const endShape = (
  outline: readonly Point[],
  holes: readonly (readonly Point[])[] = [],
): Shape => {
  const shape = new Shape(outline.map(toEnd));
  shape.holes.push(...holes.map((hole) => new Path(hole.map(toEnd))));
  return shape;
};

const roundedRect = (
  left: number,
  right: number,
  bottom: number,
  top: number,
  radius: number,
  steps = 3,
): Point[] => {
  const corners: Triple[] = [
    [right - radius, bottom + radius, -Math.PI / 2],
    [right - radius, top - radius, 0],
    [left + radius, top - radius, Math.PI / 2],
    [left + radius, bottom + radius, Math.PI],
  ];
  return corners.flatMap(([centreA, centreB, start]) =>
    listEvenly(start, start + Math.PI / 2, steps).map((angle): Point => [
      centreA + radius * Math.cos(angle),
      centreB + radius * Math.sin(angle),
    ]),
  );
};

const signedArea = (points: readonly Point[]): number =>
  points.reduce((sum, [x, y], index) => {
    const [nextX, nextY] = points[(index + 1) % points.length];
    return sum + x * nextY - nextX * y;
  }, 0);

/** Moves every edge of a simple polygon inwards (or outwards when negative). */
const insetPolygon = (points: readonly Point[], distance: number): Point[] => {
  const turn = signedArea(points) > 0 ? 1 : -1;
  const count = points.length;
  const inward = ([ax, ay]: Point, [bx, by]: Point): Point => {
    const length = Math.hypot(bx - ax, by - ay);
    return [(-(by - ay) / length) * turn, ((bx - ax) / length) * turn];
  };
  return points.map((point, index) => {
    const before = points[(index - 1 + count) % count];
    const after = points[(index + 1) % count];
    const [ax, ay] = inward(before, point);
    const [bx, by] = inward(point, after);
    const reach = distance / Math.max(0.2, 1 + ax * bx + ay * by);
    return [point[0] + (ax + bx) * reach, point[1] + (ay + by) * reach];
  });
};

/** Quads given corner by corner; each is turned to face `outward`. */
const quadGeometry = (
  quads: readonly (readonly [Vector3, Vector3, Vector3, Vector3])[],
  outward: Vector3,
): BufferGeometry => {
  const positions: number[] = [];
  for (const [a, b, c, d] of quads) {
    const normal = new Vector3()
      .subVectors(b, a)
      .cross(new Vector3().subVectors(c, a));
    const corners =
      normal.dot(outward) >= 0 ? [a, b, c, a, c, d] : [a, c, b, a, d, c];
    for (const corner of corners) {
      positions.push(corner.x, corner.y, corner.z);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3),
  );
  return geometry;
};

const circleSection = (
  radius: number,
  centreY: number,
  around: number,
): Point[] =>
  Array.from({ length: around }, (_, step) => {
    const angle = -Math.PI / 2 + (step / around) * Math.PI * 2;
    return [radius * Math.cos(angle), centreY + radius * Math.sin(angle)];
  });

const mirrorRight = (right: readonly Point[]): Point[] => [
  ...right,
  ...right
    .slice(1, -1)
    .toReversed()
    .map(([x, y]): Point => [-x, y]),
];

const lerp = (from: number, to: number, share: number): number =>
  from + (to - from) * share;

/** Black band with a fine white line each side, as on LNER boiler bands. */
const bandColour = (
  z: number,
  centres: readonly number[],
): ColorRepresentation | undefined => {
  for (const centre of centres) {
    const distance = Math.abs(z - centre);
    if (distance < 0.025) {
      return liningBlack;
    }
    if (distance < 0.037) {
      return liningWhite;
    }
  }
  return undefined;
};

const bandEdges = (centres: readonly number[]): number[] =>
  centres.flatMap((centre) => [
    centre - 0.037,
    centre - 0.025,
    centre + 0.025,
    centre + 0.037,
  ]);

interface CrankPin {
  y: number;
  z: number;
}

const crankPin = (
  wheelZ: number,
  radius: number,
  throw_: number,
  angle: number,
): CrankPin => ({
  y: radius + throw_ * Math.cos(angle),
  z: wheelZ + throw_ * Math.sin(angle),
});

interface SpokedWheelStyle {
  radius: number;
  spokes: number;
  segments: number;
  centre?: ColorRepresentation;
  crankThrow?: number;
  crankAngles?: readonly [number, number];
  hasBalance?: boolean;
  hasHub?: boolean;
}

const tyrePaint =
  (
    wheelY: number,
    wheelZ: number,
    radius: number,
    centre: ColorRepresentation,
  ): Paint =>
  ({ y, z }) =>
    Math.hypot(y - wheelY, z - wheelZ) > radius * 0.9
      ? tyreBlack
      : { colour: centre, finish: "paint" };

const spokesGeometry = (
  side: number,
  radius: number,
  spokes: number,
  hasBacks: boolean,
): BufferGeometry => {
  const inner = radius * 0.2;
  const outer = radius * 0.82;
  const halfIn = radius * 0.05;
  const halfOut = radius * 0.03;
  const outerFace = side * 0.012;
  const innerFace = -side * 0.012;
  const positions: number[] = [];
  for (let spoke = 0; spoke < spokes; spoke++) {
    const angle = ((spoke + 0.5) / spokes) * Math.PI * 2;
    const at = (x: number, along: number, across: number) =>
      new Vector3(
        x,
        Math.cos(angle) * along - Math.sin(angle) * across,
        Math.sin(angle) * along + Math.cos(angle) * across,
      );
    const faces: [Vector3, Vector3, Vector3, Vector3, Vector3][] = [
      [
        at(outerFace, inner, -halfIn),
        at(outerFace, outer, -halfOut),
        at(outerFace, outer, halfOut),
        at(outerFace, inner, halfIn),
        new Vector3(side, 0, 0),
      ],
      ...(hasBacks
        ? [
            [
              at(innerFace, inner, -halfIn),
              at(innerFace, outer, -halfOut),
              at(innerFace, outer, halfOut),
              at(innerFace, inner, halfIn),
              new Vector3(-side, 0, 0),
            ] satisfies [Vector3, Vector3, Vector3, Vector3, Vector3],
          ]
        : []),
      ...[-1, 1].map((edge): [Vector3, Vector3, Vector3, Vector3, Vector3] => [
        at(outerFace, inner, edge * halfIn),
        at(outerFace, outer, edge * halfOut),
        at(innerFace, outer, edge * halfOut),
        at(innerFace, inner, edge * halfIn),
        at(0, 0, edge),
      ]),
    ];
    for (const [a, b, c, d, outward] of faces) {
      positions.push(
        ...quadGeometry([[a, b, c, d]], outward).getAttribute("position").array,
      );
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3),
  );
  return geometry;
};

const balanceWeightShape = (
  wheelZ: number,
  radius: number,
  facing: number,
): Shape => {
  const spread = 0.62;
  const outer = listEvenly(facing - spread, facing + spread, 6).map(
    (angle): Point => [
      wheelZ + Math.sin(angle) * radius * 0.8,
      radius + Math.cos(angle) * radius * 0.8,
    ],
  );
  const inner = listEvenly(facing + spread * 0.8, facing - spread * 0.8, 4).map(
    (angle): Point => [
      wheelZ + Math.sin(angle) * radius * 0.5,
      radius + Math.cos(angle) * radius * 0.5,
    ],
  );
  return sideShape([...outer, ...inner]);
};

/** A steam wheelset: see-through spokes, lined rims, bosses and crank pins. */
const addSpokedWheelset = (
  builder: VehicleBuilder,
  z: number,
  {
    radius,
    spokes,
    segments,
    centre = appleGreen,
    crankThrow = 0,
    crankAngles = [0, 0],
    hasBalance = false,
    hasHub = true,
  }: SpokedWheelStyle,
): void => {
  const half = wheelTread / 2;
  for (const side of [1, -1]) {
    const x = side * railHalfGauge;
    if (builder.isMap) {
      builder.cylinder("metal", tyreBlack, {
        radius: radius + 0.02,
        length: wheelTread,
        at: [x, radius, z],
        axis: "x",
        segments: Math.max(8, segments),
      });
      continue;
    }
    const ring: Point[] = [
      [radius * 0.78, -half],
      [radius * 0.9, -half],
      [radius, -half],
      [radius, half - 0.03],
      [radius + 0.032, half - 0.012],
      [radius + 0.032, half],
      [radius * 0.9, half],
      [radius * 0.78, half],
      [radius * 0.78, -half],
    ];
    builder.painted(
      new LatheGeometry(
        ring.map(([across, along]) => new Vector2(across, along)),
        segments,
      ),
      tyrePaint(radius, z, radius, centre),
      { at: [x, radius, z], rotation: [0, 0, (side * Math.PI) / 2] },
      "metal",
    );
    builder.add("paint", centre, spokesGeometry(side, radius, spokes, hasHub), {
      at: [x, radius, z],
    });
    const crankAngle = side > 0 ? crankAngles[0] : crankAngles[1];
    if (hasHub) {
      builder.cylinder("paint", centre, {
        radius: radius * 0.22,
        length: 0.07,
        at: [x + side * 0.01, radius, z],
        axis: "x",
        segments: 12,
      });
      builder.cylinder("metal", "#3a3d41", {
        radius: radius * 0.1,
        length: 0.03,
        at: [x + side * 0.05, radius, z],
        axis: "x",
        segments: 8,
      });
    }
    if (hasBalance) {
      builder.sidePlate(
        "paint",
        centre,
        balanceWeightShape(z, radius, crankAngle + Math.PI),
        x + side * 0.005,
        0.05,
      );
    }
    if (crankThrow > 0) {
      const pin = crankPin(z, radius, crankThrow, crankAngle);
      builder.cylinder("paint", centre, {
        radius: 0.07,
        length: 0.05,
        at: [x + side * 0.03, pin.y, pin.z],
        axis: "x",
        segments: 10,
      });
      builder.cylinder("metal", steel, {
        radius: 0.035,
        length: 0.2,
        at: [x + side * 0.1, pin.y, pin.z],
        axis: "x",
        segments: 8,
      });
    }
  }
  builder.cylinder("metal", "#2b2e33", {
    radius: 0.045,
    length: railHalfGauge * 2,
    at: [0, radius, z],
    axis: "x",
    segments: 8,
  });
};

/** A flat bar from one point to another in a side plane, as a box. */
const addRod = (
  builder: VehicleBuilder,
  colour: ColorRepresentation,
  x: number,
  from: CrankPin,
  to: CrankPin,
  depth: number,
  thickness = 0.03,
  finish: Finish = "metal",
): void => {
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  builder.box(
    finish,
    colour,
    [thickness, depth, Math.hypot(dy, dz)],
    [x, (from.y + to.y) / 2, (from.z + to.z) / 2],
    [Math.atan2(-dy, dz), 0, 0],
  );
};

const lampAt = (builder: VehicleBuilder, at: Triple, facing: number) => {
  builder.box("paint", lampWhite, [0.1, 0.12, 0.08], at);
  builder.box(
    "paint",
    lampWhite,
    [0.03, 0.04, 0.03],
    [at[0], at[1] + 0.08, at[2]],
  );
  builder.cylinder("glass", "#fff3c8", {
    radius: 0.035,
    length: 0.02,
    at: [at[0], at[1], at[2] + facing * 0.045],
    axis: "z",
    segments: 10,
  });
};

const lampIron = (builder: VehicleBuilder, at: Triple) => {
  builder.box("metal", frameBlack, [0.03, 0.09, 0.02], at);
};

// Locomotive layout (z): smokebox front at +2.42, cab back at -2.7.
const bogieAxles = [2.27, 1.65];
const coupledAxles = [0.8, -0.28, -1.36];
const trailingAxle = -2.28;
const driverRadius = 0.48;
const crankThrow = 0.15;
const crankAngles: readonly [number, number] = [2.4, 2.4 - Math.PI / 2];
const cylinderZ: Point = [1.55, 2.12];
const cylinderY = 0.7;
const cylinderX = 0.575;
const smokeboxZ: Point = [1.72, 2.42];
const smokeboxRadius = 0.53;
const barrelRear = -0.35;
const cabFront = -1.55;
const cabBack = -2.7;
const cabTop = 1.98;
const chimneyZ = 2.1;
const chimneyTop = 2.28;

const barrelRadius = (z: number): number =>
  z > 0.75 ? 0.5 : lerp(0.5, 0.53, (0.75 - z) / (0.75 - barrelRear));

const runningPlateHeight = (z: number): number => {
  const dropFrom = 2.12;
  const dropTo = 2.44;
  if (z <= dropFrom) {
    return runningPlateY;
  }
  if (z >= dropTo) {
    return 0.72;
  }
  const share = (z - dropFrom) / (dropTo - dropFrom);
  return lerp(runningPlateY, 0.72, (1 - Math.cos(share * Math.PI)) / 2);
};

const addRunningPlate = (builder: VehicleBuilder) => {
  const valance = builder.isMap ? 0.07 : 0.085;
  const zs = listBreaks(
    -2.8,
    2.12,
    ...listEvenly(2.12, 2.44, builder.segments(6, 3)),
    2.62,
  );
  builder.loft({
    stations: zs.map((z) => {
      const y = runningPlateHeight(z);
      return {
        z,
        points: [
          [-loPlateHalf, y - valance],
          [-loPlateHalf + 0.02, y - valance],
          [-loPlateHalf + 0.02, y - 0.025],
          [loPlateHalf - 0.02, y - 0.025],
          [loPlateHalf - 0.02, y - valance],
          [loPlateHalf, y - valance],
          [loPlateHalf, y],
          [-loPlateHalf, y],
        ],
      };
    }),
    paint: () => engineBlack,
  });
};

const addBoiler = (builder: VehicleBuilder) => {
  const around = builder.segments(26, 14);
  const bands = [1.15, 0.45, barrelRear];
  const zs = listBreaks(
    smokeboxZ[0] + 0.01,
    barrelRear,
    0.75,
    ...listEvenly(barrelRear, 0.75, 3),
    ...(builder.isMap ? [] : bandEdges(bands)),
    ...(builder.isMap ? [] : [smokeboxZ[0] - 0.037, smokeboxZ[0] - 0.025]),
  ).filter((z) => z >= barrelRear && z <= smokeboxZ[0] + 0.01);
  builder.loft({
    stations: zs.map((z) => ({
      z,
      points: circleSection(barrelRadius(z), boilerCentreY, around),
    })),
    paint: ({ z }) => {
      if (z > smokeboxZ[0] - 0.025) {
        return liningBlack;
      }
      if (z > smokeboxZ[0] - 0.037) {
        return liningWhite;
      }
      return bandColour(z, bands) ?? appleGreen;
    },
    capStart: false,
    capEnd: false,
  });
  const fireboxSection = (share: number): Point[] => {
    const radius = lerp(0.53, 0.47, share);
    const centreY = lerp(boilerCentreY, 1.49, share);
    const arcFrom = -0.3;
    const arc = listEvenly(arcFrom, Math.PI / 2, builder.segments(9, 5))
      .slice(0, -1)
      .map((angle): Point => [
        radius * Math.cos(angle),
        centreY + radius * Math.sin(angle),
      ]);
    const sideX = lerp(0.56, 0.55, share);
    return mirrorRight([
      [0, runningPlateY],
      [sideX, runningPlateY],
      [sideX, (runningPlateY + arc[0][1]) / 2],
      ...arc,
      [0, centreY + radius],
    ]);
  };
  const fireboxEnd = cabFront - 0.1;
  const fireboxBands = [barrelRear, cabFront + 0.04];
  const fireboxZs = listBreaks(
    barrelRear,
    fireboxEnd,
    ...listEvenly(fireboxEnd, barrelRear, builder.segments(4, 2)),
    ...(builder.isMap ? [] : bandEdges(fireboxBands)),
  ).filter((z) => z >= fireboxEnd && z <= barrelRear);
  builder.loft({
    stations: fireboxZs.map((z) => ({
      z,
      points: fireboxSection((barrelRear - z) / (barrelRear - fireboxEnd)),
    })),
    paint: ({ z }) => bandColour(z, fireboxBands) ?? appleGreen,
  });
};

const addSmokebox = (builder: VehicleBuilder) => {
  const [rear, front] = smokeboxZ;
  builder.cylinder("paint", smokeboxBlack, {
    radius: smokeboxRadius,
    length: front - rear,
    at: [0, boilerCentreY, (front + rear) / 2],
    axis: "z",
    segments: builder.segments(30, 14),
  });
  builder.box(
    "paint",
    smokeboxBlack,
    [0.6, 0.12, 2.1 - rear],
    [0, runningPlateY + 0.04, (2.1 + rear) / 2],
  );
  const door: Point[] = [
    [0, 0],
    [0.47, 0],
    [0.47, 0.018],
    [0.42, 0.04],
    [0.24, 0.055],
    [0, 0.06],
  ];
  builder.add(
    "paint",
    smokeboxBlack,
    new LatheGeometry(
      door.map(([across, along]) => new Vector2(across, along)),
      builder.segments(24, 12),
    ),
    { at: [0, boilerCentreY, front], rotation: [Math.PI / 2, 0, 0] },
  );
  if (builder.isMap) {
    return;
  }
  builder.torus(
    "paint",
    smokeboxBlack,
    0.5,
    0.015,
    [0, boilerCentreY, front],
    "z",
    20,
  );
  for (const y of [boilerCentreY + 0.24, boilerCentreY - 0.24]) {
    builder.box(
      "metal",
      "#2c2f33",
      [0.62, 0.04, 0.02],
      [0.12, y, front + 0.045],
    );
    builder.cylinder("metal", "#2c2f33", {
      radius: 0.025,
      length: 0.06,
      at: [0.44, y, front + 0.04],
      axis: "y",
      segments: 8,
    });
  }
  builder.box(
    "metal",
    steel,
    [0.2, 0.025, 0.025],
    [0, boilerCentreY, front + 0.08],
  );
  builder.cylinder("metal", steel, {
    radius: 0.022,
    length: 0.06,
    at: [0, boilerCentreY, front + 0.06],
    axis: "z",
    segments: 8,
  });
  builder.cylinder("metal", steel, {
    radius: 0.05,
    length: 0.015,
    at: [0, boilerCentreY, front + 0.1],
    axis: "z",
    segments: 10,
  });
  builder.bar(
    "metal",
    steel,
    [-0.3, 1.95, front + 0.02],
    [0.3, 1.95, front + 0.02],
    0.022,
  );
  lampIron(builder, [0, 2.04, front - 0.03]);
};

const addChimneyAndFittings = (builder: VehicleBuilder) => {
  const chimney: Point[] = [
    [0.22, 1.96],
    [0.2, 2.06],
    [0.15, 2.13],
    [0.125, 2.17],
    [0.125, 2.235],
    [0.145, 2.25],
    [0.145, chimneyTop],
    [0.105, chimneyTop],
    [0.1, 2.22],
  ];
  builder.add(
    "paint",
    smokeboxBlack,
    new LatheGeometry(
      chimney.map(([across, along]) => new Vector2(across, along)),
      builder.segments(20, 10),
    ),
    { at: [0, 0, chimneyZ], scale: [1, 1, 1.55] },
  );
  builder.cylinder("metal", "#0d0e0f", {
    radius: 0.105,
    length: 0.01,
    at: [0, 2.24, chimneyZ],
    segments: 12,
  });
  builder.sphere(
    "paint",
    appleGreen,
    0.19,
    [0, 2.04, 0.0],
    [0.95, 0.6, 1.9],
    14,
  );
  if (builder.isMap) {
    return;
  }
  builder.sphere("paint", appleGreen, 0.13, [0, 2.04, 0.32], [1, 0.7, 1], 12);
  for (const x of [0.07, -0.07]) {
    builder.cylinder("metal", brass, {
      radius: 0.035,
      length: 0.12,
      at: [x, 2.05, -0.62],
      segments: 10,
    });
    builder.cylinder("metal", brass, {
      radius: 0.045,
      length: 0.02,
      at: [x, 2.11, -0.62],
      segments: 10,
    });
  }
  builder.cylinder("metal", brass, {
    radius: 0.025,
    length: 0.14,
    at: [0.0, 2.02, -1.42],
    segments: 8,
  });
  builder.cylinder("metal", brass, {
    radius: 0.035,
    length: 0.08,
    at: [0.0, 2.12, -1.42],
    segments: 8,
  });
  for (const side of [1, -1]) {
    builder.bar(
      "metal",
      steel,
      [side * 0.47, 1.83, smokeboxZ[0] - 0.05],
      [side * 0.5, 1.83, barrelRear],
      0.022,
    );
    builder.bar(
      "metal",
      steel,
      [side * 0.5, 1.83, barrelRear],
      [side * 0.47, 1.8, cabFront],
      0.022,
    );
    builder.bar(
      "metal",
      steel,
      [side * 0.53, 1.72, smokeboxZ[0] + 0.05],
      [side * 0.53, 1.72, smokeboxZ[1] - 0.05],
      0.022,
    );
  }
};

const addSmokeDeflectors = (builder: VehicleBuilder) => {
  const plate: Point[] = [
    [1.8, 1.12],
    [2.02, 1.12],
    [2.36, 1.44],
    [2.37, 1.68],
    [2.31, 1.74],
    [1.8, 1.74],
  ];
  for (const side of [1, -1]) {
    builder.sidePlate(
      "paint",
      engineBlack,
      sideShape(plate),
      side * 0.685,
      0.02,
    );
    if (!builder.isMap) {
      builder.bar(
        "metal",
        engineBlack,
        [side * 0.68, 1.72, 1.9],
        [side * 0.46, 1.78, 1.9],
        0.025,
      );
    }
  }
};

const addCylinders = (builder: VehicleBuilder) => {
  const [rear, front] = cylinderZ;
  const length = front - rear;
  for (const side of [1, -1]) {
    const x = side * cylinderX;
    builder.cylinder("paint", appleGreen, {
      radius: 0.165,
      length,
      at: [x, cylinderY, (front + rear) / 2],
      axis: "z",
      segments: builder.segments(16, 8),
    });
    builder.box(
      "paint",
      appleGreen,
      [0.24, 0.15, length],
      [x - side * 0.01, cylinderY + 0.2, (front + rear) / 2],
    );
    if (builder.isMap) {
      continue;
    }
    for (const end of [rear - 0.01, front + 0.01]) {
      builder.cylinder("paint", engineBlack, {
        radius: 0.15,
        length: 0.03,
        at: [x, cylinderY, end],
        axis: "z",
        segments: 16,
      });
      builder.cylinder("paint", liningWhite, {
        radius: 0.167,
        length: 0.012,
        at: [x, cylinderY, end + Math.sign(end - 1.83) * -0.05],
        axis: "z",
        segments: 18,
      });
    }
    builder.box(
      "metal",
      frameBlack,
      [0.03, 0.2, 0.1],
      [x + side * 0.06, 0.48, rear + 0.05],
    );
  }
};

const addMotion = (builder: VehicleBuilder) => {
  const middle = coupledAxles[1];
  for (const side of [1, -1]) {
    const angle = side > 0 ? crankAngles[0] : crankAngles[1];
    const pins = coupledAxles.map((z) =>
      crankPin(z, driverRadius, crankThrow, angle),
    );
    const rodX = side * 0.55;
    addRod(
      builder,
      steel,
      rodX,
      pins[0],
      pins[2],
      builder.isMap ? 0.07 : 0.06,
      0.03,
    );
    const drive = crankPin(middle, driverRadius, crankThrow, angle);
    const rodLength = 1.3;
    const crossheadZ =
      drive.z + Math.sqrt(rodLength ** 2 - (cylinderY - drive.y) ** 2);
    const crosshead = { y: cylinderY, z: crossheadZ };
    addRod(builder, steel, side * 0.6, crosshead, drive, 0.075, 0.03);
    if (builder.isMap) {
      continue;
    }
    for (const pin of pins) {
      builder.cylinder("metal", steel, {
        radius: 0.05,
        length: 0.04,
        at: [rodX, pin.y, pin.z],
        axis: "x",
        segments: 10,
      });
    }
    const slideX = side * 0.6;
    for (const offset of [0.07, -0.07]) {
      builder.box(
        "metal",
        steel,
        [0.04, 0.025, cylinderZ[0] - 0.85],
        [slideX, cylinderY + offset, (cylinderZ[0] + 0.85) / 2],
      );
    }
    builder.box(
      "metal",
      "#6d7279",
      [0.06, 0.12, 0.16],
      [slideX, cylinderY, crossheadZ],
    );
    builder.cylinder("metal", steel, {
      radius: 0.022,
      length: cylinderZ[0] - crossheadZ,
      at: [side * cylinderX, cylinderY, (cylinderZ[0] + crossheadZ) / 2],
      axis: "z",
      segments: 8,
    });
    const linkZ = 0.2;
    const valveGearX = side * 0.64;
    builder.box(
      "metal",
      "#3c4046",
      [0.04, 0.24, 0.07],
      [valveGearX, 0.84, linkZ],
      [0.15, 0, 0],
    );
    addRod(
      builder,
      steel,
      valveGearX,
      { y: 0.92, z: linkZ },
      { y: 0.93, z: 1.45 },
      0.04,
      0.025,
    );
    addRod(
      builder,
      steel,
      valveGearX,
      { y: 0.95, z: 1.45 },
      { y: 0.6, z: 1.42 },
      0.045,
      0.025,
    );
    addRod(
      builder,
      steel,
      valveGearX,
      { y: 0.62, z: 1.42 },
      { y: 0.62, z: crossheadZ },
      0.035,
      0.025,
    );
    const returnCrank = { y: drive.y + 0.1, z: drive.z - 0.06 };
    addRod(builder, steel, side * 0.62, drive, returnCrank, 0.04, 0.025);
    addRod(
      builder,
      steel,
      valveGearX,
      returnCrank,
      { y: 0.73, z: linkZ },
      0.04,
      0.025,
    );
    builder.box(
      "metal",
      frameBlack,
      [0.03, 0.08, 0.5],
      [valveGearX, 0.86, linkZ + 0.05],
    );
  }
  builder.bar("metal", steel, [0.66, 1.1, cabFront], [0.66, 1.0, 0.25], 0.03);
};

const addFramesAndBogies = (builder: VehicleBuilder) => {
  for (const side of [1, -1]) {
    builder.box(
      "paint",
      frameBlack,
      [0.04, 0.5, 5.15],
      [side * 0.36, 0.72, -0.05],
    );
    builder.box(
      "metal",
      frameBlack,
      [0.04, 0.2, 0.95],
      [side * 0.3, 0.3, 1.96],
    );
    builder.sidePlate(
      "paint",
      frameBlack,
      sideShape([
        [-2.0, 0.42],
        [-2.62, 0.42],
        [-2.62, 0.78],
        [-2.0, 0.78],
        [-1.95, 0.6],
      ]),
      side * 0.58,
      0.03,
    );
    builder.box(
      "metal",
      "#2c2f33",
      [0.07, 0.15, 0.17],
      [side * 0.6, 0.3, trailingAxle],
    );
    if (!builder.isMap) {
      builder.bar(
        "metal",
        "#3a3e44",
        [side * 0.42, 0.06, 2.55],
        [side * 0.42, 0.45, 2.52],
        0.025,
      );
      for (const z of [0.25, -0.83, -1.92]) {
        builder.box(
          "metal",
          "#2c2f33",
          [0.06, 0.06, 0.12],
          [side * 0.36, 0.2, z],
        );
      }
    }
  }
  builder.box("metal", frameBlack, [0.6, 0.06, 0.2], [0, 0.36, 1.96]);
  for (const z of bogieAxles) {
    addSpokedWheelset(builder, z, {
      radius: 0.25,
      spokes: 10,
      segments: builder.segments(16, 8),
    });
  }
  addSpokedWheelset(builder, trailingAxle, {
    radius: 0.29,
    spokes: 12,
    segments: builder.segments(16, 8),
  });
  for (const z of coupledAxles) {
    addSpokedWheelset(builder, z, {
      radius: driverRadius,
      spokes: 16,
      segments: builder.segments(22, 10),
      crankThrow,
      crankAngles,
      hasBalance: true,
    });
  }
};

const cabOutline: Point[] = [
  [cabFront, 0.9],
  [cabFront, cabTop],
  [cabBack, cabTop],
  [cabBack, 1.4],
  ...listEvenly(Math.PI / 2, 0, 3).map((angle): Point => [
    -2.34 + 0.12 * Math.cos(angle),
    1.28 + 0.12 * Math.sin(angle),
  ]),
  [-2.22, 0.9],
];

const cabWindows: Point[][] = [
  roundedRect(-2.02, -1.66, 1.52, 1.86, 0.05, 2),
  roundedRect(-2.5, -2.12, 1.52, 1.86, 0.05, 2),
];

const roofY = (x: number, halfWidth: number): number =>
  cabTop + 0.23 * Math.sqrt(Math.max(0, 1 - (x / halfWidth) ** 2));

const addCab = (builder: VehicleBuilder) => {
  for (const side of [1, -1]) {
    if (builder.isMap) {
      builder.sidePlate(
        "paint",
        appleGreen,
        sideShape(cabOutline, cabWindows),
        side * 0.7,
        0.02,
      );
    } else {
      builder.sidePlate(
        "paint",
        liningBlack,
        sideShape(cabOutline, cabWindows),
        side * 0.7,
        0.016,
      );
      builder.sidePlate(
        "paint",
        liningWhite,
        sideShape(
          insetPolygon(cabOutline, 0.032),
          cabWindows.map((window) => insetPolygon(window, -0.032)),
        ),
        side * 0.7095,
        0.003,
      );
      builder.sidePlate(
        "paint",
        appleGreen,
        sideShape(
          insetPolygon(cabOutline, 0.044),
          cabWindows.map((window) => insetPolygon(window, -0.044)),
        ),
        side * 0.7125,
        0.003,
      );
      for (const z of [-2.22, cabBack + 0.02]) {
        builder.bar(
          "metal",
          brass,
          [side * 0.725, 1.0, z],
          [side * 0.725, 1.36, z],
          0.02,
        );
      }
    }
    for (const window of cabWindows) {
      builder.sidePlate(
        "glass",
        "#22303a",
        sideShape(window),
        side * 0.69,
        0.006,
      );
    }
  }
  const front: Point[] = [
    [-0.7, runningPlateY],
    [0.7, runningPlateY],
    ...listEvenly(0.7, -0.7, builder.segments(10, 6)).map((x): Point => [
      x,
      roofY(x, 0.7),
    ]),
  ];
  const frontWindow: Point[] = [
    [0.38, 1.8],
    [0.46, 1.7],
    [0.63, 1.7],
    [0.63, 1.95],
    [0.42, 1.98],
  ];
  const frontWindows = [
    frontWindow,
    frontWindow.map(([x, y]): Point => [-x, y]).toReversed(),
  ];
  builder.endPlate(
    "paint",
    appleGreen,
    endShape(front, frontWindows),
    cabFront - 0.02,
    cabFront,
  );
  for (const window of frontWindows) {
    builder.endPlate(
      "glass",
      "#22303a",
      endShape(window),
      cabFront - 0.015,
      cabFront - 0.01,
    );
  }
  builder.box(
    "paint",
    cabDark,
    [1.3, 0.95, 1.0],
    [0, 1.5, (cabFront + cabBack) / 2 - 0.05],
  );
  const roofHalf = 0.735;
  const roofSteps = builder.segments(12, 6);
  const outer = listEvenly(roofHalf, -roofHalf, roofSteps).map((x): Point => [
    x,
    roofY(x, roofHalf) - 0.02,
  ]);
  const inner = outer
    .toReversed()
    .map(([x, y]): Point => [x * 0.98, y - 0.025]);
  const roofSection = [...outer, ...inner];
  builder.loft({
    stations: [cabFront + 0.06, cabBack - 0.06].map((z) => ({
      z,
      points: roofSection,
    })),
    paint: () => engineBlack,
  });
  builder.box(
    "paint",
    engineBlack,
    [1.36, 0.03, 0.2],
    [0, runningPlateY + 0.01, cabBack - 0.03],
  );
  if (!builder.isMap) {
    builder.box("paint", engineBlack, [0.4, 0.03, 0.5], [0, 2.215, -2.1]);
  }
};

const addFrontEnd = (builder: VehicleBuilder) => {
  builder.box("paint", bufferRed, [1.44, 0.36, 0.1], [0, 0.54, 2.57]);
  addBuffers(builder, 2.8, { height: 0.52, reach: 0.16 });
  builder.box("paint", frameBlack, [1.0, 0.3, 0.12], [0, 0.57, cabBack - 0.03]);
  if (builder.isMap) {
    return;
  }
  for (const x of [-0.42, 0, 0.42]) {
    lampIron(builder, [x, 0.77, 2.6]);
  }
  for (const x of [0.42, -0.42]) {
    lampAt(builder, [x, 0.86, 2.6], 1);
  }
  builder.bar(
    "metal",
    frameBlack,
    [0.22, 0.35, 2.66],
    [0.22, 0.62, 2.66],
    0.04,
  );
  builder.bar(
    "metal",
    frameBlack,
    [-0.22, 0.35, 2.66],
    [-0.22, 0.62, 2.66],
    0.04,
  );
};

const buildLocomotive = (detail: TrainDetail) => {
  const builder = new VehicleBuilder(detail);
  addRunningPlate(builder);
  addBoiler(builder);
  addSmokebox(builder);
  addChimneyAndFittings(builder);
  addSmokeDeflectors(builder);
  addCylinders(builder);
  addFramesAndBogies(builder);
  addMotion(builder);
  addCab(builder);
  addFrontEnd(builder);
  return builder.build();
};

// Tender layout: body from -1.58 to +1.62, buffers at ±1.7.
const tenderBack = -1.58;
const tenderFront = 1.62;
const tenderBottom = 0.62;
const tenderPanelTop = 1.36;
const tenderTop = 1.53;
const tenderHalf = 0.68;
const tenderAxles = [1.13, 0.38, -0.38, -1.13];
const tenderWheelRadius = 0.29;

const panelLining = (y: number, z: number): ColorRepresentation => {
  const edge = Math.min(
    z - tenderBack,
    tenderFront - z,
    y - tenderBottom,
    tenderPanelTop - y,
  );
  if (edge < 0.045) {
    return liningBlack;
  }
  return edge < 0.057 ? liningWhite : appleGreen;
};

const tenderSection = (detail: TrainDetail): Point[] => {
  const isMap = detail === "map";
  const flare: Point[] = [
    [tenderHalf + 0.01, 1.44],
    [tenderHalf + 0.03, 1.53],
    [tenderHalf + 0.042, 1.61],
    [tenderHalf + 0.045, 1.655],
    [tenderHalf + 0.03, 1.675],
    [tenderHalf + 0.005, 1.62],
    [tenderHalf - 0.015, tenderTop],
  ];
  const lining: Point[] = isMap
    ? []
    : [
        [tenderHalf, tenderBottom + 0.045],
        [tenderHalf, tenderBottom + 0.057],
        [tenderHalf, tenderPanelTop - 0.057],
        [tenderHalf, tenderPanelTop - 0.045],
      ];
  return mirrorRight([
    [0, tenderBottom],
    [tenderHalf - 0.02, tenderBottom],
    [tenderHalf, tenderBottom + 0.02],
    ...lining,
    [tenderHalf, 1.0],
    [tenderHalf, tenderPanelTop],
    ...(isMap ? flare.filter((_, index) => index % 2 === 0) : flare),
    [0, tenderTop],
  ]);
};

const tenderPaint: Paint = ({ x, y, z }, normal) => {
  if (normal.y < -0.8) {
    return engineBlack;
  }
  if (normal.y > 0.8 && y < tenderTop + 0.01) {
    return engineBlack;
  }
  if (Math.abs(normal.z) > 0.9) {
    return z > 0 ? engineBlack : appleGreen;
  }
  if (y > 1.655 || (y > tenderTop && x * normal.x < 0)) {
    return engineBlack;
  }
  if (y < tenderPanelTop && Math.abs(normal.x) > 0.5) {
    return panelLining(y, z);
  }
  return appleGreen;
};

const coalHeight = (x: number, z: number): number => {
  const across = Math.max(0, 1 - (x / 0.66) ** 2) ** 0.7;
  const along =
    Math.sin(Math.min(1, Math.max(0, (z + 0.3) / 1.95)) * Math.PI * 0.85) **
    0.6;
  return 1.62 + 0.36 * across * (0.45 + 0.55 * along);
};

const addCoal = (builder: VehicleBuilder) => {
  const across = builder.segments(11, 6);
  const zs = listEvenly(-0.28, 1.5, builder.segments(8, 4));
  builder.loft({
    stations: zs.map((z, station) => {
      const top = listEvenly(0.66, -0.66, across).map((x, step): Point => {
        const isEdge = step === 0 || step === across;
        const lump =
          isEdge || builder.isMap ? 0 : (hash(station, step, 3) - 0.5) * 0.06;
        return [x, coalHeight(x, z) + lump];
      });
      return { z, points: [[-0.66, tenderTop], [0.66, tenderTop], ...top] };
    }),
    paint: ({ x, y, z }) => {
      const shade = hash(
        Math.round(x * 40),
        Math.round(y * 40),
        Math.round(z * 40),
      );
      if (shade > 0.93) {
        return "#3b3d42";
      }
      return shade > 0.5 ? "#1a1b1d" : "#242528";
    },
    finish: "metal",
  });
};

const hornFrame = (
  axles: readonly number[],
  from: number,
  to: number,
  top: number,
  bottom: number,
  hornBottom: number,
  hornHalf: number,
): Point[] => [
  [to, top],
  [from, top],
  [from, bottom],
  ...axles
    .toSorted((a, b) => a - b)
    .flatMap((z): Point[] => [
      [z - hornHalf - 0.04, bottom],
      [z - hornHalf, hornBottom],
      [z + hornHalf, hornBottom],
      [z + hornHalf + 0.04, bottom],
    ]),
  [to, bottom],
];

const buildTender = (detail: TrainDetail) => {
  const builder = new VehicleBuilder(detail);
  const section = tenderSection(detail);
  const zs = listBreaks(
    tenderBack,
    tenderFront,
    ...listEvenly(tenderBack, tenderFront, 3),
    ...(builder.isMap
      ? []
      : [
          tenderBack + 0.045,
          tenderBack + 0.057,
          tenderFront - 0.057,
          tenderFront - 0.045,
        ]),
  );
  builder.loft({
    stations: zs.map((z) => ({ z, points: section })),
    paint: tenderPaint,
  });
  addCoal(builder);
  builder.box(
    "paint",
    engineBlack,
    [1.32, 0.3, 0.04],
    [0, tenderTop + 0.14, -0.27],
  );
  const holes = builder.isMap
    ? []
    : [-0.755, 0, 0.755].map((z) =>
        roundedRect(z - 0.14, z + 0.14, 0.47, 0.57, 0.04, 2),
      );
  const frame = hornFrame(
    tenderAxles,
    tenderBack,
    tenderFront - 0.02,
    tenderBottom + 0.01,
    0.42,
    0.16,
    0.12,
  );
  for (const side of [1, -1]) {
    builder.sidePlate(
      "paint",
      frameBlack,
      sideShape(frame, holes),
      side * 0.6,
      0.03,
    );
    if (builder.isMap) {
      continue;
    }
    for (const z of tenderAxles) {
      builder.box(
        "metal",
        "#2c2f33",
        [0.07, 0.15, 0.17],
        [side * 0.64, tenderWheelRadius, z],
      );
      for (const [step, length] of [0.34, 0.24].entries()) {
        builder.box(
          "metal",
          "#33363b",
          [0.05, 0.022, length],
          [side * 0.635, 0.5 - step * 0.024, z],
        );
      }
    }
    builder.bar(
      "metal",
      steel,
      [side * 0.72, 0.8, tenderBack - 0.02],
      [side * 0.72, 1.6, tenderBack - 0.02],
      0.022,
    );
    for (const y of [0.42, 0.6]) {
      builder.box(
        "metal",
        frameBlack,
        [0.16, 0.025, 0.12],
        [side * 0.6, y, tenderBack - 0.04],
      );
    }
  }
  for (const z of tenderAxles) {
    addSpokedWheelset(builder, z, {
      radius: tenderWheelRadius,
      spokes: 10,
      segments: builder.segments(12, 8),
      hasHub: false,
    });
  }
  builder.box(
    "paint",
    bufferRed,
    [1.4, 0.32, 0.06],
    [0, 0.53, tenderBack - 0.03],
  );
  addBuffers(builder, -1.7, { height: 0.52, reach: 0.1 });
  builder.box(
    "paint",
    frameBlack,
    [1.1, 0.26, 0.08],
    [0, 0.55, tenderFront + 0.04],
  );
  for (const side of [1, -1]) {
    builder.box(
      "paint",
      appleGreen,
      [0.26, 0.22, 0.24],
      [side * 0.54, tenderTop + 0.11, tenderFront - 0.14],
    );
  }
  if (builder.isMap) {
    return builder.build();
  }
  builder.cylinder("paint", engineBlack, {
    radius: 0.17,
    length: 0.1,
    at: [0, tenderTop + 0.05, -1.05],
    segments: 12,
  });
  builder.cylinder("paint", engineBlack, {
    radius: 0.19,
    length: 0.025,
    at: [0, tenderTop + 0.11, -1.05],
    segments: 12,
  });
  for (const x of [0.45, -0.45]) {
    builder.cylinder("metal", frameBlack, {
      radius: 0.035,
      length: 0.16,
      at: [x, tenderTop + 0.08, -1.4],
      segments: 8,
    });
  }
  for (const x of [0.22, -0.22]) {
    builder.cylinder("metal", frameBlack, {
      radius: 0.03,
      length: 0.4,
      at: [x, 1.3, tenderFront + 0.02],
      segments: 8,
    });
    builder.torus(
      "metal",
      "#3a3e44",
      0.06,
      0.012,
      [x, 1.52, tenderFront + 0.02],
      "y",
      10,
    );
  }
  builder.box(
    "paint",
    engineBlack,
    [0.4, 0.22, 0.03],
    [0, 1.3, tenderFront + 0.01],
  );
  for (const x of [-0.4, 0, 0.4]) {
    lampIron(builder, [x, 0.75, tenderBack - 0.02]);
  }
  for (const y of listEvenly(0.85, 1.5, 4)) {
    builder.box(
      "metal",
      steel,
      [0.1, 0.018, 0.018],
      [0.66, y, tenderBack - 0.03],
    );
  }
  builder.bar(
    "metal",
    steel,
    [0.61, 0.8, tenderBack - 0.03],
    [0.61, 1.55, tenderBack - 0.03],
    0.02,
  );
  return builder.build();
};

// Carriage: Gresley teak corridor coach, body from -2.92 to +2.92 with bow ends.
const carriageLength = 6.2;
const bodyEnd = 2.92;
const coachHalf = 0.71;
const coachBottom = 0.6;
const coachCantrail = 1.74;
const coachRoofTop = 2.04;
const compartments = 6;
const compartmentSpan = 2.36;
const doorZ = 2.63;

const compartmentCentres = Array.from(
  { length: compartments },
  (_, index) =>
    -compartmentSpan + ((index + 0.5) * 2 * compartmentSpan) / compartments,
);

const coachRoofY = (x: number): number => {
  const shoulder = coachHalf;
  const angle = Math.acos(Math.min(1, Math.abs(x) / shoulder));
  return (
    coachCantrail + (coachRoofTop - coachCantrail) * Math.sin(angle) ** 0.85
  );
};

const coachStations = (section: readonly Point[], isMap: boolean) => {
  const bowOffsets = isMap ? [0, 0.035, 0.062] : [0, 0.02, 0.04, 0.055, 0.066];
  const bow = (offset: number) => Math.sqrt(1 - offset / 0.07);
  const scaled = (offset: number) =>
    section.map(([x, y]): Point => [x * bow(offset), y]);
  return [
    ...bowOffsets.toReversed().map((offset) => ({
      z: -bodyEnd - offset,
      points: scaled(offset),
    })),
    { z: 0, points: section },
    ...bowOffsets.map((offset) => ({
      z: bodyEnd + offset,
      points: scaled(offset),
    })),
  ];
};

const coachPaint: Paint = ({ y }, normal) => {
  if (normal.y < -0.8 || y < coachBottom + 0.02) {
    return underframeBlack;
  }
  return y > coachCantrail + 0.005 ? roofWhite : teak;
};

const addBeading = (
  builder: VehicleBuilder,
  side: number,
  zFrom: number,
  zTo: number,
  yFrom: number,
  yTo: number,
  proud = 0.012,
) => {
  const isHorizontal = Math.abs(zTo - zFrom) > Math.abs(yTo - yFrom);
  builder.box(
    "paint",
    teakBeading,
    isHorizontal
      ? [proud, 0.018, Math.abs(zTo - zFrom)]
      : [proud, Math.abs(yTo - yFrom), 0.018],
    [side * (coachHalf + proud / 2), (yFrom + yTo) / 2, (zFrom + zTo) / 2],
  );
};

const addCoachGlass = (
  builder: VehicleBuilder,
  side: number,
  zFrom: number,
  zTo: number,
  yFrom: number,
  yTo: number,
  radius: number,
) => {
  if (builder.isMap || radius <= 0.02) {
    builder.box(
      "glass",
      "#2a3843",
      [0.01, yTo - yFrom, zTo - zFrom],
      [side * (coachHalf + 0.003), (yFrom + yTo) / 2, (zFrom + zTo) / 2],
    );
    return;
  }
  builder.sidePlate(
    "glass",
    "#2a3843",
    sideShape(roundedRect(zFrom, zTo, yFrom, yTo, radius, 2)),
    side * (coachHalf + 0.004),
    0.007,
  );
};

const addCoachSide = (builder: VehicleBuilder, side: number) => {
  const windowHalf = side > 0 ? 0.25 : 0.29;
  for (const centre of compartmentCentres) {
    addCoachGlass(
      builder,
      side,
      centre - windowHalf,
      centre + windowHalf,
      1.13,
      1.52,
      0.05,
    );
    if (builder.isMap) {
      continue;
    }
    if (side > 0) {
      builder.box(
        "glass",
        "#3a2722",
        [0.002, 0.11, windowHalf * 2 - 0.1],
        [side * (coachHalf + 0.0085), 1.2, centre],
      );
    }
    addCoachGlass(
      builder,
      side,
      centre - windowHalf,
      centre - 0.015,
      1.6,
      1.685,
      0.02,
    );
    addCoachGlass(
      builder,
      side,
      centre + 0.015,
      centre + windowHalf,
      1.6,
      1.685,
      0.02,
    );
    for (const edge of [
      centre - windowHalf - 0.02,
      centre + windowHalf + 0.02,
    ]) {
      addBeading(builder, side, edge, edge, 1.09, 1.715);
    }
    addBeading(builder, side, centre, centre, 1.56, 1.715);
    addBeading(builder, side, centre, centre, 0.78, 1.09);
  }
  for (const end of [1, -1]) {
    const centre = end * doorZ;
    addCoachGlass(
      builder,
      side,
      centre - 0.12,
      centre + 0.12,
      1.18,
      1.52,
      0.04,
    );
    if (builder.isMap) {
      continue;
    }
    builder.sidePlate(
      "paint",
      teakDoor,
      sideShape(
        roundedRect(centre - 0.17, centre + 0.17, 0.78, 1.715, 0.03, 2),
      ),
      side * (coachHalf + 0.002),
      0.004,
    );
    addCoachGlass(
      builder,
      side,
      centre - 0.12,
      centre + 0.12,
      1.6,
      1.685,
      0.02,
    );
    for (const edge of [centre - 0.185, centre + 0.185]) {
      addBeading(builder, side, edge, edge, 0.7, 1.73, 0.024);
    }
    addBeading(builder, side, centre - 0.17, centre + 0.17, 1.56, 1.56, 0.014);
    addBeading(builder, side, centre - 0.17, centre + 0.17, 1.1, 1.1, 0.014);
    builder.box(
      "metal",
      brass,
      [0.03, 0.025, 0.07],
      [side * (coachHalf + 0.02), 1.14, centre - end * 0.1],
    );
    builder.bar(
      "metal",
      brass,
      [side * (coachHalf + 0.03), 0.95, centre + end * 0.22],
      [side * (coachHalf + 0.03), 1.4, centre + end * 0.22],
      0.018,
      6,
    );
    builder.box(
      "paint",
      underframeBlack,
      [0.1, 0.025, 0.4],
      [side * 0.68, 0.46, centre],
    );
  }
  if (builder.isMap) {
    return;
  }
  const panelEnd = doorZ - 0.185;
  for (const y of [0.78, 1.09, 1.56, 1.715]) {
    addBeading(builder, side, -panelEnd, panelEnd, y, y);
  }
  for (const end of [1, -1]) {
    for (const y of [0.78, 1.715]) {
      addBeading(
        builder,
        side,
        end * (doorZ + 0.185),
        end * (bodyEnd - 0.01),
        y,
        y,
      );
    }
    addBeading(
      builder,
      side,
      end * (bodyEnd - 0.02),
      end * (bodyEnd - 0.02),
      0.78,
      1.715,
    );
  }
  builder.box(
    "paint",
    "#b9b6ad",
    [0.02, 0.02, bodyEnd * 2],
    [side * 0.6, coachRoofY(0.6) + 0.01, 0],
  );
};

const addCoachBuffers = (builder: VehicleBuilder, end: number) => {
  const facing = Math.sign(end);
  for (const side of [1, -1]) {
    builder.cylinder("metal", "#26292e", {
      radius: 0.045,
      radiusEnd: 0.055,
      length: 0.15,
      at: [side * 0.44, 0.52, end - facing * 0.095],
      axis: "z",
      segments: builder.segments(8, 6),
    });
    builder.cylinder("metal", "#3a3e45", {
      radius: 0.09,
      length: 0.025,
      at: [side * 0.44, 0.52, end - facing * 0.0125],
      axis: "z",
      segments: builder.segments(14, 8),
    });
  }
  if (!builder.isMap) {
    builder.box(
      "metal",
      "#1f2226",
      [0.09, 0.12, 0.14],
      [0, 0.52, end - facing * 0.09],
    );
  }
};

const addPullmanGangway = (builder: VehicleBuilder, end: number) => {
  const facing = Math.sign(end);
  const face = end * (carriageLength / 2) - facing * 0.03;
  builder.box(
    "metal",
    "#1c1b1a",
    [0.66, 1.14, 0.12],
    [0, 1.26, face - facing * 0.07],
  );
  builder.box("metal", "#2e2c29", [0.76, 1.22, 0.03], [0, 1.26, face]);
  if (!builder.isMap) {
    builder.box(
      "metal",
      "#121212",
      [0.42, 0.98, 0.01],
      [0, 1.24, face + facing * 0.017],
    );
    for (const offset of [0.04, 0.08]) {
      builder.box(
        "metal",
        "#2a2826",
        [0.7, 1.18, 0.015],
        [0, 1.26, face - facing * offset],
      );
    }
  }
};

const coachWheelset = (builder: VehicleBuilder, z: number, radius: number) => {
  const profile: Point[] = [
    [0, -0.06],
    [0.07, -0.06],
    [0.09, -0.03],
    [radius * 0.85, -0.04],
    [radius * 0.9, -0.05],
    [radius, -0.05],
    [radius, 0.03],
    [radius + 0.03, 0.05],
    [radius * 0.8, 0.05],
    [0, 0.02],
  ];
  for (const side of [1, -1]) {
    if (builder.isMap) {
      builder.cylinder("metal", "#33363b", {
        radius: radius + 0.02,
        length: wheelTread,
        at: [side * railHalfGauge, radius, z],
        axis: "x",
        segments: 7,
      });
      continue;
    }
    builder.painted(
      new LatheGeometry(
        profile.map(([across, along]) => new Vector2(across, along)),
        10,
      ),
      ({ y, z: faceZ }) =>
        Math.hypot(y - radius, faceZ - z) > radius * 0.9
          ? "#55585e"
          : "#2b2d31",
      {
        at: [side * railHalfGauge, radius, z],
        rotation: [0, 0, (side * Math.PI) / 2],
      },
      "metal",
    );
  }
  if (!builder.isMap) {
    builder.cylinder("metal", "#2b2e33", {
      radius: 0.035,
      length: railHalfGauge * 2,
      at: [0, radius, z],
      axis: "x",
      segments: 6,
    });
  }
};

const addGresleyBogie = (builder: VehicleBuilder, z: number) => {
  const radius = 0.24;
  const base = 0.95;
  const half = base / 2;
  const axles = [z - half, z + half];
  for (const axle of axles) {
    coachWheelset(builder, axle, radius);
  }
  const frame: Point[] = [
    [z + 0.68, 0.41],
    [z + 0.68, 0.47],
    [z - 0.68, 0.47],
    [z - 0.68, 0.41],
    ...axles.flatMap((axle, index): Point[] => [
      [axle - 0.11, 0.39],
      [axle - 0.08, 0.2],
      [axle + 0.08, 0.2],
      [axle + 0.11, 0.39],
      ...(index === 0 ? ([[z, 0.34]] satisfies Point[]) : []),
    ]),
  ];
  for (const side of [1, -1]) {
    builder.sidePlate("metal", "#24272b", sideShape(frame), side * 0.56, 0.03);
    if (builder.isMap) {
      continue;
    }
    for (const axle of axles) {
      builder.box(
        "metal",
        "#2d3035",
        [0.06, 0.11, 0.12],
        [side * 0.595, radius, axle],
      );
      for (const [step, length] of [0.4, 0.3, 0.2].entries()) {
        builder.box(
          "metal",
          "#373a40",
          [0.05, 0.02, length],
          [side * 0.6, 0.355 - step * 0.02, axle],
        );
      }
    }
    for (const offset of [-0.1, 0.1]) {
      builder.cylinder("metal", "#41454c", {
        radius: 0.045,
        length: 0.14,
        at: [side * 0.52, 0.36, z + offset],
        segments: 8,
      });
    }
  }
  builder.box("metal", "#24272b", [1.1, 0.08, 0.3], [0, 0.45, z]);
};

const addCoachUnderframe = (builder: VehicleBuilder) => {
  for (const side of [1, -1]) {
    builder.box(
      "paint",
      underframeBlack,
      [0.05, 0.12, bodyEnd * 2],
      [side * 0.64, coachBottom - 0.04, 0],
    );
    if (builder.isMap) {
      continue;
    }
    const truss: Triple[] = [
      [side * 0.5, 0.56, -1.6],
      [side * 0.5, 0.3, -0.9],
      [side * 0.5, 0.3, 0.9],
      [side * 0.5, 0.56, 1.6],
    ];
    for (let index = 0; index < truss.length - 1; index++) {
      builder.bar(
        "metal",
        underframeBlack,
        truss[index],
        truss[index + 1],
        0.03,
        5,
      );
    }
    for (const z of [-0.9, 0.9]) {
      builder.box(
        "metal",
        underframeBlack,
        [0.04, 0.26, 0.04],
        [side * 0.5, 0.43, z],
      );
    }
  }
  for (const end of [1, -1]) {
    builder.box(
      "paint",
      underframeBlack,
      [1.36, 0.24, 0.06],
      [0, 0.52, end * (bodyEnd - 0.01)],
    );
    addCoachBuffers(builder, end * (carriageLength / 2));
    addPullmanGangway(builder, end);
  }
  if (builder.isMap) {
    return;
  }
  builder.box("metal", "#26282b", [0.55, 0.22, 0.45], [0, 0.42, 0.35]);
  builder.cylinder("metal", "#2a2c30", {
    radius: 0.13,
    length: 0.26,
    at: [0, 0.38, -0.55],
    axis: "x",
    segments: 10,
  });
  builder.cylinder("metal", "#2a2c30", {
    radius: 0.08,
    length: 0.2,
    at: [-0.3, 0.42, 1.15],
    axis: "z",
    segments: 8,
  });
};

const addCoachRoof = (builder: VehicleBuilder) => {
  if (builder.isMap) {
    return;
  }
  for (const centre of compartmentCentres) {
    for (const x of [0.34, -0.34]) {
      builder.cylinder("paint", ventGrey, {
        radius: 0.04,
        radiusEnd: 0.03,
        length: 0.14,
        at: [x, coachRoofY(x) + 0.03, centre],
        axis: "z",
        segments: 6,
      });
    }
  }
};

const buildCarriage = (detail: TrainDetail) => {
  const builder = new VehicleBuilder(detail);
  const section = buildCoachSection({
    halfWidth: coachHalf,
    bottom: coachBottom,
    waist: 0.78,
    cantrail: coachCantrail,
    roofTop: coachRoofTop,
    tumblehome: 0.035,
    lean: 0,
    roofSteps: builder.segments(10, 5),
    bilge: 0.03,
  });
  builder.loft({
    stations: coachStations(section, builder.isMap),
    paint: coachPaint,
  });
  for (const side of [1, -1]) {
    addCoachSide(builder, side);
  }
  addCoachRoof(builder);
  addCoachUnderframe(builder);
  for (const z of [2.2, -2.2]) {
    addGresleyBogie(builder, z);
  }
  return builder.build();
};

export const trainModel: TrainModel = {
  locomotive: { length: 5.6, build: buildLocomotive },
  tender: { length: 3.4, build: buildTender },
  carriage: { length: carriageLength, build: buildCarriage },
  carriageCount: 3,
  chimney: [0, chimneyTop, chimneyZ],
};
