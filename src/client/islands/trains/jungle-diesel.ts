import { BufferAttribute, BufferGeometry, Shape, Vector3 } from "three";
import {
  addBuffers,
  addLamp,
  listBreaks,
  listEvenly,
  railHalfGauge,
  wheelTread,
  type Finish,
  type Paint,
  type Painted,
  type TrainDetail,
  type TrainModel,
  type Triple,
  VehicleBuilder,
} from "./train-kit.js";

type Point = readonly [number, number];

const glass = (colour: string): Painted => ({ colour, finish: "glass" });
const metal = (colour: string): Painted => ({ colour, finish: "metal" });

const within = (value: number, from: number, to: number): boolean =>
  value > from && value < to;

const inAny = (value: number, spans: readonly Point[]): boolean =>
  spans.some(([from, to]) => within(value, from, to));

const mirrorSpans = (spans: readonly Point[]): Point[] => [
  ...spans,
  ...spans.map(([from, to]): Point => [-to, -from]),
];

const superellipseRoof = (
  shoulder: Point,
  roofTop: number,
  steps: number,
  exponent: number,
): Point[] =>
  Array.from({ length: steps }, (_, step) => {
    const angle = ((step + 1) / (steps + 1)) * (Math.PI / 2);
    return [
      shoulder[0] * Math.cos(angle) ** (2 / exponent),
      shoulder[1] + (roofTop - shoulder[1]) * Math.sin(angle) ** (2 / exponent),
    ];
  });

/**
 * Turns a grid of points into triangles, dropping slivers and facing them
 * outwards, and paints them face by face.
 */
