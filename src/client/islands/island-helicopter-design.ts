import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Matrix4,
  SphereGeometry,
  type BufferGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  buildModelGeometry,
  type ModelPart,
  type Triple,
} from "../world-map-models.js";
import { smoothStep } from "../world-map-terrain.js";
import {
  helicopterDoor,
  helicopterRotorRadius,
  type Spot3,
} from "./island-flight.js";
import { buildLiveryGeometry, onBothSides } from "./island-livery.js";
import {
  buildAirfoilLoft,
  buildLoftGeometry,
  buildPaintedLoft,
  paintAll,
  paintFaces,
} from "./island-lofts.js";

const cabinHalfWidth = 0.86;
const cabinFloor = 0.75;
const cabinRoof = 2.2;
const noseStart = 1.4;
const noseTip = 2.75;
const cabinBack = -1.3;
const cabinEnd = -2.5;
const squareness = 2.6;
const ringPoints = 40;

const rotorHub: Triple = [0, 3.05, 0.15];
const tailRotorHub: Triple = [-0.3, 2.65, -7.35];

const paint = {
  red: new Color("#dc2626"),
  white: new Color("#f8fafc"),
  yellow: new Color("#facc15"),
  glass: new Color("#1e293b"),
  frame: new Color("#cbd5e1"),
  doorway: new Color("#1f2937"),
  grille: new Color("#334155"),
};

interface CabinSection {
  halfWidth: number;
  bottom: number;
  top: number;
}

const findCabinSection = (z: number): CabinSection => {
  if (z > noseStart) {
    const towardsTip = Math.min(1, (z - noseStart) / (noseTip - noseStart));
    return {
      halfWidth: cabinHalfWidth * Math.max(0, 1 - towardsTip ** 2.2) ** 0.5,
      bottom: cabinFloor + 0.45 * towardsTip ** 1.5,
      top: cabinRoof - 0.85 * towardsTip ** 1.2,
    };
  }
  if (z < cabinBack) {
    const towardsBoom = Math.min(1, (cabinBack - z) / (cabinBack - cabinEnd));
    return {
      halfWidth: cabinHalfWidth - 0.46 * smoothStep(0, 1, towardsBoom),
      bottom: cabinFloor + 1 * towardsBoom ** 1.4,
      top: cabinRoof - 0.05 * towardsBoom,
    };
  }
  return { halfWidth: cabinHalfWidth, bottom: cabinFloor, top: cabinRoof };
};

const findSuperellipsePoint = (angle: number): [number, number] => {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return [
    Math.sign(cosine) * Math.abs(cosine) ** (2 / squareness),
    Math.sign(sine) * Math.abs(sine) ** (2 / squareness),
  ];
};

const buildSectionRing = (
  { halfWidth, bottom, top }: CabinSection,
  z: number,
  points = ringPoints,
): Triple[] =>
  Array.from({ length: points }, (_, point): Triple => {
    const [across, up] = findSuperellipsePoint((point / points) * Math.PI * 2);
    return [
      across * halfWidth,
      (bottom + top) / 2 + (up * (top - bottom)) / 2,
      z,
    ];
  });

const listStations = (from: number, to: number, count: number, bunching = 1) =>
  Array.from({ length: count }, (_, station) => {
    const share = station / (count - 1);
    return from + (to - from) * (1 - (1 - share) ** bunching);
  });

const cabinStations = [
  ...listStations(cabinEnd, cabinBack, 10).slice(0, -1),
  ...listStations(cabinBack, noseStart, 16).slice(0, -1),
  ...listStations(noseStart, noseTip, 20, 1.5),
];

const doorBack = helicopterDoor.z - 0.77;
const doorFront = helicopterDoor.z + 0.77;
const doorTop = 2.08;

const isInDoorway = ({ x, y, z }: Spot3): boolean =>
  x > 0 && z > doorBack && z < doorFront && y > helicopterDoor.y && y < doorTop;

const isInBox = (
  { y, z }: Spot3,
  [zFrom, zTo]: [number, number],
  [yFrom, yTo]: [number, number],
): boolean => z > zFrom && z < zTo && y > yFrom && y < yTo;

const paintLivery = (centre: Spot3, section: CabinSection): Color => {
  const middle = (section.bottom + section.top) / 2;
  const upness =
    (centre.y - middle) / Math.max(0.01, (section.top - section.bottom) / 2);
  if (upness > 0.3) {
    return paint.white;
  }
  if (upness > -0.22 && upness < -0.08) {
    return paint.yellow;
  }
  return paint.red;
};

