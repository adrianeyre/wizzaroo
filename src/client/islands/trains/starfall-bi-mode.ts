import type { Vector3 } from "three";
import {
  listBreaks,
  listEvenly,
  type Painted,
  railHalfGauge,
  type Spot,
  type TrainDetail,
  type TrainModel,
  VehicleBuilder,
} from "./train-kit.js";

const locomotiveLength = 7;
const carriageLength = 6.8;
const couplerHeight = 0.52;

const livery = {
  body: "#1a2a62",
  bodyEnd: "#16234f",
  gold: "#d4ad4f",
  band: "#0b0d13",
  glass: "#0c1018",
  seats: "#1c2230",
  skirt: "#8e949d",
  roofEdge: "#a3a9b1",
  roof: "#1b2858",
  underside: "#24272c",
  seam: "#070910",
  warning: "#e2b51f",
  headlight: "#f4f7ff",
  marker: "#ff3b2a",
};

const metal = {
  equipment: "#30343a",
  equipmentLight: "#3b4047",
  grille: "#1d2024",
  frame: "#2a2e34",
  rubber: "#17191c",
  coupler: "#3a3e44",
  spring: "#c5a21c",
  axleCover: "#d8b425",
  damper: "#7d838c",
};

const nominal = {
  bottom: 0.58,
  waist: 0.95,
  cantrail: 1.72,
  roofTop: 2.04,
  halfWidth: 0.71,
};

const heights = {
  skirtTop: 0.78,
  stripeLow: 0.965,
  stripeHigh: 1,
  bandLow: 1.08,
  glassLow: 1.11,
  seatTop: 1.22,
  glassHigh: 1.49,
  bandHigh: 1.52,
  edgeLow: 1.6,
  doorTop: 1.63,
};

const exploreSideHeights = [
  0.64,
  heights.skirtTop,
  0.87,
  heights.stripeLow,
  heights.stripeHigh,
  heights.bandLow,
  heights.glassLow,
  heights.seatTop,
  heights.glassHigh,
  heights.bandHigh,
  heights.edgeLow,
  heights.doorTop,
];

const mapSideHeights = [
  0.64,
  heights.skirtTop,
  heights.stripeLow,
  heights.stripeHigh,
  heights.bandLow,
  heights.bandHigh,
  heights.edgeLow,
];

interface SectionShape {
  halfWidth: number;
  bottom: number;
  cantrail: number;
  roofTop: number;
  lean: number;
}

const sideX = (h: number): number => {
  if (h <= nominal.waist) {
    const share = (nominal.waist - h) / (nominal.waist - nominal.bottom);
    return nominal.halfWidth - 0.05 * share ** 2;
  }
  const share = (h - nominal.waist) / (nominal.cantrail - nominal.waist);
  return nominal.halfWidth - 0.04 * share ** 1.6;
};

const buildSection = (
  { halfWidth, bottom, cantrail, roofTop, lean }: SectionShape,
  sideHeights: readonly number[],
  roofSteps: number,
): [number, number][] => {
  const scaleY = (cantrail - bottom) / (nominal.cantrail - nominal.bottom);
  const scaleX = halfWidth / nominal.halfWidth;
  const at = (h: number): [number, number] => {
    const above = Math.max(
      0,
      (h - nominal.waist) / (nominal.cantrail - nominal.waist),
    );
    return [
      sideX(h) * scaleX - lean * above ** 1.5,
      bottom + (h - nominal.bottom) * scaleY,
    ];
  };
  const side = [...sideHeights, nominal.cantrail].map(at);
  const [shoulder] = side[side.length - 1];
  const roof = Array.from(
    { length: roofSteps - 1 },
    (_, step): [number, number] => {
      const angle = ((step + 1) / roofSteps) * (Math.PI / 2);
      return [
        shoulder * Math.cos(angle),
        cantrail + (roofTop - cantrail) * Math.sin(angle) ** 0.85,
      ];
    },
  );
  const right: [number, number][] = [
    [0, bottom],
    [side[0][0] - 0.05 * scaleX, bottom + 0.008 * scaleY],
    ...side,
    ...roof,
    [0, roofTop],
  ];
  const left = right
    .slice(1, -1)
    .toReversed()
    .map(([x, y]): [number, number] => [-x, y]);
  return [...right, ...left];
};

