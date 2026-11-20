import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Matrix4,
  SphereGeometry,
  TorusGeometry,
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
  aeroplaneDoor,
  aeroplaneStairRun,
  type Spot3,
} from "./island-flight.js";
import { buildLiveryGeometry, onBothSides } from "./island-livery.js";
import {
  buildAirfoilLoft,
  buildLoftGeometry,
  buildPaintedLoft,
  paintAll,
  paintFaces,
  type AirfoilSection,
} from "./island-lofts.js";

const fuselageRadius = aeroplaneDoor.x;
const fuselageCentreHeight = 2.05;
const aeroplaneNose = 10.5;
const aeroplaneTail = -9.5;
const noseStart = 6.5;
const tailStart = -4;
const tailUpsweep = 0.72;
const tailConeRadius = 0.22;
const fuselageAround = 48;

const livery = {
  white: new Color("#f8fafc"),
  navy: new Color("#1e3a8a"),
  orange: new Color("#f97316"),
  window: new Color("#0f172a"),
  frame: new Color("#e2e8f0"),
  doorway: new Color("#111827"),
  seam: new Color("#94a3b8"),
  tailCone: new Color("#9ca3af"),
};

interface FuselageSection {
  centreHeight: number;
  radius: number;
}

const findFuselageSection = (z: number): FuselageSection => {
  if (z > noseStart) {
    const towardsNose = Math.min(
      1,
      (z - noseStart) / (aeroplaneNose - noseStart),
    );
    return {
      centreHeight: fuselageCentreHeight - 0.3 * towardsNose ** 1.6,
      radius: fuselageRadius * Math.max(0, 1 - towardsNose ** 2.4) ** 0.55,
    };
  }
  if (z < tailStart) {
    const towardsTail = Math.min(
      1,
      (tailStart - z) / (tailStart - aeroplaneTail),
    );
    return {
      centreHeight: fuselageCentreHeight + tailUpsweep * towardsTail ** 1.6,
      radius:
        tailConeRadius +
        (fuselageRadius - tailConeRadius) * (1 - towardsTail ** 1.4),
    };
  }
  return { centreHeight: fuselageCentreHeight, radius: fuselageRadius };
};

const heightStretch = 1.04;

const listStations = (
  from: number,
  to: number,
  count: number,
  bunching: number,
) =>
  Array.from({ length: count }, (_, station) => {
    const share = station / (count - 1);
    return from + (to - from) * (1 - (1 - share) ** bunching);
  });

const fuselageStations = [
  ...listStations(aeroplaneTail, tailStart, 20, 0.6).slice(0, -1),
  ...listStations(tailStart, noseStart, 30, 1).slice(0, -1),
  ...listStations(noseStart, aeroplaneNose, 30, 1.6),
];

const buildFuselageRing = (z: number): Triple[] => {
  const { centreHeight, radius } = findFuselageSection(z);
  return Array.from({ length: fuselageAround }, (_, point): Triple => {
    const angle = (point / fuselageAround) * Math.PI * 2;
    return [
      Math.cos(angle) * radius,
      centreHeight + Math.sin(angle) * radius * heightStretch,
      z,
    ];
  });
};

const doorFront = aeroplaneDoor.z + 0.43;
const doorBack = aeroplaneDoor.z - 0.43;
const doorTop = aeroplaneDoor.y + 1.45;

const isInDoorway = ({ x, y, z }: Spot3): boolean =>
  x > 0 && z > doorBack && z < doorFront && y > aeroplaneDoor.y && y < doorTop;

const isOnDoorSeam = ({ x, y, z }: Spot3, side: number): boolean => {
  const middle = side > 0 ? aeroplaneDoor.z : -3.4;
  const isBeside =
    Math.abs(Math.abs(z - middle) - 0.47) < 0.05 &&
    y > aeroplaneDoor.y - 0.04 &&
    y < doorTop + 0.04;
  const isAboveOrBelow =
    Math.abs(z - middle) < 0.47 &&
    (Math.abs(y - aeroplaneDoor.y + 0.03) < 0.05 ||
      Math.abs(y - doorTop - 0.03) < 0.05);
  return Math.sign(x) === side && (isBeside || isAboveOrBelow);
};

const cockpitPosts = [0, 0.48, 0.8];

