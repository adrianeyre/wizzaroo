import { ExtrudeGeometry, Shape, type ColorRepresentation } from "three";
import {
  VehicleBuilder,
  addBuffers,
  addLamp,
  buildCoachSection,
  listBreaks,
  listEvenly,
  railHalfGauge,
  type LoftStation,
  type Paint,
  type TrainDetail,
  type TrainModel,
  type Triple,
  wheelTread,
} from "./train-kit.js";

const railBlue = "#22415f";
const railBlueDeep = "#172f47";
const railBlueLouvre = "#2a4b6c";
const warningYellow = "#f2c21b";
const roofGrey = "#5f656c";
const pearlGrey = "#c9ccc8";
const windowBlack = "#121417";
const underframeBlack = "#1d1f23";
const bogieBlack = "#23262b";
const glassTint = "#18222c";
const aluminium = "#aeb4ba";
const coachEndBlack = "#1f2124";

const glass = (colour: ColorRepresentation = glassTint) => ({
  colour,
  finish: "glass" as const,
});

const isInside = (
  value: number,
  [from, to]: readonly [number, number],
): boolean => value > from && value < to;

const extrudeSide = (
  builder: VehicleBuilder,
  colour: ColorRepresentation,
  shape: Shape,
  at: Triple,
  thickness: number,
) => {
  const geometry = new ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
    curveSegments: builder.segments(10, 4),
  });
  geometry.translate(0, 0, -thickness / 2);
  builder.add("metal", colour, geometry, {
    at,
    rotation: [0, Math.PI / 2, 0],
  });
};

const locoLength = 6.2;
const locoEnd = locoLength / 2;

const body = {
  halfWidth: 0.7,
  bottom: 0.64,
  waist: 0.9,
  cantrail: 1.74,
  roofTop: 2.0,
  lean: 0.014,
};

const bodySideX = (y: number): number =>
  body.halfWidth -
  body.lean *
    Math.max(0, (y - body.waist) / (body.cantrail - body.waist)) ** 1.5;

const cabFoot = 2.45;
const cabCrown = 2.33;
const bonnetLine = 1.42;
const yellowWrap = 2.27;
const cabDoor: readonly [number, number] = [1.97, 2.21];
const cabDropLight: readonly [number, number] = [2.03, 2.15];
const cabDropFrame: readonly [number, number] = [2.01, 2.17];
const cabWindowHeights: readonly [number, number] = [1.42, 1.7];
const cabWindowFrame: readonly [number, number] = [1.4, 1.72];

const louvreBanks: readonly (readonly [number, number, number, number])[] = [
  [1.3, 1.86, 1.46, 1.7],
  [0.2, 0.86, 1.46, 1.7],
  [-0.96, -0.38, 1.46, 1.7],
];
const radiatorGrille: readonly [number, number, number, number] = [
  -1.88, -1.08, 1.02, 1.72,
];
const bodyDoors: readonly (readonly [number, number])[] = [
  [0.95, 1.22],
  [-0.26, 0.02],
];

const keepSideHeights = (
  points: readonly [number, number][],
  [from, to]: readonly [number, number],
  keep: readonly number[],
): [number, number][] =>
  points.filter(
    ([, y]) =>
      y <= from + 0.0001 ||
      y >= to - 0.0001 ||
      keep.some((height) => Math.abs(height - y) < 0.0001),
  );

const clampSection = (
  points: readonly (readonly [number, number])[],
  ceiling: number,
): [number, number][] => points.map(([x, y]) => [x, Math.min(y, ceiling)]);

const paintLocoBody: Paint = ({ x, y, z }, normal) => {
  const along = Math.abs(z);
  if (normal.y < -0.6) {
    return underframeBlack;
  }
  if (along > cabCrown + 0.001) {
    return warningYellow;
  }
  if (y > body.cantrail + 0.005) {
    return roofGrey;
  }
  if (Math.abs(normal.z) > 0.7) {
    return railBlue;
  }
  if (along > yellowWrap) {
    return warningYellow;
  }
  if (
    Math.abs(x) > 0.5 &&
    isInside(along, cabDropFrame) &&
    isInside(y, cabWindowFrame)
  ) {
    return isInside(along, cabDropLight) && isInside(y, cabWindowHeights)
      ? glass()
      : windowBlack;
  }
  return railBlue;
};