const bodySection: SectionShape = {
  halfWidth: nominal.halfWidth,
  bottom: nominal.bottom,
  cantrail: nominal.cantrail,
  roofTop: nominal.roofTop,
  lean: 0,
};

const smoothstep = (from: number, to: number, value: number): number => {
  const share = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return share * share * (3 - 2 * share);
};

const noseStart = 1.86;
const noseTip = locomotiveLength / 2;
const noseLength = noseTip - noseStart;
const tipHeight = 0.66;

const noseShare = (z: number): number =>
  Math.min(1, Math.max(0, (z - noseStart) / noseLength));

const tipRounding = (u: number): number => Math.sqrt(Math.max(0, 1 - u ** 6));

const noseSection = (u: number): SectionShape => {
  const plan = tipRounding(u);
  const profile = Math.sqrt(plan);
  const rawBottom = nominal.bottom - 0.14 * smoothstep(0.3, 0.9, u);
  const rawTop = nominal.roofTop - 0.66 * smoothstep(0, 0.62, u) - 0.46 * u;
  const bottom = tipHeight - (tipHeight - rawBottom) * profile;
  const roofTop = tipHeight + (rawTop - tipHeight) * profile;
  const roofShare =
    (nominal.roofTop - nominal.cantrail) / (nominal.roofTop - nominal.bottom) +
    0.1 * smoothstep(0, 0.5, u);
  return {
    halfWidth: nominal.halfWidth * (1 - 0.1 * u ** 2) * plan,
    bottom,
    roofTop,
    cantrail: roofTop - (roofTop - bottom) * roofShare,
    lean: 0.08 * smoothstep(0, 0.5, u) * plan,
  };
};

const drivingSectionAt = (z: number): SectionShape =>
  z > noseStart ? noseSection(noseShare(z)) : bodySection;

/** The livery height a point would have on the plain body section. */
const nominalHeight = (
  { y }: Spot,
  { bottom, cantrail, roofTop }: SectionShape,
): number => {
  if (y <= cantrail) {
    return (
      nominal.bottom +
      ((y - bottom) / Math.max(0.001, cantrail - bottom)) *
        (nominal.cantrail - nominal.bottom)
    );
  }
  return (
    nominal.cantrail +
    ((y - cantrail) / Math.max(0.001, roofTop - cantrail)) *
      (nominal.roofTop - nominal.cantrail)
  );
};

interface SideLayout {
  doors: readonly number[];
  windows: readonly number[];
  windowWidth: number;
}

const doorHalf = 0.21;
const seamWidth = 0.014;
const doorGlassHalf = 0.075;

const isWithin = (value: number, from: number, to: number): boolean =>
  value > from && value < to;

const doorAt = (z: number, doors: readonly number[]): number | undefined =>
  doors.find((door) => Math.abs(z - door) < doorHalf + seamWidth);

const sideStations = (
  { doors, windows, windowWidth }: SideLayout,
  isMap: boolean,
): number[] => {
  const doorEdges = doors.flatMap((door) =>
    isMap
      ? [door - doorHalf, door + doorHalf]
      : [
          door - doorHalf - seamWidth,
          door - doorHalf,
          door - doorGlassHalf,
          door + doorGlassHalf,
          door + doorHalf,
          door + doorHalf + seamWidth,
        ],
  );
  const windowEdges = isMap
    ? []
    : windows.flatMap((centre) => [
        centre - windowWidth / 2,
        centre + windowWidth / 2,
      ]);
  return [...doorEdges, ...windowEdges];
};