const isCockpitWindow = ({ x, y, z }: Spot3): Color | undefined => {
  const { centreHeight, radius } = findFuselageSection(z);
  if (radius < 0.05 || z < 8.55 || z > 9.6) {
    return undefined;
  }
  const upness = (y - centreHeight) / (radius * heightStretch);
  const sill = 0.16;
  if (upness < sill || upness > 0.52) {
    return undefined;
  }
  const across = x / radius;
  return cockpitPosts.some((post) => Math.abs(Math.abs(across) - post) < 0.045)
    ? livery.frame
    : livery.window;
};

const paintFuselage = (centre: Spot3): Color => {
  if (isInDoorway(centre)) {
    return livery.doorway;
  }
  if (isOnDoorSeam(centre, 1) || isOnDoorSeam(centre, -1)) {
    return livery.seam;
  }
  const cockpit = isCockpitWindow(centre);
  if (cockpit !== undefined) {
    return cockpit;
  }
  if (centre.z < aeroplaneTail + 0.35) {
    return livery.tailCone;
  }
  const { centreHeight, radius } = findFuselageSection(centre.z);
  const upness =
    (centre.y - centreHeight) / Math.max(0.01, radius * heightStretch);
  if (upness < -0.42) {
    return livery.navy;
  }
  if (upness < -0.33) {
    return livery.orange;
  }
  return livery.white;
};

const buildFuselageGeometry = (): BufferGeometry =>
  buildPaintedLoft(fuselageStations.map(buildFuselageRing), paintFuselage);

const windowUpness = 0.38;
const windowAngle = Math.asin(windowUpness);

const buildCabinWindowParts = (): ModelPart[] =>
  [1, -1].flatMap((side) =>
    Array.from({ length: 15 }, (_, index): ModelPart => {
      const z = -3.6 + index * 0.62;
      return {
        geometry: new CylinderGeometry(0.12, 0.12, 0.05, 10),
        colour: "#0f172a",
        position: [
          side * Math.cos(windowAngle) * (fuselageRadius + 0.005),
          fuselageCentreHeight + windowUpness * fuselageRadius * heightStretch,
          z,
        ],
        rotation: [0, 0, side * (windowAngle - Math.PI / 2)],
      };
    }),
  );

const wingRoot = { span: 0.9, leadingEdge: 3, chord: 4.4, height: 1.3 };
const wingKink = { span: 3.8, chord: 3.12 };
const wingTip = { span: 9.4, chord: 1.15 };
const wingSweep = Math.tan((27 * Math.PI) / 180);
const wingDihedral = 0.09;

const findWingHeight = (span: number): number =>
  wingRoot.height + (span - wingRoot.span) * wingDihedral;

const findWingLeadingEdge = (span: number): number =>
  wingRoot.leadingEdge - (span - wingRoot.span) * wingSweep;

const buildWingSection = (
  span: number,
  chord: number,
  thickness: number,
  side: number,
): AirfoilSection => ({
  leadingEdge: [side * span, findWingHeight(span), findWingLeadingEdge(span)],
  chord: [0, 0, -chord],
  thicknessAxis: [0, 1, 0],
  thickness,
  camber: 0.02,
});

const wingUpper = new Color("#e5e9ef");
const wingLower = new Color("#c3cad5");
const flapColour = new Color("#d3d9e2");

const paintWing = ({ x, y, z }: Spot3): Color => {
  const span = Math.abs(x);
  const leadingEdge = findWingLeadingEdge(span);
  const chord =
    span < wingKink.span
      ? wingRoot.chord +
        ((wingKink.chord - wingRoot.chord) * (span - wingRoot.span)) /
          (wingKink.span - wingRoot.span)
      : wingKink.chord +
        ((wingTip.chord - wingKink.chord) * (span - wingKink.span)) /
          (wingTip.span - wingKink.span);
  const share = (leadingEdge - z) / chord;
  if (y < findWingHeight(span)) {
    return wingLower;
  }
  return share > 0.74 && span > 1.4 && span < 8.6 ? flapColour : wingUpper;
};

const buildWingGeometry = (side: number): BufferGeometry =>
  paintFaces(
    buildAirfoilLoft([
      buildWingSection(wingRoot.span, wingRoot.chord, 0.14, side),
      buildWingSection(wingKink.span, wingKink.chord, 0.12, side),
      buildWingSection(wingTip.span, wingTip.chord, 0.1, side),
    ]),
    paintWing,
  );