const addLocoBody = (builder: VehicleBuilder) => {
  const fullSection = buildCoachSection({
    halfWidth: body.halfWidth,
    bottom: body.bottom,
    waist: body.waist,
    cantrail: body.cantrail,
    roofTop: body.roofTop,
    tumblehome: 0.004,
    lean: body.lean,
    bilge: 0.03,
    roofSteps: builder.segments(10, 5),
    sideHeights: builder.isMap
      ? []
      : [bonnetLine, ...cabWindowHeights, ...cabWindowFrame],
  });
  const section = builder.isMap
    ? keepSideHeights(
        fullSection,
        [body.bottom + 0.03, body.cantrail],
        [body.waist],
      )
    : fullSection;
  const halfStations = builder.isMap
    ? [yellowWrap]
    : [yellowWrap, ...cabDoor, ...cabDropLight, ...cabDropFrame];
  const inner = listBreaks(
    ...listEvenly(-cabCrown, cabCrown, builder.segments(6, 2)),
    ...halfStations.flatMap((z) => [z, -z]),
  );
  const stations: LoftStation[] = [
    { z: -cabFoot, points: clampSection(section, bonnetLine) },
    ...inner.map((z) => ({ z, points: section })),
    { z: cabFoot, points: clampSection(section, bonnetLine) },
  ];
  builder.loft({ stations, paint: paintLocoBody });
};

const noseSection = (
  halfWidth: number,
  top: number,
  radius: number,
  steps: number,
): [number, number][] => {
  const bottom = 0.64;
  const arc = Array.from({ length: steps + 1 }, (_, step): [number, number] => {
    const angle = (step / steps) * (Math.PI / 2);
    return [
      halfWidth - radius + radius * Math.cos(angle),
      top - radius + radius * Math.sin(angle),
    ];
  });
  const right: [number, number][] = [
    [0, bottom],
    [halfWidth, bottom],
    [halfWidth, (bottom + top - radius) / 2],
    ...arc,
    [0, top],
  ];
  const left = right
    .slice(1, -1)
    .toReversed()
    .map(([x, y]): [number, number] => [-x, y]);
  return [...right, ...left];
};

const noseFront = 2.945;

const addNose = (builder: VehicleBuilder, facing: number) => {
  const steps = builder.segments(4, 2);
  const shapes: readonly (readonly [number, number, number, number])[] = [
    [cabFoot - 0.05, 0.56, 1.43, 0.1],
    [2.8, 0.56, 1.335, 0.1],
    [2.885, 0.548, 1.318, 0.11],
    [2.925, 0.525, 1.296, 0.12],
    [noseFront, 0.495, 1.272, 0.12],
  ];
  builder.loft({
    stations: shapes.map(([z, halfWidth, top, radius]) => ({
      z: facing * z,
      points: noseSection(halfWidth, top, radius, steps),
    })),
    paint: () => warningYellow,
  });
  const front = facing * noseFront;
  builder.box(
    "paint",
    warningYellow,
    [0.5, 0.25, 0.14],
    [0, 1.17, facing * (noseFront - 0.05)],
  );
  builder.box(
    "glass",
    windowBlack,
    [0.42, 0.16, 0.012],
    [0, 1.175, front + facing * 0.022],
  );
  for (const side of [1, -1]) {
    builder.cylinder("glass", "#fff6d8", {
      radius: 0.022,
      length: 0.01,
      at: [side * 0.15, 1.175, front + facing * 0.03],
      axis: "z",
      segments: 10,
    });
  }
  if (builder.isMap) {
    return;
  }
  for (const side of [1, -1]) {
    addLamp(builder, [side * 0.36, 0.82, front + facing * 0.01], facing, {
      radius: 0.035,
      lens: side > 0 ? "#fff3cf" : "#c8261e",
    });
    builder.bar(
      "metal",
      "#30343a",
      [side * 0.46, 0.76, front + facing * 0.03],
      [side * 0.46, 1.14, front + facing * 0.03],
      0.018,
      6,
    );
    for (const seam of [2.6, 2.84]) {
      builder.box(
        "paint",
        "#c79e12",
        [0.006, 0.6, 0.01],
        [side * 0.561, 0.98, facing * seam],
      );
    }
    builder.box(
      "metal",
      "#30343a",
      [0.012, 0.012, 0.16],
      [side * 0.566, 1.08, facing * 2.72],
    );
  }
};