const paintSide = (
  spot: Spot,
  normal: Vector3,
  h: number,
  layout: SideLayout,
  isMap: boolean,
): Painted => {
  const isSide = Math.abs(normal.x) > 0.45;
  const door = doorAt(spot.z, layout.doors);
  if (door !== undefined && isSide && h > 0.64 && h < heights.doorTop + 0.02) {
    const offset = Math.abs(spot.z - door);
    if (!isMap && (offset > doorHalf || h > heights.doorTop)) {
      return livery.seam;
    }
    if (
      !isMap &&
      offset < doorGlassHalf &&
      isWithin(h, heights.glassLow, heights.glassHigh)
    ) {
      return { colour: livery.glass, finish: "glass" };
    }
    if (isWithin(h, heights.stripeLow, heights.stripeHigh)) {
      return livery.gold;
    }
    return h < heights.skirtTop ? livery.skirt : livery.body;
  }
  if (isWithin(h, heights.bandLow, heights.bandHigh)) {
    const inWindow =
      !isMap &&
      isSide &&
      isWithin(h, heights.glassLow, heights.glassHigh) &&
      layout.windows.some(
        (centre) => Math.abs(spot.z - centre) < layout.windowWidth / 2,
      );
    if (inWindow) {
      return {
        colour: h < heights.seatTop ? livery.seats : livery.glass,
        finish: "glass",
      };
    }
    return livery.band;
  }
  return undefined;
};

const paintBody = (spot: Spot, normal: Vector3, h: number): string => {
  if (normal.y < -0.6 || h < 0.6) {
    return livery.underside;
  }
  if (h < heights.skirtTop) {
    return livery.skirt;
  }
  if (isWithin(h, heights.stripeLow, heights.stripeHigh)) {
    return livery.gold;
  }
  if (h < heights.edgeLow) {
    return livery.body;
  }
  if (h < nominal.cantrail + 0.02) {
    return livery.roofEdge;
  }
  return livery.roof;
};

const paintEnd = (normal: Vector3): Painted =>
  Math.abs(normal.z) > 0.95 ? livery.bodyEnd : undefined;

const addCoupler = (builder: VehicleBuilder, bodyEnd: number, end: number) => {
  const facing = Math.sign(end);
  const reach = Math.abs(end - bodyEnd);
  builder.box(
    "metal",
    metal.coupler,
    [0.09, 0.09, reach],
    [0, couplerHeight, bodyEnd + (facing * reach) / 2],
  );
  builder.box(
    "metal",
    metal.frame,
    [0.24, 0.16, 0.06],
    [0, couplerHeight, end - facing * 0.03],
  );
};

const roundedOutline = (
  halfWidth: number,
  bottom: number,
  top: number,
  radius: number,
  steps: number,
): [number, number][] => {
  const corners: [number, number, number][] = [
    [halfWidth - radius, bottom + radius, -Math.PI / 2],
    [halfWidth - radius, top - radius, 0],
    [-halfWidth + radius, top - radius, Math.PI / 2],
    [-halfWidth + radius, bottom + radius, Math.PI],
  ];
  return corners.flatMap(([x, y, start]) =>
    listEvenly(start, start + Math.PI / 2, steps).map(
      (angle): [number, number] => [
        x + radius * Math.cos(angle),
        y + radius * Math.sin(angle),
      ],
    ),
  );
};

const addExtrusion = (
  builder: VehicleBuilder,
  outline: readonly (readonly [number, number])[],
  from: number,
  to: number,
  colour: string,
  finish: "paint" | "metal" = "metal",
) => {
  builder.loft({
    stations: [
      { z: from, points: outline },
      { z: to, points: outline },
    ],
    paint: () => colour,
    finish,
  });
};

/** The enclosed full-width gangway of a modern inter-city car end. */
const addGangwayEnd = (
  builder: VehicleBuilder,
  bodyEnd: number,
  end: number,
) => {
  const facing = Math.sign(end);
  const outer = end - facing * 0.012;
  const steps = builder.segments(3, 1);
  const inner = bodyEnd - facing * 0.02;
  addExtrusion(
    builder,
    roundedOutline(0.56, 0.64, 1.96, 0.14, steps),
    inner,
    outer,
    metal.rubber,
  );
  if (!builder.isMap) {
    const ridge = roundedOutline(0.575, 0.625, 1.975, 0.15, steps);
    for (const share of [0.3, 0.65]) {
      const z = bodyEnd + (outer - bodyEnd) * share;
      addExtrusion(builder, ridge, z - 0.008, z + 0.008, "#26292d");
    }
    addExtrusion(
      builder,
      roundedOutline(0.42, 0.74, 1.86, 0.1, steps),
      outer - facing * 0.004,
      outer + facing * 0.006,
      "#2e3136",
    );
  }
  addCoupler(builder, bodyEnd, end);
};

