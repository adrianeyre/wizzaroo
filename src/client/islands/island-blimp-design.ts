import {
  BoxGeometry,
  BufferAttribute,
  Color,
  ConeGeometry,
  CylinderGeometry,
  LatheGeometry,
  Matrix4,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  type BufferGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  buildModelGeometry,
  type ModelPart,
  type Triple,
} from "../world-map-models.js";
import {
  blimpDoor,
  blimpEnvelopeCentre,
  blimpGondolaFloor,
  blimpGondolaHalfWidth,
  blimpGondolaLength,
  blimpGondolaTop,
  blimpLength,
  blimpRadius,
  blimpStepRun,
} from "./island-flight.js";
import {
  buildAirfoilLoft,
  buildLoftGeometry,
  buildPaintedLoft,
  paintAll,
  paintFaces,
} from "./island-lofts.js";
import {
  buildLiveryGeometry,
  onBothSides,
  type LiveryDecal,
} from "./island-livery.js";

// A modern passenger airship in Wizzaroo pearl, purple and gold. A long
// lathed teardrop envelope with faint gores, a battened nose and mooring cone,
// four tail fins in a cross with violet rudders and elevators, and a sleek
// lofted gondola with a wrap-around windscreen, a tinted window band and a
// sliding door on its +x side. Two ducted propellers spin on pylons either
// side of the gondola, and a little step folds out under the door.

const axisY = blimpEnvelopeCentre;
export const blimpNoseZ = 11;
export const blimpTailZ = blimpNoseZ - blimpLength;
const widestShare = 0.38;

const paint = {
  pearl: new Color("#f8fafc"),
  pearlShade: new Color("#eceff6"),
  purple: new Color("#4c1d95"),
  violet: new Color("#6d28d9"),
  night: new Color("#1e1b4b"),
  gold: new Color("#f5c542"),
  glass: new Color("#2b4a75"),
  glassBand: new Color("#141233"),
  doorway: new Color("#0b0a1c"),
  roof: new Color("#e2e8f0"),
};

const clampShare = (value: number): number => Math.min(1, Math.max(0, value));
const ease = (value: number): number => {
  const share = clampShare(value);
  return share * share * (3 - 2 * share);
};

// --- Envelope -------------------------------------------------------------

export const findBlimpEnvelopeRadius = (z: number): number => {
  const share = (blimpNoseZ - z) / blimpLength;
  if (share <= 0 || share >= 1) {
    return 0;
  }
  if (share < widestShare) {
    const fromWidest = (widestShare - share) / widestShare;
    return blimpRadius * Math.sqrt(1 - fromWidest ** 2);
  }
  const toTail = (share - widestShare) / (1 - widestShare);
  return blimpRadius * (1 - toTail ** 1.8) ** 1.1;
};

const envelopeSegments = 72;
const envelopeStations = 90;
const battenShare = 0.06;
const tailConeShare = 0.962;
const envelopeEdges = [battenShare, battenShare + 0.006, tailConeShare];

const listEnvelopeShares = (): number[] =>
  [
    ...Array.from(
      { length: envelopeStations + 1 },
      (_, station) =>
        (1 - Math.cos((Math.PI * station) / envelopeStations)) / 2,
    ),
    ...envelopeEdges,
  ]
    .toSorted((first, second) => first - second)
    .filter(
      (share, index, sorted) =>
        index === 0 || share - sorted[index - 1] > 0.0015,
    );

const listEnvelopeProfile = (): Vector2[] =>
  listEnvelopeShares()
    .toReversed()
    .map((share) => {
      const z = blimpNoseZ - share * blimpLength;
      return new Vector2(Math.max(0.001, findBlimpEnvelopeRadius(z)), z);
    });

const segmentAngle = (Math.PI * 2) / envelopeSegments;