const paintCabin = (centre: Spot3): Color => {
  const section = findCabinSection(centre.z);
  const middle = (section.bottom + section.top) / 2;
  const upness =
    (centre.y - middle) / Math.max(0.01, (section.top - section.bottom) / 2);
  const across = centre.x / Math.max(0.01, section.halfWidth);
  if (isInDoorway(centre)) {
    return paint.doorway;
  }
  if (
    centre.z > 1.5 &&
    centre.z < 2.5 &&
    upness > 0.05 &&
    upness < 0.85 &&
    Math.abs(across) < 0.96
  ) {
    return Math.abs(across) < 0.06 ? paint.frame : paint.glass;
  }
  if (
    centre.z > 1.85 &&
    centre.z < 2.45 &&
    upness < -0.35 &&
    upness > -0.85 &&
    Math.abs(across) > 0.12 &&
    Math.abs(across) < 0.7
  ) {
    return paint.glass;
  }
  const isSide = Math.abs(across) > 0.78;
  if (
    isSide &&
    (isInBox(centre, [0.98, 1.38], [1.25, 2.05]) ||
      isInBox(centre, [-1.2, -0.7], [1.5, 2.02]))
  ) {
    return paint.glass;
  }
  return paintLivery(centre, section);
};

const buildCabinGeometry = (): BufferGeometry =>
  buildPaintedLoft(
    cabinStations.map((z) => buildSectionRing(findCabinSection(z), z)),
    paintCabin,
  );

const boomStations = listStations(-2.3, -7.4, 14);

const findBoomSection = (z: number): CabinSection => {
  const share = (-2.3 - z) / 5.1;
  const radius = 0.34 - 0.18 * share;
  const centre = 1.95 + 0.25 * share;
  return { halfWidth: radius, bottom: centre - radius, top: centre + radius };
};

const buildBoomGeometry = (): BufferGeometry =>
  buildPaintedLoft(
    boomStations.map((z) => buildSectionRing(findBoomSection(z), z, 20)),
    ({ z }) => (z < -4.3 && z > -4.75 ? paint.white : paint.red),
  );

const findCowlingSection = (z: number): CabinSection => {
  const fromMiddle = Math.abs(z + 0.5) / 1.5;
  const rounding = Math.max(0, 1 - fromMiddle ** 4) ** 0.5;
  return {
    halfWidth: 0.62 * Math.max(0.2, rounding),
    bottom: 2.05,
    top: 2.1 + 0.62 * Math.max(0.15, rounding),
  };
};

const buildCowlingGeometry = (): BufferGeometry =>
  buildPaintedLoft(
    listStations(-2, 1, 18).map((z) =>
      buildSectionRing(findCowlingSection(z), z, 24),
    ),
    ({ x, y, z }) =>
      z > -0.15 && z < 0.4 && Math.abs(x) > 0.5 && y > 2.32 && y < 2.6
        ? paint.grille
        : paint.white,
  );

const buildFinGeometry = (): BufferGeometry =>
  paintFaces(
    mergeGeometries([
      buildAirfoilLoft([
        {
          leadingEdge: [0, 2.05, -6.7],
          chord: [0, 0, -0.95],
          thicknessAxis: [1, 0, 0],
          thickness: 0.14,
        },
        {
          leadingEdge: [0, 3.4, -7.3],
          chord: [0, 0, -0.6],
          thicknessAxis: [1, 0, 0],
          thickness: 0.12,
        },
      ]),
      buildAirfoilLoft([
        {
          leadingEdge: [0, 2.05, -6.85],
          chord: [0, 0, -0.65],
          thicknessAxis: [1, 0, 0],
          thickness: 0.14,
        },
        {
          leadingEdge: [0, 1.4, -7.1],
          chord: [0, 0, -0.42],
          thicknessAxis: [1, 0, 0],
          thickness: 0.12,
        },
      ]),
    ]),
    ({ y }) => (y > 3.05 ? paint.white : paint.red),
  );

const buildStabiliserGeometry = (): BufferGeometry =>
  paintAll(
    mergeGeometries([
      buildAirfoilLoft([
        {
          leadingEdge: [1.2, 2.05, -5.95],
          chord: [0, 0, -0.55],
          thicknessAxis: [0, 1, 0],
          thickness: 0.12,
        },
        {
          leadingEdge: [-1.2, 2.05, -5.95],
          chord: [0, 0, -0.55],
          thicknessAxis: [0, 1, 0],
          thickness: 0.12,
        },
      ]),
      ...[1, -1].map((side) =>
        buildAirfoilLoft([
          {
            leadingEdge: [side * 1.22, 1.8, -5.9],
            chord: [0, 0, -0.6],
            thicknessAxis: [1, 0, 0],
            thickness: 0.1,
          },
          {
            leadingEdge: [side * 1.22, 2.4, -6.05],
            chord: [0, 0, -0.5],
            thicknessAxis: [1, 0, 0],
            thickness: 0.1,
          },
        ]),
      ),
    ]),
    "#b91c1c",
  );

