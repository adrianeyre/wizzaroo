import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  OctahedronGeometry,
  RingGeometry,
  SphereGeometry,
  type BufferGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { buildModelGeometry, type ModelPart } from "../world-map-models.js";
import {
  balloonFieldFlatRadius,
  helipadFlatRadius,
  runwayHalfLength,
  type BalloonField,
  type Helipad,
  type Runway,
} from "../world-map-terrain.js";
import { exploreScale, type IslandAdventure } from "./island-adventures.js";
import { aeroplaneWingspan } from "./island-flight.js";

const pavedHalfWidth = 4.8;
const surfaceLift = 0.06;
const markingLift = surfaceLift + 0.01;
const markingWhite = "#f1f5f9";
const slabDepth = 0.6;

const marking = (
  width: number,
  length: number,
  x: number,
  z: number,
  colour = markingWhite,
): ModelPart => ({
  geometry: new BoxGeometry(width, 0.02, length),
  colour,
  position: [x, markingLift, z],
});

type Segment = "a" | "b" | "c" | "d" | "e" | "f" | "g";

const digitSegments: readonly (readonly Segment[])[] = [
  ["a", "b", "c", "d", "e", "f"],
  ["b", "c"],
  ["a", "b", "d", "e", "g"],
  ["a", "b", "c", "d", "g"],
  ["b", "c", "f", "g"],
  ["a", "c", "d", "f", "g"],
  ["a", "c", "d", "e", "f", "g"],
  ["a", "b", "c"],
  ["a", "b", "c", "d", "e", "f", "g"],
  ["a", "b", "c", "d", "f", "g"],
];

const digitHeight = 4;
const digitWidth = 2.2;
const stroke = 0.4;

const buildDigitParts = (
  digit: number,
  across: number,
  along: number,
  facing: number,
): ModelPart[] => {
  const half = digitHeight / 2;
  const sideways = digitWidth / 2 - stroke / 2;
  const segments: Record<Segment, [number, number, number, number]> = {
    a: [0, half - stroke / 2, digitWidth, stroke],
    d: [0, -half + stroke / 2, digitWidth, stroke],
    g: [0, 0, digitWidth, stroke],
    b: [sideways, half / 2, stroke, half],
    c: [sideways, -half / 2, stroke, half],
    f: [-sideways, half / 2, stroke, half],
    e: [-sideways, -half / 2, stroke, half],
  };
  return digitSegments[digit].map((segment) => {
    const [right, up, width, height] = segments[segment];
    return marking(
      width,
      height,
      -facing * (across + right),
      along + facing * up,
    );
  });
};

export const findRunwayNumber = (heading: number): number => {
  const bearing =
    (Math.atan2(Math.sin(heading), -Math.cos(heading)) * 180) / Math.PI;
  const tens = Math.round((bearing + 360) / 10) % 36;
  return tens === 0 ? 36 : tens;
};

const buildRunwayNumberParts = (
  number: number,
  along: number,
  facing: number,
): ModelPart[] =>
  [Math.floor(number / 10), number % 10].flatMap((digit, index) =>
    buildDigitParts(digit, (index - 0.5) * (digitWidth + 0.9), along, facing),
  );

const edgeLightSpacing = 7.5;

const buildRunwayLightParts = (halfLength: number): ModelPart[] => {
  const edgeCount = Math.floor((halfLength * 2) / edgeLightSpacing) + 1;
  const light = (colour: string, x: number, z: number): ModelPart[] => [
    {
      geometry: new CylinderGeometry(0.06, 0.08, 0.32, 5),
      colour: "#374151",
      position: [x, surfaceLift + 0.16, z],
    },
    {
      geometry: new OctahedronGeometry(0.13),
      colour,
      position: [x, surfaceLift + 0.38, z],
    },
  ];
  const edges = [1, -1].flatMap((side) =>
    Array.from({ length: edgeCount }, (_, index) =>
      light(
        "#fefce8",
        side * (pavedHalfWidth + 0.35),
        -halfLength + index * edgeLightSpacing,
      ),
    ).flat(),
  );
  const ends = [-1, 1].flatMap((end) =>
    Array.from({ length: 8 }, (_, index) =>
      light(
        end < 0 ? "#22c55e" : "#ef4444",
        -pavedHalfWidth + 0.6 + index * ((pavedHalfWidth * 2 - 1.2) / 7),
        end * (halfLength + 0.5),
      ),
    ).flat(),
  );
  return [...edges, ...ends];
};

const buildPapiParts = (halfLength: number): ModelPart[] =>
  ["#f8fafc", "#f8fafc", "#ef4444", "#ef4444"].flatMap(
    (colour, index): ModelPart[] => [
      {
        geometry: new BoxGeometry(0.9, 0.5, 0.5),
        colour: "#d1d5db",
        position: [
          pavedHalfWidth + 2 + index * 1.2,
          surfaceLift + 0.35,
          -halfLength + 16,
        ],
      },
      {
        geometry: new BoxGeometry(0.7, 0.3, 0.06),
        colour,
        position: [
          pavedHalfWidth + 2 + index * 1.2,
          surfaceLift + 0.4,
          -halfLength + 15.73,
        ],
      },
    ],
  );