const paintEnvelope = ({
  x,
  y,
  z,
}: {
  x: number;
  y: number;
  z: number;
}): Color => {
  const share = (blimpNoseZ - z) / blimpLength;
  const angle = Math.atan2(y - axisY, x);
  const segment = Math.floor(
    (((angle / segmentAngle) % envelopeSegments) + envelopeSegments) %
      envelopeSegments,
  );
  if (share < 0.008) {
    return paint.gold;
  }
  if (share < battenShare) {
    return segment % 8 === 0 ? paint.violet : paint.pearl;
  }
  if (share < battenShare + 0.006) {
    return paint.gold;
  }
  if (share > tailConeShare) {
    return paint.purple;
  }
  const fromBelly =
    angle > Math.PI / 2 ? angle - (Math.PI * 3) / 2 : angle + Math.PI / 2;
  const belly = Math.floor(Math.abs(fromBelly) / segmentAngle);
  if (belly < 8) {
    return paint.violet;
  }
  if (belly === 8) {
    return paint.gold;
  }
  if (belly === 10) {
    return paint.purple;
  }
  return Math.floor(segment / 4) % 2 === 0 ? paint.pearl : paint.pearlShade;
};

const buildEnvelopeLathe = (phiStart = 0, phiLength = Math.PI * 2) =>
  new LatheGeometry(
    listEnvelopeProfile(),
    Math.round((envelopeSegments * phiLength) / (Math.PI * 2)),
    phiStart,
    phiLength,
  )
    .rotateX(Math.PI / 2)
    .translate(0, axisY, 0);

const buildEnvelopeGeometry = (): BufferGeometry =>
  paintFaces(buildEnvelopeLathe(), paintEnvelope);

// The lathe's φ = π/2 meridian lies along +x, so a quarter turn about it
// covers each flank where the name and crest are painted.
const buildEnvelopeFlanks = (): BufferGeometry =>
  mergeGeometries(
    [Math.PI / 4, (Math.PI * 5) / 4].map((start) =>
      buildEnvelopeLathe(start, Math.PI / 2).toNonIndexed(),
    ),
  );

const buildEnvelopeFittings = (): ModelPart[] => {
  const top = axisY + blimpRadius;
  return [
    {
      geometry: new ConeGeometry(0.46, 0.7, 40, 2).rotateX(Math.PI / 2),
      colour: "#f5c542",
      position: [0, axisY, blimpNoseZ - 0.02],
    },
    {
      geometry: new TorusGeometry(0.2, 0.05, 8, 24),
      colour: "#94a3b8",
      position: [0, axisY, blimpNoseZ + 0.42],
    },
    {
      geometry: new SphereGeometry(0.1, 12, 8),
      colour: "#fde68a",
      position: [0, axisY, blimpNoseZ + 0.44],
    },
    {
      geometry: new ConeGeometry(0.16, 0.5, 20).rotateX(-Math.PI / 2),
      colour: "#4c1d95",
      position: [0, axisY, blimpTailZ - 0.1],
    },
    {
      geometry: new SphereGeometry(0.09, 10, 8),
      colour: "#f8fafc",
      position: [0, axisY, blimpTailZ - 0.38],
    },
    {
      geometry: new CylinderGeometry(0.14, 0.18, 0.12, 16),
      colour: "#334155",
      position: [0, top + 0.02, 0.6],
    },
    {
      geometry: new SphereGeometry(0.13, 14, 10),
      colour: "#ef4444",
      position: [0, top + 0.12, 0.6],
    },
    {
      geometry: new BoxGeometry(0.04, 0.45, 0.24),
      colour: "#cbd5e1",
      position: [0, top + 0.18, -1.6],
      rotation: [-0.35, 0, 0],
    },
    {
      geometry: new CylinderGeometry(0.015, 0.025, 0.7, 6),
      colour: "#cbd5e1",
      position: [0, top + 0.32, -2.6],
      rotation: [-0.3, 0, 0],
    },
  ];
};

// --- Tail fins ------------------------------------------------------------

const finRoot = 0.35;
const finTip = 4.4;
const finRootLeadingEdge = -8.4;
const finSweep = 3;
const finRootChord = 5;
const finTipChord = 2.5;
const finHinge = 0.69;

const findFinShare = (reach: number): number =>
  (reach - finRoot) / (finTip - finRoot);
const findFinLeadingEdge = (reach: number): number =>
  finRootLeadingEdge - finSweep * findFinShare(reach);
const findFinChord = (reach: number): number =>
  finRootChord - (finRootChord - finTipChord) * findFinShare(reach);

const findAerofoilHalfThickness = (share: number): number =>
  5 *
  (0.2969 * Math.sqrt(share) -
    0.126 * share -
    0.3516 * share ** 2 +
    0.2843 * share ** 3 -
    0.1036 * share ** 4);

