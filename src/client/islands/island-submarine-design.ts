import {
  BoxGeometry,
  Color,
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
  buildAirfoilLoft,
  buildPaintedLoft,
  paintAll,
  paintFaces,
} from "./island-lofts.js";
import { buildLiveryGeometry, onBothSides } from "./island-livery.js";
import {
  subBrowLength,
  subBrowZ,
  subDeckHalfWidth,
  subDeckHeight,
  subHatch,
  subHullRadius,
  subLength,
} from "./island-sea-craft.js";

const subBow = subLength / 2;
const subStern = -subLength / 2;
const noseStart = 5.6;
const tailStart = -3.6;
const tailRadius = 0.16;
const hullAround = 44;
const waterline = 0.02;

const paint = {
  hull: new Color("#2a2346"),
  hullLight: new Color("#3a3160"),
  antifouling: new Color("#8b1e1e"),
  bootTop: new Color("#f5c542"),
  marks: new Color("#f8fafc"),
  limber: new Color("#0b0a14"),
  deck: new Color("#3f3f52"),
  deckTile: new Color("#4a4a60"),
  glass: new Color("#0f172a"),
  bronze: new Color("#b7791f"),
};

const findHullRadius = (z: number): number => {
  if (z > noseStart) {
    const towardsNose = (z - noseStart) / (subBow - noseStart);
    return subHullRadius * Math.max(0, 1 - towardsNose ** 2.2) ** 0.5;
  }
  if (z < tailStart) {
    const towardsTail = (tailStart - z) / (tailStart - subStern);
    return (
      tailRadius +
      (subHullRadius - tailRadius) * (1 - towardsTail ** 1.7) ** 1.1
    );
  }
  return subHullRadius;
};

const hullStations = [
  ...Array.from(
    { length: 16 },
    (_, station) => subStern + (tailStart - subStern) * (station / 15),
  ).slice(0, -1),
  ...Array.from(
    { length: 10 },
    (_, station) => tailStart + (noseStart - tailStart) * (station / 9),
  ).slice(0, -1),
  ...Array.from({ length: 16 }, (_, station) => {
    const share = station / 15;
    return noseStart + (subBow - 0.02 - noseStart) * (1 - (1 - share) ** 1.6);
  }),
];

const buildHullRing = (z: number): Triple[] => {
  const radius = Math.max(0.02, findHullRadius(z));
  return Array.from({ length: hullAround }, (_, point): Triple => {
    const angle = (point / hullAround) * Math.PI * 2;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius, z];
  });
};

const isDraughtMark = (y: number, z: number): boolean =>
  [subBow - 1.9, subStern + 2.4].some(
    (markZ) =>
      Math.abs(z - markZ) < 0.06 &&
      y < waterline - 0.1 &&
      y > -0.9 &&
      Math.round((y + 1) * 5) % 2 === 0,
  );

const paintHull = ({ x, y, z }: { x: number; y: number; z: number }) => {
  if (isDraughtMark(y, z)) {
    return paint.marks;
  }
  if (y < waterline - 0.08) {
    return paint.antifouling;
  }
  if (y < waterline + 0.06) {
    return paint.bootTop;
  }
  const isLimberRow = y > 0.88 && y < 1.02 && z > -5.5 && z < 5.2;
  if (isLimberRow) {
    const slot = (((z + 5.5) % 0.62) + 0.62) % 0.62;
    if (slot < 0.28) {
      return paint.limber;
    }
  }
  return Math.abs(x) < 0.3 ? paint.hullLight : paint.hull;
};

const buildHullGeometry = (): BufferGeometry =>
  buildPaintedLoft(hullStations.map(buildHullRing), paintHull);

const casingFront = 6.9;
const casingBack = -6.4;
const casingBottom = 0.8;
const casingTop = subDeckHeight + 0.03;

