import { type BufferGeometry, Shape, type Vector3 } from "three";
import {
  listBreaks,
  listEvenly,
  railHalfGauge,
  type Painted,
  type Spot,
  type TrainDetail,
  type TrainModel,
  type TrainVehicleModel,
  type Triple,
  VehicleBuilder,
  wheelTread,
} from "./train-kit.js";

const livery = {
  navy: "#16213b",
  red: "#b3141f",
  white: "#eef0f2",
  roof: "#4a4d54",
  yellow: "#f0c018",
  band: "#0c111c",
  seam: "#080c16",
  tint: "#24324a",
  underframe: "#24272c",
  grille: "#1a1f2a",
  steel: "#4d535c",
} as const;

const glass = (colour: string): Painted => ({ colour, finish: "glass" });

const stripes = {
  redBottom: 0.68,
  redTop: 0.86,
  whiteBottom: 0.885,
  whiteTop: 0.91,
};

const stripeHeights = Object.values(stripes);

const paintStripes = (y: number): string | undefined => {
  if (y > stripes.redBottom && y < stripes.redTop) {
    return livery.red;
  }
  if (y > stripes.whiteBottom && y < stripes.whiteTop) {
    return livery.white;
  }
  return undefined;
};

const between = (value: number, from: number, to: number): boolean =>
  value > from && value < to;

const bufferHeight = 0.52;
const seamWidth = 0.014;

interface BodySection {
  halfWidth: number;
  bottom: number;
  waist: number;
  cantrail: number;
  roofTop: number;
  tumblehome: number;
  lean: number;
  heights: readonly number[];
  roofSteps: number;
  bilge: number;
}

const sideXOf =
  ({ halfWidth, bottom, waist, cantrail, tumblehome, lean }: BodySection) =>
  (y: number): number =>
    y <= waist
      ? halfWidth - tumblehome * ((waist - y) / (waist - bottom)) ** 2
      : halfWidth - lean * ((y - waist) / (cantrail - waist)) ** 1.5;

/**
 * A body cross-section with a row exactly on every livery and window
 * height and nothing else on the sides, so long bodies stay cheap.
 */
const buildBodySection = (spec: BodySection): [number, number][] => {
  const { bottom, waist, cantrail, roofTop, heights, roofSteps, bilge } = spec;
  const sideX = sideXOf(spec);
  const rows = listBreaks(
    bottom + bilge,
    waist,
    cantrail,
    ...heights.filter((y) => y > bottom + bilge && y < cantrail),
  );
  const shoulder = sideX(cantrail);
  const roof = Array.from(
    { length: roofSteps - 1 },
    (_, step): [number, number] => {
      const angle = ((step + 1) / roofSteps) * (Math.PI / 2);
      return [
        shoulder * Math.cos(angle),
        cantrail + (roofTop - cantrail) * Math.sin(angle) ** 0.8,
      ];
    },
  );
  const right: [number, number][] = [
    [0, bottom],
    [sideX(bottom + bilge) - bilge * 0.7, bottom + bilge * 0.12],
    ...rows.map((y): [number, number] => [sideX(y), y]),
    ...roof,
    [0, roofTop],
  ];
  const left = right
    .slice(1, -1)
    .toReversed()
    .map(([x, y]): [number, number] => [-x, y]);
  return [...right, ...left];
};