const buildWindsockParts = ([x, z]: [number, number]): ModelPart[] => [
  {
    geometry: new CylinderGeometry(0.07, 0.1, 4.8, 6),
    colour: "#e5e7eb",
    position: [x, 0.8, z],
  },
  ...[0, 1, 2, 3].map((band): ModelPart => ({
    geometry: new CylinderGeometry(
      0.34 - band * 0.05,
      0.29 - band * 0.05,
      0.55,
      12,
    ),
    colour: band % 2 === 0 ? "#f97316" : "#f8fafc",
    position: [x + 0.35 + band * 0.55, 3, z],
    rotation: [0, 0, Math.PI / 2],
  })),
];

const towerAcross = -(aeroplaneWingspan / 2 + 4);

const buildControlTowerParts = (along: number): ModelPart[] => [
  {
    geometry: new CylinderGeometry(0.9, 1.15, 12, 12),
    colour: "#e5e7eb",
    position: [towerAcross, 1, along],
  },
  {
    geometry: new CylinderGeometry(1.75, 1.35, 0.5, 8),
    colour: "#cbd5e1",
    position: [towerAcross, 7.25, along],
  },
  {
    geometry: new CylinderGeometry(1.7, 1.55, 1.6, 8),
    colour: "#1e3a5f",
    position: [towerAcross, 8.3, along],
  },
  {
    geometry: new CylinderGeometry(1.95, 1.8, 0.35, 8),
    colour: "#f8fafc",
    position: [towerAcross, 9.25, along],
  },
  {
    geometry: new CylinderGeometry(0.05, 0.05, 1.6, 5),
    colour: "#6b7280",
    position: [towerAcross, 10.2, along],
  },
  {
    geometry: new OctahedronGeometry(0.14),
    colour: "#ef4444",
    position: [towerAcross, 11.05, along],
  },
];

const buildRunwayParts = ({ heading }: Runway): ModelPart[] => {
  const halfLength = runwayHalfLength * exploreScale;
  const dashes = Array.from(
    { length: Math.floor((halfLength * 2 - 32) / 6) + 1 },
    (_, index) => marking(0.32, 3.2, 0, -halfLength + 16 + index * 6),
  );
  const thresholdBars = [-1, 1].flatMap((end) =>
    [1, -1].flatMap((side) =>
      Array.from({ length: 4 }, (_, bar) =>
        marking(
          0.42,
          5.5,
          side * (0.95 + bar * 0.85),
          end * (halfLength - 3.9),
        ),
      ),
    ),
  );
  const aimingPoints = [-1, 1].flatMap((end) =>
    [1, -1].map((side) => marking(1, 6, side * 2, end * (halfLength - 22))),
  );
  const touchdownZones = [-1, 1].flatMap((end) =>
    [1, -1].flatMap((side) =>
      [0, 1].map((stripe) =>
        marking(0.3, 3, side * (1.6 + stripe * 0.6), end * (halfLength - 30)),
      ),
    ),
  );
  return [
    {
      geometry: new BoxGeometry(pavedHalfWidth * 2, slabDepth, halfLength * 2),
      colour: "#3b4045",
      position: [0, surfaceLift - slabDepth / 2, 0],
    },
    {
      geometry: new BoxGeometry(
        pavedHalfWidth * 2 + 1.2,
        slabDepth,
        halfLength * 2 + 1.2,
      ),
      colour: "#6b6f74",
      position: [0, surfaceLift - slabDepth / 2 - 0.02, 0],
    },
    ...[1, -1].map((side) =>
      marking(0.3, halfLength * 2 - 1, side * (pavedHalfWidth - 0.45), 0),
    ),
    ...dashes,
    ...thresholdBars,
    ...aimingPoints,
    ...touchdownZones,
    ...buildRunwayNumberParts(findRunwayNumber(heading), -halfLength + 12, 1),
    ...buildRunwayNumberParts(
      findRunwayNumber(heading + Math.PI),
      halfLength - 12,
      -1,
    ),
    ...buildRunwayLightParts(halfLength),
    ...buildPapiParts(halfLength),
    ...buildWindsockParts([-(pavedHalfWidth + 8), -halfLength + 8]),
    ...buildControlTowerParts(14),
  ];
};

const padRadius = 7;

const flatRing = (inner: number, outer: number, colour: string): ModelPart => ({
  geometry: new RingGeometry(inner, outer, 48),
  colour,
  position: [0, markingLift + 0.005, 0],
  rotation: [-Math.PI / 2, 0, 0],
});