const findCasingHalfWidth = (z: number): number =>
  subDeckHalfWidth *
  (1 -
    0.75 * smoothStep(casingFront - 1.4, casingFront, z) ** 1.5 -
    0.75 * smoothStep(casingBack + 1.4, casingBack, z) ** 1.5);

const buildCasingRing = (z: number): Triple[] => {
  const halfWidth = findCasingHalfWidth(z);
  return Array.from({ length: 24 }, (_, point): Triple => {
    const angle = (point / 24) * Math.PI * 2;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const across = Math.sign(cosine) * Math.abs(cosine) ** 0.4 * halfWidth;
    const up = Math.sign(sine) * Math.abs(sine) ** 0.4;
    return [
      across,
      (casingBottom + casingTop) / 2 + (up * (casingTop - casingBottom)) / 2,
      z,
    ];
  });
};

const buildCasingGeometry = (): BufferGeometry =>
  buildPaintedLoft(
    Array.from(
      { length: 30 },
      (_, station) => casingBack + (casingFront - casingBack) * (station / 29),
    ).map(buildCasingRing),
    ({ y, z }) =>
      y > casingTop - 0.03
        ? Math.floor((z - casingBack) / 0.45) % 2 === 0
          ? paint.deck
          : paint.deckTile
        : paint.hull,
  );

const sailFront = 4.9;
const sailChord = 3.6;
const sailBase = 1.05;
const sailTop = 3.95;
const sailRake = 0.35;

const buildSailGeometry = (): BufferGeometry =>
  paintFaces(
    buildAirfoilLoft([
      {
        leadingEdge: [0, sailBase, sailFront],
        chord: [0, 0, -sailChord],
        thicknessAxis: [1, 0, 0],
        thickness: 0.3,
      },
      {
        leadingEdge: [0, (sailBase + sailTop) / 2, sailFront - sailRake / 2],
        chord: [0, 0, -sailChord + 0.1],
        thicknessAxis: [1, 0, 0],
        thickness: 0.29,
      },
      {
        leadingEdge: [0, sailTop, sailFront - sailRake],
        chord: [0, 0, -sailChord + 0.2],
        thicknessAxis: [1, 0, 0],
        thickness: 0.27,
      },
    ]),
    ({ y, z }) => {
      if (y > sailTop - 0.32 && y < sailTop - 0.08 && z > sailFront - 1.4) {
        return paint.glass;
      }
      return y > sailTop - 0.04 ? paint.hullLight : paint.hull;
    },
  );

const buildPlaneGeometry = (): BufferGeometry =>
  paintAll(
    mergeGeometries([
      ...[1, -1].map((side) =>
        buildAirfoilLoft([
          {
            leadingEdge: [side * 0.42, 3.05, sailFront - 0.9],
            chord: [0, 0, -1.15],
            thicknessAxis: [0, 1, 0],
            thickness: 0.14,
          },
          {
            leadingEdge: [side * 2, 3.05, sailFront - 1.05],
            chord: [0, 0, -0.85],
            thicknessAxis: [0, 1, 0],
            thickness: 0.12,
          },
        ]),
      ),
      ...[0, 1, 2, 3].map((fin) => {
        const angle = (fin * Math.PI) / 2;
        const out: Triple = [Math.cos(angle), Math.sin(angle), 0];
        const root = 0.38;
        const tip = 1.75;
        return buildAirfoilLoft([
          {
            leadingEdge: [out[0] * root, out[1] * root, -6.9],
            chord: [0, 0, -1.25],
            thicknessAxis: [-out[1], out[0], 0],
            thickness: 0.13,
          },
          {
            leadingEdge: [out[0] * tip, out[1] * tip, -7.35],
            chord: [0, 0, -0.8],
            thicknessAxis: [-out[1], out[0], 0],
            thickness: 0.11,
          },
        ]);
      }),
    ]),
    "#2a2346",
  );