const finChordShares = [
  ...Array.from(
    { length: 19 },
    (_, station) => (1 - Math.cos((Math.PI * station) / 18)) / 2,
  ),
  0.03,
  finHinge - 0.015,
  finHinge + 0.005,
]
  .toSorted((first, second) => first - second)
  .filter(
    (share, index, sorted) => index === 0 || share - sorted[index - 1] > 0.004,
  );

const buildFinRing = (reach: number): Triple[] => {
  const leadingEdge = findFinLeadingEdge(reach);
  const chord = findFinChord(reach);
  const thickness = 0.1 - 0.025 * findFinShare(reach);
  const at = (share: number, side: number): Triple => [
    reach,
    side * thickness * chord * findAerofoilHalfThickness(share),
    leadingEdge - chord * share,
  ];
  return [
    ...finChordShares.toReversed().map((share) => at(share, 1)),
    ...finChordShares.slice(1, -1).map((share) => at(share, -1)),
  ];
};

const finReaches = [
  finRoot,
  ...Array.from({ length: 14 }, (_, step) => 1.2 + step * 0.22),
  4.12,
  4.18,
  4.3,
  finTip,
];

const paintFin = ({ x, z }: { x: number; z: number }): Color => {
  if (x > 4.15) {
    return paint.gold;
  }
  const share = (findFinLeadingEdge(x) - z) / findFinChord(x);
  if (share < 0.03) {
    return paint.gold;
  }
  if (share > finHinge - 0.015 && share < finHinge + 0.005) {
    return paint.night;
  }
  return share > finHinge ? paint.violet : paint.purple;
};

const finAngles = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2];

const buildFinGeometry = (angle: number): BufferGeometry =>
  buildPaintedLoft(finReaches.map(buildFinRing), paintFin)
    .rotateZ(angle)
    .translate(0, axisY, 0);

const buildFinLights = (): ModelPart[] => {
  const lightZ = findFinLeadingEdge(finTip) - finTipChord * 0.35;
  return [
    { colour: "#ef4444", x: 1, y: 0 },
    { colour: "#22c55e", x: -1, y: 0 },
    { colour: "#f8fafc", x: 0, y: 1 },
  ].map(({ colour, x, y }): ModelPart => ({
    geometry: new SphereGeometry(0.1, 12, 8),
    colour,
    position: [x * (finTip + 0.06), axisY + y * (finTip + 0.06), lightZ],
  }));
};

// --- Gondola ----------------------------------------------------------------

const gondolaNoseZ = blimpGondolaLength / 2;
const gondolaTailZ = -blimpGondolaLength / 2;
const gondolaBottom = 0.25;
const noseStart = 1.1;
const tailStart = -0.9;
const bottomCorner = 0.3;
const topCorner = 0.4;
const sideBottom = gondolaBottom + bottomCorner;
const sideTop = blimpGondolaTop - topCorner;
const sideHeights = [
  sideBottom,
  0.68,
  0.78,
  0.86,
  0.95,
  1.02,
  1.12,
  1.22,
  1.32,
  1.42,
  1.52,
  1.62,
  1.7,
  1.8,
  1.92,
  2.05,
  sideTop,
];

const stripeBottom = 0.78;
const stripeTop = 0.86;
const windowBottom = 1.02;
const windowTop = 1.62;
const windscreenTop = sideTop + 0.25;
const windscreenStart = 1.25;

export const blimpDoorway = {
  halfWidth: 0.33,
  top: blimpGondolaFloor + 1.18,
} as const;
const doorFront = blimpDoor.z + blimpDoorway.halfWidth;
const doorBack = blimpDoor.z - blimpDoorway.halfWidth;

interface GondolaRing {
  halfWidth: number;
  bottom: number;
  top: number;
  bottomCorner: number;
  topCorner: number;
}