/** One axle with plain disc wheels, flanges and axle. */
const addDiscWheelset = (builder: VehicleBuilder, z: number) => {
  const radius = 0.2;
  const around = builder.segments(16, 8);
  for (const side of [1, -1]) {
    const x = side * railHalfGauge;
    builder.cylinder("metal", "#2d3035", {
      radius,
      length: 0.1,
      at: [x, radius, z],
      axis: "x",
      segments: around,
    });
    builder.cylinder("metal", "#3c4046", {
      radius: radius + 0.028,
      length: 0.02,
      at: [x - side * 0.04, radius, z],
      axis: "x",
      segments: around,
      isOpen: true,
    });
    if (!builder.isMap) {
      builder.cylinder("metal", "#555a62", {
        radius: 0.05,
        length: 0.13,
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

/** Hitachi-style bolsterless bogie: low side frames, coil springs, yellow axle covers. */
const addModernBogie = (builder: VehicleBuilder, z: number) => {
  const wheelBase = 0.86;
  const radius = 0.2;
  const axles = [z + wheelBase / 2, z - wheelBase / 2];
  for (const axle of axles) {
    addDiscWheelset(builder, axle);
  }
  const frameX = 0.54;
  for (const side of [1, -1]) {
    builder.box(
      "metal",
      metal.frame,
      [0.07, 0.11, wheelBase + 0.36],
      [side * frameX, radius + 0.05, z],
    );
    if (builder.isMap) {
      continue;
    }
    builder.box(
      "metal",
      metal.frame,
      [0.08, 0.1, 0.46],
      [side * frameX, radius + 0.14, z],
    );
    for (const axle of axles) {
      builder.cylinder("metal", metal.axleCover, {
        radius: 0.065,
        length: 0.05,
        at: [side * (frameX + 0.025), radius, axle],
        axis: "x",
        segments: 10,
      });
      builder.cylinder("metal", metal.spring, {
        radius: 0.045,
        length: 0.12,
        at: [side * frameX, radius + 0.14, axle - Math.sign(axle - z) * 0.07],
        segments: 8,
      });
    }
    builder.cylinder("metal", "#3f444c", {
      radius: 0.075,
      length: 0.12,
      at: [side * (frameX - 0.04), radius + 0.26, z],
      segments: 10,
    });
    builder.bar(
      "metal",
      metal.damper,
      [side * (frameX + 0.05), radius + 0.06, z + 0.16],
      [side * (frameX + 0.05), radius + 0.2, z - 0.12],
      0.03,
      6,
    );
  }
  builder.box(
    "metal",
    metal.frame,
    [frameX * 2, 0.08, 0.22],
    [0, radius + 0.07, z],
  );
};

const addEquipmentBox = (
  builder: VehicleBuilder,
  from: number,
  to: number,
  { bottom = 0.3, halfWidth = 0.58, colour = metal.equipment } = {},
) => {
  const top = nominal.bottom + 0.01;
  builder.box(
    "metal",
    colour,
    [halfWidth * 2, top - bottom, to - from],
    [0, (top + bottom) / 2, (from + to) / 2],
  );
};

const addGrille = (
  builder: VehicleBuilder,
  from: number,
  to: number,
  bottom: number,
) => {
  if (builder.isMap) {
    return;
  }
  for (const side of [1, -1]) {
    for (const z of listEvenly(from, to, Math.round((to - from) / 0.09))) {
      builder.box(
        "metal",
        metal.grille,
        [0.02, nominal.bottom - bottom - 0.08, 0.025],
        [side * 0.585, (nominal.bottom + bottom) / 2, z],
      );
    }
  }
};

const addRoofPod = (builder: VehicleBuilder, z: number, length: number) => {
  if (builder.isMap) {
    return;
  }
  const base = nominal.roofTop - 0.04;
  const full = roundedOutline(0.32, base, base + 0.11, 0.04, 2);
  const low = roundedOutline(0.28, base, base + 0.05, 0.02, 2);
  builder.loft({
    stations: [
      { z: z - length / 2, points: low },
      { z: z - length / 2 + 0.07, points: full },
      { z: z + length / 2 - 0.07, points: full },
      { z: z + length / 2, points: low },
    ],
    paint: () => "#555a63",
  });
};

const screenTop = 0.12;
const screenEnd = 0.42;

const paintWindscreen = (
  spot: Spot,
  normal: Vector3,
  h: number,
  u: number,
): Painted => {
  const isSide = Math.abs(normal.x) > 0.55;
  if (u > screenTop && u < screenEnd && h > heights.bandLow) {
    return { colour: livery.glass, finish: "glass" };
  }
  if (u > screenTop - 0.02 && u < screenEnd + 0.012 && h > heights.bandLow) {
    return livery.band;
  }
  if (
    isSide &&
    isWithin(u, 0.012, screenTop - 0.035) &&
    isWithin(h, heights.glassLow, heights.glassHigh)
  ) {
    return { colour: livery.glass, finish: "glass" };
  }
  if (isWithin(h, heights.bandLow, heights.bandHigh) && u < screenEnd) {
    return livery.band;
  }
  return undefined;
};

const light = { from: 0.66, to: 0.86, rim: 0.02 };

const paintNose = (spot: Spot, normal: Vector3): Painted => {
  const u = noseShare(spot.z);
  const h = nominalHeight(spot, noseSection(u));
  const screen = paintWindscreen(spot, normal, h, u);
  if (screen !== undefined) {
    return screen;
  }
  if (
    isWithin(u, light.from, light.to) &&
    isWithin(h, heights.stripeHigh, heights.seatTop)
  ) {
    const isLens =
      isWithin(u, light.from + light.rim, light.to - light.rim) &&
      h > heights.bandLow;
    return isLens ? { colour: livery.headlight, finish: "glass" } : livery.band;
  }
  if ((u > 0.92 && h > heights.stripeHigh) || u > 0.995) {
    return livery.warning;
  }
  if (h > heights.edgeLow && u > screenEnd) {
    return livery.body;
  }
  return paintBody(spot, normal, h);
};

const noseShares = (isMap: boolean): number[] =>
  isMap
    ? [0.08, 0.16, 0.26, screenEnd, 0.55, 0.7, 0.82, 0.9, 0.96, 0.99, 0.999]
    : listBreaks(
        ...listEvenly(0.02, 0.9, 20),
        0.012,
        0.085,
        screenTop - 0.02,
        screenTop,
        screenEnd,
        screenEnd + 0.012,
        light.from,
        light.from + light.rim,
        light.to - light.rim,
        light.to,
        0.92,
        0.95,
        0.965,
        0.98,
        0.99,
        0.997,
        0.9995,
      );

const drivingLayout: SideLayout = {
  doors: [-2.92, 1.5],
  windows: listEvenly(-2.33, 0.97, 5),
  windowWidth: 0.5,
};

const carriageLayout: SideLayout = {
  doors: [-2.82, 2.82],
  windows: listEvenly(-2.16, 2.16, 6),
  windowWidth: 0.58,
};

const sideHeightsFor = (builder: VehicleBuilder) =>
  builder.isMap ? mapSideHeights : exploreSideHeights;

const roofStepsFor = (builder: VehicleBuilder) => (builder.isMap ? 5 : 7);

/** The deep valance and obstacle deflector under the nose. */
const addNoseValance = (builder: VehicleBuilder) => {
  const shares = builder.isMap
    ? [0.3, 0.6, 0.85, 0.94]
    : listBreaks(...listEvenly(0.3, 0.9, 8), 0.93, 0.955);
  const deflectorTop = 0.42;
  builder.loft({
    stations: shares.map((u) => {
      const { halfWidth, bottom } = noseSection(u);
      const width = halfWidth * 0.94 - 0.02;
      const low = 0.3 + 0.06 * smoothstep(0.85, 0.96, u);
      const top = Math.max(bottom + 0.03, low + 0.04);
      return {
        z: noseStart + u * noseLength,
        points: [
          [width - 0.04, low],
          [width, deflectorTop],
          [width, top],
          [-width, top],
          [-width, deflectorTop],
          [-width + 0.04, low],
        ],
      };
    }),
    paint: ({ y }) => (y < deflectorTop ? "#2a2d33" : livery.skirt),
  });
};

const buildDrivingCar = (detail: TrainDetail) => {
  const builder = new VehicleBuilder(detail);
  const half = locomotiveLength / 2;
  const bodyEnd = -half + 0.12;
  const bodyZs = listBreaks(
    bodyEnd,
    noseStart,
    ...listEvenly(bodyEnd, noseStart, builder.isMap ? 3 : 8),
    ...sideStations(drivingLayout, builder.isMap),
  );
  const noseZs = noseShares(builder.isMap).map(
    (u) => noseStart + u * noseLength,
  );
  const sideHeights = sideHeightsFor(builder);
  const roofSteps = roofStepsFor(builder);
  builder.loft({
    stations: [...bodyZs, ...noseZs].map((z) => ({
      z,
      points: buildSection(drivingSectionAt(z), sideHeights, roofSteps),
    })),
    paint: (spot, normal) => {
      if (spot.z < bodyEnd + 0.001) {
        return paintEnd(normal);
      }
      if (spot.z > noseStart) {
        return paintNose(spot, normal);
      }
      const h = nominalHeight(spot, bodySection);
      return (
        paintSide(spot, normal, h, drivingLayout, builder.isMap) ??
        paintBody(spot, normal, h)
      );
    },
  });
  addGangwayEnd(builder, bodyEnd, -half);
  addModernBogie(builder, 1.62);
  addModernBogie(builder, -2.42);
  addEquipmentBox(builder, -1.62, -0.06, { bottom: 0.27 });
  addGrille(builder, -1.5, -0.9, 0.27);
  addEquipmentBox(builder, 0.04, 0.62, {
    bottom: 0.33,
    colour: metal.equipmentLight,
  });
  addEquipmentBox(builder, 0.7, 1.02, { bottom: 0.36, halfWidth: 0.5 });
  addEquipmentBox(builder, -1.94, -1.72, { bottom: 0.38, halfWidth: 0.5 });
  addNoseValance(builder);
  addRoofPod(builder, -1.6, 0.9);
  addRoofPod(builder, 0.4, 0.5);
  return builder.build();
};

const buildCarriage = (detail: TrainDetail) => {
  const builder = new VehicleBuilder(detail);
  const half = carriageLength / 2;
  const bodyEnd = half - 0.12;
  const zs = listBreaks(
    -bodyEnd,
    bodyEnd,
    ...listEvenly(-bodyEnd, bodyEnd, builder.isMap ? 2 : 6),
    ...sideStations(carriageLayout, builder.isMap),
  );
  const section = buildSection(
    bodySection,
    sideHeightsFor(builder),
    roofStepsFor(builder),
  );
  builder.loft({
    stations: zs.map((z) => ({ z, points: section })),
    paint: (spot, normal) => {
      if (Math.abs(spot.z) > bodyEnd - 0.001) {
        return paintEnd(normal);
      }
      const h = nominalHeight(spot, bodySection);
      return (
        paintSide(spot, normal, h, carriageLayout, builder.isMap) ??
        paintBody(spot, normal, h)
      );
    },
  });
  for (const end of [half, -half]) {
    addGangwayEnd(builder, Math.sign(end) * bodyEnd, end);
  }
  for (const z of [2.3, -2.3]) {
    addModernBogie(builder, z);
  }
  addEquipmentBox(builder, -1.6, -0.5, { bottom: 0.32 });
  addEquipmentBox(builder, -0.38, 0.5, {
    bottom: 0.36,
    colour: metal.equipmentLight,
  });
  addEquipmentBox(builder, 0.62, 1.6, { bottom: 0.3 });
  addGrille(builder, 0.75, 1.45, 0.3);
  addRoofPod(builder, 1.5, 0.8);
  return builder.build();
};

export const trainModel: TrainModel = {
  locomotive: { length: locomotiveLength, build: buildDrivingCar },
  carriage: { length: carriageLength, build: buildCarriage },
  carriageCount: 3,
};
