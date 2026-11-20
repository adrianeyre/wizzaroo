import {
  BoxGeometry,
  Color,
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
import { smoothStep } from "../world-map-terrain.js";
import {
  buildAirfoilLoft,
  buildLoftGeometry,
  buildPaintedLoft,
  paintAll,
  paintFaces,
} from "./island-lofts.js";
import { buildLiveryGeometry, onBothSides } from "./island-livery.js";
import {
  hovercraftBeam,
  hovercraftBow,
  hovercraftCushion,
  hovercraftDeck,
  hovercraftLength,
  hovercraftRampDrop,
  hovercraftRampSpan,
} from "./island-sea-craft.js";

const hullHalfLength = hovercraftLength / 2 - 0.4;
const hullHalfBeam = hovercraftBeam / 2 - 0.35;
const planSquareness = 3.4;
const planPoints = 64;
const skirtTop = 0.95;
const skirtFingers = 32;

const paint = {
  hull: new Color("#3b1d9a"),
  hullDark: new Color("#2a1272"),
  gold: new Color("#f5c542"),
  white: new Color("#f8fafc"),
  cream: new Color("#eef2f7"),
  deck: new Color("#64748b"),
  deckLine: new Color("#94a3b8"),
  glass: new Color("#0f172a"),
  frame: new Color("#cbd5e1"),
  doorway: new Color("#111827"),
  skirt: new Color("#1f2937"),
  skirtFinger: new Color("#111827"),
  skirtWorn: new Color("#374151"),
};

const findPlanPoint = (
  angle: number,
  halfLength: number,
  halfBeam: number,
): [number, number] => {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return [
    Math.sign(cosine) * Math.abs(cosine) ** (2 / planSquareness) * halfBeam,
    Math.sign(sine) * Math.abs(sine) ** (2 / planSquareness) * halfLength,
  ];
};

const buildPlanRing = (y: number, grow: number, points = planPoints) =>
  Array.from({ length: points }, (_, point): Triple => {
    const [x, z] = findPlanPoint(
      (point / points) * Math.PI * 2,
      hullHalfLength + grow,
      hullHalfBeam + grow,
    );
    return [x, y, z];
  });

const buildHullGeometry = (): BufferGeometry =>
  buildPaintedLoft(
    [
      buildPlanRing(skirtTop - 0.05, -0.05),
      buildPlanRing(skirtTop + 0.12, 0.05),
      buildPlanRing(hovercraftDeck - 0.12, 0.05),
      buildPlanRing(hovercraftDeck, -0.02),
    ],
    ({ x, y, z }) => {
      if (y > hovercraftDeck - 0.02) {
        const isLine =
          Math.abs(Math.abs(x) - (hullHalfBeam - 0.45)) < 0.12 ||
          Math.abs(z - hovercraftBow + 1) < 0.08;
        return isLine ? paint.deckLine : paint.deck;
      }
      if (y > skirtTop + 0.1 && y < skirtTop + 0.2) {
        return paint.gold;
      }
      return y < skirtTop + 0.1 ? paint.hullDark : paint.hull;
    },
  );

export const buildSkirtGeometry = (): BufferGeometry =>
  paintFaces(
    buildLoftGeometry([
      buildPlanRing(0, -0.3),
      buildPlanRing(0.12, -0.05),
      buildPlanRing(0.42, 0.2),
      buildPlanRing(0.72, 0.18),
      buildPlanRing(skirtTop, 0),
    ]),
    ({ x, y, z }) => {
      if (y < 0.08) {
        return paint.skirtWorn;
      }
      const angle = Math.atan2(z / hullHalfLength, x / hullHalfBeam);
      const finger = Math.floor(
        ((angle + Math.PI) / (Math.PI * 2)) * skirtFingers,
      );
      if (y < 0.45 && finger % 2 === 0) {
        return paint.skirtFinger;
      }
      return paint.skirt;
    },
  );

const cabinBack = -3.7;
const cabinFront = 5.2;
const cabinHalfWidth = 2.3;
const cabinRoof = 3.55;
const cabinSquareness = 3;

interface CabinSection {
  halfWidth: number;
  bottom: number;
  top: number;
}

const findCabinSection = (z: number): CabinSection => {
  const front = smoothStep(cabinFront - 1.6, cabinFront, z);
  const back = smoothStep(cabinBack + 0.9, cabinBack, z);
  return {
    halfWidth: cabinHalfWidth * (1 - 0.18 * back ** 2 - 0.5 * front ** 2),
    bottom: hovercraftDeck - 0.05,
    top: cabinRoof - 0.75 * front ** 1.4 - 0.35 * back ** 1.6,
  };
};

const buildCabinRing = (z: number): Triple[] => {
  const { halfWidth, bottom, top } = findCabinSection(z);
  return Array.from({ length: 44 }, (_, point): Triple => {
    const angle = (point / 44) * Math.PI * 2;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const across =
      Math.sign(cosine) * Math.abs(cosine) ** (2 / cabinSquareness) * halfWidth;
    const up = Math.sign(sine) * Math.abs(sine) ** (2 / cabinSquareness);
    return [across, (bottom + top) / 2 + (up * (top - bottom)) / 2, z];
  });
};

const cabinStations = Array.from({ length: 26 }, (_, station) => {
  const share = station / 25;
  const bunched = 0.5 - 0.5 * Math.cos(Math.PI * share);
  return cabinBack + (cabinFront - cabinBack) * bunched;
});

const windowPitch = 0.95;

const paintCabin = ({ x, y, z }: { x: number; y: number; z: number }) => {
  const { halfWidth, bottom, top } = findCabinSection(z);
  const upness = (y - bottom) / (top - bottom);
  const across = x / halfWidth;
  if (z > cabinFront - 0.01) {
    return paint.doorway;
  }
  if (z < cabinBack + 0.01) {
    return paint.white;
  }
  const isNose = z > cabinFront - 1.5;
  if (isNose && upness > 0.55 && upness < 0.86) {
    const isPost =
      Math.abs(Math.abs(across) - 0.42) < 0.06 || Math.abs(across) < 0.05;
    return isPost && z > cabinFront - 0.6 ? paint.frame : paint.glass;
  }
  const isSide = Math.abs(across) > 0.86;
  if (isSide && upness > 0.55 && upness < 0.8 && z > cabinBack + 0.9) {
    const inPane =
      (((z - cabinBack) % windowPitch) + windowPitch) % windowPitch;
    return inPane < 0.12 ? paint.frame : paint.glass;
  }
  if (upness > 0.94) {
    return paint.cream;
  }
  if (upness < 0.2) {
    return paint.hull;
  }
  if (upness < 0.26) {
    return paint.gold;
  }
  return paint.white;
};

const buildCabinGeometry = (): BufferGeometry =>
  buildPaintedLoft(cabinStations.map(buildCabinRing), paintCabin);

const ductCentres: Triple[] = [
  [-1.85, 3.3, -5.15],
  [1.85, 3.3, -5.15],
];
const ductInner = 1.22;
const ductOuter = 1.42;
const ductDepth = 1.15;

const buildDuctGeometry = (): BufferGeometry => {
  const profile = [
    new Vector2(ductInner, -ductDepth / 2),
    new Vector2(ductInner - 0.04, 0),
    new Vector2(ductInner, ductDepth / 2),
    new Vector2(ductInner + 0.12, ductDepth / 2 + 0.06),
    new Vector2(ductOuter, ductDepth / 2 - 0.05),
    new Vector2(ductOuter + 0.02, 0),
    new Vector2(ductOuter - 0.06, -ductDepth / 2),
    new Vector2(ductInner, -ductDepth / 2),
  ];
  const ducts = ductCentres.map(([x, y, z]) =>
    new LatheGeometry(profile, 36).rotateX(Math.PI / 2).translate(x, y, z),
  );
  return paintFaces(mergeGeometries(ducts), ({ z }) =>
    z > ductCentres[0][2] + ductDepth / 2 - 0.02 ? paint.gold : paint.white,
  );
};

const buildRudderGeometry = (): BufferGeometry =>
  paintAll(
    mergeGeometries(
      ductCentres.flatMap(([x, y, z]) =>
        [-0.55, 0.55].map((offset) =>
          buildAirfoilLoft([
            {
              leadingEdge: [x + offset, y - 1.15, z - 0.75],
              chord: [0, 0, -0.7],
              thicknessAxis: [1, 0, 0],
              thickness: 0.14,
            },
            {
              leadingEdge: [x + offset, y + 1.15, z - 0.75],
              chord: [0, 0, -0.62],
              thicknessAxis: [1, 0, 0],
              thickness: 0.13,
            },
          ]),
        ),
      ),
    ),
    "#e2e8f0",
  );

const buildDuctParts = (): ModelPart[] =>
  ductCentres.flatMap(([x, y, z]): ModelPart[] => [
    {
      geometry: new BoxGeometry(
        0.3,
        y - ductOuter - hovercraftDeck + 0.15,
        0.9,
      ),
      colour: "#cbd5e1",
      position: [x, (y - ductOuter + hovercraftDeck) / 2, z],
    },
    {
      geometry: new TorusGeometry(ductInner * 0.66, 0.025, 4, 28),
      colour: "#475569",
      position: [x, y, z + ductDepth / 2 - 0.02],
    },
    {
      geometry: new TorusGeometry(ductInner * 0.33, 0.025, 4, 20),
      colour: "#475569",
      position: [x, y, z + ductDepth / 2 - 0.02],
    },
    ...[0, 1, 2, 3].map((spoke): ModelPart => ({
      geometry: new BoxGeometry(ductInner * 2, 0.04, 0.04),
      colour: "#475569",
      position: [x, y, z + ductDepth / 2 - 0.02],
      rotation: [0, 0, (spoke * Math.PI) / 4],
    })),
    {
      geometry: new CylinderGeometry(0.06, 0.06, 1.3, 6),
      colour: "#94a3b8",
      position: [x, y, z - 0.2],
      rotation: [0, 0, Math.PI / 2],
    },
    {
      geometry: new BoxGeometry(0.05, 0.06, 1.5),
      colour: "#94a3b8",
      position: [x, y - 0.6, z - 0.95],
    },
  ]);

const railStart = cabinBack - 0.4;
const railSpacing = 1.25;

const buildDeckParts = (): ModelPart[] => {
  const railHeight = 0.75;
  const railInset = 0.35;
  const railSides = [-1, 1];
  const posts = railSides.flatMap((side) =>
    Array.from({ length: 8 }, (_, post): ModelPart => {
      const z = railStart + post * railSpacing;
      return {
        geometry: new CylinderGeometry(0.035, 0.035, railHeight, 5),
        colour: "#e2e8f0",
        position: [
          side * (hullHalfBeam - railInset),
          hovercraftDeck + railHeight / 2,
          z,
        ],
      };
    }),
  );
  const rails = railSides.flatMap((side) =>
    [railHeight, railHeight * 0.5].map((height): ModelPart => ({
      geometry: new CylinderGeometry(0.03, 0.03, railSpacing * 7, 5),
      colour: "#e2e8f0",
      position: [
        side * (hullHalfBeam - railInset),
        hovercraftDeck + height,
        railStart + railSpacing * 3.5,
      ],
      rotation: [Math.PI / 2, 0, 0],
    })),
  );
  const buoys = railSides.map((side): ModelPart => ({
    geometry: new TorusGeometry(0.32, 0.09, 8, 18),
    colour: "#f97316",
    position: [side * (cabinHalfWidth + 0.06), 2, cabinBack + 1.1],
    rotation: [0, Math.PI / 2, 0],
  }));
  const fanIntake: ModelPart[] = [
    {
      geometry: new CylinderGeometry(1.05, 1.15, 0.45, 24),
      colour: "#cbd5e1",
      position: [0, hovercraftDeck + 0.22, cabinBack - 1.05],
    },
    {
      geometry: new CylinderGeometry(0.9, 0.9, 0.06, 24),
      colour: "#1f2937",
      position: [0, hovercraftDeck + 0.46, cabinBack - 1.05],
    },
    ...[0, 1, 2].map((bar): ModelPart => ({
      geometry: new BoxGeometry(1.8, 0.05, 0.05),
      colour: "#94a3b8",
      position: [0, hovercraftDeck + 0.5, cabinBack - 1.05],
      rotation: [0, (bar * Math.PI) / 3, 0],
    })),
  ];
  const lights: ModelPart[] = [
    {
      geometry: new SphereGeometry(0.11, 8, 6),
      colour: "#ef4444",
      position: [-cabinHalfWidth - 0.02, 3.05, 2.6],
    },
    {
      geometry: new SphereGeometry(0.11, 8, 6),
      colour: "#22c55e",
      position: [cabinHalfWidth + 0.02, 3.05, 2.6],
    },
    {
      geometry: new BoxGeometry(0.5, 0.18, 0.12),
      colour: "#fef9c3",
      position: [0, 3.2, cabinFront - 0.04],
    },
  ];
  const mast: ModelPart[] = [
    {
      geometry: new CylinderGeometry(0.08, 0.12, 1.3, 8),
      colour: "#e2e8f0",
      position: [0, cabinRoof + 0.6, 0.8],
    },
    {
      geometry: new SphereGeometry(0.1, 8, 6),
      colour: "#fef9c3",
      position: [0, cabinRoof + 1.3, 0.8],
    },
    {
      geometry: new CylinderGeometry(0.06, 0.06, 0.5, 6),
      colour: "#f5c542",
      position: [0.25, cabinRoof + 0.25, -0.8],
      rotation: [Math.PI / 2, 0, 0],
    },
  ];
  const fenders = railSides.flatMap((side) =>
    [-3, 0, 3].map((z): ModelPart => ({
      geometry: new CylinderGeometry(0.16, 0.16, 0.6, 10),
      colour: "#1f2937",
      position: [side * (hullHalfBeam + 0.06), skirtTop + 0.28, z],
      rotation: [Math.PI / 2, 0, 0],
    })),
  );
  return [
    ...posts,
    ...rails,
    ...buoys,
    ...fanIntake,
    ...lights,
    ...mast,
    ...fenders,
  ];
};

export const buildHovercraftGeometry = (): BufferGeometry =>
  mergeGeometries([
    buildHullGeometry(),
    buildCabinGeometry(),
    buildDuctGeometry(),
    buildRudderGeometry(),
    buildModelGeometry([...buildDuctParts(), ...buildDeckParts()]),
  ]);

export const buildHovercraftLiveryGeometry = (): BufferGeometry =>
  buildLiveryGeometry([
    {
      surface: buildCabinGeometry(),
      decals: onBothSides({
        face: "name",
        centre: [cabinHalfWidth, 1.82, 0.4],
        outward: [1, 0, 0],
        up: [0, 1, 0],
        width: 4.4,
        height: 1.1,
      }),
    },
    {
      surface: buildDuctGeometry(),
      decals: onBothSides({
        face: "flag",
        centre: [
          ductCentres[1][0] + ductOuter,
          ductCentres[1][1] + 0.2,
          ductCentres[1][2],
        ],
        outward: [1, 0.15, 0],
        up: [0, 1, 0],
        width: 1,
        height: 0.5,
      }),
    },
  ]);

const bladeCount = 5;
const bladeTip = 1.12;

const buildPropellerGeometry = (): BufferGeometry =>
  paintFaces(
    mergeGeometries([
      ...Array.from({ length: bladeCount }, (_, blade) =>
        buildAirfoilLoft([
          {
            leadingEdge: [0.16, -0.12, 0.08],
            chord: [0, 0.26, -0.22],
            thicknessAxis: [0, 0.6, 0.8],
            thickness: 0.12,
          },
          {
            leadingEdge: [bladeTip, -0.05, 0.05],
            chord: [0, 0.18, -0.08],
            thicknessAxis: [0, 0.3, 0.95],
            thickness: 0.08,
          },
        ])
          .rotateZ((blade / bladeCount) * Math.PI * 2)
          .toNonIndexed(),
      ),
      new SphereGeometry(0.22, 12, 8)
        .deleteAttribute("uv")
        .scale(1, 1, 1.6)
        .toNonIndexed(),
    ]),
    ({ x, y }) =>
      Math.hypot(x, y) > bladeTip - 0.12
        ? new Color("#f5c542")
        : new Color("#334155"),
  );

export const buildHovercraftPropellerGeometry = (): BufferGeometry =>
  buildPropellerGeometry();

const rampHalfWidth = 1.05;

export const buildHovercraftRampGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new BoxGeometry(rampHalfWidth * 2, 0.12, hovercraftRampSpan),
      colour: "#64748b",
      position: [0, 0.06, hovercraftRampSpan / 2],
    },
    ...[-1, 1].map((side): ModelPart => ({
      geometry: new BoxGeometry(0.1, 0.32, hovercraftRampSpan),
      colour: "#3b1d9a",
      position: [side * (rampHalfWidth - 0.05), 0.16, hovercraftRampSpan / 2],
    })),
    ...Array.from({ length: 6 }, (_, rib): ModelPart => ({
      geometry: new BoxGeometry(rampHalfWidth * 1.8, 0.05, 0.08),
      colour: "#94a3b8",
      position: [0, 0.14, 0.3 + rib * (hovercraftRampSpan / 6.4)],
    })),
    {
      geometry: new BoxGeometry(rampHalfWidth * 2, 0.08, 0.12),
      colour: "#f5c542",
      position: [0, 0.04, hovercraftRampSpan - 0.06],
    },
  ]);