const findGondolaRing = (z: number): GondolaRing => {
  const fitCorners = (
    ring: Omit<GondolaRing, "bottomCorner" | "topCorner">,
    bottom: number,
    top: number,
  ) => {
    const limit = Math.min(
      ring.halfWidth * 0.999,
      (ring.top - ring.bottom) * 0.48,
    );
    return {
      ...ring,
      bottomCorner: Math.min(bottom, limit),
      topCorner: Math.min(top, limit),
    };
  };
  if (z > noseStart) {
    const along = clampShare((z - noseStart) / (gondolaNoseZ - noseStart));
    const tip = 1.4;
    return fitCorners(
      {
        halfWidth: blimpGondolaHalfWidth * (1 - along ** 2.6) ** 0.5,
        bottom: tip - (tip - gondolaBottom) * (1 - along ** 1.8) ** 0.7,
        top: tip + (blimpGondolaTop - tip) * (1 - along ** 2.2) ** 0.6,
      },
      bottomCorner + 0.5 * along,
      topCorner + 0.7 * along,
    );
  }
  if (z < tailStart) {
    const along = clampShare((tailStart - z) / (tailStart - gondolaTailZ));
    const fill = Math.sqrt(1 - along ** 2);
    const tip = 1.95;
    return fitCorners(
      {
        halfWidth: blimpGondolaHalfWidth * fill ** 0.6,
        bottom: tip - (tip - gondolaBottom) * fill ** 0.5,
        top: tip + (blimpGondolaTop - tip) * fill ** 0.35,
      },
      bottomCorner + 0.4 * along,
      topCorner + 0.4 * along,
    );
  }
  return {
    halfWidth: blimpGondolaHalfWidth,
    bottom: gondolaBottom,
    top: blimpGondolaTop,
    bottomCorner,
    topCorner,
  };
};

const cornerSteps = 6;
const flatSteps = 4;

const buildGondolaRing = (z: number): Triple[] => {
  const ring = findGondolaRing(z);
  const width = ring.halfWidth;
  const low = ring.bottom + ring.bottomCorner;
  const high = ring.top - ring.topCorner;
  const half: [number, number][] = [
    ...Array.from({ length: flatSteps }, (_, step): [number, number] => [
      ((width - ring.bottomCorner) * step) / flatSteps,
      ring.bottom,
    ]),
    ...Array.from({ length: cornerSteps }, (_, step): [number, number] => {
      const angle = -Math.PI / 2 + ((Math.PI / 2) * step) / cornerSteps;
      return [
        width - ring.bottomCorner + ring.bottomCorner * Math.cos(angle),
        low + ring.bottomCorner * Math.sin(angle),
      ];
    }),
    ...sideHeights.map((height): [number, number] => [
      width,
      low + ((height - sideBottom) / (sideTop - sideBottom)) * (high - low),
    ]),
    ...Array.from({ length: cornerSteps }, (_, step): [number, number] => {
      const angle = ((Math.PI / 2) * (step + 1)) / cornerSteps;
      return [
        width - ring.topCorner + ring.topCorner * Math.cos(angle),
        high + ring.topCorner * Math.sin(angle),
      ];
    }),
    ...Array.from({ length: flatSteps }, (_, step): [number, number] => [
      (width - ring.topCorner) * (1 - (step + 1) / flatSteps),
      ring.top,
    ]),
  ];
  const right = half.map(([x, y]): Triple => [x, y, z]);
  const left = half
    .slice(1, -1)
    .toReversed()
    .map(([x, y]): Triple => [-x, y, z]);
  return [...right, ...left];
};

const paneLength = 0.5;
const panePitch = 0.62;
const firstPane = -2.1;
const paneCount = 6;
const panes = Array.from({ length: paneCount }, (_, pane) => {
  const back = firstPane + pane * panePitch;
  return { back, front: back + paneLength };
});

const isPane = (x: number, z: number): boolean =>
  panes.some(
    ({ back, front }) =>
      z > back &&
      z < front &&
      !(x > 0 && front > doorBack - 0.12 && back < doorFront + 0.12),
  );

const gondolaEdges = [
  ...panes.flatMap(({ back, front }) => [back, front]),
  doorBack - 0.04,
  doorBack,
  doorFront,
  doorFront + 0.04,
  windscreenStart - 0.07,
  windscreenStart,
];

const listGondolaStations = (): number[] => {
  const tip = Array.from(
    { length: 18 },
    (_, step) =>
      noseStart +
      (gondolaNoseZ - noseStart) * Math.sin((Math.PI / 2) * ((step + 1) / 18)),
  );
  const tail = Array.from(
    { length: 16 },
    (_, step) =>
      tailStart -
      (tailStart - gondolaTailZ) * Math.sin((Math.PI / 2) * ((step + 1) / 16)),
  );
  const middle = Array.from(
    { length: 31 },
    (_, step) => tailStart + ((noseStart - tailStart) * step) / 30,
  );
  return [...tail, ...middle, ...tip, ...gondolaEdges]
    .toSorted((first, second) => first - second)
    .filter((z, index, sorted) => index === 0 || z - sorted[index - 1] > 0.012);
};