const buildFittingParts = (): ModelPart[] => {
  const mastTop = sailTop;
  const masts: ModelPart[] = [
    {
      geometry: new CylinderGeometry(0.09, 0.1, 1.5, 10),
      colour: "#4b5563",
      position: [0, mastTop + 0.75, sailFront - 1.15],
    },
    {
      geometry: new BoxGeometry(0.16, 0.22, 0.28),
      colour: "#1f2937",
      position: [0, mastTop + 1.55, sailFront - 1.12],
    },
    {
      geometry: new CylinderGeometry(0.11, 0.11, 1.1, 10),
      colour: "#4b5563",
      position: [0, mastTop + 0.55, sailFront - 1.75],
    },
    {
      geometry: new SphereGeometry(0.14, 10, 6),
      colour: "#e5e7eb",
      position: [0, mastTop + 1.15, sailFront - 1.75],
    },
    {
      geometry: new CylinderGeometry(0.07, 0.07, 0.8, 8),
      colour: "#4b5563",
      position: [0, mastTop + 0.4, sailFront - 2.35],
    },
    {
      geometry: new BoxGeometry(0.06, 0.28, 0.7),
      colour: "#e5e7eb",
      position: [0, mastTop + 0.9, sailFront - 2.35],
    },
  ];
  const lights: ModelPart[] = [
    {
      geometry: new SphereGeometry(0.08, 8, 6),
      colour: "#ef4444",
      position: [-0.48, sailTop - 0.6, sailFront - 0.95],
    },
    {
      geometry: new SphereGeometry(0.08, 8, 6),
      colour: "#22c55e",
      position: [0.48, sailTop - 0.6, sailFront - 0.95],
    },
    {
      geometry: new SphereGeometry(0.09, 8, 6),
      colour: "#fef9c3",
      position: [0, sailTop + 0.05, sailFront - 0.5],
    },
  ];
  const hatches: ModelPart[] = [subHatch.z, 5.8].map((z): ModelPart => ({
    geometry: new TorusGeometry(0.42, 0.07, 8, 24),
    colour: "#6b7280",
    position: [0, casingTop + 0.02, z],
    rotation: [Math.PI / 2, 0, 0],
  }));
  const forwardLid: ModelPart = {
    geometry: new CylinderGeometry(0.4, 0.42, 0.08, 20),
    colour: "#4b5563",
    position: [0, casingTop + 0.05, 5.8],
  };
  const cleats: ModelPart[] = [-5.2, -4, 6.3].flatMap((z) =>
    [-1, 1].map((side): ModelPart => ({
      geometry: new BoxGeometry(0.09, 0.12, 0.42),
      colour: "#9ca3af",
      position: [side * (subDeckHalfWidth - 0.12), casingTop + 0.06, z],
    })),
  );
  const shaft: ModelPart = {
    geometry: new CylinderGeometry(0.12, 0.18, 0.5, 12),
    colour: "#6b7280",
    position: [0, 0, subStern - 0.12],
    rotation: [Math.PI / 2, 0, 0],
  };
  const sonarDome: ModelPart = {
    geometry: new SphereGeometry(0.42, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    colour: "#7f1d1d",
    position: [0, -subHullRadius + 0.05, 3.5],
    rotation: [Math.PI, 0, 0],
    scale: [1, 0.5, 2.4],
  };
  return [
    ...masts,
    ...lights,
    ...hatches,
    forwardLid,
    ...cleats,
    shaft,
    sonarDome,
  ];
};

export const buildSubmarineGeometry = (): BufferGeometry =>
  mergeGeometries([
    buildHullGeometry(),
    buildCasingGeometry(),
    buildSailGeometry(),
    buildPlaneGeometry(),
    buildModelGeometry(buildFittingParts()),
  ]);

export const buildSubmarineLiveryGeometry = (): BufferGeometry =>
  buildLiveryGeometry([
    {
      surface: buildSailGeometry(),
      decals: onBothSides({
        face: "flag",
        centre: [0.5, 2.25, sailFront - 1.9],
        outward: [1, 0, 0],
        up: [0, 1, 0],
        width: 2.1,
        height: 1.05,
      }),
    },
    {
      surface: buildHullGeometry(),
      decals: onBothSides({
        face: "name",
        centre: [1.1, 0.44, -3.9],
        outward: [0.93, 0.36, 0],
        up: [-0.36, 0.93, 0],
        width: 3,
        height: 0.72,
      }),
    },
  ]);

const propellerBlades = 7;
const propellerTip = 0.95;

export const buildSubmarinePropellerGeometry = (): BufferGeometry =>
  paintAll(
    mergeGeometries([
      ...Array.from({ length: propellerBlades }, (_, blade) =>
        buildAirfoilLoft([
          {
            leadingEdge: [0.14, -0.14, 0.12],
            chord: [0, 0.28, -0.2],
            thicknessAxis: [0, 0.55, 0.83],
            thickness: 0.12,
          },
          {
            leadingEdge: [propellerTip * 0.62, 0.02, 0.08],
            chord: [0, 0.3, -0.12],
            thicknessAxis: [0, 0.4, 0.9],
            thickness: 0.1,
          },
          {
            leadingEdge: [propellerTip, 0.22, 0.02],
            chord: [0, 0.12, -0.05],
            thicknessAxis: [0, 0.3, 0.95],
            thickness: 0.08,
          },
        ])
          .rotateZ((blade / propellerBlades) * Math.PI * 2)
          .toNonIndexed(),
      ),
      new SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)
        .deleteAttribute("uv")
        .rotateX(-Math.PI / 2)
        .scale(1, 1, 1.8)
        .toNonIndexed(),
    ]),
    "#b7791f",
  );