const addDiscWheelset = (
  builder: VehicleBuilder,
  z: number,
  radius: number,
): void => {
  const around = builder.segments(18, 8);
  for (const side of [1, -1]) {
    const x = side * railHalfGauge;
    builder.cylinder("metal", "#3b3f45", {
      radius,
      length: wheelTread,
      at: [x, radius, z],
      axis: "x",
      segments: around,
    });
    builder.cylinder("metal", "#34373c", {
      radius: radius + 0.03,
      length: 0.02,
      at: [x - side * (wheelTread / 2 - 0.01), radius, z],
      axis: "x",
      segments: around,
    });
    if (!builder.isMap) {
      builder.cylinder("metal", "#55595f", {
        radius: radius * 0.3,
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

interface ModernBogie {
  wheelBase: number;
  radius: number;
  frame: string;
  /** Height of the body underside the springs carry. */
  bodyBottom: number;
  isLocomotive: boolean;
}

const frameX = railHalfGauge + 0.12;

const addSideFrame = (
  builder: VehicleBuilder,
  z: number,
  { wheelBase, radius, frame, isLocomotive }: ModernBogie,
): void => {
  const reach = wheelBase / 2 + radius * (isLocomotive ? 0.75 : 0.6);
  const over = radius + (isLocomotive ? 0.2 : 0.17);
  const dip = radius - (isLocomotive ? 0.1 : 0.06);
  const outline: [number, number][] = [
    [-reach, radius + 0.04],
    [-reach, over - 0.03],
    [-wheelBase / 2 + 0.16, over],
    [-0.3, over - 0.07],
    [0.3, over - 0.07],
    [wheelBase / 2 - 0.16, over],
    [reach, over - 0.03],
    [reach, radius + 0.04],
    [wheelBase / 2 - 0.2, radius + 0.04],
    [0.24, dip],
    [-0.24, dip],
    [-wheelBase / 2 + 0.2, radius + 0.04],
  ];
  const shape = new Shape();
  outline.forEach(([along, y], index) => {
    if (index === 0) {
      shape.moveTo(z + along, y);
    } else {
      shape.lineTo(z + along, y);
    }
  });
  shape.closePath();
  for (const side of [1, -1]) {
    builder.sidePlate("metal", frame, shape, side * frameX, 0.06);
  }
};

const addModernBogie = (
  builder: VehicleBuilder,
  z: number,
  style: ModernBogie,
): void => {
  const { wheelBase, radius, frame, bodyBottom, isLocomotive } = style;
  const axles = [z + wheelBase / 2, z - wheelBase / 2];
  for (const axle of axles) {
    addDiscWheelset(builder, axle, radius);
  }
  addSideFrame(builder, z, style);
  builder.box("metal", frame, [frameX * 2, 0.07, 0.24], [0, radius + 0.04, z]);
  for (const end of [1, -1]) {
    builder.box(
      "metal",
      frame,
      [frameX * 2, 0.05, 0.06],
      [0, radius + 0.1, z + end * (wheelBase / 2 + radius * 0.5)],
    );
  }
  if (builder.isMap) {
    return;
  }
  const springTop = bodyBottom - 0.02;
  for (const side of [1, -1]) {
    const x = side * (frameX + 0.045);
    for (const axle of axles) {
      builder.box("metal", "#2d3035", [0.07, 0.12, 0.16], [x, radius, axle]);
      builder.cylinder("metal", "#3c4047", {
        radius: 0.03,
        length: 0.03,
        at: [x + side * 0.04, radius, axle],
        axis: "x",
        segments: 8,
      });
      for (const turn of [-0.06, 0.06]) {
        builder.cylinder("metal", "#4a5058", {
          radius: 0.026,
          length: 0.1,
          at: [side * frameX, radius + 0.12, axle + turn],
          segments: 8,
        });
      }
    }
    const nest = isLocomotive ? [-0.12, 0.12] : [0];
    for (const offset of nest) {
      const from = radius + 0.1;
      builder.cylinder("metal", isLocomotive ? "#4a3a30" : "#2e3136", {
        radius: isLocomotive ? 0.055 : 0.075,
        length: springTop - from,
        at: [side * (frameX - 0.06), (springTop + from) / 2, z + offset],
        segments: 10,
      });
    }
    builder.bar(
      "metal",
      "#1b1e22",
      [side * (frameX + 0.035), radius + 0.02, z + wheelBase * 0.18],
      [side * (frameX + 0.035), springTop, z + wheelBase * 0.05],
      0.035,
      6,
    );
    builder.bar(
      "metal",
      "#2a2d31",
      [side * (frameX + 0.04), radius + 0.13, z - wheelBase * 0.3],
      [side * (frameX + 0.04), radius + 0.13, z + 0.1],
      0.03,
      6,
    );
  }
};

const addBufferPair = (
  builder: VehicleBuilder,
  end: number,
  reach: number,
): void => {
  const facing = Math.sign(end);
  for (const side of [1, -1]) {
    builder.cylinder("metal", "#26292e", {
      radius: 0.045,
      radiusEnd: 0.055,
      length: reach,
      at: [side * 0.44, bufferHeight, end - facing * (reach / 2 + 0.02)],
      axis: "z",
      segments: 10,
    });
    builder.cylinder("metal", "#3a3e45", {
      radius: 0.09,
      length: 0.025,
      at: [side * 0.44, bufferHeight, end - facing * 0.0125],
      axis: "z",
      segments: 14,
    });
  }
  builder.box(
    "metal",
    "#1f2226",
    [0.09, 0.08, reach],
    [0, bufferHeight, end - facing * (reach / 2 + 0.01)],
  );
};

const addPipes = (builder: VehicleBuilder, end: number): void => {
  if (builder.isMap) {
    return;
  }
  const facing = Math.sign(end);
  for (const side of [1, -1]) {
    builder.bar(
      "metal",
      "#2c2f34",
      [side * 0.18, 0.36, end - facing * 0.14],
      [side * 0.22, 0.3, end - facing * 0.03],
      0.03,
      6,
    );
  }
};

const locoLength = 6.6;
const locoFront = locoLength / 2;
const hinge = 0.93;
const locoBody: BodySection = {
  halfWidth: 0.72,
  bottom: 0.58,
  waist: 1.0,
  cantrail: 1.8,
  roofTop: 2.0,
  tumblehome: 0.03,
  lean: 0.02,
  heights: [],
  roofSteps: 10,
  bilge: 0.04,
};
const noseTip = 3.22;
const rearFace = -3.2;
const noseStart = 1.92;
const browEnd = 2.04;
const screenBottom = 2.5;

const cabWindow = { bottom: 1.32, top: 1.64 };
const doorTop = 1.74;

const noseProfile: readonly (readonly [number, number])[] = [
  [noseStart, locoBody.roofTop],
  [1.98, 1.985],
  [browEnd, 1.945],
  [2.27, 1.7],
  [screenBottom, 1.44],
  [2.62, 1.31],
  [2.74, 1.2],
  [2.86, 1.11],
  [2.98, 1.05],
  [3.08, 1.005],
  [3.16, 0.975],
  [noseTip, 0.96],
];

const rearProfile: readonly (readonly [number, number])[] = [
  [rearFace, 1.94],
  [-3.18, 1.975],
  [-3.14, 1.995],
  [-3.1, locoBody.roofTop],
];

const interpolate = (
  profile: readonly (readonly [number, number])[],
  z: number,
): number => {
  for (let index = 0; index < profile.length - 1; index++) {
    const [z0, y0] = profile[index];
    const [z1, y1] = profile[index + 1];
    if (z >= z0 && z <= z1) {
      return y0 + ((y1 - y0) * (z - z0)) / (z1 - z0);
    }
  }
  return locoBody.roofTop;
};

const locoTopAt = (z: number): number => {
  if (z >= noseStart) {
    return interpolate(noseProfile, z);
  }
  if (z <= rearProfile[rearProfile.length - 1][0]) {
    return interpolate(rearProfile, z);
  }
  return locoBody.roofTop;
};

const nosePlanStart = 2.2;

const locoWidthAt = (z: number): number => {
  if (z > nosePlanStart) {
    const share = Math.min(1, (z - nosePlanStart) / (noseTip - nosePlanStart));
    return 1 - 0.17 * share ** 2.4;
  }
  if (z < -3.08) {
    const share = Math.min(1, (-3.08 - z) / (-3.08 - rearFace));
    return 1 - 0.035 * share ** 2;
  }
  return 1;
};

const raise = (y: number, top: number): number =>
  y <= hinge
    ? y
    : hinge + ((y - hinge) * (top - hinge)) / (locoBody.roofTop - hinge);

const yellowFrom = 2.98;
const noseChin = 0.8;

const pinchAt = (z: number): number =>
  Math.max(0, (z - yellowFrom) / (noseTip - yellowFrom)) ** 2;

const lower = (y: number, top: number): number =>
  y <= hinge
    ? y
    : hinge + ((y - hinge) * (locoBody.roofTop - hinge)) / (top - hinge);

interface CabSide {
  doorFrom: number;
  doorTo: number;
  windowFrom: number;
  windowTo: number;
}

const cabSides: readonly CabSide[] = [
  { doorFrom: 1.3, doorTo: 1.62, windowFrom: 1.68, windowTo: 1.88 },
  { doorFrom: -2.9, doorTo: -2.58, windowFrom: -3.06, windowTo: -2.94 },
];

const paintCabSide = (z: number, y: number): Painted => {
  for (const cab of cabSides) {
    if (
      between(z, cab.windowFrom, cab.windowTo) &&
      between(y, cabWindow.bottom, cabWindow.top)
    ) {
      return glass(livery.tint);
    }
    const onSeam =
      between(z, cab.doorFrom, cab.doorFrom + seamWidth) ||
      between(z, cab.doorTo - seamWidth, cab.doorTo);
    if (onSeam && y < doorTop) {
      return livery.seam;
    }
    if (
      between(z, cab.doorFrom, cab.doorTo) &&
      between(y, doorTop - seamWidth, doorTop)
    ) {
      return livery.seam;
    }
    if (
      between(z, cab.doorFrom + 0.06, cab.doorTo - 0.06) &&
      between(y, cabWindow.bottom + 0.04, cabWindow.top)
    ) {
      return glass(livery.tint);
    }
  }
  return undefined;
};

const paintNose = (z: number, y: number, across: number): Painted => {
  const isRoofRow = y > locoBody.cantrail;
  if (z < browEnd) {
    return isRoofRow ? livery.roof : livery.navy;
  }
  if (z < screenBottom) {
    return isRoofRow && across < 0.6 ? glass(livery.tint) : livery.band;
  }
  return livery.yellow;
};

const paintLocoBody = (centre: Spot, normal: Vector3): Painted => {
  const { x, z } = centre;
  if (normal.z > 0.9 && z > noseTip - 0.01) {
    return livery.yellow;
  }
  if (normal.z < -0.9 && z < rearFace + 0.01) {
    return livery.yellow;
  }
  if (z > yellowFrom) {
    return livery.yellow;
  }
  const y = lower(centre.y, locoTopAt(z));
  if (y < locoBody.bottom + 0.02 && Math.abs(normal.y) > 0.8) {
    return livery.underframe;
  }
  if (z > noseStart && y > hinge) {
    return paintNose(z, y, Math.abs(x) / locoWidthAt(z));
  }
  if (y > locoBody.cantrail) {
    return livery.roof;
  }
  return paintStripes(y) ?? paintCabSide(z, y) ?? livery.navy;
};

const locoStations = (isMap: boolean): number[] => {
  const cabEdges = cabSides.flatMap((cab) =>
    isMap
      ? [cab.windowFrom, cab.windowTo]
      : [
          cab.doorFrom,
          cab.doorFrom + seamWidth,
          cab.doorFrom + 0.06,
          cab.doorTo - 0.06,
          cab.doorTo - seamWidth,
          cab.doorTo,
          cab.windowFrom,
          cab.windowTo,
        ],
  );
  const nose = isMap
    ? [noseStart, browEnd, screenBottom, 2.74, yellowFrom, 3.14, noseTip]
    : [...noseProfile.map(([z]) => z), 3.12, 3.19, 3.21];
  const rear = isMap
    ? [rearFace, -3.14, -3.1]
    : [...rearProfile.map(([z]) => z), -3.08];
  const nosePlan = isMap ? [] : listEvenly(nosePlanStart, noseTip, 5);
  return listBreaks(...rear, ...cabEdges, 0, ...nose, ...nosePlan);
};

const buildLocoBody = (builder: VehicleBuilder): void => {
  const section = buildBodySection({
    ...locoBody,
    heights: builder.isMap
      ? [...stripeHeights, hinge, 1.4]
      : [
          ...stripeHeights,
          hinge,
          cabWindow.bottom,
          cabWindow.bottom + 0.04,
          cabWindow.top,
          doorTop - seamWidth,
          doorTop,
        ],
    roofSteps: builder.isMap ? 5 : 9,
  });
  builder.loft({
    stations: locoStations(builder.isMap).map((z) => {
      const top = locoTopAt(z);
      const pinch = pinchAt(z);
      const width = locoWidthAt(z) * (1 - 0.12 * pinch);
      return {
        z,
        points: section.map(([x, y]) => {
          const raised = raise(y, top);
          return [
            x * width,
            raised + (noseChin - raised) * 0.3 * pinch,
          ] as const;
        }),
      };
    }),
    paint: paintLocoBody,
  });
};

const locoSideX = sideXOf(locoBody);

const addGrille = (
  builder: VehicleBuilder,
  z: number,
  length: number,
  from: number,
  to: number,
): void => {
  const height = to - from;
  const slats = Math.round(height / 0.05);
  for (const side of [1, -1]) {
    const x = side * (locoSideX((from + to) / 2) + 0.003);
    builder.box(
      "metal",
      livery.grille,
      [0.01, height, length],
      [x, (from + to) / 2, z],
    );
    for (let slat = 1; slat < slats; slat++) {
      builder.box(
        "metal",
        "#363c47",
        [0.014, 0.01, length - 0.03],
        [x + side * 0.003, from + (height * slat) / slats, z],
      );
    }
  }
};

const addInsulator = (
  builder: VehicleBuilder,
  at: Triple,
  height: number,
): void => {
  if (builder.isMap) {
    return;
  }
  const sheds = 3;
  const profile: [number, number][] = [[0.001, 0]];
  for (let shed = 0; shed < sheds; shed++) {
    const base = (height * shed) / sheds;
    profile.push(
      [0.02, base + height * 0.04],
      [0.04, base + height * 0.16],
      [0.02, base + height * 0.3],
    );
  }
  profile.push([0.02, height], [0.001, height]);
  builder.lathe("metal", "#9c4a32", profile, at, "y", 8);
};

const pantographHead = { z: -2.15, top: 2.56 };

const addPantographFrame = (builder: VehicleBuilder): void => {
  const base = { from: -2.68, to: -1.78, y: 2.1, halfWidth: 0.26 };
  const roofY = 1.98;
  for (const z of [base.from + 0.08, base.to - 0.08]) {
    for (const side of [1, -1]) {
      addInsulator(
        builder,
        [side * base.halfWidth, roofY, z],
        base.y - roofY - 0.015,
      );
    }
    builder.box(
      "metal",
      livery.steel,
      [base.halfWidth * 2, 0.03, 0.035],
      [0, base.y, z],
    );
  }
  for (const side of [1, -1]) {
    builder.box(
      "metal",
      livery.steel,
      [0.035, 0.03, base.to - base.from],
      [side * base.halfWidth, base.y, (base.from + base.to) / 2],
    );
  }
};

const addPantograph = (builder: VehicleBuilder): void => {
  addPantographFrame(builder);
  const hingeAt: Triple = [0, 2.15, -2.55];
  const knee: Triple = [0, 2.3, -1.6];
  const headZ = pantographHead.z;
  const top = pantographHead.top;
  const crossY = top - 0.07;
  builder.box("metal", livery.steel, [0.42, 0.05, 0.06], hingeAt);
  for (const side of [1, -1]) {
    builder.bar(
      "metal",
      "#5b616b",
      [side * 0.13, hingeAt[1], hingeAt[2]],
      [side * 0.03, knee[1], knee[2]],
      0.045,
      8,
    );
    builder.bar(
      "metal",
      livery.steel,
      [side * 0.03, knee[1], knee[2]],
      [side * 0.2, crossY, headZ],
      0.024,
      6,
    );
  }
  builder.bar(
    "metal",
    livery.steel,
    [-0.24, crossY, headZ],
    [0.24, crossY, headZ],
    0.024,
    6,
  );
  for (const offset of [-0.07, 0.07]) {
    builder.box(
      "metal",
      "#2b2b2d",
      [0.86, 0.025, 0.045],
      [0, top - 0.0125, headZ + offset],
    );
    builder.box(
      "metal",
      livery.steel,
      [0.86, 0.02, 0.03],
      [0, top - 0.035, headZ + offset],
    );
    for (const side of [1, -1]) {
      builder.bar(
        "metal",
        livery.steel,
        [side * 0.43, top - 0.03, headZ + offset],
        [side * 0.56, top - 0.12, headZ + offset],
        0.02,
        6,
      );
    }
  }
  for (const side of [1, -1]) {
    builder.box(
      "metal",
      livery.steel,
      [0.03, 0.05, 0.17],
      [side * 0.22, top - 0.05, headZ],
    );
  }
  if (builder.isMap) {
    return;
  }
  builder.bar(
    "metal",
    "#2e3238",
    [0, 2.13, -2.35],
    [0, knee[1] - 0.03, knee[2] - 0.15],
    0.016,
    6,
  );
  builder.cylinder("metal", "#2e3238", {
    radius: 0.035,
    length: 0.24,
    at: [0, 2.15, -2.25],
    axis: "z",
    segments: 10,
  });
  builder.cylinder("metal", livery.steel, {
    radius: 0.03,
    length: 0.1,
    at: knee,
    axis: "x",
    segments: 10,
  });
};

const addRoofEquipment = (builder: VehicleBuilder): void => {
  const roofY = 1.98;
  const busY = 2.17;
  for (const z of [-1.4, -0.95, -0.45]) {
    addInsulator(builder, [0, roofY, z], busY - roofY);
  }
  addInsulator(builder, [0.24, roofY - 0.01, -0.82], 0.12);
  addInsulator(builder, [0.24, roofY - 0.01, -0.42], 0.12);
  builder.bar("metal", "#8a8e95", [0, busY, -1.8], [0, busY, -0.45], 0.022, 6);
  builder.cylinder("metal", "#5e646d", {
    radius: 0.055,
    length: 0.36,
    at: [0.24, roofY + 0.17, -0.62],
    axis: "z",
    segments: 12,
  });
  builder.box("paint", "#3f4248", [0.6, 0.04, 1.5], [0, 2.0, 0.6]);
  if (!builder.isMap) {
    for (let slat = 0; slat < 9; slat++) {
      builder.box(
        "metal",
        "#24272d",
        [0.5, 0.012, 0.06],
        [0, 2.025, -0.05 + slat * 0.16],
      );
    }
    builder.box("paint", "#3f4248", [0.34, 0.05, 0.3], [0, 2.0, 1.55]);
  }
};

const addLocoUnderframe = (builder: VehicleBuilder): void => {
  builder.box("metal", livery.underframe, [1.06, 0.3, 2.0], [0, 0.43, 0]);
  for (const side of [1, -1]) {
    builder.box(
      "metal",
      "#1d2024",
      [0.04, 0.1, locoLength - 0.7],
      [side * 0.66, 0.53, 0],
    );
    if (builder.isMap) {
      continue;
    }
    builder.cylinder("metal", "#3b4048", {
      radius: 0.08,
      length: 0.6,
      at: [side * 0.42, 0.42, 0.65],
      axis: "z",
      segments: 12,
    });
    for (let rib = 0; rib < 5; rib++) {
      builder.box(
        "metal",
        "#2d3136",
        [0.012, 0.22, 0.03],
        [side * 0.535, 0.42, -0.8 + rib * 0.32],
      );
    }
  }
};

const addLocoFront = (builder: VehicleBuilder): void => {
  const valance = new Shape();
  valance.moveTo(-0.58, 0.64);
  valance.lineTo(-0.58, 0.42);
  valance.lineTo(-0.44, 0.3);
  valance.lineTo(0.44, 0.3);
  valance.lineTo(0.58, 0.42);
  valance.lineTo(0.58, 0.64);
  valance.closePath();
  builder.endPlate("metal", "#2a2d32", valance, 2.9, 3.15);
  addBufferPair(builder, locoFront, 0.14);
  addPipes(builder, locoFront);
  if (builder.isMap) {
    return;
  }
  for (const side of [1, -1]) {
    builder.box(
      "metal",
      "#202327",
      [0.25, 0.1, 0.02],
      [side * 0.36, 0.78, noseTip + 0.004],
    );
    builder.box(
      "glass",
      "#fffbe6",
      [0.12, 0.065, 0.02],
      [side * 0.4, 0.78, noseTip + 0.01],
    );
    builder.box(
      "glass",
      "#c01f1f",
      [0.065, 0.065, 0.02],
      [side * 0.28, 0.78, noseTip + 0.01],
    );
  }
  builder.bar(
    "metal",
    "#15171a",
    [0.02, 1.57, 2.36],
    [0.3, 1.8, 2.17],
    0.014,
    4,
  );
  builder.bar(
    "metal",
    "#15171a",
    [-0.34, 1.57, 2.36],
    [-0.06, 1.8, 2.17],
    0.014,
    4,
  );
};

const addLocoRear = (builder: VehicleBuilder): void => {
  builder.box(
    "metal",
    "#1f2226",
    [1.26, 0.28, 0.1],
    [0, 0.46, rearFace + 0.04],
  );
  addBufferPair(builder, -locoFront, 0.1);
  addPipes(builder, -locoFront);
  const face = rearFace - 0.004;
  builder.box(
    "metal",
    "#111418",
    [1.16, 0.42, 0.006],
    [0, 1.56, rearFace - 0.002],
  );
  for (const side of [1, -1]) {
    builder.box(
      "glass",
      livery.tint,
      [0.5, 0.3, 0.012],
      [side * 0.29, 1.56, face],
    );
    if (builder.isMap) {
      continue;
    }
    builder.box(
      "metal",
      "#202327",
      [0.24, 0.1, 0.012],
      [side * 0.42, 0.79, face],
    );
    builder.box(
      "glass",
      "#fffbe6",
      [0.11, 0.065, 0.012],
      [side * 0.46, 0.79, face - 0.006],
    );
    builder.box(
      "glass",
      "#c01f1f",
      [0.065, 0.065, 0.012],
      [side * 0.34, 0.79, face - 0.006],
    );
  }
  builder.box("metal", "#15171a", [0.07, 0.32, 0.016], [0, 1.56, face]);
};

const buildLocomotive = (detail: TrainDetail): BufferGeometry => {
  const builder = new VehicleBuilder(detail);
  buildLocoBody(builder);
  for (const z of [1.95, -1.95]) {
    addModernBogie(builder, z, {
      wheelBase: 1.2,
      radius: 0.26,
      frame: "#22252a",
      bodyBottom: locoBody.bottom,
      isLocomotive: true,
    });
  }
  addLocoUnderframe(builder);
  addLocoFront(builder);
  addLocoRear(builder);
  addPantograph(builder);
  addRoofEquipment(builder);
  if (!builder.isMap) {
    for (const z of [-1.5, -0.85, 0.85]) {
      addGrille(builder, z, 0.5, 1.22, 1.6);
    }
  }
  return builder.build();
};

const coachLength = 6.8;
const coachEnd = 3.28;
const coachBody: BodySection = {
  halfWidth: 0.71,
  bottom: 0.6,
  waist: 0.92,
  cantrail: 1.8,
  roofTop: 1.99,
  tumblehome: 0.05,
  lean: 0.085,
  heights: [],
  roofSteps: 8,
  bilge: 0.04,
};
const windowBand = { bottom: 1.18, top: 1.62 };
const windowGlass = { bottom: 1.22, top: 1.58 };
const coachDoor = { from: 2.76, to: 3.12, top: 1.76 };
const bandEnd = coachEnd - 0.12;

const windowCount = 8;
const windowWidth = 0.48;
const pillarWidth = 0.17;
const windowsFrom =
  -(windowCount * windowWidth + (windowCount - 1) * pillarWidth) / 2;

const windowEdges = Array.from({ length: windowCount }, (_, index) => {
  const from = windowsFrom + index * (windowWidth + pillarWidth);
  return [from, from + windowWidth] as const;
});

const coachWidthAt = (z: number): number => {
  const share = Math.max(0, (Math.abs(z) - 3.1) / (coachEnd - 3.1));
  return 1 - 0.06 * share ** 2;
};

const coachTopAt = (z: number): number => {
  const share = Math.max(0, (Math.abs(z) - 3.2) / (coachEnd - 3.2));
  return coachBody.roofTop - 0.04 * share ** 2;
};

const paintCoachDoor = (az: number, y: number): Painted => {
  const { from, to, top } = coachDoor;
  const onSeam =
    between(az, from, from + seamWidth) || between(az, to - seamWidth, to);
  if (onSeam && y < top) {
    return livery.seam;
  }
  if (between(az, from, to) && between(y, top - seamWidth, top)) {
    return livery.seam;
  }
  if (
    !between(az, from, to) ||
    !between(y, windowBand.bottom, windowBand.top)
  ) {
    return undefined;
  }
  const isDoorWindow =
    between(az, from + 0.08, to - 0.08) &&
    between(y, windowGlass.bottom, windowGlass.top);
  return isDoorWindow ? glass(livery.tint) : livery.navy;
};

const paintCoach =
  (isMap: boolean) =>
  (centre: Spot, normal: Vector3): Painted => {
    const { y, z } = centre;
    const az = Math.abs(z);
    if (Math.abs(normal.z) > 0.9 && az > coachEnd - 0.01) {
      return livery.navy;
    }
    if (y < coachBody.bottom + 0.02 && Math.abs(normal.y) > 0.8) {
      return livery.underframe;
    }
    if (y > coachBody.cantrail - 0.0001) {
      return livery.roof;
    }
    const stripe = paintStripes(y);
    if (stripe !== undefined) {
      return stripe;
    }
    const door = isMap ? undefined : paintCoachDoor(az, y);
    if (door !== undefined) {
      return door;
    }
    if (!between(y, windowBand.bottom, windowBand.top) || az > bandEnd) {
      return livery.navy;
    }
    if (isMap) {
      return glass(livery.band);
    }
    const isWindow =
      between(y, windowGlass.bottom, windowGlass.top) &&
      windowEdges.some(([from, to]) => between(z, from, to));
    return isWindow ? glass(livery.tint) : livery.band;
  };

const coachStations = (isMap: boolean): number[] => {
  if (isMap) {
    return listBreaks(...[3.16, bandEnd, coachEnd].flatMap((z) => [z, -z]), 0);
  }
  const ends = [3.1, 3.2, 3.25, coachEnd];
  const door = [
    coachDoor.from,
    coachDoor.from + seamWidth,
    coachDoor.from + 0.08,
    coachDoor.to - 0.08,
    coachDoor.to - seamWidth,
    coachDoor.to,
  ];
  return listBreaks(
    ...[...ends, ...door, bandEnd].flatMap((z) => [z, -z]),
    ...windowEdges.flat(),
  );
};

const buildCoachBody = (builder: VehicleBuilder): void => {
  const section = buildBodySection({
    ...coachBody,
    heights: builder.isMap
      ? [...stripeHeights, windowBand.bottom, windowBand.top]
      : [
          ...stripeHeights,
          windowBand.bottom,
          windowGlass.bottom,
          windowGlass.top,
          windowBand.top,
          coachDoor.top - seamWidth,
          coachDoor.top,
        ],
    roofSteps: builder.isMap ? 4 : 7,
  });
  const { cantrail, roofTop } = coachBody;
  builder.loft({
    stations: coachStations(builder.isMap).map((z) => {
      const width = coachWidthAt(z);
      const roof = coachTopAt(z);
      const squash = (roof - cantrail) / (roofTop - cantrail);
      return {
        z,
        points: section.map(
          ([x, y]) =>
            [
              x * width,
              y > cantrail ? cantrail + (y - cantrail) * squash : y,
            ] as const,
        ),
      };
    }),
    paint: paintCoach(builder.isMap),
  });
};

const addCoachUnderframe = (builder: VehicleBuilder): void => {
  const boxes: readonly [number, number, number][] = [
    [-1.2, 0.7, 0.24],
    [-0.15, 0.9, 0.28],
    [0.95, 0.75, 0.22],
  ];
  for (const [z, length, height] of boxes) {
    builder.box(
      "metal",
      "#2a2d32",
      [1.0, height, length],
      [0, 0.6 - height / 2, z],
    );
  }
  for (const side of [1, -1]) {
    builder.box(
      "metal",
      "#1d2024",
      [0.04, 0.06, coachLength - 2.2],
      [side * 0.62, 0.57, 0],
    );
  }
  if (!builder.isMap) {
    builder.cylinder("metal", "#3a3f47", {
      radius: 0.07,
      length: 0.55,
      at: [0.36, 0.42, 1.72],
      axis: "z",
      segments: 10,
    });
  }
};

const addCoachEnds = (builder: VehicleBuilder): void => {
  for (const end of [coachLength / 2, -coachLength / 2]) {
    const facing = Math.sign(end);
    addBufferPair(builder, end, 0.1);
    addPipes(builder, end);
    builder.box(
      "metal",
      "#1f2226",
      [1.1, 0.12, 0.08],
      [0, 0.58, facing * (coachEnd - 0.04)],
    );
    const face = facing * (coachEnd + 0.045);
    builder.box(
      "metal",
      "#1a1c1f",
      [0.86, 1.14, 0.1],
      [0, 1.25, facing * (coachEnd + 0.04)],
    );
    if (!builder.isMap) {
      for (const ridge of [0.03, 0.065]) {
        builder.box(
          "metal",
          "#2a2d31",
          [0.88, 1.16, 0.012],
          [0, 1.25, facing * (coachEnd + ridge)],
        );
      }
      builder.box(
        "metal",
        "#0f1114",
        [0.56, 0.96, 0.02],
        [0, 1.24, face + facing * 0.01],
      );
    }
  }
};

const addCoachRoof = (builder: VehicleBuilder): void => {
  if (builder.isMap) {
    return;
  }
  for (let vent = 0; vent < 4; vent++) {
    builder.box(
      "paint",
      "#3c3f45",
      [0.16, 0.035, 0.16],
      [0, 1.995, -1.5 + vent * 1.0],
    );
  }
};

const buildCarriage = (detail: TrainDetail): BufferGeometry => {
  const builder = new VehicleBuilder(detail);
  buildCoachBody(builder);
  for (const z of [2.35, -2.35]) {
    addModernBogie(builder, z, {
      wheelBase: 1.3,
      radius: 0.23,
      frame: "#26292e",
      bodyBottom: coachBody.bottom,
      isLocomotive: false,
    });
  }
  addCoachUnderframe(builder);
  addCoachEnds(builder);
  addCoachRoof(builder);
  return builder.build();
};

const locomotive: TrainVehicleModel = {
  length: locoLength,
  build: buildLocomotive,
};

const carriage: TrainVehicleModel = {
  length: coachLength,
  build: buildCarriage,
};

export const trainModel: TrainModel = {
  locomotive,
  carriage,
  carriageCount: 3,
  pantograph: pantographHead,
};