const skidSpan = 1;
const skidHeight = 0.07;
const crossTubes = [-0.85, 0.95];

const buildSkidParts = (): ModelPart[] =>
  [1, -1].flatMap((side): ModelPart[] => [
    {
      geometry: new CylinderGeometry(0.06, 0.06, 3.4, 10),
      colour: "#9ca3af",
      position: [side * skidSpan, skidHeight, 0.05],
      rotation: [Math.PI / 2, 0, 0],
    },
    {
      geometry: new CylinderGeometry(0.06, 0.06, 0.55, 10),
      colour: "#9ca3af",
      position: [side * skidSpan, skidHeight + 0.15, 1.95],
      rotation: [Math.PI / 2 - 0.85, 0, 0],
    },
    ...crossTubes.map((z): ModelPart => ({
      geometry: new CylinderGeometry(0.055, 0.055, 0.8, 8),
      colour: "#9ca3af",
      position: [
        side * (skidSpan - 0.17),
        (skidHeight + cabinFloor) / 2 + 0.02,
        z,
      ],
      rotation: [0, 0, side * 0.45],
    })),
    {
      geometry: new BoxGeometry(0.32, 0.05, 0.7),
      colour: "#6b7280",
      position: [side * (skidSpan - 0.05), 0.42, helicopterDoor.z],
    },
  ]);

const buildFittingParts = (): ModelPart[] => {
  const light = (
    colour: string,
    position: Triple,
    radius = 0.07,
  ): ModelPart => ({
    geometry: new SphereGeometry(radius, 8, 6),
    colour,
    position,
  });
  return [
    ...[1, -1].map((side): ModelPart => ({
      geometry: new CylinderGeometry(0.12, 0.14, 0.5, 10),
      colour: "#4b5563",
      position: [side * 0.42, 2.55, -1.55],
      rotation: [-Math.PI / 2 + 0.35, 0, side * -0.4],
    })),
    {
      geometry: new CylinderGeometry(0.2, 0.32, 0.4, 14),
      colour: "#9ca3af",
      position: [rotorHub[0], 2.8, rotorHub[2]],
    },
    light("#ef4444", [1.27, 2.4, -6.3]),
    light("#22c55e", [-1.27, 2.4, -6.3]),
    light("#dc2626", [0, 2.76, -1.5], 0.09),
    light("#dc2626", [0, cabinFloor - 0.03, -0.4], 0.09),
    light("#f8fafc", [0, 3.42, -7.6]),
    {
      geometry: new CylinderGeometry(0.12, 0.09, 0.14, 12),
      colour: "#fef9c3",
      position: [0, findCabinSection(2).bottom - 0.05, 2],
    },
    {
      geometry: new BoxGeometry(0.03, 0.3, 0.35),
      colour: "#cbd5e1",
      position: [0, cabinFloor - 0.12, 0.8],
    },
  ];
};

export const buildHelicopterLiveryGeometry = (): BufferGeometry =>
  buildLiveryGeometry([
    {
      surface: buildCowlingGeometry(),
      decals: onBothSides({
        face: "flag",
        centre: [0, 2.38, -0.95],
        outward: [1, 0, 0],
        up: [0, 1, 0],
        width: 0.94,
        height: 0.47,
      }),
    },
    {
      surface: buildBoomGeometry(),
      decals: onBothSides({
        face: "name",
        centre: [0, 2, -3.35],
        outward: [1, 0, 0],
        up: [0, 1, 0],
        width: 1.6,
        height: 0.4,
      }),
    },
  ]);

export const buildHelicopterGeometry = (): BufferGeometry =>
  mergeGeometries([
    buildCabinGeometry(),
    buildBoomGeometry(),
    buildCowlingGeometry(),
    buildFinGeometry(),
    buildStabiliserGeometry(),
    buildModelGeometry([...buildSkidParts(), ...buildFittingParts()]),
  ]);

const bladeRoot = 0.32;
const bladeChord = 0.32;

const paintBlade = ({ x, z }: Spot3): Color => {
  const reach = Math.hypot(x, z);
  if (reach > helicopterRotorRadius - 0.25) {
    return paint.yellow;
  }
  if (reach > helicopterRotorRadius - 0.5) {
    return paint.white;
  }
  return new Color("#1f2937");
};