export const buildSubmarineHatchGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.4, 0.4, 0.08, 20),
      colour: "#4b5563",
      position: [0, 0.04, 0.4],
    },
    {
      geometry: new TorusGeometry(0.12, 0.025, 5, 12),
      colour: "#f5c542",
      position: [0, 0.1, 0.4],
      rotation: [Math.PI / 2, 0, 0],
    },
    {
      geometry: new BoxGeometry(0.16, 0.06, 0.18),
      colour: "#6b7280",
      position: [0, 0.03, 0.02],
    },
  ]);

const browHalfWidth = 0.42;

export const buildSubmarineBrowGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new BoxGeometry(subBrowLength, 0.1, browHalfWidth * 2),
      colour: "#a77b4f",
      position: [subBrowLength / 2, 0.05, 0],
    },
    ...[-1, 1].flatMap((side): ModelPart[] => [
      {
        geometry: new CylinderGeometry(0.025, 0.025, subBrowLength, 5),
        colour: "#e5e7eb",
        position: [subBrowLength / 2, 0.85, side * browHalfWidth],
        rotation: [0, 0, Math.PI / 2],
      },
      ...[0.15, subBrowLength / 2, subBrowLength - 0.15].map(
        (along): ModelPart => ({
          geometry: new CylinderGeometry(0.025, 0.025, 0.8, 5),
          colour: "#e5e7eb",
          position: [along, 0.45, side * browHalfWidth],
        }),
      ),
    ]),
  ]);

const hatchOpenAngle = -Math.PI * 0.62;

export const placeSubmarineHatch = (opening: number): Matrix4 =>
  new Matrix4()
    .makeTranslation(0, casingTop + 0.02, subHatch.z - 0.4)
    .multiply(new Matrix4().makeRotationX(hatchOpenAngle * opening));

export const placeSubmarineBrow = (opening: number, side: number): Matrix4 =>
  new Matrix4()
    .makeTranslation(side * subDeckHalfWidth, casingTop, subBrowZ)
    .multiply(new Matrix4().makeRotationY(side > 0 ? 0 : Math.PI))
    .multiply(new Matrix4().makeScale(Math.max(0.001, opening), 1, 1));

export const placeSubmarinePropeller = (turn: number): Matrix4 =>
  new Matrix4()
    .makeTranslation(0, 0, subStern - 0.35)
    .multiply(new Matrix4().makeRotationZ(turn));