const buildWingletGeometry = (side: number): BufferGeometry => {
  const base = findWingHeight(wingTip.span);
  const leadingEdge = findWingLeadingEdge(wingTip.span);
  return paintAll(
    buildAirfoilLoft([
      {
        leadingEdge: [
          side * (wingTip.span - 0.05),
          base - 0.05,
          leadingEdge - 0.05,
        ],
        chord: [0, 0, -wingTip.chord],
        thicknessAxis: [1, 0, 0],
        thickness: 0.1,
      },
      {
        leadingEdge: [
          side * (wingTip.span + 0.32),
          base + 1.15,
          leadingEdge - 0.75,
        ],
        chord: [0, 0, -0.5],
        thicknessAxis: [1, 0, 0],
        thickness: 0.1,
      },
    ]),
    "#1e3a8a",
  );
};

const flapTrackSpans = [2.4, 5.2, 7.2];

const buildFlapTrackParts = (): ModelPart[] =>
  [1, -1].flatMap((side) =>
    flapTrackSpans.map((span): ModelPart => {
      const trailingEdge =
        findWingLeadingEdge(span) -
        (span < wingKink.span
          ? 3.6
          : wingKink.chord - (span - wingKink.span) * 0.35);
      return {
        geometry: new ConeGeometry(0.12, 1.4, 8),
        colour: "#c3cad5",
        position: [
          side * span,
          findWingHeight(span) - 0.14,
          trailingEdge + 0.25,
        ],
        rotation: [-Math.PI / 2, 0, 0],
        scale: [1, 1, 0.7],
      };
    }),
  );

const engineSpan = 3.6;
const engineHeight = 0.8;
const intakeZ = 4.6;
const exhaustZ = 1;

const nacelleRings: [number, number][] = [
  [exhaustZ, 0.42],
  [1.3, 0.5],
  [2, 0.57],
  [3, 0.6],
  [3.7, 0.6],
  [3.95, 0.6],
  [4.15, 0.6],
  [4.45, 0.56],
  [intakeZ, 0.5],
];

const nacelleWhite = new Color("#f8fafc");
const nacelleStripe = new Color("#f97316");
const fanFace = new Color("#334155");
const exhaustFace = new Color("#475569");

const buildNacelleGeometry = (side: number): BufferGeometry =>
  buildPaintedLoft(
    nacelleRings.map(([z, radius]) =>
      Array.from({ length: 28 }, (_, point): Triple => {
        const angle = (point / 28) * Math.PI * 2;
        return [
          side * engineSpan + Math.cos(angle) * radius,
          engineHeight + Math.sin(angle) * radius,
          z,
        ];
      }),
    ),
    ({ x, y, z }) => {
      const fromAxis = Math.hypot(x - side * engineSpan, y - engineHeight);
      if (z > intakeZ - 0.01 && fromAxis < 0.49) {
        return fanFace;
      }
      if (z < exhaustZ + 0.01 && fromAxis < 0.41) {
        return exhaustFace;
      }
      return z > 3.7 && z < 3.95 ? nacelleStripe : nacelleWhite;
    },
  );

const buildEngineParts = (side: number): ModelPart[] => {
  const axis: Triple = [side * engineSpan, engineHeight, 0];
  const fanBlades = Array.from({ length: 12 }, (_, blade): ModelPart => ({
    geometry: new BoxGeometry(0.04, 0.4, 0.02),
    colour: "#64748b",
    position: [
      axis[0] + Math.cos((blade * Math.PI) / 6) * 0.26,
      axis[1] + Math.sin((blade * Math.PI) / 6) * 0.26,
      intakeZ - 0.02,
    ],
    rotation: [0, 0.4, (blade * Math.PI) / 6 - Math.PI / 2],
  }));
  return [
    {
      geometry: new TorusGeometry(0.52, 0.05, 6, 28),
      colour: "#cbd5e1",
      position: [axis[0], axis[1], intakeZ],
    },
    {
      geometry: new ConeGeometry(0.15, 0.36, 12),
      colour: "#e2e8f0",
      position: [axis[0], axis[1], intakeZ + 0.12],
      rotation: [Math.PI / 2, 0, 0],
    },
    {
      geometry: new ConeGeometry(0.27, 0.7, 12),
      colour: "#6b7280",
      position: [axis[0], axis[1], exhaustZ - 0.3],
      rotation: [-Math.PI / 2, 0, 0],
    },
    ...fanBlades,
  ];
};