const paintGondola = ({
  x,
  y,
  z,
}: {
  x: number;
  y: number;
  z: number;
}): Color => {
  const height = y;
  const isDoorway =
    x > 0.5 &&
    z > doorBack &&
    z < doorFront &&
    y > blimpGondolaFloor &&
    y < blimpDoorway.top;
  if (isDoorway) {
    return paint.doorway;
  }
  const isDoorFrame =
    x > 0.5 &&
    z > doorBack - 0.04 &&
    z < doorFront + 0.04 &&
    y > blimpGondolaFloor - 0.04 &&
    y < blimpDoorway.top + 0.06;
  if (isDoorFrame) {
    return paint.gold;
  }
  if (height < stripeBottom) {
    return paint.violet;
  }
  if (height < stripeTop) {
    return paint.gold;
  }
  if (
    z > windscreenStart - 0.07 &&
    z < windscreenStart &&
    height > windowBottom - 0.05
  ) {
    return height < windscreenTop ? paint.night : paint.pearl;
  }
  if (z > windscreenStart && height > windowBottom && height < windscreenTop) {
    return paint.glass;
  }
  if (height > windowBottom && height < windowTop && z > firstPane - 0.12) {
    return isPane(x, z) ? paint.glass : paint.glassBand;
  }
  if (height > windowTop && height < windowTop + 0.09) {
    return paint.violet;
  }
  return height > sideTop + 0.2 ? paint.roof : paint.pearl;
};

// Each face is painted by its row and station on the loft rather than by
// where it sits, so the window band and stripes follow the rows cleanly into
// the tapering nose and tail: a row is painted as its height amidships.
const buildGondolaGeometry = (): BufferGeometry => {
  const stations = listGondolaStations();
  const rings = stations.map(buildGondolaRing);
  const midship = buildGondolaRing(0);
  const around = midship.length;
  const flat = buildLoftGeometry(rings).toNonIndexed();
  const positions = flat.getAttribute("position");
  const sideCorners = (rings.length - 1) * around * 6;
  const colours = new Float32Array(positions.count * 3);
  for (let corner = 0; corner < positions.count; corner += 3) {
    const quad = Math.floor(corner / 6);
    const point = quad % around;
    const next = (point + 1) % around;
    const station = Math.floor(quad / around);
    const colour =
      corner < sideCorners
        ? paintGondola({
            x: (midship[point][0] + midship[next][0]) / 2,
            y: (midship[point][1] + midship[next][1]) / 2,
            z: (stations[station] + stations[station + 1]) / 2,
          })
        : paint.purple;
    for (let vertex = corner; vertex < corner + 3; vertex++) {
      colour.toArray(colours, vertex * 3);
    }
  }
  flat.setAttribute("color", new BufferAttribute(colours, 3));
  return flat;
};

const wheelZ = -0.45;
const wheelRadius = 0.21;

const buildGondolaFittings = (): ModelPart[] => [
  {
    geometry: new SphereGeometry(1, 40, 20),
    colour: "#e2e8f0",
    position: [0, blimpGondolaTop, -0.1],
    scale: [0.62, 0.72, 2.5],
  },
  {
    geometry: new TorusGeometry(wheelRadius - 0.065, 0.065, 10, 28).rotateY(
      Math.PI / 2,
    ),
    colour: "#1f2937",
    position: [0, wheelRadius, wheelZ],
  },
  {
    geometry: new CylinderGeometry(0.1, 0.1, 0.1, 18).rotateZ(Math.PI / 2),
    colour: "#f5c542",
    position: [0, wheelRadius, wheelZ],
  },
  ...[-1, 1].map((side): ModelPart => ({
    geometry: new BoxGeometry(0.04, 0.3, 0.12),
    colour: "#94a3b8",
    position: [side * 0.11, wheelRadius + 0.12, wheelZ],
  })),
  {
    geometry: new SphereGeometry(
      1,
      24,
      12,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2,
    ).rotateX(Math.PI),
    colour: "#4c1d95",
    position: [0, gondolaBottom + 0.16, wheelZ],
    scale: [0.2, 0.14, 0.42],
  },
  {
    geometry: new SphereGeometry(0.07, 10, 8),
    colour: "#ef4444",
    position: [0, gondolaBottom - 0.01, -1.8],
  },
  {
    geometry: new SphereGeometry(0.06, 10, 8),
    colour: "#f8fafc",
    position: [0, 1.4, gondolaNoseZ + 0.02],
  },
  {
    geometry: new CylinderGeometry(0.012, 0.022, 0.55, 6),
    colour: "#cbd5e1",
    position: [0.35, blimpGondolaTop + 0.12, -2.35],
    rotation: [-0.6, 0, 0],
  },
  {
    geometry: new BoxGeometry(0.03, 0.03, doorFront - doorBack + 0.9),
    colour: "#94a3b8",
    position: [
      blimpGondolaHalfWidth + 0.02,
      blimpGondolaFloor - 0.07,
      blimpDoor.z - 0.42,
    ],
  },
  {
    geometry: new BoxGeometry(0.03, 0.03, doorFront - doorBack + 0.9),
    colour: "#94a3b8",
    position: [
      blimpGondolaHalfWidth + 0.02,
      blimpDoorway.top + 0.09,
      blimpDoor.z - 0.42,
    ],
  },
];