const windscreenSlope = Math.atan2(cabFoot - cabCrown, 1.97 - bonnetLine);

const windscreenZ = (y: number): number =>
  cabFoot - ((y - bonnetLine) / (1.97 - bonnetLine)) * (cabFoot - cabCrown);

const addWindscreens = (builder: VehicleBuilder, facing: number) => {
  const middle = 1.69;
  const tilt: Triple = [-facing * windscreenSlope, 0, 0];
  const out = (lift: number) =>
    facing * (windscreenZ(middle) + lift * Math.cos(windscreenSlope));
  const rise = (lift: number) => middle + lift * Math.sin(windscreenSlope);
  for (const side of [1, -1]) {
    builder.box(
      "paint",
      windowBlack,
      [0.44, 0.33, 0.02],
      [side * 0.255, rise(0.004), out(0.004)],
      tilt,
    );
    builder.box(
      "glass",
      glassTint,
      [0.38, 0.27, 0.01],
      [side * 0.255, rise(0.014), out(0.014)],
      tilt,
    );
    if (!builder.isMap) {
      builder.bar(
        "metal",
        "#202327",
        [side * 0.12, rise(0.02) - 0.11, out(0.02)],
        [side * 0.3, rise(0.02) + 0.06, out(0.02) - facing * 0.03],
        0.012,
        4,
      );
    }
  }
};

const addLouvres = (
  builder: VehicleBuilder,
  side: number,
  [zFrom, zTo, yFrom, yTo]: readonly [number, number, number, number],
  pitch: number,
  slat: ColorRepresentation,
) => {
  const length = zTo - zFrom;
  const middle = (zFrom + zTo) / 2;
  const x = bodySideX((yFrom + yTo) / 2);
  builder.box(
    "paint",
    railBlueDeep,
    [0.012, yTo - yFrom, length],
    [side * x, (yFrom + yTo) / 2, middle],
  );
  if (builder.isMap) {
    return;
  }
  const count = Math.floor((yTo - yFrom) / pitch);
  for (let row = 0; row < count; row++) {
    builder.box(
      "paint",
      slat,
      [0.012, pitch * 0.62, length - 0.02],
      [side * (x + 0.009), yFrom + pitch * (row + 0.5), middle],
      [0, 0, side * 0.5],
    );
  }
};

const addBodyDoor = (
  builder: VehicleBuilder,
  side: number,
  [zFrom, zTo]: readonly [number, number],
  [yFrom, yTo]: readonly [number, number],
  colour: ColorRepresentation,
) => {
  const x = side * (bodySideX(1.2) + 0.004);
  const seam = 0.011;
  for (const z of [zFrom, zTo]) {
    builder.box(
      "paint",
      colour,
      [0.006, yTo - yFrom, seam],
      [x, (yFrom + yTo) / 2, z],
    );
  }
  for (const y of [yFrom, yTo]) {
    builder.box(
      "paint",
      colour,
      [0.006, seam, zTo - zFrom],
      [x, y, (zFrom + zTo) / 2],
    );
  }
};