const buildPylonGeometry = (side: number): BufferGeometry =>
  paintAll(
    buildAirfoilLoft([
      {
        leadingEdge: [side * engineSpan, engineHeight + 0.45, 4.1],
        chord: [0, 0, -3.3],
        thicknessAxis: [1, 0, 0],
        thickness: 0.09,
      },
      {
        leadingEdge: [
          side * engineSpan,
          findWingHeight(engineSpan) + 0.02,
          2.6,
        ],
        chord: [0, 0, -2.6],
        thicknessAxis: [1, 0, 0],
        thickness: 0.09,
      },
    ]),
    "#e2e8f0",
  );

const finColour = new Color("#1e3a8a");
const rudderColour = new Color("#1b3479");

const buildFinGeometry = (): BufferGeometry =>
  paintFaces(
    buildAirfoilLoft([
      {
        leadingEdge: [0, 2.9, -5.2],
        chord: [0, 0, -3.9],
        thicknessAxis: [1, 0, 0],
        thickness: 0.12,
      },
      {
        leadingEdge: [0, 6.3, -8],
        chord: [0, 0, -1.7],
        thicknessAxis: [1, 0, 0],
        thickness: 0.11,
      },
    ]),
    ({ y, z }) => {
      const share = (y - 2.9) / 3.4;
      const leadingEdge = -5.2 - 2.8 * share;
      const chord = 3.9 - 2.2 * share;
      return (leadingEdge - z) / chord > 0.68 ? rudderColour : finColour;
    },
  );

const buildTailplaneGeometry = (side: number): BufferGeometry =>
  paintAll(
    buildAirfoilLoft([
      {
        leadingEdge: [side * 0.2, 2.55, -7.2],
        chord: [0, 0, -2.1],
        thicknessAxis: [0, 1, 0],
        thickness: 0.1,
      },
      {
        leadingEdge: [side * 3.5, 2.85, -8.85],
        chord: [0, 0, -0.9],
        thicknessAxis: [0, 1, 0],
        thickness: 0.09,
      },
    ]),
    "#e5e9ef",
  );

const buildWheelParts = (
  position: Triple,
  radius: number,
  width: number,
): ModelPart[] => [
  {
    geometry: new CylinderGeometry(radius, radius, width, 18),
    colour: "#1f2937",
    position,
    rotation: [0, 0, Math.PI / 2],
  },
  {
    geometry: new CylinderGeometry(
      radius * 0.5,
      radius * 0.5,
      width + 0.03,
      12,
    ),
    colour: "#9ca3af",
    position,
    rotation: [0, 0, Math.PI / 2],
  },
];

const noseGearZ = 8.3;
const mainGearZ = -0.3;
const mainGearSpan = 1.9;

const buildLandingGearParts = (): ModelPart[] => [
  {
    geometry: new CylinderGeometry(0.07, 0.07, 0.62, 8),
    colour: "#d1d5db",
    position: [0, 0.6, noseGearZ],
  },
  {
    geometry: new BoxGeometry(0.06, 0.24, 0.18),
    colour: "#9ca3af",
    position: [0, 0.45, noseGearZ - 0.12],
  },
  ...[1, -1].flatMap((side) =>
    buildWheelParts([side * 0.12, 0.3, noseGearZ], 0.3, 0.15),
  ),
  ...[1, -1].flatMap((side): ModelPart[] => [
    {
      geometry: new CylinderGeometry(0.1, 0.1, 0.95, 8),
      colour: "#d1d5db",
      position: [side * mainGearSpan, 0.85, mainGearZ],
    },
    {
      geometry: new CylinderGeometry(0.04, 0.04, 1.3, 6),
      colour: "#9ca3af",
      position: [side * (mainGearSpan - 0.55), 0.95, mainGearZ],
      rotation: [0, 0, side * 0.95],
    },
    {
      geometry: new BoxGeometry(0.06, 0.8, 0.9),
      colour: "#e5e9ef",
      position: [side * (mainGearSpan + 0.22), 1.05, mainGearZ],
    },
    ...buildWheelParts(
      [side * (mainGearSpan + 0.15), 0.4, mainGearZ],
      0.4,
      0.2,
    ),
    ...buildWheelParts(
      [side * (mainGearSpan - 0.15), 0.4, mainGearZ],
      0.4,
      0.2,
    ),
  ]),
];