// --- Ducted propellers ----------------------------------------------------

const ductReach = 2.72;
const ductHeight = 1.95;
const ductZ = -2.05;
const ductInner = 0.76;
const bladeReach = 0.72;
const propSides = [1, -1] as const;

const findDuctCentre = (side: number): Triple => [
  side * ductReach,
  ductHeight,
  ductZ,
];

const listDuctProfile = (): Vector2[] =>
  Array.from({ length: 28 }, (_, step) => {
    const angle = (step / 28) * Math.PI * 2;
    const thickness = 0.075 + 0.035 * Math.max(0, Math.sin(angle));
    return new Vector2(
      ductInner + 0.08 + thickness * Math.cos(angle),
      0.4 * Math.sin(angle),
    );
  });

const buildDuctGeometry = (side: number): BufferGeometry => {
  const [x, y, z] = findDuctCentre(side);
  const loop = listDuctProfile();
  const shroud = new LatheGeometry([...loop, loop[0]], 56)
    .rotateX(Math.PI / 2)
    .translate(x, y, z);
  return paintFaces(shroud, (centre) => {
    if (centre.z > z + 0.3) {
      return paint.gold;
    }
    if (centre.z < z - 0.35) {
      return paint.night;
    }
    return Math.hypot(centre.x - x, centre.y - y) > ductInner + 0.1
      ? paint.violet
      : paint.night;
  });
};

const buildPylonParts = (side: number): BufferGeometry => {
  const [x, y, z] = findDuctCentre(side);
  const pylon = buildAirfoilLoft([
    {
      leadingEdge: [side * 0.85, y, z + 0.55],
      chord: [0, 0, -1.05],
      thicknessAxis: [0, 1, 0],
      thickness: 0.14,
    },
    {
      leadingEdge: [side * (ductReach - ductInner - 0.02), y, z + 0.3],
      chord: [0, 0, -0.62],
      thicknessAxis: [0, 1, 0],
      thickness: 0.14,
    },
  ]);
  const stators = [0, 1, 2].map((stator): ModelPart => {
    const angle = Math.PI / 2 + (stator / 3) * Math.PI * 2;
    return {
      geometry: new BoxGeometry(ductInner, 0.05, 0.16),
      colour: "#334155",
      position: [
        x + Math.cos(angle) * ductInner * 0.5,
        y + Math.sin(angle) * ductInner * 0.5,
        z - 0.22,
      ],
      rotation: [0, 0, angle],
    };
  });
  const nacelle: ModelPart[] = [
    {
      geometry: new CylinderGeometry(0.17, 0.17, 0.42, 20).rotateX(Math.PI / 2),
      colour: "#1e1b4b",
      position: [x, y, z - 0.2],
    },
    {
      geometry: new ConeGeometry(0.17, 0.3, 20).rotateX(-Math.PI / 2),
      colour: "#4c1d95",
      position: [x, y, z - 0.56],
    },
  ];
  return mergeGeometries([
    paintAll(pylon, "#e2e8f0"),
    buildModelGeometry([...stators, ...nacelle]),
  ]);
};

const bladeCount = 5;