const addSkin = (
  builder: VehicleBuilder,
  grid: readonly (readonly Triple[])[],
  isClosed: boolean,
  paint: Paint,
  outward: (centre: Vector3) => Vector3,
): void => {
  const width = grid[0].length;
  const span = isClosed ? width : width - 1;
  const triangles: Vector3[][] = [];
  let facing = 0;
  const keep = (a: Triple, b: Triple, c: Triple) => {
    const corners = [a, b, c].map((point) => new Vector3(...point));
    const normal = new Vector3()
      .subVectors(corners[1], corners[0])
      .cross(new Vector3().subVectors(corners[2], corners[0]));
    if (normal.length() < 1e-7) {
      return;
    }
    const centre = corners[0].clone().add(corners[1]).add(corners[2]);
    facing += Math.sign(normal.dot(outward(centre.divideScalar(3))));
    triangles.push(corners);
  };
  for (let row = 0; row < grid.length - 1; row++) {
    for (let column = 0; column < span; column++) {
      const next = (column + 1) % width;
      const a = grid[row][column];
      const c = grid[row + 1][next];
      keep(a, grid[row][next], c);
      keep(a, c, grid[row + 1][column]);
    }
  }
  const positions = new Float32Array(triangles.length * 9);
  triangles.forEach((corners, index) => {
    const ordered = facing < 0 ? [corners[0], corners[2], corners[1]] : corners;
    ordered.forEach((corner, vertex) => {
      corner.toArray(positions, index * 9 + vertex * 3);
    });
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  builder.painted(geometry, paint);
};

interface ShellSpec {
  /** The right half of the section, from the bottom edge up to the crown on x = 0. */
  outline: readonly Point[];
  /** Body end at the bottom; the ends are drawn at ±end. */
  end: number;
  stations: readonly number[];
  /** How far the end face is set back at each height. */
  rake: (y: number) => number;
  cornerRadius: number;
  /** Columns across the end faces, as distances from the centre line. */
  endColumns: readonly number[];
  cornerSteps: readonly number[];
  paintSide: Paint;
  paintEnd: Paint;
}

/**
 * A closed body with shaped ends: sides lofted along the vehicle, and an
 * end face at each end raked by height and rounded at its corners in plan,
 * so cab fronts, roof domes and window frames line up with the grid.
 */
const addShell = (
  builder: VehicleBuilder,
  {
    outline,
    end,
    stations,
    rake,
    cornerRadius,
    endColumns,
    cornerSteps,
    paintSide,
    paintEnd,
  }: ShellSpec,
): void => {
  const widest = Math.max(...outline.map(([x]) => x));
  const radiusAt = (row: number) =>
    cornerRadius * Math.min(1, outline[row][0] / widest);
  const setback = (x: number, row: number) => {
    const radius = radiusAt(row);
    const into = Math.abs(x) - (outline[row][0] - radius);
    if (into <= 0 || radius <= 0) {
      return 0;
    }
    return radius - Math.sqrt(Math.max(0, radius ** 2 - into ** 2));
  };
  const reach = (x: number, row: number) =>
    end - rake(outline[row][1]) - setback(x, row);
  const crown = outline.length - 1;
  const ring: { x: number; row: number }[] = [
    { x: 0, row: 0 },
    ...outline.map(([x], row) => ({ x, row })),
    ...outline
      .slice(0, crown)
      .toReversed()
      .map(([x], index) => ({ x: -x, row: crown - 1 - index })),
  ];
  const body = stations.map((z) =>
    ring.map(({ x, row }): Triple => {
      const limit = reach(x, row);
      return [x, outline[row][1], Math.min(limit, Math.max(-limit, z))];
    }),
  );
  addSkin(
    builder,
    body,
    true,
    paintSide,
    (centre) => new Vector3(centre.x, centre.y - 1.3, 0),
  );
  for (const facing of [1, -1]) {
    const face = outline.map(([width, y], row) => {
      const radius = radiusAt(row);
      const half = [
        ...endColumns.map((x) => Math.min(x, width - radius)),
        ...cornerSteps.map((step) => width - radius * step),
      ];
      const across = [...half.toReversed().map((x) => -x), 0, ...half];
      return across.map((x): Triple => [x, y, facing * reach(x, row)]);
    });
    addSkin(builder, face, false, paintEnd, () => new Vector3(0, 0, facing));
  }
};

const solid =
  (colour: string, finish: Finish): Paint =>
  () => ({ colour, finish });

/** A thin upright strip lying on a body side: a door seam, slat or handrail. */
const addSideStrip = (
  builder: VehicleBuilder,
  colour: string,
  widthAt: (y: number) => number,
  side: number,
  z: number,
  [from, to]: Point,
  steps = 1,
  thickness = 0.012,
  lift = 0.003,
): void => {
  const grid = listEvenly(from, to, steps).map((y): Triple[] => {
    const x = side * (widthAt(y) + lift);
    return [
      [x, y, z - thickness / 2],
      [x, y, z + thickness / 2],
    ];
  });
  addSkin(
    builder,
    grid,
    false,
    solid(colour, "metal"),
    () => new Vector3(side, 0, 0),
  );
};

/** A thin strip running along a body side at one height. */
const addSideRail = (
  builder: VehicleBuilder,
  colour: string,
  widthAt: (y: number) => number,
  side: number,
  y: number,
  [from, to]: Point,
  thickness = 0.012,
): void => {
  const grid = [y - thickness / 2, y + thickness / 2].map(
    (height): Triple[] => {
      const x = side * (widthAt(height) + 0.003);
      return [
        [x, height, from],
        [x, height, to],
      ];
    },
  );
  addSkin(
    builder,
    grid,
    false,
    solid(colour, "metal"),
    () => new Vector3(side, 0, 0),
  );
};

/** A disc wheelset: tread and flange, with a hub boss close up. */
const addDiscWheelset = (
  builder: VehicleBuilder,
  z: number,
  radius: number,
  segments: number,
): void => {
  for (const side of [1, -1]) {
    const x = side * railHalfGauge;
    builder.cylinder("metal", "#43474d", {
      radius,
      length: wheelTread,
      at: [x, radius, z],
      axis: "x",
      segments: builder.segments(segments, 6),
    });
    if (builder.isMap) {
      continue;
    }
    builder.cylinder("metal", "#2b2e33", {
      radius: radius + 0.025,
      length: 0.02,
      at: [x - side * (wheelTread / 2 - 0.01), radius, z],
      axis: "x",
      segments,
    });
    builder.cylinder("metal", "#474b52", {
      radius: radius * 0.24,
      length: wheelTread + 0.03,
      at: [x + side * 0.01, radius, z],
      axis: "x",
      segments: 6,
    });
  }
};

/** A side frame in side view, centred on `centre`, with bellies dipping between the axles. */
const sideFrameShape = (
  centre: number,
  length: number,
  top: number,
  bottom: number,
  bellies: readonly { from: number; to: number; depth: number }[],
): Shape => {
  const at = (z: number) => -(centre + z);
  const shape = new Shape();
  shape.moveTo(at(-length / 2), bottom);
  for (const { from, to, depth } of bellies.toSorted(
    (first, second) => first.from - second.from,
  )) {
    shape.lineTo(at(from), bottom);
    shape.bezierCurveTo(
      at(from + (to - from) * 0.15),
      depth,
      at(to - (to - from) * 0.15),
      depth,
      at(to),
      bottom,
    );
  }
  shape.lineTo(at(length / 2), bottom);
  shape.lineTo(at(length / 2), top);
  shape.lineTo(at(-length / 2), top);
  shape.closePath();
  return shape;
};

const locoLength = 6.3;
const locoEnd = 2.95;
const locoTop = 2.06;
const locoCantrail = 1.82;

const loco = {
  green: "#1d4a2d",
  band: "#6f9e57",
  roof: "#5d6164",
  yellow: "#e2b52a",
  rubber: "#121314",
  glass: "#18212a",
  grille: "#202426",
  slat: "#40474a",
  under: "#1c1e20",
  frame: "#4a4f55",
  seam: "#12291a",
  handrail: "#a7adb2",
};

const locoWidth = (y: number): number => {
  if (y < 0.67) {
    return 0.675 + (0.035 * Math.max(0, y - 0.62)) / 0.05;
  }
  if (y <= 1.3) {
    return 0.71;
  }
  return 0.71 - 0.05 * ((Math.min(y, locoCantrail) - 1.3) / 0.52) ** 1.4;
};

const locoRake = (y: number): number => {
  if (y <= 1.12) {
    return 0;
  }
  if (y <= 1.62) {
    return (0.14 * (y - 1.12)) / 0.5;
  }
  const share = Math.min(1, (y - 1.62) / (locoTop - 1.62));
  return 0.14 + 0.34 * (1 - Math.sqrt(Math.max(0, 1 - share ** 2)));
};

const locoOutline = (isMap: boolean): Point[] => {
  const heights = isMap
    ? [0.62, 0.9, 0.92, 1.12, 1.2, 1.42, 1.6, 1.66]
    : [
        0.62, 0.67, 0.78, 0.9, 0.92, 1.12, 1.2, 1.22, 1.3, 1.42, 1.58, 1.6,
        1.66, 1.74,
      ];
  const shoulder: Point = [locoWidth(locoCantrail), locoCantrail];
  return [
    ...heights.map((y): Point => [locoWidth(y), y]),
    shoulder,
    ...superellipseRoof(shoulder, locoTop, isMap ? 3 : 6, 2.6),
    [0, locoTop],
  ];
};

const cabDoor: Point = [2.33, 2.57];
const cabDroplight: Point = [2.37, 2.53];
const cabWindow: Point = [2.62, 2.73];
const engineWindows = mirrorSpans([
  [1.95, 2.12],
  [1.66, 1.83],
  [-0.04, 0.13],
]);
const grilles: Point[] = [
  [0.38, 1.46],
  [-1.6, -0.22],
];

const locoSidePaint =
  (isMap: boolean): Paint =>
  ({ y, z }, normal) => {
    if (normal.y < -0.7) {
      return metal(loco.under);
    }
    if (y > locoCantrail + 0.005) {
      return loco.roof;
    }
    const absZ = Math.abs(z);
    if (Math.abs(normal.x) > 0.55) {
      if (
        within(y, isMap ? 1.2 : 1.3, 1.6) &&
        (within(absZ, ...cabDroplight) ||
          (!isMap && within(absZ, ...cabWindow)))
      ) {
        return glass(loco.glass);
      }
      if (within(y, 1.42, 1.66)) {
        if (!isMap && inAny(z, engineWindows)) {
          return glass(loco.glass);
        }
        if (inAny(z, grilles)) {
          return metal(loco.grille);
        }
      }
    }
    return y < 0.9 ? loco.band : loco.green;
  };

const locoEndPaint =
  (isMap: boolean): Paint =>
  ({ x, y }, normal) => {
    if (normal.y < -0.7) {
      return metal(loco.under);
    }
    const absX = Math.abs(x);
    const pane = isMap ? [0.02, 0.56, 1.2, 1.6] : [0.04, 0.54, 1.22, 1.58];
    if (within(y, pane[2], pane[3]) && within(absX, pane[0], pane[1])) {
      return glass(loco.glass);
    }
    if (within(y, 1.2, 1.6) && within(absX, 0.02, 0.56)) {
      return loco.rubber;
    }
    if (within(y, 0.92, 1.12) && absX < 0.3) {
      return loco.yellow;
    }
    if (y > 2.01) {
      return loco.roof;
    }
    return y < 0.9 ? loco.band : loco.green;
  };

const addCoCoBogie = (builder: VehicleBuilder, centre: number): void => {
  const radius = 0.27;
  const pitch = 0.62;
  const axles = [centre - pitch, centre, centre + pitch];
  for (const axle of axles) {
    addDiscWheelset(builder, axle, radius, 18);
  }
  const frameX = railHalfGauge + 0.12;
  const frame = sideFrameShape(centre, 1.86, 0.55, 0.37, [
    { from: -0.5, to: -0.12, depth: 0.16 },
    { from: 0.12, to: 0.5, depth: 0.16 },
  ]);
  for (const side of [1, -1]) {
    builder.sidePlate("metal", loco.frame, frame, side * frameX, 0.05);
    if (builder.isMap) {
      continue;
    }
    builder.box(
      "metal",
      loco.frame,
      [0.09, 0.035, 1.9],
      [side * (frameX + 0.01), 0.55, centre],
    );
    for (const axle of axles) {
      builder.box(
        "metal",
        "#50555c",
        [0.1, 0.18, 0.18],
        [side * (frameX + 0.02), radius, axle],
      );
      builder.box(
        "metal",
        "#1d2023",
        [0.11, 0.03, 0.21],
        [side * (frameX + 0.025), radius + 0.1, axle],
      );
      for (const offset of [-0.06, 0.06]) {
        builder.cylinder("metal", "#4a4f56", {
          radius: 0.03,
          length: 0.07,
          at: [side * (frameX + 0.03), radius + 0.15, axle + offset],
          segments: 6,
        });
      }
    }
    for (const end of [-1, 1]) {
      builder.box(
        "metal",
        "#2a2d31",
        [0.1, 0.16, 0.12],
        [side * (frameX + 0.02), 0.46, centre + end * 0.97],
      );
      builder.cylinder("metal", "#30343a", {
        radius: 0.05,
        length: 0.1,
        at: [side * (frameX + 0.05), 0.5, centre + end * 0.31],
        axis: "x",
        segments: 8,
      });
    }
  }
  for (const end of [-1, 1]) {
    builder.box(
      "metal",
      loco.frame,
      [frameX * 2, 0.1, 0.1],
      [0, 0.5, centre + end * 0.9],
    );
  }
};

const addGrilleSlats = (builder: VehicleBuilder): void => {
  for (const side of [1, -1]) {
    for (const [from, to] of grilles) {
      for (const z of listEvenly(
        from + 0.025,
        to - 0.025,
        Math.round((to - from) / 0.04),
      )) {
        addSideStrip(
          builder,
          loco.slat,
          locoWidth,
          side,
          z,
          [1.43, 1.65],
          1,
          0.01,
        );
      }
      for (const y of [1.426, 1.654]) {
        addSideRail(builder, loco.slat, locoWidth, side, y, [from, to], 0.01);
      }
    }
  }
};

const addCabSideDetails = (builder: VehicleBuilder, facing: number): void => {
  for (const side of [1, -1]) {
    for (const z of cabDoor) {
      addSideStrip(
        builder,
        loco.seam,
        locoWidth,
        side,
        facing * z,
        [0.66, 1.68],
        3,
        0.01,
      );
    }
    addSideRail(
      builder,
      loco.seam,
      locoWidth,
      side,
      1.68,
      [
        facing > 0 ? cabDoor[0] : -cabDoor[1],
        facing > 0 ? cabDoor[1] : -cabDoor[0],
      ],
      0.01,
    );
    for (const z of [cabDoor[0] - 0.035, cabDoor[1] + 0.035]) {
      addSideStrip(
        builder,
        loco.handrail,
        locoWidth,
        side,
        facing * z,
        [0.8, 1.5],
        3,
        0.014,
        0.012,
      );
    }
    for (const y of [0.42, 0.25]) {
      builder.box(
        "metal",
        loco.under,
        [0.06, 0.025, 0.2],
        [side * 0.68, y, (facing * (cabDoor[0] + cabDoor[1])) / 2],
      );
    }
    for (const z of [cabDoor[0] + 0.02, cabDoor[1] - 0.02]) {
      builder.box(
        "metal",
        loco.under,
        [0.02, 0.4, 0.02],
        [side * 0.69, 0.42, facing * z],
      );
    }
  }
};

const addCabFront = (builder: VehicleBuilder, facing: number): void => {
  const front = facing * locoEnd;
  builder.box("metal", loco.under, [1.4, 0.24, 0.12], [0, 0.5, front]);
  builder.box(
    "metal",
    loco.under,
    [1.24, 0.12, 0.08],
    [0, 0.33, front - facing * 0.03],
  );
  addBuffers(builder, facing * (locoLength / 2), { height: 0.52 });
  const box = { bottom: 1.64, top: 1.84 };
  const faceZ = locoEnd - locoRake(box.bottom) + 0.02;
  builder.box(
    "paint",
    loco.green,
    [0.46, box.top - box.bottom, 0.26],
    [0, (box.bottom + box.top) / 2, facing * (faceZ - 0.13)],
  );
  builder.box(
    "glass",
    loco.glass,
    [0.38, 0.12, 0.012],
    [0, (box.bottom + box.top) / 2, facing * (faceZ + 0.002)],
  );
  if (builder.isMap) {
    return;
  }
  for (const side of [1, -1]) {
    addLamp(builder, [side * 0.5, 0.78, front + facing * 0.005], facing, {
      radius: 0.032,
    });
    builder.box(
      "metal",
      loco.handrail,
      [0.05, 0.012, 0.03],
      [side * 0.5, 0.86, front + facing * 0.02],
    );
    builder.bar(
      "metal",
      "#0e0f10",
      [side * 0.24, 1.25, facing * (locoEnd - locoRake(1.25) + 0.012)],
      [side * 0.4, 1.52, facing * (locoEnd - locoRake(1.52) + 0.012)],
      0.012,
      4,
    );
    for (const offset of [-0.08, 0.08]) {
      builder.bar(
        "metal",
        "#2a2d31",
        [side * 0.24 + offset, 0.48, facing * (locoEnd + 0.07)],
        [side * 0.24 + offset, 0.3, facing * (locoEnd + 0.13)],
        0.035,
        6,
      );
    }
  }
  addCabSideDetails(builder, facing);
};

const addRoofDetails = (builder: VehicleBuilder): void => {
  const fanZ = -1.0;
  builder.cylinder("metal", "#34383c", {
    radius: 0.3,
    length: 0.06,
    at: [0, locoTop, fanZ],
    segments: 24,
  });
  if (builder.isMap) {
    return;
  }
  builder.cylinder("metal", "#1a1c1e", {
    radius: 0.26,
    length: 0.02,
    at: [0, locoTop + 0.03, fanZ],
    segments: 24,
  });
  for (let spoke = 0; spoke < 6; spoke++) {
    builder.box(
      "metal",
      "#4a4f55",
      [0.52, 0.015, 0.02],
      [0, locoTop + 0.045, fanZ],
      [0, (spoke / 6) * Math.PI, 0],
    );
  }
  for (const z of [0.55, 0.95, 1.35]) {
    builder.box("metal", "#2b2f33", [0.34, 0.025, 0.22], [0, locoTop, z]);
  }
};

const addLocoUnderframe = (builder: VehicleBuilder): void => {
  builder.box("metal", loco.under, [1.36, 0.06, 5.7], [0, 0.6, 0]);
  builder.box("metal", "#202326", [1.12, 0.3, 1.12], [0, 0.42, 0]);
  for (const z of [0.78, -0.78]) {
    builder.box("metal", "#25282c", [1.24, 0.22, 0.26], [0, 0.46, z]);
  }
  if (builder.isMap) {
    return;
  }
  for (const z of [0.78, -0.78]) {
    builder.box("metal", "#33373c", [1.26, 0.03, 0.27], [0, 0.575, z]);
  }
  for (const z of [-0.3, 0, 0.3]) {
    builder.box("metal", "#2d3135", [1.14, 0.02, 0.02], [0, 0.4, z]);
  }
};

const buildLocomotive = (detail: TrainDetail): BufferGeometry => {
  const builder = new VehicleBuilder(detail);
  const isMap = builder.isMap;
  const cabSpans = isMap ? [cabDroplight] : [cabDoor, cabDroplight, cabWindow];
  const stations = listBreaks(
    -locoEnd,
    locoEnd,
    0,
    ...mirrorSpans(cabSpans).flat(),
    ...(isMap ? [] : engineWindows.flat()),
    ...grilles.flat(),
    ...[0.2, 0.4].flatMap((inset) => [locoEnd - inset, inset - locoEnd]),
  );
  addShell(builder, {
    outline: locoOutline(isMap),
    end: locoEnd,
    stations,
    rake: locoRake,
    cornerRadius: 0.1,
    endColumns: isMap ? [0.02, 0.3, 0.56] : [0.02, 0.04, 0.3, 0.54, 0.56],
    cornerSteps: isMap ? [1, 0.4, 0] : [1, 0.55, 0.2, 0],
    paintSide: locoSidePaint(isMap),
    paintEnd: locoEndPaint(isMap),
  });
  for (const centre of [1.8, -1.8]) {
    addCoCoBogie(builder, centre);
  }
  addLocoUnderframe(builder);
  addRoofDetails(builder);
  for (const facing of [1, -1]) {
    addCabFront(builder, facing);
  }
  if (!isMap) {
    addGrilleSlats(builder);
  }
  return builder.build();
};

const coachLength = 6.2;
const coachEnd = 2.92;
const coachTop = 2.0;
const coachCantrail = 1.765;

const coach = {
  carmine: "#7e1b29",
  cream: "#e4d1a2",
  gold: "#c39a45",
  lining: "#141414",
  roof: "#5b5f62",
  end: "#1b1b1c",
  glass: "#1d252c",
  frame: "#b9bcbf",
  under: "#1c1e20",
  seam: "#5a1019",
  creamSeam: "#a8966e",
};

const coachWidth = (y: number): number => {
  if (y < 1.06) {
    return 0.72 - 0.085 * ((1.06 - Math.max(0.6, y)) / 0.46) ** 2;
  }
  return 0.72 - 0.025 * ((Math.min(y, coachCantrail) - 1.06) / 0.705) ** 1.5;
};

const coachOutline = (isMap: boolean): Point[] => {
  const heights = isMap
    ? [0.6, 0.8, 1.1, 1.2, 1.58]
    : [
        0.6, 0.7, 0.84, 0.98, 1.1, 1.115, 1.127, 1.2, 1.24, 1.48, 1.495, 1.58,
        1.74, 1.752,
      ];
  const shoulder: Point = [coachWidth(coachCantrail), coachCantrail];
  return [
    ...heights.map((y): Point => [coachWidth(y), y]),
    shoulder,
    ...superellipseRoof(shoulder, coachTop, isMap ? 2 : 4, 2.3),
    [0, coachTop],
  ];
};

const coachRake = (y: number): number => {
  if (y <= coachCantrail) {
    return 0;
  }
  const share = Math.min(1, (y - coachCantrail) / (coachTop - coachCantrail));
  return 0.1 * (1 - Math.sqrt(Math.max(0, 1 - share ** 2)));
};

interface CoachLayout {
  windows: Point[];
  doors: Point[];
  droplights: Point[];
  compartments: Point[];
}

const coachLayout = (): CoachLayout => {
  const count = 5;
  const span = 2.44;
  const pitch = (span * 2) / count;
  const windowWidth = 0.298;
  const doorWidth = 0.26;
  const gap = (pitch - windowWidth * 2 - doorWidth) / 4;
  const windows: Point[] = [];
  const compartments: Point[] = [];
  const doors: Point[] = [
    [2.52, 2.78],
    [-2.78, -2.52],
  ];
  for (let index = 0; index < count; index++) {
    const start = -span + index * pitch + gap;
    windows.push([start, start + windowWidth]);
    const doorStart = start + windowWidth + gap;
    doors.push([doorStart, doorStart + doorWidth]);
    const secondStart = doorStart + doorWidth + gap;
    windows.push([secondStart, secondStart + windowWidth]);
    compartments.push([start, secondStart + windowWidth]);
  }
  const droplights = doors.map(([from, to]): Point => [from + 0.04, to - 0.04]);
  return { windows, doors, droplights, compartments };
};

const layout = coachLayout();

const coachSidePaint =
  (isMap: boolean): Paint =>
  ({ y, z }, normal) => {
    if (normal.y < -0.7) {
      return metal(coach.under);
    }
    if (y > coachCantrail + 0.004) {
      return coach.roof;
    }
    if (Math.abs(normal.x) > 0.5) {
      if (isMap) {
        if (
          within(y, 1.2, 1.58) &&
          inAny(z, [...layout.compartments, ...layout.droplights.slice(0, 2)])
        ) {
          return glass(coach.glass);
        }
      } else {
        if (within(y, 1.24, 1.58) && inAny(z, layout.droplights)) {
          return glass(coach.glass);
        }
        if (within(y, 1.2, 1.58) && inAny(z, layout.windows)) {
          return within(y, 1.48, 1.495) ? coach.frame : glass(coach.glass);
        }
      }
    }
    if (y < 1.1) {
      return coach.carmine;
    }
    if (y < 1.115) {
      return coach.lining;
    }
    if (y < 1.127) {
      return coach.gold;
    }
    if (y > 1.752) {
      return coach.lining;
    }
    if (y > 1.74) {
      return coach.gold;
    }
    return coach.cream;
  };

const coachEndPaint =
  (isMap: boolean): Paint =>
  (centre, normal) => {
    if (normal.y < -0.7) {
      return metal(coach.under);
    }
    if (Math.abs(normal.z) < 0.6) {
      return coachSidePaint(isMap)({ ...centre, z: 0 }, normal);
    }
    return centre.y > coachCantrail + 0.004 ? coach.roof : coach.end;
  };

const addPlateBogie = (builder: VehicleBuilder, centre: number): void => {
  const radius = 0.25;
  const wheelBase = 0.82;
  for (const axle of [centre - wheelBase / 2, centre + wheelBase / 2]) {
    addDiscWheelset(builder, axle, radius, 12);
  }
  const frameX = railHalfGauge + 0.11;
  const frame = sideFrameShape(centre, 1.3, 0.52, 0.34, [
    { from: -0.24, to: 0.24, depth: 0.16 },
  ]);
  for (const side of [1, -1]) {
    builder.sidePlate("metal", "#4b5056", frame, side * frameX, 0.04);
    if (builder.isMap) {
      continue;
    }
    for (const axle of [-wheelBase / 2, wheelBase / 2]) {
      builder.box(
        "metal",
        "#555a61",
        [0.09, 0.15, 0.14],
        [side * (frameX + 0.02), radius, centre + axle],
      );
      builder.cylinder("metal", "#474c53", {
        radius: 0.03,
        length: 0.07,
        at: [side * (frameX + 0.025), radius + 0.11, centre + axle],
        segments: 6,
      });
    }
    builder.cylinder("metal", "#3f444b", {
      radius: 0.055,
      length: 0.12,
      at: [side * (frameX + 0.01), 0.36, centre],
      segments: 8,
    });
  }
  builder.box("metal", "#24272b", [frameX * 2, 0.08, 0.24], [0, 0.46, centre]);
};

const addCoachEnd = (builder: VehicleBuilder, facing: number): void => {
  const end = facing * coachEnd;
  builder.box("metal", coach.under, [1.36, 0.16, 0.1], [0, 0.53, end]);
  for (const side of [1, -1]) {
    builder.cylinder("metal", "#26292e", {
      radius: 0.045,
      radiusEnd: 0.055,
      length: 0.16,
      at: [side * 0.44, 0.52, facing * (coachLength / 2 - 0.1)],
      axis: "z",
      segments: 8,
    });
    builder.cylinder("metal", "#3a3e45", {
      radius: 0.09,
      length: 0.025,
      at: [side * 0.44, 0.52, facing * (coachLength / 2 - 0.0125)],
      axis: "z",
      segments: 12,
    });
  }
  builder.box(
    "metal",
    "#1f2226",
    [0.08, 0.07, 0.16],
    [0, 0.52, facing * (coachLength / 2 - 0.08)],
  );
  builder.box(
    "metal",
    "#1d1f22",
    [0.62, 1.18, 0.1],
    [0, 1.3, facing * (coachEnd + 0.04)],
  );
  if (builder.isMap) {
    return;
  }
  for (const [width, height, depth] of [
    [0.66, 1.22, 0.04],
    [0.64, 1.2, 0.07],
  ]) {
    builder.box(
      "metal",
      "#2a2d31",
      [width, height, 0.015],
      [0, 1.3, facing * (coachEnd + depth)],
    );
  }
  builder.box(
    "metal",
    "#121315",
    [0.4, 0.95, 0.012],
    [0, 1.3, facing * (coachEnd + 0.095)],
  );
  builder.bar(
    "metal",
    "#2a2d31",
    [0.22, 0.48, facing * (coachEnd + 0.05)],
    [0.24, 0.32, facing * (coachEnd + 0.12)],
    0.035,
    6,
  );
};

const addCoachSideDetails = (builder: VehicleBuilder): void => {
  for (const side of [1, -1]) {
    for (const [from, to] of layout.doors) {
      for (const z of [from, to]) {
        addSideStrip(
          builder,
          coach.seam,
          coachWidth,
          side,
          z,
          [0.64, 1.1],
          4,
          0.008,
        );
        addSideStrip(
          builder,
          coach.creamSeam,
          coachWidth,
          side,
          z,
          [1.127, 1.68],
          2,
          0.008,
        );
      }
      addSideRail(
        builder,
        coach.creamSeam,
        coachWidth,
        side,
        1.68,
        [from, to],
        0.008,
      );
      addSideRail(
        builder,
        "#c9ccd0",
        coachWidth,
        side,
        1.18,
        [to - 0.06, to - 0.025],
        0.016,
      );
    }
  }
  for (const side of [1, -1]) {
    for (const [from, to] of layout.windows) {
      for (const z of [from, to]) {
        addSideStrip(
          builder,
          coach.frame,
          coachWidth,
          side,
          z,
          [1.194, 1.586],
          1,
          0.012,
        );
      }
      for (const y of [1.2, 1.58]) {
        addSideRail(
          builder,
          coach.frame,
          coachWidth,
          side,
          y,
          [from - 0.006, to + 0.006],
          0.012,
        );
      }
    }
  }
  for (const z of listEvenly(-2.3, 2.3, 6)) {
    builder.cylinder("metal", "#45494d", {
      radius: 0.045,
      radiusEnd: 0.03,
      length: 0.05,
      at: [0, coachTop + 0.015, z],
      segments: 7,
    });
  }
};

const addCoachUnderframe = (builder: VehicleBuilder): void => {
  for (const side of [1, -1]) {
    builder.box(
      "metal",
      coach.under,
      [0.05, 0.1, coachEnd * 2],
      [side * 0.6, 0.56, 0],
    );
  }
  builder.box("metal", "#25282b", [0.9, 0.22, 0.6], [0, 0.42, 0.7]);
  if (builder.isMap) {
    return;
  }
  for (const z of [-0.45, -0.95]) {
    builder.cylinder("metal", "#2a2d31", {
      radius: 0.12,
      length: 0.5,
      at: [0, 0.4, z],
      axis: "x",
      segments: 10,
    });
  }
  builder.box("metal", "#2e3236", [0.3, 0.16, 0.3], [0.3, 0.44, 1.35]);
};

const buildCarriage = (detail: TrainDetail): BufferGeometry => {
  const builder = new VehicleBuilder(detail);
  const isMap = builder.isMap;
  const edges = isMap
    ? [...layout.compartments, ...layout.droplights.slice(0, 2)].flat()
    : [...layout.windows, ...layout.droplights].flat();
  addShell(builder, {
    outline: coachOutline(isMap),
    end: coachEnd,
    stations: listBreaks(
      -coachEnd,
      coachEnd,
      ...edges,
      coachEnd - 0.06,
      0.06 - coachEnd,
    ),
    rake: coachRake,
    cornerRadius: 0.05,
    endColumns: [0.3],
    cornerSteps: isMap ? [1, 0] : [1, 0.5, 0],
    paintSide: coachSidePaint(isMap),
    paintEnd: coachEndPaint(isMap),
  });
  for (const centre of [2.15, -2.15]) {
    addPlateBogie(builder, centre);
  }
  for (const facing of [1, -1]) {
    addCoachEnd(builder, facing);
  }
  addCoachUnderframe(builder);
  if (!isMap) {
    addCoachSideDetails(builder);
  }
  return builder.build();
};

export const trainModel: TrainModel = {
  locomotive: { length: locoLength, build: buildLocomotive },
  carriage: { length: coachLength, build: buildCarriage },
  carriageCount: 3,
};