const buildLightParts = (): ModelPart[] => {
  const tipHeight = findWingHeight(wingTip.span);
  const tipLeadingEdge = findWingLeadingEdge(wingTip.span);
  const light = (
    colour: string,
    position: Triple,
    radius = 0.09,
  ): ModelPart => ({
    geometry: new SphereGeometry(radius, 8, 6),
    colour,
    position,
  });
  return [
    light("#ef4444", [wingTip.span + 0.1, tipHeight, tipLeadingEdge - 0.3]),
    light("#22c55e", [-wingTip.span - 0.1, tipHeight, tipLeadingEdge - 0.3]),
    light("#f8fafc", [
      0,
      findFuselageSection(aeroplaneTail).centreHeight,
      aeroplaneTail - 0.05,
    ]),
    light(
      "#dc2626",
      [0, fuselageCentreHeight + fuselageRadius * heightStretch + 0.04, 0],
      0.11,
    ),
    light(
      "#dc2626",
      [0, fuselageCentreHeight - fuselageRadius * heightStretch - 0.04, 1.5],
      0.11,
    ),
    light(
      "#fef9c3",
      [1.3, findWingHeight(1.3) - 0.1, findWingLeadingEdge(1.3) - 0.2],
      0.1,
    ),
    light(
      "#fef9c3",
      [-1.3, findWingHeight(1.3) - 0.1, findWingLeadingEdge(1.3) - 0.2],
      0.1,
    ),
  ];
};

const buildFairingParts = (): ModelPart[] => [
  {
    geometry: new SphereGeometry(1, 24, 12),
    colour: "#c3cad5",
    position: [0, 1.18, 0.5],
    scale: [1.22, 0.55, 3.4],
  },
  {
    geometry: new BoxGeometry(0.03, 0.32, 0.5),
    colour: "#cbd5e1",
    position: [
      0,
      fuselageCentreHeight + fuselageRadius * heightStretch + 0.15,
      3.2,
    ],
  },
  {
    geometry: new BoxGeometry(0.03, 0.26, 0.4),
    colour: "#cbd5e1",
    position: [
      0,
      fuselageCentreHeight + fuselageRadius * heightStretch + 0.12,
      -1.8,
    ],
  },
];

const fuselageLetteringUpness = 0.75;
const fuselageLetteringAngle = Math.asin(fuselageLetteringUpness);

export const buildAeroplaneLiveryGeometry = (): BufferGeometry =>
  buildLiveryGeometry([
    {
      surface: buildFuselageGeometry(),
      decals: onBothSides({
        face: "name",
        centre: [
          fuselageRadius * Math.cos(fuselageLetteringAngle),
          fuselageCentreHeight +
            fuselageLetteringUpness * fuselageRadius * heightStretch,
          1.6,
        ],
        outward: [
          Math.cos(fuselageLetteringAngle),
          Math.sin(fuselageLetteringAngle),
          0,
        ],
        up: [
          -Math.sin(fuselageLetteringAngle),
          Math.cos(fuselageLetteringAngle),
          0,
        ],
        width: 5.6,
        height: 1.4,
      }),
    },
    {
      surface: buildFinGeometry(),
      decals: onBothSides({
        face: "flag",
        centre: [0, 4.6, -7.9],
        outward: [1, 0, 0],
        up: [0, 1, 0],
        width: 1.6,
        height: 0.8,
      }),
    },
  ]);

export const buildAeroplaneGeometry = (): BufferGeometry =>
  mergeGeometries([
    buildFuselageGeometry(),
    ...[1, -1].flatMap((side) => [
      buildWingGeometry(side),
      buildWingletGeometry(side),
      buildNacelleGeometry(side),
      buildPylonGeometry(side),
      buildTailplaneGeometry(side),
    ]),
    buildFinGeometry(),
    buildModelGeometry([
      ...buildCabinWindowParts(),
      ...buildFlapTrackParts(),
      ...buildEngineParts(1),
      ...buildEngineParts(-1),
      ...buildLandingGearParts(),
      ...buildLightParts(),
      ...buildFairingParts(),
    ]),
  ]);

