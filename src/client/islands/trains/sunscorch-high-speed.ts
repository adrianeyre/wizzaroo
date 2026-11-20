import {
  BufferAttribute,
  BufferGeometry,
  type ColorRepresentation,
  Shape,
  ShapeGeometry,
  type Vector3,
} from "three";
import {
  addBuffers,
  addLamp,
  buildCoachSection,
  type Finish,
  type FinishedColour,
  listBreaks,
  listEvenly,
  type LoftStation,
  type Paint,
  type Spot,
  type TrainDetail,
  type TrainModel,
  type TrainVehicleModel,
  VehicleBuilder,
  railHalfGauge,
  wheelTread,
} from "./train-kit.js";

const livery = {
  lower: "#cdc6b8",
  red: "#c22a26",
  white: "#f1efe9",
  band: "#34373b",
  roof: "#a9adb0",
  cantrail: "#c4c0b6",
  underframe: "#303337",
  glass: "#243240",
  rubber: "#141619",
  seam: "#8e897f",
  bandSeam: "#26282b",
  grille: "#2c2f33",
  valance: "#3b3e42",
};

const stripes = { red: 1.1, white: 1.155, band: 1.18, bandTop: 1.74 };

const glass = (colour: ColorRepresentation = livery.glass): FinishedColour => ({
  colour,
  finish: "glass",
});

const sideLivery = (y: number): ColorRepresentation => {
  if (y < stripes.red) {
    return livery.lower;
  }
  if (y < stripes.white) {
    return livery.red;
  }
  if (y < stripes.band) {
    return livery.white;
  }
  if (y < stripes.bandTop) {
    return livery.band;
  }
  return livery.cantrail;
};

interface SectionShape {
  halfWidth: number;
  bottom: number;
  waist: number;
  cantrail: number;
  roofTop: number;
  tumblehome: number;
  lean: number;
}

const sideXAt = (shape: SectionShape, y: number): number => {
  if (y <= shape.waist) {
    const share = (shape.waist - y) / (shape.waist - shape.bottom);
    return shape.halfWidth - shape.tumblehome * share ** 2;
  }
  const share = Math.min(1, (y - shape.waist) / (shape.cantrail - shape.waist));
  return shape.halfWidth - shape.lean * share ** 1.5;
};

const roundedRectangle = (
  zFrom: number,
  zTo: number,
  yFrom: number,
  yTo: number,
  radius: number,
): Shape => {
  const shape = new Shape();
  shape.moveTo(zFrom + radius, yFrom);
  shape.lineTo(zTo - radius, yFrom);
  shape.quadraticCurveTo(zTo, yFrom, zTo, yFrom + radius);
  shape.lineTo(zTo, yTo - radius);
  shape.quadraticCurveTo(zTo, yTo, zTo - radius, yTo);
  shape.lineTo(zFrom + radius, yTo);
  shape.quadraticCurveTo(zFrom, yTo, zFrom, yTo - radius);
  shape.lineTo(zFrom, yFrom + radius);
  shape.quadraticCurveTo(zFrom, yFrom, zFrom + radius, yFrom);
  return shape;
};

/**
 * Lays a flat side-view shape onto a body side, following its curve
 * (`xAt(y)`), standing `offset` proud of the paint.
 */