export const buildMainRotorGeometry = (): BufferGeometry => {
  const blade = buildAirfoilLoft(
    [bladeRoot, 1.2, 3, helicopterRotorRadius].map((reach, index) => ({
      leadingEdge: [reach, -0.02 * index, -bladeChord / 2] satisfies Triple,
      chord: [0, 0, bladeChord] satisfies Triple,
      thicknessAxis: [0, 1, 0] satisfies Triple,
      thickness: 0.12,
    })),
  );
  const blades = Array.from({ length: 4 }, (_, index) =>
    blade
      .clone()
      .applyMatrix4(new Matrix4().makeRotationY((index * Math.PI) / 2)),
  );
  return mergeGeometries([
    ...blades.map((each) => paintFaces(each, paintBlade)),
    buildModelGeometry([
      {
        geometry: new CylinderGeometry(0.3, 0.3, 0.18, 16),
        colour: "#6b7280",
      },
      {
        geometry: new CylinderGeometry(0.12, 0.2, 0.22, 12),
        colour: "#9ca3af",
        position: [0, 0.18, 0],
      },
      ...Array.from({ length: 4 }, (_, index): ModelPart => ({
        geometry: new BoxGeometry(0.42, 0.12, 0.16),
        colour: "#4b5563",
        position: [
          Math.cos((index * Math.PI) / 2) * 0.38,
          0,
          -Math.sin((index * Math.PI) / 2) * 0.38,
        ],
        rotation: [0, (index * Math.PI) / 2, 0],
      })),
    ]),
  ]);
};

export const buildTailRotorGeometry = (): BufferGeometry => {
  const blade = buildAirfoilLoft(
    [0.08, 0.85].map((reach) => ({
      leadingEdge: [0, reach, -0.07] satisfies Triple,
      chord: [0, 0, 0.14] satisfies Triple,
      thicknessAxis: [1, 0, 0] satisfies Triple,
      thickness: 0.12,
    })),
  );
  return mergeGeometries([
    paintAll(blade.clone(), "#e5e7eb"),
    paintAll(
      blade.clone().applyMatrix4(new Matrix4().makeRotationX(Math.PI)),
      "#e5e7eb",
    ),
    buildModelGeometry([
      {
        geometry: new CylinderGeometry(0.1, 0.1, 0.16, 10),
        colour: "#6b7280",
        rotation: [0, 0, Math.PI / 2],
      },
    ]),
  ]);
};

const doorRows = 8;

const buildDoorRing = (z: number): Triple[] => {
  const section = findCabinSection(z);
  const middle = (section.bottom + section.top) / 2;
  const halfHeight = (section.top - section.bottom) / 2;
  const heights = Array.from(
    { length: doorRows },
    (_, row) =>
      helicopterDoor.y +
      0.03 +
      ((doorTop - helicopterDoor.y - 0.03) * row) / (doorRows - 1),
  );
  const findSurface = (y: number, offset: number): Triple => {
    const upness = Math.min(0.999, Math.abs((y - middle) / halfHeight));
    return [
      section.halfWidth * (1 - upness ** squareness) ** (1 / squareness) +
        offset,
      y,
      z,
    ];
  };
  return [
    ...heights.map((y) => findSurface(y, 0.035)),
    ...heights.toReversed().map((y) => findSurface(y, -0.015)),
  ];
};

export const buildHelicopterDoorGeometry = (): BufferGeometry =>
  paintFaces(
    buildLoftGeometry(
      [doorBack + 0.01, helicopterDoor.z, doorFront - 0.01].map(buildDoorRing),
    ),
    (centre) =>
      isInBox(centre, [doorBack + 0.2, doorFront - 0.2], [1.45, 1.98])
        ? paint.glass
        : paintLivery(centre, findCabinSection(centre.z)),
  );

const doorSlide = 1.45;

export const placeHelicopterDoor = (opening: number): Matrix4 =>
  new Matrix4().makeTranslation(
    0.09 * smoothStep(0, 0.15, opening),
    0,
    -doorSlide * smoothStep(0.1, 0.65, opening),
  );

export const placeMainRotor = (turn: number): Matrix4 =>
  new Matrix4()
    .makeTranslation(...rotorHub)
    .multiply(new Matrix4().makeRotationY(turn));

export const placeTailRotor = (turn: number): Matrix4 =>
  new Matrix4()
    .makeTranslation(...tailRotorHub)
    .multiply(new Matrix4().makeRotationX(turn));