const doorRows = 8;

const buildDoorRing = (z: number): Triple[] => {
  const { centreHeight, radius } = findFuselageSection(z);
  const heights = Array.from(
    { length: doorRows },
    (_, row) =>
      aeroplaneDoor.y + ((doorTop - aeroplaneDoor.y) * row) / (doorRows - 1),
  );
  const findSurface = (y: number, offset: number): Triple => {
    const upness = Math.min(
      0.99,
      (y - centreHeight) / (radius * heightStretch),
    );
    return [Math.sqrt(1 - upness * upness) * radius + offset, y, z];
  };
  return [
    ...heights.map((y) => findSurface(y, 0.035)),
    ...heights.toReversed().map((y) => findSurface(y, -0.02)),
  ];
};

const doorHinge: Triple = [fuselageRadius, 0, doorFront];

export const buildAeroplaneDoorGeometry = (): BufferGeometry =>
  paintFaces(
    buildLoftGeometry(
      [doorBack + 0.02, aeroplaneDoor.z, doorFront - 0.02].map(buildDoorRing),
    ),
    ({ y, z }) =>
      y > doorTop - 0.5 &&
      y < doorTop - 0.22 &&
      Math.abs(z - aeroplaneDoor.z) < 0.14
        ? livery.window
        : livery.white,
  );

const stairDrop = aeroplaneDoor.y;
const stairSlope = Math.atan2(stairDrop, aeroplaneStairRun);
const stairLength = Math.hypot(stairDrop, aeroplaneStairRun);
const stairSteps = 7;
const stairHalfWidth = 0.38;

export const buildAirstairGeometry = (): BufferGeometry => {
  const treads = Array.from({ length: stairSteps }, (_, step): ModelPart => {
    const share = (step + 0.5) / stairSteps;
    return {
      geometry: new BoxGeometry(0.36, 0.05, stairHalfWidth * 2),
      colour: "#4b5563",
      position: [aeroplaneStairRun * share, -stairDrop * share + 0.03, 0],
    };
  });
  const sides = [1, -1].flatMap((side): ModelPart[] => [
    {
      geometry: new BoxGeometry(stairLength, 0.22, 0.05),
      colour: "#9ca3af",
      position: [aeroplaneStairRun / 2, -stairDrop / 2, side * stairHalfWidth],
      rotation: [0, 0, -stairSlope],
    },
    {
      geometry: new CylinderGeometry(0.03, 0.03, stairLength, 6),
      colour: "#e5e7eb",
      position: [
        aeroplaneStairRun / 2,
        -stairDrop / 2 + 0.75,
        side * (stairHalfWidth + 0.02),
      ],
      rotation: [0, 0, -(Math.PI / 2 + stairSlope)],
    },
    ...[0.15, 0.5, 0.85].map((share): ModelPart => ({
      geometry: new CylinderGeometry(0.025, 0.025, 0.75, 5),
      colour: "#e5e7eb",
      position: [
        aeroplaneStairRun * share,
        -stairDrop * share + 0.375,
        side * (stairHalfWidth + 0.02),
      ],
    })),
  ]);
  return buildModelGeometry([...treads, ...sides]);
};

const doorSwing = -Math.PI * 0.97;
const stairStowedTurn = Math.PI / 2 + stairSlope;

export const placeAeroplaneDoor = (opening: number): Matrix4 => {
  const swing = doorSwing * smoothStep(0, 0.45, opening);
  const outward = 0.15 * smoothStep(0, 0.1, opening);
  return new Matrix4()
    .makeTranslation(doorHinge[0] + outward, doorHinge[1], doorHinge[2])
    .multiply(new Matrix4().makeRotationY(swing))
    .multiply(
      new Matrix4().makeTranslation(
        -doorHinge[0],
        -doorHinge[1],
        -doorHinge[2],
      ),
    );
};

export const placeAirstair = (opening: number): Matrix4 => {
  if (opening < 0.4) {
    return new Matrix4().makeScale(0, 0, 0);
  }
  const turn = stairStowedTurn * (1 - smoothStep(0.45, 1, opening));
  return new Matrix4()
    .makeTranslation(aeroplaneDoor.x, aeroplaneDoor.y, aeroplaneDoor.z)
    .multiply(new Matrix4().makeRotationZ(turn));
};