const addSideSkin = (
  builder: VehicleBuilder,
  finish: Finish,
  colour: ColorRepresentation,
  shape: Shape,
  side: number,
  xAt: (y: number) => number,
  offset: number,
): void => {
  const flat = new ShapeGeometry(shape, builder.segments(3, 2)).toNonIndexed();
  const source = flat.getAttribute("position");
  const positions = new Float32Array(source.count * 3);
  for (let corner = 0; corner < source.count; corner += 3) {
    const order = side > 0 ? [0, 2, 1] : [0, 1, 2];
    order.forEach((from, to) => {
      const z = source.getX(corner + from);
      const y = source.getY(corner + from);
      positions.set([side * (xAt(y) + offset), y, z], (corner + to) * 3);
    });
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  builder.add(finish, colour, geometry, {}, undefined);
};

const addSideWindow = (
  builder: VehicleBuilder,
  side: number,
  xAt: (y: number) => number,
  zFrom: number,
  zTo: number,
  yFrom: number,
  yTo: number,
  radius: number,
): void => {
  if (!builder.isMap) {
    addSideSkin(
      builder,
      "metal",
      livery.rubber,
      roundedRectangle(
        zFrom - 0.018,
        zTo + 0.018,
        yFrom - 0.018,
        yTo + 0.018,
        radius + 0.015,
      ),
      side,
      xAt,
      0.003,
    );
  }
  addSideSkin(
    builder,
    "glass",
    livery.glass,
    roundedRectangle(zFrom, zTo, yFrom, yTo, radius),
    side,
    xAt,
    0.006,
  );
};

const addSeam = (
  builder: VehicleBuilder,
  side: number,
  xAt: (y: number) => number,
  zFrom: number,
  zTo: number,
  yFrom: number,
  yTo: number,
): void => {
  const width = 0.008;
  const strips: [number, number, number, number][] = [
    [zFrom - width, zFrom + width, yFrom, yTo],
    [zTo - width, zTo + width, yFrom, yTo],
    [zFrom, zTo, yTo - width, yTo + width],
  ];
  for (const [z0, z1, y0, y1] of strips) {
    for (const [from, to, colour] of [
      [y0, Math.min(y1, stripes.band), livery.seam],
      [Math.max(y0, stripes.band), y1, livery.bandSeam],
    ] as const) {
      if (to <= from) {
        continue;
      }
      const shape = new Shape();
      shape.moveTo(z0, from);
      shape.lineTo(z1, from);
      shape.lineTo(z1, to);
      shape.lineTo(z0, to);
      addSideSkin(builder, "paint", colour, shape, side, xAt, 0.002);
    }
  }
};

const addLouvres = (
  builder: VehicleBuilder,
  side: number,
  xAt: (y: number) => number,
  zFrom: number,
  zTo: number,
  yFrom: number,
  yTo: number,
  slats: number,
): void => {
  addSideSkin(
    builder,
    "metal",
    livery.grille,
    roundedRectangle(zFrom, zTo, yFrom, yTo, 0.012),
    side,
    xAt,
    0.004,
  );
  if (builder.isMap) {
    return;
  }
  const pitch = (yTo - yFrom) / slats;
  for (let slat = 0; slat < slats; slat++) {
    const y = yFrom + pitch * (slat + 0.5);
    builder.box(
      "metal",
      "#4a4e54",
      [0.012, pitch * 0.35, zTo - zFrom - 0.02],
      [side * (xAt(y) + 0.01), y, (zFrom + zTo) / 2],
    );
  }
};

/* ---------------------------------------------------------------- */
/* Running gear                                                      */
/* ---------------------------------------------------------------- */

const addDiscWheelset = (
  builder: VehicleBuilder,
  z: number,
  radius: number,
): void => {
  for (const side of [1, -1]) {
    const x = side * railHalfGauge;
    builder.cylinder("metal", "#3d4147", {
      radius,
      length: wheelTread,
      at: [x, radius, z],
      axis: "x",
      segments: 18,
    });
    if (builder.isMap) {
      continue;
    }
    builder.cylinder("metal", "#34373c", {
      radius: radius + 0.025,
      length: 0.016,
      at: [x - side * 0.042, radius, z],
      axis: "x",
      segments: 18,
    });
    builder.cylinder("metal", "#2b2e33", {
      radius: radius * 0.8,
      length: wheelTread + 0.012,
      at: [x, radius, z],
      axis: "x",
      segments: 14,
    });
    builder.cylinder("metal", "#555a61", {
      radius: radius * 0.2,
      length: wheelTread + 0.03,
      at: [x, radius, z],
      axis: "x",
      segments: 8,
    });
  }
  if (!builder.isMap) {
    builder.cylinder("metal", "#2b2e33", {
      radius: 0.03,
      length: railHalfGauge * 2,
      at: [0, radius, z],
      axis: "x",
      segments: 6,
    });
  }
};

interface FramedBogie {
  wheelBase: number;
  radius: number;
  isPowered: boolean;
}

const sideFrameShape = (
  z: number,
  { wheelBase, radius, isPowered }: FramedBogie,
): Shape => {
  const half = wheelBase / 2;
  const reach = half + radius + (isPowered ? 0.1 : 0.06);
  const top = radius + (isPowered ? 0.24 : 0.19);
  const seat = radius + 0.1;
  const belly = radius - (isPowered ? 0.06 : 0.02);
  const outline: [number, number][] = [
    [-reach, seat + 0.03],
    [-reach + 0.05, top],
    [reach - 0.05, top],
    [reach, seat + 0.03],
    [half + 0.08, seat],
    [half - 0.12, seat],
    [half - 0.24, belly],
    [-half + 0.24, belly],
    [-half + 0.12, seat],
    [-half - 0.08, seat],
  ];
  const shape = new Shape();
  outline.forEach(([along, y], index) => {
    if (index === 0) {
      shape.moveTo(-z + along, y);
    } else {
      shape.lineTo(-z + along, y);
    }
  });
  shape.closePath();
  return shape;
};

/** An outside-framed bogie: BT10 under the coaches, BP16 under the power car. */
const addFramedBogie = (
  builder: VehicleBuilder,
  z: number,
  style: FramedBogie,
): void => {
  const { wheelBase, radius, isPowered } = style;
  const axles = [z + wheelBase / 2, z - wheelBase / 2];
  for (const axle of axles) {
    addDiscWheelset(builder, axle, radius);
  }
  const frameX = railHalfGauge + 0.11;
  const frame = isPowered ? "#25282c" : "#2a2d31";
  for (const side of [1, -1]) {
    builder.sidePlate(
      "metal",
      frame,
      sideFrameShape(z, style),
      side * frameX,
      0.05,
    );
    if (builder.isMap) {
      continue;
    }
    for (const axle of axles) {
      builder.box(
        "metal",
        "#33363b",
        [0.1, 0.13, 0.16],
        [side * (frameX + 0.005), radius, axle],
      );
      builder.cylinder("metal", "#5b6067", {
        radius: 0.045,
        length: 0.03,
        at: [side * (frameX + 0.065), radius, axle],
        axis: "x",
        segments: 10,
      });
      for (const offset of isPowered ? [-0.1, 0.1] : [0]) {
        builder.cylinder("metal", "#4b5057", {
          radius: isPowered ? 0.04 : 0.045,
          length: 0.07,
          at: [side * (frameX + 0.005), radius + 0.1, axle + offset],
          segments: 8,
        });
      }
    }
    for (const offset of isPowered ? [-0.13, 0.13] : [0]) {
      builder.cylinder("metal", "#454a51", {
        radius: isPowered ? 0.065 : 0.08,
        length: isPowered ? 0.14 : 0.13,
        at: [
          side * (frameX - 0.03),
          radius + (isPowered ? 0.31 : 0.26),
          z + offset,
        ],
        segments: 10,
      });
    }
    builder.bar(
      "metal",
      "#1a1c1f",
      [side * (frameX + 0.04), radius + 0.02, z + wheelBase * 0.18],
      [side * (frameX + 0.04), radius + 0.2, z - wheelBase * 0.05],
      0.035,
      6,
    );
  }
  builder.box("metal", frame, [frameX * 2, 0.08, 0.22], [0, radius + 0.13, z]);
};

const addFlatBox = (
  builder: VehicleBuilder,
  colour: ColorRepresentation,
  size: [number, number, number],
  at: [number, number, number],
): void => {
  builder.box("metal", colour, size, at);
};

/* ---------------------------------------------------------------- */
/* Power car                                                         */
/* ---------------------------------------------------------------- */

const locomotiveLength = 6.2;
const locoFront = locomotiveLength / 2;
const locoBodyRear = -2.92;

const locoShape: SectionShape = {
  halfWidth: 0.71,
  bottom: 0.58,
  waist: 1.0,
  cantrail: 1.78,
  roofTop: 2.03,
  tumblehome: 0.05,
  lean: 0.035,
};

const locoSideX = (y: number) => sideXAt(locoShape, y);

const windscreenSill = 1.55;

const locoSection = (detail: TrainDetail) =>
  buildCoachSection({
    ...locoShape,
    sideHeights:
      detail === "map"
        ? [0.8, stripes.red, stripes.band, windscreenSill, stripes.bandTop]
        : [
            0.8,
            stripes.red,
            stripes.white,
            stripes.band,
            1.3,
            1.42,
            windscreenSill,
            1.66,
            stripes.bandTop,
          ],
    roofSteps: detail === "map" ? 5 : 9,
  });

const windscreenBase = { z: 2.38, y: 1.3 };
const windscreenTop = { z: 1.98, y: 1.84 };
const cabRoofStart = 1.8;
const frameDepth = 0.03;
const noseTipY = 0.6;

/** Height of the top of the body along the power car, in side view. */
const noseTop = (z: number): number => {
  if (z <= cabRoofStart) {
    return locoShape.roofTop;
  }
  if (z <= windscreenTop.z) {
    const share = (z - cabRoofStart) / (windscreenTop.z - cabRoofStart);
    return (
      locoShape.roofTop - (locoShape.roofTop - windscreenTop.y) * share ** 1.7
    );
  }
  if (z <= windscreenBase.z) {
    const share = (z - windscreenTop.z) / (windscreenBase.z - windscreenTop.z);
    return windscreenTop.y + (windscreenBase.y - windscreenTop.y) * share;
  }
  const share = Math.min(
    1,
    (z - windscreenBase.z) / (locoFront - windscreenBase.z),
  );
  const fall = 0.72 * share ** 1.1 + 0.28 * (1 - Math.sqrt(1 - share ** 2));
  return windscreenBase.y - (windscreenBase.y - noseTipY) * fall;
};

const valanceStart = 2.68;
const valanceDeep = 2.88;
const valanceDrop = 0.26;

const noseBottom = (z: number): number => {
  if (z <= valanceStart) {
    return locoShape.bottom;
  }
  if (z <= valanceDeep) {
    const share = (z - valanceStart) / (valanceDeep - valanceStart);
    return locoShape.bottom - valanceDrop * Math.sin((share * Math.PI) / 2);
  }
  const share = (z - valanceDeep) / (locoFront - valanceDeep);
  return locoShape.bottom - valanceDrop + 0.22 * share ** 1.4;
};

const noseHalfWidth = (z: number): number => {
  const start = 2.15;
  if (z <= start) {
    return locoShape.halfWidth;
  }
  const share = (z - start) / (locoFront - start);
  return locoShape.halfWidth - 0.19 * share ** 2.2;
};

interface NoseFrame {
  top: number;
  bottom: number;
  anchor: number;
  scaleX: number;
}

const noseFrame = (z: number): NoseFrame => {
  const top = noseTop(z);
  const bottom = noseBottom(z);
  return {
    top,
    bottom,
    anchor: Math.min(locoShape.waist, (top + bottom) / 2),
    scaleX: noseHalfWidth(z) / locoShape.halfWidth,
  };
};

/** Moves a height on the full body section onto the shaped nose section. */
const toNose = ({ top, bottom, anchor }: NoseFrame, y: number): number =>
  y <= locoShape.waist
    ? bottom +
      ((y - locoShape.bottom) * (anchor - bottom)) /
        (locoShape.waist - locoShape.bottom)
    : anchor +
      ((y - locoShape.waist) * (top - anchor)) /
        (locoShape.roofTop - locoShape.waist);

/** The inverse of `toNose`: where a nose height sits on the full section. */
const fromNose = ({ top, bottom, anchor }: NoseFrame, y: number): number =>
  y <= anchor
    ? locoShape.bottom +
      ((y - bottom) * (locoShape.waist - locoShape.bottom)) /
        Math.max(0.0001, anchor - bottom)
    : locoShape.waist +
      ((y - anchor) * (locoShape.roofTop - locoShape.waist)) /
        Math.max(0.0001, top - anchor);

const shapeStation = (
  section: readonly (readonly [number, number])[],
  z: number,
): LoftStation => {
  const frame = noseFrame(z);
  return {
    z,
    points: section.map(([x, y]) => [x * frame.scaleX, toNose(frame, y)]),
  };
};

const insideSection = (
  points: readonly (readonly [number, number])[],
  x: number,
  y: number,
): boolean => {
  let inside = false;
  for (
    let index = 0, previous = points.length - 1;
    index < points.length;
    previous = index++
  ) {
    const [xi, yi] = points[index];
    const [xj, yj] = points[previous];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
};

/** How far forward the nose skin reaches at a given x and y. */
const noseSurfaceZ = (x: number, y: number): number => {
  const section = locoSection("explore");
  for (let z = locoFront; z > 1.5; z -= 0.004) {
    if (insideSection(shapeStation(section, z).points, x, y)) {
      return z;
    }
  }
  return 1.5;
};

const glazingFrom = windscreenTop.z + frameDepth;
const glazingTo = windscreenBase.z - frameDepth * 0.8;
const bandEnd = windscreenBase.z + frameDepth;

const powerCarPaint =
  (isMap: boolean): Paint =>
  (centre: Spot, normal: Vector3) => {
    const { y, z } = centre;
    if (z < locoBodyRear + 0.001 && normal.z < -0.9) {
      return sideLivery(Math.min(y, stripes.bandTop - 0.01));
    }
    const original = fromNose(noseFrame(z), y);
    if (z > glazingFrom && z < glazingTo && original > windscreenSill) {
      return glass("#141a20");
    }
    if (z > cabRoofStart && z < bandEnd && original >= stripes.band) {
      return original > locoShape.cantrail + 0.005 && z < glazingFrom
        ? livery.roof
        : livery.band;
    }
    if (z >= bandEnd) {
      return original < 0.8 && z > valanceStart && !isMap
        ? livery.valance
        : livery.lower;
    }
    if (original > locoShape.cantrail + 0.005 && Math.abs(normal.x) < 0.6) {
      return livery.roof;
    }
    return sideLivery(original);
  };

const locoStations = (detail: TrainDetail): LoftStation[] => {
  const section = locoSection(detail);
  const isMap = detail === "map";
  const zs = listBreaks(
    locoBodyRear,
    -2.85,
    ...(isMap ? [] : [-2.0, -1.0, 0.0, 1.0]),
    1.4,
    ...listEvenly(cabRoofStart, windscreenTop.z, isMap ? 2 : 4),
    ...listEvenly(windscreenTop.z, windscreenBase.z, isMap ? 1 : 4),
    glazingFrom,
    glazingTo,
    bandEnd,
    ...listEvenly(windscreenBase.z, locoFront - 0.04, isMap ? 4 : 12),
    ...(isMap ? [] : [valanceStart, valanceDeep, locoFront - 0.02]),
    locoFront,
  );
  return zs.map((z) => shapeStation(section, z));
};

const addHeadlights = (builder: VehicleBuilder): void => {
  for (const side of [1, -1]) {
    const x = side * 0.33;
    const y = 0.8;
    const z = noseSurfaceZ(x, y);
    addFlatBox(builder, "#1d2024", [0.25, 0.1, 0.08], [x, y, z - 0.025]);
    if (builder.isMap) {
      builder.box("glass", "#f6f1dc", [0.19, 0.05, 0.02], [x, y, z + 0.01]);
      continue;
    }
    addLamp(builder, [x - side * 0.055, y, z + 0.005], 1, {
      radius: 0.034,
      lens: "#fbf6e2",
    });
    addLamp(builder, [x + side * 0.06, y, z + 0.005], 1, {
      radius: 0.03,
      lens: "#ffe9c4",
    });
  }
  if (builder.isMap) {
    return;
  }
  const coverY = 0.44;
  const coverZ = noseSurfaceZ(0, coverY);
  addFlatBox(
    builder,
    "#2a2d31",
    [0.26, 0.12, 0.1],
    [0, coverY, Math.min(locoFront - 0.05, coverZ - 0.02)],
  );
  for (const pivot of [0.24, -0.18]) {
    builder.bar(
      "metal",
      "#111316",
      [pivot, windscreenBase.y + 0.07, windscreenBase.z - 0.05],
      [pivot - 0.2, windscreenBase.y + 0.26, windscreenBase.z - 0.19],
      0.014,
      4,
    );
  }
};

const addCabSides = (builder: VehicleBuilder): void => {
  for (const side of [1, -1]) {
    addSideWindow(builder, side, locoSideX, 1.6, 1.86, 1.3, 1.66, 0.04);
    if (builder.isMap) {
      continue;
    }
    addSeam(builder, side, locoSideX, 1.2, 1.5, 0.64, 1.8);
    addSideWindow(builder, side, locoSideX, 1.27, 1.43, 1.34, 1.62, 0.03);
    builder.bar(
      "metal",
      "#b9bcbf",
      [side * (locoSideX(1.0) + 0.02), 0.78, 1.15],
      [side * (locoSideX(1.0) + 0.02), 1.3, 1.15],
      0.016,
      5,
    );
    builder.box(
      "metal",
      "#3b3f45",
      [0.05, 0.03, 0.22],
      [side * (locoSideX(0.62) - 0.01), 0.6, 1.35],
    );
  }
};

const addEngineRoom = (builder: VehicleBuilder): void => {
  const panels: [number, number][] = builder.isMap
    ? [[-1.95, 0.95]]
    : [
        [-1.95, -1.3],
        [-1.2, -0.55],
        [-0.45, 0.2],
        [0.3, 0.95],
      ];
  for (const side of [1, -1]) {
    for (const [from, to] of panels) {
      addLouvres(builder, side, locoSideX, from, to, 1.46, 1.68, 6);
    }
    addLouvres(builder, side, locoSideX, -2.78, -2.1, 1.22, 1.68, 12);
    if (!builder.isMap) {
      for (const z of [-2.04, 1.02]) {
        addSeam(builder, side, locoSideX, z, z + 0.001, 0.64, 1.76);
      }
    }
  }
  const roofY = locoShape.roofTop;
  addFlatBox(builder, "#7f8388", [0.86, 0.05, 0.7], [0, roofY - 0.01, -2.42]);
  builder.cylinder("metal", "#3a3d41", {
    radius: 0.26,
    length: 0.03,
    at: [0, roofY + 0.02, -2.42],
    segments: 20,
  });
  if (builder.isMap) {
    return;
  }
  for (const turn of [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4]) {
    builder.box(
      "metal",
      "#6a6f75",
      [0.5, 0.012, 0.018],
      [0, roofY + 0.04, -2.42],
      [0, turn, 0],
    );
  }
  addFlatBox(builder, "#8d9196", [0.5, 0.04, 0.46], [0, roofY - 0.005, -0.6]);
  builder.cylinder("metal", "#2a2c2f", {
    radius: 0.07,
    length: 0.08,
    at: [0, roofY + 0.04, -0.6],
    segments: 10,
  });
  for (const z of [-1.6, 0.4, 1.3]) {
    builder.box("metal", "#94989c", [0.7, 0.01, 0.025], [0, roofY + 0.002, z]);
  }
};

const addLocoUnderframe = (builder: VehicleBuilder): void => {
  const bogie: FramedBogie = { wheelBase: 1.05, radius: 0.27, isPowered: true };
  addFramedBogie(builder, 1.84, bogie);
  addFramedBogie(builder, -1.84, bogie);
  addFlatBox(builder, livery.underframe, [1.2, 0.28, 1.5], [0, 0.44, 0]);
  addFlatBox(
    builder,
    "#1b1d20",
    [1.36, 0.06, 5.9],
    [0, locoShape.bottom - 0.02, -0.15],
  );
  if (builder.isMap) {
    return;
  }
  for (const side of [1, -1]) {
    builder.cylinder("metal", "#2c2f34", {
      radius: 0.08,
      length: 0.62,
      at: [side * 0.4, 0.42, -0.95],
      axis: "z",
      segments: 10,
    });
    addFlatBox(builder, "#202326", [0.1, 0.2, 0.36], [side * 0.6, 0.45, 0.92]);
  }
};

const addLocoRear = (builder: VehicleBuilder): void => {
  addFlatBox(
    builder,
    "#202326",
    [1.38, 0.24, 0.08],
    [0, 0.5, locoBodyRear + 0.03],
  );
  addBuffers(builder, -locoFront, { height: 0.52 });
  if (builder.isMap) {
    return;
  }
  for (const side of [1, -1]) {
    addLamp(builder, [side * 0.52, 0.88, locoBodyRear - 0.01], -1, {
      lens: "#b3241e",
      radius: 0.035,
    });
    builder.cylinder("metal", "#1a1c1f", {
      radius: 0.025,
      length: 0.08,
      at: [side * 0.24, 0.74, locoBodyRear - 0.03],
      axis: "z",
      segments: 8,
    });
  }
  builder.bar(
    "metal",
    "#15171a",
    [0.24, 0.72, locoBodyRear - 0.06],
    [0.12, 0.6, -locoFront + 0.03],
    0.025,
    5,
  );
  addFlatBox(
    builder,
    "#3a3e43",
    [0.34, 1.0, 0.012],
    [0, 1.25, locoBodyRear - 0.004],
  );
  for (const side of [1, -1]) {
    builder.bar(
      "metal",
      "#8c9095",
      [side * 0.3, 0.8, locoBodyRear - 0.02],
      [side * 0.3, 1.7, locoBodyRear - 0.02],
      0.018,
      4,
    );
  }
};

const buildPowerCar = (detail: TrainDetail): BufferGeometry => {
  const builder = new VehicleBuilder(detail);
  builder.loft({
    stations: locoStations(detail),
    paint: powerCarPaint(builder.isMap),
  });
  addHeadlights(builder);
  addCabSides(builder);
  addEngineRoom(builder);
  addLocoUnderframe(builder);
  addLocoRear(builder);
  return builder.build();
};

/* ---------------------------------------------------------------- */
/* Mark 3 coach                                                      */
/* ---------------------------------------------------------------- */

const carriageLength = 6.8;
const coachEnd = carriageLength / 2;
const coachBodyEnd = 3.22;

const coachShape: SectionShape = {
  halfWidth: 0.715,
  bottom: 0.6,
  waist: 1.05,
  cantrail: 1.8,
  roofTop: 2.02,
  tumblehome: 0.07,
  lean: 0.03,
};

const coachSideX = (y: number) => sideXAt(coachShape, y);

const coachSection = (detail: TrainDetail) =>
  buildCoachSection({
    ...coachShape,
    sideHeights:
      detail === "map"
        ? [stripes.red, stripes.band, stripes.bandTop]
        : [
            0.85,
            stripes.red,
            stripes.white,
            stripes.band,
            1.4,
            1.6,
            stripes.bandTop,
          ],
    roofSteps: detail === "map" ? 5 : 9,
  });

const roofDomeLength = 0.3;

const roofDomeDrop = (z: number): number => {
  const fromEnd = coachBodyEnd - Math.abs(z);
  return fromEnd >= roofDomeLength ? 0 : 1 - (fromEnd / roofDomeLength) ** 2;
};

const coachStation = (
  section: readonly (readonly [number, number])[],
  z: number,
): LoftStation => {
  const drop = roofDomeDrop(z);
  return {
    z,
    points: section.map(([x, y]) => [
      x,
      y > coachShape.cantrail
        ? coachShape.cantrail +
          (y - coachShape.cantrail) * (1 - 0.32 * drop) -
          0.01 * drop
        : y,
    ]),
  };
};

const coachPaint: Paint = (centre, normal) => {
  const { y, z } = centre;
  if (Math.abs(z) > coachBodyEnd - 0.001 && Math.abs(normal.z) > 0.9) {
    if (y > coachShape.cantrail) {
      return livery.roof;
    }
    return y > stripes.band && y < stripes.bandTop ? livery.band : livery.lower;
  }
  if (y > coachShape.cantrail + 0.005 && Math.abs(normal.x) < 0.55) {
    return livery.roof;
  }
  return sideLivery(y);
};

const windowBottom = 1.27;
const windowTop = 1.67;
const doorWidth = 0.3;
const doorFront = 3.12;

const addCoachSides = (builder: VehicleBuilder): void => {
  const saloonEnd = doorFront - doorWidth - 0.1;
  const windows = 8;
  const pitch = (saloonEnd * 2) / windows;
  const pane = pitch - 0.1;
  for (const side of [1, -1]) {
    for (let index = 0; index < windows; index++) {
      const zFrom = -saloonEnd + index * pitch + 0.05;
      addSideWindow(
        builder,
        side,
        coachSideX,
        zFrom,
        zFrom + pane,
        windowBottom,
        windowTop,
        0.06,
      );
    }
    for (const end of [1, -1]) {
      const zFrom = Math.min(end * doorFront, end * (doorFront - doorWidth));
      const zTo = zFrom + doorWidth;
      addSideWindow(
        builder,
        side,
        coachSideX,
        zFrom + 0.07,
        zTo - 0.07,
        1.34,
        windowTop,
        0.035,
      );
      if (builder.isMap) {
        continue;
      }
      addSeam(builder, side, coachSideX, zFrom, zTo, 0.64, 1.86);
      builder.box(
        "metal",
        "#c9ccd0",
        [0.02, 0.025, 0.06],
        [side * (coachSideX(1.25) + 0.012), 1.25, end * (doorFront - 0.05)],
      );
      builder.box(
        "metal",
        "#c9ccd0",
        [0.02, 0.012, 0.1],
        [side * (coachSideX(1.0) + 0.012), 1.0, end * (doorFront - 0.06)],
      );
    }
  }
};

const addRoofRibs = (builder: VehicleBuilder): void => {
  if (builder.isMap) {
    return;
  }
  const section = coachSection("explore");
  const roof = section.filter(([, y]) => y >= coachShape.cantrail - 0.001);
  const right = roof.filter(([x]) => x >= 0).toSorted(([, a], [, b]) => a - b);
  const left = roof.filter(([x]) => x < 0).toSorted(([, a], [, b]) => b - a);
  const arc = [...right, ...left];
  for (const end of [1, -1]) {
    for (let rib = 0; rib < 4; rib++) {
      const z = end * (coachBodyEnd - 0.05 - rib * 0.07);
      const ring = coachStation(arc, z).points.map(
        ([x, y]): [number, number] => [
          x * 1.012,
          coachShape.cantrail + (y - coachShape.cantrail) * 1.03 + 0.006,
        ],
      );
      builder.loft({
        stations: [
          { z: z - 0.012, points: ring },
          { z: z + 0.012, points: ring },
        ],
        paint: () => "#989ca0",
        isClosed: false,
        capStart: false,
        capEnd: false,
      });
    }
  }
};

const addCoachUnderframe = (builder: VehicleBuilder): void => {
  const bogie: FramedBogie = {
    wheelBase: 0.86,
    radius: 0.24,
    isPowered: false,
  };
  addFramedBogie(builder, 2.36, bogie);
  addFramedBogie(builder, -2.36, bogie);
  addFlatBox(
    builder,
    "#1c1e21",
    [1.3, 0.06, carriageLength - 0.4],
    [0, coachShape.bottom - 0.02, 0],
  );
  const boxes: [number, number, number][] = builder.isMap
    ? [[0, 2.4, 0.26]]
    : [
        [-1.2, 0.7, 0.28],
        [-0.25, 0.8, 0.22],
        [0.75, 0.9, 0.3],
        [1.5, 0.35, 0.2],
      ];
  for (const [z, length, height] of boxes) {
    addFlatBox(
      builder,
      livery.underframe,
      [1.18, height, length],
      [0, coachShape.bottom - height / 2, z],
    );
  }
  if (!builder.isMap) {
    builder.cylinder("metal", "#303338", {
      radius: 0.1,
      length: 0.55,
      at: [0.36, 0.42, -0.4],
      axis: "z",
      segments: 10,
    });
  }
};

const addCoachEnds = (builder: VehicleBuilder): void => {
  for (const end of [1, -1]) {
    const facing = Math.sign(end);
    addFlatBox(
      builder,
      "#202326",
      [1.3, 0.22, 0.08],
      [0, 0.52, end * (coachBodyEnd - 0.03)],
    );
    addBuffers(builder, end * coachEnd, { height: 0.52 });
    addFlatBox(
      builder,
      "#1d1f22",
      [0.6, 1.15, 0.11],
      [0, 1.28, end * coachBodyEnd + facing * 0.045],
    );
    if (builder.isMap) {
      continue;
    }
    for (const ridge of [0.025, 0.065]) {
      addFlatBox(
        builder,
        "#2b2e32",
        [0.64, 1.19, 0.014],
        [0, 1.28, end * coachBodyEnd + facing * ridge],
      );
    }
    for (const side of [1, -1]) {
      builder.bar(
        "metal",
        "#6e7277",
        [side * 0.52, 0.75, end * (coachBodyEnd + 0.008)],
        [side * 0.52, 1.8, end * (coachBodyEnd + 0.008)],
        0.02,
        4,
      );
    }
  }
};

const buildMark3 = (detail: TrainDetail): BufferGeometry => {
  const builder = new VehicleBuilder(detail);
  const section = coachSection(detail);
  const steps = builder.isMap ? 2 : 3;
  const zs = listBreaks(
    ...listEvenly(-coachBodyEnd, -coachBodyEnd + roofDomeLength, steps),
    ...listEvenly(coachBodyEnd - roofDomeLength, coachBodyEnd, steps),
  );
  builder.loft({
    stations: zs.map((z) => coachStation(section, z)),
    paint: coachPaint,
  });
  addCoachSides(builder);
  addRoofRibs(builder);
  addCoachUnderframe(builder);
  addCoachEnds(builder);
  return builder.build();
};

const locomotive: TrainVehicleModel = {
  length: locomotiveLength,
  build: buildPowerCar,
};

const carriage: TrainVehicleModel = {
  length: carriageLength,
  build: buildMark3,
};

export const trainModel: TrainModel = {
  locomotive,
  carriage,
  carriageCount: 3,
};