const buildPropellerGeometry = (side: number): BufferGeometry => {
  const [x, y, z] = findDuctCentre(side);
  const blades = Array.from({ length: bladeCount }, (_, blade): ModelPart[] => {
    const angle = (blade / bladeCount) * Math.PI * 2;
    const place = (geometry: BufferGeometry, out: number) =>
      geometry
        .rotateX(0.5 * side)
        .translate(out, 0, 0)
        .rotateZ(angle)
        .translate(x, y, z);
    return [
      {
        geometry: place(
          new BoxGeometry(bladeReach - 0.24, 0.15, 0.025),
          0.12 + (bladeReach - 0.24) / 2,
        ),
        colour: "#e2e8f0",
      },
      {
        geometry: place(new BoxGeometry(0.12, 0.15, 0.03), bladeReach - 0.06),
        colour: "#f5c542",
      },
    ];
  }).flat();
  return buildModelGeometry([
    ...blades,
    {
      geometry: new SphereGeometry(0.18, 18, 10),
      colour: "#f5c542",
      position: [x, y, z + 0.04],
      scale: [1, 1, 1.5],
    },
  ]);
};

const placePropeller = (side: number, turn: number): Matrix4 => {
  const [x, y, z] = findDuctCentre(side);
  return new Matrix4()
    .makeTranslation(x, y, z)
    .multiply(new Matrix4().makeRotationZ(side * turn * 1.1))
    .multiply(new Matrix4().makeTranslation(-x, -y, -z));
};

// --- Body -------------------------------------------------------------------

export const buildBlimpGeometry = (): BufferGeometry =>
  mergeGeometries([
    buildEnvelopeGeometry(),
    ...finAngles.map(buildFinGeometry),
    buildGondolaGeometry(),
    ...propSides.flatMap((side) => [
      buildDuctGeometry(side),
      buildPylonParts(side),
    ]),
    buildModelGeometry([
      ...buildEnvelopeFittings(),
      ...buildFinLights(),
      ...buildGondolaFittings(),
    ]),
  ]);

// --- Livery -----------------------------------------------------------------

const envelopeDecals: LiveryDecal[] = (
  [
    {
      face: "name",
      centre: [blimpRadius, axisY + 0.1, -1.3],
      outward: [1, 0, 0],
      up: [0, 1, 0],
      width: 13,
      height: 2.6,
    },
    {
      face: "flag",
      centre: [blimpRadius, axisY + 0.1, 7.3],
      outward: [1, 0, 0],
      up: [0, 1, 0],
      width: 3.4,
      height: 1.7,
    },
  ] satisfies LiveryDecal[]
).flatMap(onBothSides);

const finCrestReach = 2.7;
const finDecals: LiveryDecal[] = onBothSides({
  face: "flag",
  centre: [0, axisY + finCrestReach, -11.55],
  outward: [1, 0, 0],
  up: [0, 1, 0],
  width: 1.7,
  height: 0.85,
});

const gondolaDecals: LiveryDecal[] = onBothSides({
  face: "name",
  centre: [blimpGondolaHalfWidth, 2.17, -0.5],
  outward: [1, 0, 0],
  up: [0, 1, 0],
  width: 2.2,
  height: 0.37,
});

export const buildBlimpLiveryGeometry = (): BufferGeometry =>
  buildLiveryGeometry([
    { surface: buildEnvelopeFlanks(), decals: envelopeDecals },
    { surface: buildFinGeometry(Math.PI / 2), decals: finDecals },
    { surface: buildGondolaGeometry(), decals: gondolaDecals },
  ]);

// --- Moving parts -----------------------------------------------------------

const doorThickness = 0.04;
const doorSlide = blimpDoorway.halfWidth * 2 + 0.12;
const doorOut = 0.09;

const buildDoorGeometry = (): BufferGeometry => {
  const width = blimpDoorway.halfWidth * 2;
  const x = blimpGondolaHalfWidth + doorThickness / 2 + 0.005;
  const bands: [number, number, string][] = [
    [blimpGondolaFloor, stripeBottom, "#6d28d9"],
    [stripeBottom, stripeTop, "#f5c542"],
    [stripeTop, blimpDoorway.top, "#f8fafc"],
  ];
  return buildModelGeometry([
    ...bands.map(([bottom, top, colour]): ModelPart => ({
      geometry: new BoxGeometry(doorThickness, top - bottom, width),
      colour,
      position: [x, (bottom + top) / 2, blimpDoor.z],
    })),
    {
      geometry: new BoxGeometry(0.02, 0.46, width - 0.2),
      colour: "#2b4a75",
      position: [x + doorThickness / 2, 1.33, blimpDoor.z],
    },
    {
      geometry: new BoxGeometry(0.04, 0.05, 0.2),
      colour: "#f5c542",
      position: [x + doorThickness / 2 + 0.02, 1.0, blimpDoor.z + 0.16],
    },
  ]);
};