const radarAt: Triple = [0, cabinRoof + 0.95, 0.8];

export const buildHovercraftRadarGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new BoxGeometry(1.4, 0.12, 0.16),
      colour: "#f8fafc",
    },
    {
      geometry: new CylinderGeometry(0.07, 0.07, 0.16, 8),
      colour: "#334155",
      position: [0, -0.12, 0],
    },
  ]);

const rampRaised = -Math.PI * 0.58;

export const placeHovercraftRamp = (opening: number): Matrix4 =>
  new Matrix4()
    .makeTranslation(0, hovercraftDeck, hovercraftBow)
    .multiply(
      new Matrix4().makeRotationX(
        rampRaised + (hovercraftRampDrop - rampRaised) * opening,
      ),
    );

export const placeHovercraftPropeller = (
  index: number,
  turn: number,
): Matrix4 => {
  const [x, y, z] = ductCentres[index];
  return new Matrix4()
    .makeTranslation(x, y, z)
    .multiply(new Matrix4().makeRotationZ(index === 0 ? turn : -turn));
};

export const placeHovercraftRadar = (turn: number): Matrix4 =>
  new Matrix4()
    .makeTranslation(...radarAt)
    .multiply(new Matrix4().makeRotationY(turn * 0.12));

export const placeHovercraftSkirt = (lift: number): Matrix4 => {
  const stretch = 1 + (hovercraftCushion * lift) / skirtTop;
  return new Matrix4()
    .makeTranslation(0, skirtTop, 0)
    .multiply(new Matrix4().makeScale(1, stretch, 1))
    .multiply(new Matrix4().makeTranslation(0, -skirtTop, 0));
};