const addLocoSides = (builder: VehicleBuilder) => {
  for (const side of [1, -1]) {
    for (const bank of louvreBanks) {
      addLouvres(builder, side, bank, 0.04, railBlueLouvre);
      addLouvres(
        builder,
        side,
        [-bank[1], -bank[0], bank[2], bank[3]],
        0.04,
        railBlueLouvre,
      );
    }
    addLouvres(builder, side, radiatorGrille, 0.03, "#33393f");
    if (builder.isMap) {
      continue;
    }
    for (const door of bodyDoors) {
      addBodyDoor(builder, side, door, [0.74, 1.4], railBlueDeep);
      addBodyDoor(
        builder,
        side,
        [-door[1], -door[0]],
        [0.74, 1.4],
        railBlueDeep,
      );
    }
    for (const facing of [1, -1]) {
      const [doorFrom, doorTo] = cabDoor;
      addBodyDoor(
        builder,
        side,
        facing > 0 ? [doorFrom, doorTo] : [-doorTo, -doorFrom],
        [0.7, 1.78],
        railBlueDeep,
      );
      for (const z of [doorFrom - 0.04, doorTo + 0.035]) {
        builder.bar(
          "metal",
          "#3a3f46",
          [side * 0.715, 0.82, facing * z],
          [side * 0.715, 1.36, facing * z],
          0.016,
          6,
        );
      }
      builder.box(
        "metal",
        underframeBlack,
        [0.12, 0.025, 0.22],
        [side * 0.63, 0.47, facing * 2.09],
      );
      builder.bar(
        "metal",
        underframeBlack,
        [side * 0.68, 0.47, facing * 2.0],
        [side * 0.68, 0.64, facing * 2.0],
        0.015,
        4,
      );
      builder.bar(
        "metal",
        underframeBlack,
        [side * 0.68, 0.47, facing * 2.18],
        [side * 0.68, 0.64, facing * 2.18],
        0.015,
        4,
      );
    }
  }
};

const addRoof = (builder: VehicleBuilder) => {
  const fanZ = -1.48;
  builder.lathe(
    "paint",
    "#4b5157",
    [
      [0.33, 1.94],
      [0.33, 2.03],
      [0.3, 2.04],
      [0, 2.04],
    ],
    [0, 0, fanZ],
    "y",
    24,
  );
  builder.cylinder("metal", "#1b1e22", {
    radius: 0.27,
    length: 0.01,
    at: [0, 2.042, fanZ],
    segments: 24,
  });
  if (builder.isMap) {
    return;
  }
  for (let spoke = 0; spoke < 6; spoke++) {
    builder.box(
      "metal",
      "#4a5057",
      [0.54, 0.01, 0.018],
      [0, 2.048, fanZ],
      [0, (spoke / 6) * Math.PI, 0],
    );
  }
  builder.torus("metal", "#4a5057", 0.16, 0.008, [0, 2.047, fanZ], "y", 20);
  builder.box("paint", "#40464c", [0.2, 0.05, 0.34], [0, 1.99, 0.32]);
  builder.box("metal", "#16181b", [0.13, 0.02, 0.24], [0, 2.02, 0.32]);
  for (const facing of [1, -1]) {
    builder.box(
      "metal",
      "#2c3035",
      [0.3, 0.05, 0.12],
      [0, 1.995, facing * 2.18],
    );
  }
};

const addBufferBeam = (builder: VehicleBuilder, facing: number) => {
  const end = facing * locoEnd;
  builder.box(
    "metal",
    underframeBlack,
    [1.4, 0.3, 0.1],
    [0, 0.51, facing * 2.93],
  );
  addBuffers(builder, end, { height: 0.52, reach: 0.17 });
  const plough = new Shape();
  plough.moveTo(-0.62, 0.36);
  plough.lineTo(0.62, 0.36);
  plough.lineTo(0.5, 0.14);
  plough.lineTo(-0.5, 0.14);
  plough.closePath();
  builder.endPlate(
    "metal",
    "#202328",
    plough,
    facing * 2.88 - 0.04,
    facing * 2.88 + 0.04,
  );
  if (builder.isMap) {
    return;
  }
  for (const side of [1, -1]) {
    builder.bar(
      "metal",
      side > 0 ? "#2f3236" : "#5c1d1a",
      [side * 0.19, 0.43, facing * 2.98],
      [side * 0.2, 0.3, facing * 3.05],
      0.03,
      6,
    );
    builder.cylinder("metal", "#2a2d31", {
      radius: 0.035,
      length: 0.05,
      at: [side * 0.6, 0.6, facing * 3.0],
      axis: "z",
      segments: 10,
    });
  }
};