const placeDoor = (opening: number): Matrix4 =>
  new Matrix4().makeTranslation(
    doorOut * ease(opening / 0.15),
    0,
    -doorSlide * ease((opening - 0.12) / 0.45),
  );

const stepHinge: Triple = [blimpDoor.x, blimpDoor.y, blimpDoor.z];
const stepSlope = Math.atan2(blimpDoor.y, blimpStepRun);
const stepHalfWidth = blimpDoorway.halfWidth;

const buildStepGeometry = (): BufferGeometry => {
  const [hingeX, hingeY, hingeZ] = stepHinge;
  const length = Math.hypot(blimpStepRun, hingeY);
  const treads = [1, 2].map((tread): ModelPart => {
    const share = tread / 3;
    return {
      geometry: new BoxGeometry(
        blimpStepRun / 3 + 0.02,
        0.05,
        stepHalfWidth * 2 - 0.04,
      ),
      colour: "#cbd5e1",
      position: [
        hingeX + blimpStepRun * share,
        hingeY * (1 - share) - 0.025,
        hingeZ,
      ],
    };
  });
  const pad: ModelPart = {
    geometry: new BoxGeometry(0.3, 0.04, stepHalfWidth * 2),
    colour: "#334155",
    position: [hingeX + blimpStepRun - 0.12, 0.02, hingeZ],
  };
  const stringers = [-1, 1].map((side): ModelPart => ({
    geometry: new BoxGeometry(length, 0.12, 0.04),
    colour: "#4c1d95",
    position: [
      hingeX + blimpStepRun / 2,
      hingeY / 2 + 0.03,
      hingeZ + side * stepHalfWidth,
    ],
    rotation: [0, 0, -stepSlope],
  }));
  const postX = hingeX + blimpStepRun - 0.12;
  const posts = [-1, 1].map((side): ModelPart => ({
    geometry: new CylinderGeometry(0.022, 0.022, 0.62, 8),
    colour: "#e2e8f0",
    position: [postX, 0.33, hingeZ + side * stepHalfWidth],
  }));
  const railRun = postX - hingeX - 0.08;
  const rails = [-1, 1].map((side): ModelPart => ({
    geometry: new CylinderGeometry(0.025, 0.025, Math.hypot(railRun, 0.38), 8),
    colour: "#f5c542",
    position: [
      hingeX + 0.08 + railRun / 2,
      0.64 + 0.19,
      hingeZ + side * stepHalfWidth,
    ],
    rotation: [0, 0, Math.PI / 2 - Math.atan2(0.38, railRun)],
  }));
  return buildModelGeometry([...treads, pad, ...stringers, ...posts, ...rails]);
};

const placeStep = (opening: number): Matrix4 => {
  const stowed = 1 - ease((opening - 0.55) / 0.2);
  const folded = 1 - ease((opening - 0.72) / 0.28);
  const [hingeX, hingeY, hingeZ] = stepHinge;
  return new Matrix4()
    .makeTranslation(-(blimpStepRun + 0.2) * stowed, -0.12 * stowed, 0)
    .multiply(new Matrix4().makeTranslation(hingeX, hingeY, hingeZ))
    .multiply(new Matrix4().makeRotationZ(stepSlope * folded))
    .multiply(new Matrix4().makeTranslation(-hingeX, -hingeY, -hingeZ));
};

// Moving parts, in order: the sliding door, the +x (port) propeller, the -x
// (starboard) propeller and the fold-out boarding step.
export const buildBlimpMovingPartsGeometry = (): BufferGeometry[] => [
  buildDoorGeometry(),
  ...propSides.map(buildPropellerGeometry),
  buildStepGeometry(),
];

export const placeBlimpMovingParts = (
  opening: number,
  turn: number,
): Matrix4[] => [
  placeDoor(opening),
  ...propSides.map((side) => placePropeller(side, turn)),
  placeStep(opening),
];