const buildHelipadParts = (): ModelPart[] => [
  {
    geometry: new CylinderGeometry(padRadius, padRadius + 0.3, slabDepth, 48),
    colour: "#4b5563",
    position: [0, surfaceLift - slabDepth / 2, 0],
  },
  flatRing(padRadius - 0.65, padRadius - 0.35, markingWhite),
  flatRing(3.9, 4.35, "#facc15"),
  marking(0.6, 3.6, 1.15, 0),
  marking(0.6, 3.6, -1.15, 0),
  marking(1.7, 0.6, 0, 0),
  ...Array.from({ length: 12 }, (_, index): ModelPart[] => {
    const angle = (index / 12) * Math.PI * 2;
    const x = Math.cos(angle) * (padRadius + 0.5);
    const z = Math.sin(angle) * (padRadius + 0.5);
    return [
      {
        geometry: new CylinderGeometry(0.07, 0.09, 0.3, 5),
        colour: "#374151",
        position: [x, surfaceLift + 0.15, z],
      },
      {
        geometry: new OctahedronGeometry(0.14),
        colour: "#22c55e",
        position: [x, surfaceLift + 0.36, z],
      },
    ];
  }).flat(),
  ...buildWindsockParts([-(helipadFlatRadius * exploreScale - 1.5), -3]),
];

export const balloonFieldRadius = 8;
const balloonFieldGreens = ["#5f8a32", "#76a33f"] as const;
const pennantReach = balloonFieldRadius + 0.6;
const pennantColours = ["#5b34d6", "#facc15"] as const;

const flatRingAt = (
  inner: number,
  outer: number,
  colour: string,
  lift: number,
): ModelPart => ({
  ...flatRing(inner, outer, colour),
  position: [0, markingLift + lift, 0],
});

const landingCrossArm = (
  angle: number,
  width: number,
  colour: string,
  lift: number,
): ModelPart => ({
  geometry: new BoxGeometry(width, 0.02, 7.2 - (0.9 - width)),
  colour,
  position: [0, markingLift + lift, 0],
  rotation: [0, angle, 0],
});

const buildPennantParts = (index: number): ModelPart[] => {
  const angle = (index / 8) * Math.PI * 2 + Math.PI / 8;
  const x = Math.cos(angle) * pennantReach;
  const z = Math.sin(angle) * pennantReach;
  return [
    {
      geometry: new CylinderGeometry(0.05, 0.07, 2.4, 6),
      colour: "#f8fafc",
      position: [x, surfaceLift + 1.2, z],
    },
    {
      geometry: new ConeGeometry(0.32, 1, 3),
      colour: pennantColours[index % 2],
      position: [
        x + 0.5 * Math.cos(angle + Math.PI / 2),
        surfaceLift + 2.05,
        z + 0.5 * Math.sin(angle + Math.PI / 2),
      ],
      rotation: [0, Math.PI / 2 - angle, Math.PI / 2],
      scale: [1, 1, 0.12],
    },
    {
      geometry: new SphereGeometry(0.1, 8, 6),
      colour: "#facc15",
      position: [x, surfaceLift + 2.45, z],
    },
  ];
};

const buildBalloonFieldParts = (): ModelPart[] => [
  {
    geometry: new CylinderGeometry(
      balloonFieldRadius,
      balloonFieldRadius + 0.3,
      slabDepth,
      56,
    ),
    colour: balloonFieldGreens[0],
    position: [0, surfaceLift - slabDepth / 2, 0],
  },
  ...Array.from({ length: 7 }, (_, band) =>
    flatRingAt(band + 0.2, band + 0.7, balloonFieldGreens[1], -0.004),
  ),
  flatRingAt(
    balloonFieldRadius - 0.65,
    balloonFieldRadius - 0.3,
    markingWhite,
    0,
  ),
  flatRingAt(4.9, 5.4, "#facc15", 0),
  landingCrossArm(Math.PI / 4, 1.1, markingWhite, 0),
  landingCrossArm(-Math.PI / 4, 1.1, markingWhite, 0),
  landingCrossArm(Math.PI / 4, 0.8, "#dc2626", 0.004),
  landingCrossArm(-Math.PI / 4, 0.8, "#dc2626", 0.008),
  {
    geometry: new CylinderGeometry(0.55, 0.55, 0.02, 24),
    colour: "#facc15",
    position: [0, markingLift + 0.012, 0],
  },
  ...Array.from({ length: 8 }, (_, index) => buildPennantParts(index)).flat(),
  ...buildWindsockParts([-(balloonFieldFlatRadius * exploreScale - 1.5), -3]),
];

const placeOnStrip = (
  geometry: BufferGeometry,
  { centre, heading, level }: Runway | Helipad | BalloonField,
): BufferGeometry =>
  geometry.rotateY(heading).translate(centre.x, level, centre.z);

export const buildAirfieldGeometry = ({
  airfield,
}: IslandAdventure): BufferGeometry =>
  mergeGeometries([
    placeOnStrip(
      buildModelGeometry(buildRunwayParts(airfield.runway)),
      airfield.runway,
    ),
    placeOnStrip(buildModelGeometry(buildHelipadParts()), airfield.helipad),
    placeOnStrip(
      buildModelGeometry(buildBalloonFieldParts()),
      airfield.balloonField,
    ),
  ]);