const addDiscWheelset = (
  builder: VehicleBuilder,
  z: number,
  radius: number,
) => {
  const around = builder.segments(18, 7);
  for (const side of [1, -1]) {
    const x = side * railHalfGauge;
    builder.cylinder("metal", "#3d4147", {
      radius,
      length: wheelTread,
      at: [x, radius, z],
      axis: "x",
      segments: around,
    });
    builder.cylinder("metal", "#3d4147", {
      radius: radius + 0.03,
      length: 0.02,
      at: [x - side * (wheelTread / 2 - 0.01), radius, z],
      axis: "x",
      segments: around,
    });
    if (!builder.isMap) {
      builder.cylinder("metal", "#55595f", {
        radius: radius * 0.24,
        length: wheelTread + 0.03,
        at: [x + side * 0.01, radius, z],
        axis: "x",
        segments: 8,
      });
    }
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

const addCoCoBogie = (builder: VehicleBuilder, centre: number) => {
  const radius = 0.26;
  const spacing = 0.6;
  const axles = [centre - spacing, centre, centre + spacing];
  for (const axle of axles) {
    addDiscWheelset(builder, axle, radius);
  }
  const frame = new Shape();
  frame.moveTo(-0.95, 0.42);
  frame.lineTo(-0.9, 0.58);
  frame.lineTo(0.9, 0.58);
  frame.lineTo(0.95, 0.42);
  for (const middle of [0.3, -0.3]) {
    frame.lineTo(middle + 0.16, 0.36);
    frame.lineTo(middle + 0.1, 0.2);
    frame.lineTo(middle - 0.1, 0.2);
    frame.lineTo(middle - 0.16, 0.36);
  }
  frame.lineTo(-0.95, 0.36);
  frame.closePath();
  const frameX = railHalfGauge + 0.12;
  for (const side of [1, -1]) {
    extrudeSide(builder, bogieBlack, frame, [side * frameX, 0, centre], 0.05);
    for (const axle of axles) {
      builder.box(
        "metal",
        "#2e3237",
        [0.1, 0.17, 0.17],
        [side * (frameX + 0.04), radius, axle],
      );
      if (builder.isMap) {
        continue;
      }
      builder.cylinder("metal", "#3c4148", {
        radius: 0.045,
        length: 0.025,
        at: [side * (frameX + 0.095), radius, axle],
        axis: "x",
        segments: 8,
      });
      for (const offset of [-0.055, 0.055]) {
        builder.cylinder("metal", "#4a4f57", {
          radius: 0.026,
          length: 0.16,
          at: [side * (frameX + 0.045), 0.43, axle + offset],
          segments: 6,
        });
      }
    }
    if (builder.isMap) {
      continue;
    }
    for (const middle of [0.3, -0.3]) {
      builder.cylinder("metal", "#30343a", {
        radius: 0.05,
        length: 0.12,
        at: [side * (frameX + 0.05), 0.27, centre + middle],
        axis: "z",
        segments: 8,
      });
    }
    for (const end of [-1, 1]) {
      builder.box(
        "metal",
        "#2b2f34",
        [0.12, 0.14, 0.1],
        [side * (frameX + 0.02), 0.48, centre + end * 0.98],
      );
    }
  }
  for (const end of [-1, 1]) {
    builder.box(
      "metal",
      bogieBlack,
      [frameX * 2, 0.12, 0.1],
      [0, 0.48, centre + end * 0.9],
    );
  }
  builder.box("metal", bogieBlack, [frameX * 2, 0.1, 0.3], [0, 0.5, centre]);
};

const addUnderframe = (builder: VehicleBuilder) => {
  builder.box("metal", underframeBlack, [1.36, 0.08, 5.7], [0, 0.6, 0]);
  builder.box("metal", "#1a1c1f", [1.0, 0.3, 1.7], [0, 0.4, 0]);
  if (builder.isMap) {
    return;
  }
  for (const side of [1, -1]) {
    builder.box("metal", "#24272b", [0.012, 0.24, 1.6], [side * 0.5, 0.4, 0]);
    builder.cylinder("metal", "#3a3e44", {
      radius: 0.035,
      length: 0.03,
      at: [side * 0.3, 0.56, 0.6],
      segments: 8,
    });
    for (const z of [-0.55, 0, 0.55]) {
      builder.box(
        "metal",
        "#2c2f34",
        [0.016, 0.3, 0.02],
        [side * 0.508, 0.4, z],
      );
    }
    builder.bar(
      "metal",
      "#3a3e44",
      [side * 0.6, 0.53, -0.95],
      [side * 0.6, 0.53, 0.95],
      0.022,
      6,
    );
  }
};

const buildLocomotive = (detail: TrainDetail) => {
  const builder = new VehicleBuilder(detail);
  addLocoBody(builder);
  addLocoSides(builder);
  addRoof(builder);
  addUnderframe(builder);
  for (const facing of [1, -1]) {
    addNose(builder, facing);
    addWindscreens(builder, facing);
    addBufferBeam(builder, facing);
    addCoCoBogie(builder, facing * 1.92);
  }
  return builder.build();
};

const coachLength = 6.2;
const coachEnd = coachLength / 2;
const coachBodyEnd = 2.98;

const coach = {
  halfWidth: 0.71,
  bottom: 0.62,
  waist: 1.0,
  cantrail: 1.72,
  roofTop: 2.04,
  bandBottom: 1.05,
};

const saloonWindows = [-1.75, -1.05, -0.35, 0.35, 1.05, 1.75];
const saloonHalfWidth = 0.27;
const saloonHeights: readonly [number, number] = [1.12, 1.58];
const ventLine = 1.48;
const seatTop = 1.24;
const coachDoor: readonly [number, number] = [2.54, 2.86];
const doorDropLight: readonly [number, number] = [2.6, 2.8];
const doorDropHeights: readonly [number, number] = [1.2, 1.58];
const toiletWindow: readonly [number, number] = [2.2, 2.4];
const toiletHeights: readonly [number, number] = [1.3, 1.58];

const coachSideX = (y: number): number => {
  const section = buildCoachSection({
    halfWidth: coach.halfWidth,
    bottom: coach.bottom,
    waist: coach.waist,
    cantrail: coach.cantrail,
    roofTop: coach.roofTop,
    tumblehome: 0.07,
    lean: 0.05,
    sideHeights: [y],
  });
  return (
    section.find(([, height]) => Math.abs(height - y) < 0.0001)?.[0] ??
    coach.halfWidth
  );
};

const paintCoach =
  (isMap: boolean): Paint =>
  ({ x, y, z }, normal) => {
    if (normal.y < -0.6) {
      return underframeBlack;
    }
    if (y > coach.cantrail + 0.005) {
      return roofGrey;
    }
    const along = Math.abs(z);
    if (Math.abs(normal.z) > 0.7) {
      return coachEndBlack;
    }
    if (Math.abs(x) > 0.4) {
      const inSaloon = saloonWindows.some(
        (window) => Math.abs(z - window) < saloonHalfWidth,
      );
      if (inSaloon && isInside(y, saloonHeights)) {
        return glass(!isMap && y < seatTop ? "#2c3946" : glassTint);
      }
      if (isMap) {
        return y > coach.bandBottom ? pearlGrey : railBlue;
      }
      if (isInside(along, doorDropLight) && isInside(y, doorDropHeights)) {
        return glass();
      }
      if (isInside(along, toiletWindow) && isInside(y, toiletHeights)) {
        return glass("#8d969c");
      }
    }
    return y > coach.bandBottom ? pearlGrey : railBlue;
  };

const addCoachBody = (builder: VehicleBuilder) => {
  const fullSection = buildCoachSection({
    halfWidth: coach.halfWidth,
    bottom: coach.bottom,
    waist: coach.waist,
    cantrail: coach.cantrail,
    roofTop: coach.roofTop,
    tumblehome: 0.07,
    lean: 0.05,
    roofSteps: builder.segments(9, 4),
    sideHeights: builder.isMap
      ? [coach.bandBottom, ...saloonHeights]
      : [
          coach.bandBottom,
          ...saloonHeights,
          seatTop,
          doorDropHeights[0],
          toiletHeights[0],
        ],
  });
  const section = builder.isMap
    ? keepSideHeights(
        fullSection,
        [coach.bottom + 0.06, coach.cantrail],
        [coach.waist, coach.bandBottom, ...saloonHeights],
      )
    : fullSection;
  const windowEdges = saloonWindows.flatMap((window) => [
    window - saloonHalfWidth,
    window + saloonHalfWidth,
  ]);
  const endEdges = builder.isMap ? [] : [...doorDropLight, ...toiletWindow];
  const stations = listBreaks(
    -coachBodyEnd,
    coachBodyEnd,
    ...windowEdges,
    ...endEdges.flatMap((z) => [z, -z]),
  );
  builder.loft({
    stations: stations.map((z) => ({ z, points: section })),
    paint: paintCoach(builder.isMap),
  });
};

const addCoachDetails = (builder: VehicleBuilder) => {
  for (const side of [1, -1]) {
    const ventX = side * (coachSideX(ventLine) + 0.004);
    for (const window of saloonWindows) {
      builder.box(
        "metal",
        aluminium,
        [0.008, 0.014, saloonHalfWidth * 2],
        [ventX, ventLine, window],
      );
      builder.box(
        "metal",
        aluminium,
        [0.008, saloonHeights[1] - ventLine, 0.012],
        [ventX, (ventLine + saloonHeights[1]) / 2, window],
      );
    }
    for (const facing of [1, -1]) {
      const [from, to] = coachDoor;
      const x = side * (coachSideX(1.3) + 0.004);
      for (const z of [from, to]) {
        builder.box(
          "paint",
          "#2a2d31",
          [0.006, 1.06, 0.01],
          [x, 1.18, facing * z],
        );
      }
      builder.box(
        "paint",
        "#2a2d31",
        [0.006, 0.01, to - from],
        [x, 1.71, facing * ((from + to) / 2)],
      );
      builder.box(
        "metal",
        aluminium,
        [0.02, 0.018, 0.06],
        [side * (coachSideX(1.1) + 0.01), 1.1, facing * (from + 0.06)],
      );
      builder.bar(
        "metal",
        aluminium,
        [side * (coachSideX(1.0) + 0.012), 0.86, facing * (to + 0.04)],
        [side * (coachSideX(1.4) + 0.012), 1.4, facing * (to + 0.04)],
        0.014,
        4,
      );
    }
  }
};

const addMk2Gangway = (builder: VehicleBuilder, facing: number) => {
  const face = facing * coachBodyEnd;
  builder.box(
    "metal",
    "#26282c",
    [0.64, 1.16, 0.1],
    [0, 1.3, face + facing * 0.04],
  );
  if (builder.isMap) {
    return;
  }
  for (const ridge of [0.02, 0.05]) {
    builder.box(
      "metal",
      "#33363b",
      [0.68, 1.2, 0.012],
      [0, 1.3, face + facing * ridge],
    );
  }
  builder.box(
    "metal",
    "#3a3e44",
    [0.5, 1.02, 0.012],
    [0, 1.27, face + facing * 0.092],
  );
  for (const side of [1, -1]) {
    builder.bar(
      "metal",
      "#2d3035",
      [side * 0.55, 0.7, face + facing * 0.012],
      [side * 0.55, 1.6, face + facing * 0.012],
      0.018,
      4,
    );
  }
  builder.box(
    "metal",
    "#202326",
    [0.3, 0.06, 0.06],
    [0, 1.92, face + facing * 0.02],
  );
};

const addCoachUnderframe = (builder: VehicleBuilder) => {
  builder.box("metal", underframeBlack, [1.3, 0.07, 5.9], [0, 0.585, 0]);
  if (builder.isMap) {
    return;
  }
  const boxes: readonly (readonly [number, number, number])[] = [
    [-1.05, 0.5, 0.42],
    [-0.15, 0.36, 0.32],
    [0.75, 0.6, 0.38],
  ];
  for (const [z, length, width] of boxes) {
    builder.box("metal", "#2a2d31", [width * 2, 0.22, length], [0, 0.44, z]);
  }
  for (const side of [1, -1]) {
    builder.cylinder("metal", "#2f3237", {
      radius: 0.06,
      length: 0.7,
      at: [side * 0.45, 0.45, 0.2],
      axis: "z",
      segments: 10,
    });
  }
};

const addB4Bogie = (builder: VehicleBuilder, centre: number) => {
  const radius = 0.22;
  const halfBase = 0.43;
  const axles = [centre - halfBase, centre + halfBase];
  for (const axle of axles) {
    addDiscWheelset(builder, axle, radius);
  }
  const frame = new Shape();
  frame.moveTo(-0.66, 0.36);
  frame.lineTo(-0.62, 0.46);
  frame.lineTo(0.62, 0.46);
  frame.lineTo(0.66, 0.36);
  frame.lineTo(0.24, 0.36);
  frame.lineTo(0.2, 0.25);
  frame.lineTo(-0.2, 0.25);
  frame.lineTo(-0.24, 0.36);
  frame.closePath();
  const frameX = railHalfGauge + 0.11;
  for (const side of [1, -1]) {
    extrudeSide(builder, bogieBlack, frame, [side * frameX, 0, centre], 0.045);
    for (const axle of axles) {
      builder.box(
        "metal",
        "#30343a",
        [0.09, 0.13, 0.14],
        [side * (frameX + 0.02), radius, axle],
      );
      if (builder.isMap) {
        continue;
      }
      const inward = Math.sign(centre - axle) * 0.1;
      builder.cylinder("metal", "#4a4f57", {
        radius: 0.035,
        length: 0.12,
        at: [side * (frameX + 0.035), 0.37, axle + inward],
        segments: 6,
      });
      builder.box(
        "metal",
        "#2a2d32",
        [0.03, 0.03, 0.14],
        [side * (frameX + 0.04), 0.29, axle + inward / 2],
      );
    }
    if (builder.isMap) {
      continue;
    }
    for (const offset of [-0.08, 0.08]) {
      builder.cylinder("metal", "#4a4f57", {
        radius: 0.045,
        length: 0.1,
        at: [side * (frameX + 0.035), 0.3, centre + offset],
        segments: 6,
      });
    }
    builder.bar(
      "metal",
      "#1c1f23",
      [side * (frameX + 0.05), 0.27, centre + 0.18],
      [side * (frameX + 0.05), 0.44, centre + 0.3],
      0.03,
      6,
    );
  }
  for (const end of [-1, 1]) {
    builder.box(
      "metal",
      bogieBlack,
      [frameX * 2, 0.07, 0.07],
      [0, 0.42, centre + end * 0.6],
    );
  }
  builder.box("metal", bogieBlack, [frameX * 2, 0.09, 0.26], [0, 0.4, centre]);
};

const buildCarriage = (detail: TrainDetail) => {
  const builder = new VehicleBuilder(detail);
  addCoachBody(builder);
  addCoachUnderframe(builder);
  if (!builder.isMap) {
    addCoachDetails(builder);
  }
  for (const facing of [1, -1]) {
    addB4Bogie(builder, facing * 2.12);
    addBuffers(builder, facing * coachEnd, { height: 0.52, reach: 0.14 });
    addMk2Gangway(builder, facing);
  }
  return builder.build();
};

export const trainModel: TrainModel = {
  locomotive: { length: locoLength, build: buildLocomotive },
  carriage: { length: coachLength, build: buildCarriage },
  carriageCount: 3,
};
