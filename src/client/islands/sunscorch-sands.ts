import { raiseTunnelHills } from "./island-tunnel-hills.js";
import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
} from "three";
import { buildModelGeometry, type ModelPart } from "../world-map-models.js";
import {
  buildSideLands,
  findDistanceToNewLandRivers,
  extendWithNewLands,
  findBump,
  findLayeredNoise,
  isClearOfProps,
  levelAirfield,
  scatterAcrossLand,
  smoothStep,
  type Airfield,
  type MapPoint,
  type ScatteredThing,
} from "../world-map-terrain.js";
import {
  buildGroundPainter,
  buildIsletBlob,
  copySightsOntoNewLands,
  findCoastShare,
  findDistanceToCourse,
  findDistanceToPools,
  sinkIntoSea,
  type IslandFeature,
  type IslandLandform,
  type IslandLandmarkDesigns,
  type WaterPool,
} from "./island-landform.js";

const sandstone = "#d9a86a";
const paleSandstone = "#ecd2a2";
const palmGreen = "#3f8a3a";

export const oasisPool: WaterPool = {
  name: "oasis-pool",
  centre: { x: 6, z: 5 },
  radius: 1.8,
};

export const caravanTrail: MapPoint[] = [
  { x: -24, z: 1 },
  { x: -12, z: -2 },
  { x: -6, z: -5 },
  { x: 1, z: -2 },
  { x: 4, z: 2 },
  { x: 12, z: 3.4 },
  { x: 23, z: 4 },
];

export const marketTownCentre: MapPoint = { x: 13, z: 6 };
export const desertRuinsCentre: MapPoint = { x: -11, z: -12 };
export const mesaPosition: MapPoint = { x: 15, z: -11 };

export const sandsIslet: MapPoint = { x: 21, z: 15 };

const sandsCoast = [
  { x: -4, z: -1, radiusX: 24, radiusZ: 15 },
  { x: 14, z: 1, radiusX: 13, radiusZ: 14 },
  { x: -12, z: -9, radiusX: 10, radiusZ: 8 },
  buildIsletBlob(sandsIslet),
];

const findDunes = (point: MapPoint): number => {
  const ripple =
    0.5 +
    0.5 *
      Math.sin(
        point.x * 0.55 + 1.3 * Math.sin(point.z * 0.28) + point.z * 0.15,
      );
  const duneShare =
    smoothStep(4, -8, point.x) + 0.5 * smoothStep(6, 13, point.z);
  return 1.5 * ripple * ripple * Math.min(1, duneShare);
};

const findMesa = (point: MapPoint): number => {
  const reach = Math.hypot(point.x - mesaPosition.x, point.z - mesaPosition.z);
  const wobble = 0.8 * findLayeredNoise({ x: point.x * 0.4, z: point.z * 0.4 });
  return 4.9 * (1 - smoothStep(3.4, 5, reach + wobble));
};

const findSandsCoreHeight = (point: MapPoint): number => {
  const landShare = findCoastShare(point, sandsCoast);
  const plain =
    0.9 + 0.45 * findLayeredNoise({ x: point.x * 0.14, z: point.z * 0.14 });
  const pyramidRise = 0.8 * findBump(point, { x: -16, z: -7 }, 4);
  const raised = plain + findDunes(point) + findMesa(point) + pyramidRise;
  const basin =
    1 -
    smoothStep(
      oasisPool.radius,
      oasisPool.radius + 3.2,
      Math.hypot(point.x - oasisPool.centre.x, point.z - oasisPool.centre.z),
    );
  const pooled = raised + (-0.5 - raised) * basin;
  return sinkIntoSea(pooled, landShare);
};

export const sandsNewLands = buildSideLands({
  eastJoinZ: 0,
  westJoinZ: -3,
  hillRise: 3,
  lakes: [
    { centre: { x: 49, z: 5 }, radius: 2.6 },
    { centre: { x: -49, z: -5 }, radius: 2.6 },
  ],
  rivers: [
    [
      { x: 58.8, z: -6.2 },
      { x: 59.1, z: -4.2 },
      { x: 59.9, z: -2.3 },
      { x: 60.6, z: -0.5 },
      { x: 61, z: 1.5 },
      { x: 60.6, z: 3.4 },
      { x: 59.8, z: 5.2 },
      { x: 59, z: 7.1 },
      { x: 58.8, z: 9.1 },
      { x: 59.2, z: 11 },
      { x: 60, z: 12.8 },
      { x: 60.7, z: 14.7 },
      { x: 61, z: 16.7 },
      { x: 60.8, z: 17.7 },
    ],
    [
      { x: -62.2, z: 12.2 },
      { x: -64.1, z: 11.5 },
      { x: -66.1, z: 11.3 },
      { x: -68.1, z: 11 },
      { x: -69.9, z: 10.3 },
      { x: -71.5, z: 9.1 },
      { x: -72.6, z: 7.5 },
      { x: -73.9, z: 5.9 },
      { x: -74.6, z: 5.2 },
    ],
  ],
});

export const sandsAirfield: Airfield = {
  runway: { centre: { x: -39, z: -9 }, heading: -2.44, level: 0.93 },
  helipad: { centre: { x: 39, z: -10 }, heading: -1.32, level: 1.31 },
  balloonField: { centre: { x: -44.5, z: 5 }, heading: 1.68, level: 1.15 },
};

export const findSandsHeight = raiseTunnelHills(
  "sunscorch-sands",
  levelAirfield(
    extendWithNewLands(findSandsCoreHeight, sandsNewLands),
    sandsAirfield,
  ),
);

const findDistanceToSandsWater = (point: MapPoint): number =>
  findDistanceToPools(point, [oasisPool]);

const oasisGrass = new Color("#7aa646");
const trailDust = new Color("#b98b5a");

const paintSandsGround = buildGroundPainter({
  seabed: "#d6c08e",
  deepSeabed: "#2f8c94",
  shore: "#f2e2b6",
  lowland: "#ecd39a",
  lowlandVariant: "#dfbb7c",
  upland: "#c8925a",
  cliff: "#a35f3a",
  peak: "#b87348",
  uplandHeight: 3.3,
  peakHeight: 99,
  paintExtras: (colour, point, height) => {
    const fromPool = findDistanceToSandsWater(point);
    colour.lerp(
      oasisGrass,
      height > 0 ? 1 - smoothStep(0.6, 2.6, fromPool) : 0,
    );
    const fromTrail = findDistanceToCourse(point, caravanTrail);
    colour.lerp(trailDust, (1 - smoothStep(0.25, 0.6, fromTrail)) * 0.8);
  },
});

const buildPalmGeometry = (): BufferGeometry =>
  buildModelGeometry([
    ...Array.from({ length: 5 }, (_, ring): ModelPart => ({
      geometry: new CylinderGeometry(0.07, 0.09, 0.4, 6),
      colour: ring % 2 === 0 ? "#8a6439" : "#a07546",
      position: [ring * 0.04, 0.2 + ring * 0.36, 0],
      rotation: [0, 0, -0.08],
    })),
    ...Array.from({ length: 7 }, (_, frond): ModelPart => {
      const angle = (frond / 7) * Math.PI * 2;
      return {
        geometry: new ConeGeometry(0.16, 1.2, 4),
        colour: frond % 2 === 0 ? palmGreen : "#4f9c43",
        position: [0.2 + Math.cos(angle) * 0.45, 1.85, Math.sin(angle) * 0.45],
        rotation: [Math.sin(angle) * 1.9, 0, -Math.cos(angle) * 1.9],
        scale: [1, 1, 0.3],
      };
    }),
    {
      geometry: new SphereGeometry(0.1, 8, 6),
      colour: "#6b4423",
      position: [0.2, 1.8, 0],
    },
  ]);

const buildSandstoneBoulderGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new IcosahedronGeometry(0.45, 0),
      colour: "#c48452",
      position: [0, 0.2, 0],
      scale: [1.3, 0.7, 1],
      roughen: 0.35,
    },
  ]);

const buildFlatHouseGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new BoxGeometry(0.9, 0.7, 0.9),
      colour: paleSandstone,
      position: [0, 0.35, 0],
    },
    {
      geometry: new BoxGeometry(0.98, 0.08, 0.98),
      colour: "#d8b37c",
      position: [0, 0.74, 0],
    },
    {
      geometry: new BoxGeometry(0.22, 0.38, 0.04),
      colour: "#6b3f22",
      position: [0, 0.19, 0.46],
    },
    {
      geometry: new BoxGeometry(0.6, 0.04, 0.4),
      colour: "#c2410c",
      position: [0, 0.48, 0.62],
      rotation: [0.3, 0, 0],
    },
  ]);

const buildBrokenColumnGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new BoxGeometry(0.55, 0.15, 0.55),
      colour: "#cfae7c",
      position: [0, 0.07, 0],
    },
    {
      geometry: new CylinderGeometry(0.18, 0.2, 1.1, 8),
      colour: "#e2c492",
      position: [0, 0.68, 0],
      roughen: 0.12,
    },
    {
      geometry: new CylinderGeometry(0.18, 0.18, 0.5, 8),
      colour: "#d6b582",
      position: [0.55, 0.18, 0.1],
      rotation: [0, 0.4, Math.PI / 2],
    },
  ]);

const buildCamelGeometry = (): BufferGeometry => {
  const coat = "#c89a5f";
  return buildModelGeometry([
    {
      geometry: new SphereGeometry(0.32, 10, 8),
      colour: coat,
      position: [0, 0.68, 0],
      scale: [1.5, 0.8, 0.8],
    },
    {
      geometry: new SphereGeometry(0.18, 10, 8),
      colour: coat,
      position: [0, 0.95, 0],
    },
    ...[
      [-0.32, -0.12],
      [-0.32, 0.12],
      [0.32, -0.12],
      [0.32, 0.12],
    ].map(([x, z]): ModelPart => ({
      geometry: new CylinderGeometry(0.045, 0.04, 0.55, 5),
      colour: "#a87c47",
      position: [x, 0.28, z],
    })),
    {
      geometry: new CylinderGeometry(0.06, 0.08, 0.5, 6),
      colour: coat,
      position: [0.58, 0.92, 0],
      rotation: [0, 0, -0.6],
    },
    {
      geometry: new BoxGeometry(0.24, 0.12, 0.12),
      colour: coat,
      position: [0.78, 1.14, 0],
    },
    {
      geometry: new BoxGeometry(0.4, 0.1, 0.5),
      colour: "#b91c1c",
      position: [0, 0.98, 0],
    },
  ]);
};

const placeOnSands = (
  point: MapPoint,
  scale: number,
  turn: number,
): ScatteredThing => ({
  ...point,
  height: findSandsHeight(point),
  scale,
  turn,
});

const buildRing = (
  centre: MapPoint,
  count: number,
  innerReach: number,
  outerReach: number,
): ScatteredThing[] =>
  Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2 + 0.3;
    const reach = index % 2 === 0 ? innerReach : outerReach;
    return placeOnSands(
      {
        x: centre.x + Math.cos(angle) * reach,
        z: centre.z + Math.sin(angle) * reach,
      },
      0.85 + (index % 3) * 0.12,
      -angle,
    );
  });

const buildCaravan = (): ScatteredThing[] =>
  [0.08, 0.13, 0.18, 0.23, 0.7, 0.75].map((share, camel) => {
    const legs = caravanTrail.length - 1;
    const leg = Math.min(legs - 1, Math.floor(share * legs));
    const along = share * legs - leg;
    const from = caravanTrail[leg];
    const to = caravanTrail[leg + 1];
    return placeOnSands(
      {
        x: from.x + (to.x - from.x) * along,
        z: from.z + (to.z - from.z) * along,
      },
      1 + (camel % 2) * 0.1,
      -Math.atan2(to.z - from.z, to.x - from.x),
    );
  });

const buildOasisFountainGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(1.3, 1.4, 0.35, 20),
      colour: sandstone,
      position: [0, 0.17, 0],
    },
    {
      geometry: new CylinderGeometry(1.15, 1.15, 0.06, 20),
      colour: "#38bdf8",
      position: [0, 0.34, 0],
    },
    {
      geometry: new CylinderGeometry(0.18, 0.24, 1, 10),
      colour: paleSandstone,
      position: [0, 0.8, 0],
    },
    {
      geometry: new CylinderGeometry(0.6, 0.45, 0.2, 16),
      colour: sandstone,
      position: [0, 1.3, 0],
    },
    {
      geometry: new CylinderGeometry(0.5, 0.5, 0.05, 16),
      colour: "#7dd3fc",
      position: [0, 1.4, 0],
    },
    {
      geometry: new SphereGeometry(0.14, 10, 8),
      colour: "#f59e0b",
      position: [0, 1.6, 0],
    },
    ...[0, 1, 2, 3, 4, 5].map((tile): ModelPart => ({
      geometry: new BoxGeometry(0.28, 0.06, 0.28),
      colour: tile % 2 === 0 ? "#0e7490" : "#facc15",
      position: [
        Math.cos((tile / 6) * Math.PI * 2) * 1.35,
        0.36,
        Math.sin((tile / 6) * Math.PI * 2) * 1.35,
      ],
    })),
  ]);

const buildScrollBazaarGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new BoxGeometry(2, 1.2, 1.6),
      colour: paleSandstone,
      position: [0, 0.6, 0],
    },
    {
      geometry: new SphereGeometry(0.75, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      colour: "#0f766e",
      position: [0, 1.2, 0],
    },
    {
      geometry: new ConeGeometry(0.12, 0.4, 8),
      colour: "#fbbf24",
      position: [0, 2.1, 0],
    },
    ...[-0.6, 0, 0.6].flatMap((x, awning): ModelPart[] => [
      {
        geometry: new BoxGeometry(0.55, 0.04, 0.6),
        colour: ["#dc2626", "#2563eb", "#f59e0b"][awning],
        position: [x, 0.95, 1.05],
        rotation: [0.35, 0, 0],
      },
      {
        geometry: new CylinderGeometry(0.08, 0.08, 0.5, 8),
        colour: "#fef3c7",
        position: [x, 0.35, 1.05],
        rotation: [0, 0, Math.PI / 2],
      },
    ]),
    {
      geometry: new BoxGeometry(0.4, 0.65, 0.05),
      colour: "#5b3417",
      position: [0, 0.32, 0.81],
    },
  ]);

const buildMiragePrismGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new BoxGeometry(1.6, 0.5, 1.6),
      colour: sandstone,
      position: [0, 0.25, 0],
    },
    {
      geometry: new CylinderGeometry(0.75, 0.75, 2.2, 3),
      colour: "#d6f5ff",
      position: [0, 1.6, 0],
    },
    ...["#ef4444", "#f97316", "#facc15", "#22c55e", "#3b82f6", "#8b5cf6"].map(
      (colour, band): ModelPart => ({
        geometry: new BoxGeometry(1.6, 0.03, 0.14),
        colour,
        position: [1.5, 0.02, -0.35 + band * 0.14],
        rotation: [0, -0.3, 0],
      }),
    ),
  ]);

const buildDuneDrumsGeometry = (): BufferGeometry =>
  buildModelGeometry([
    ...[
      [0, 0, 0.6, 0.9],
      [1.1, 0.3, 0.45, 0.7],
      [-0.9, 0.5, 0.4, 0.6],
    ].flatMap(([x, z, radius, height], drum): ModelPart[] => [
      {
        geometry: new CylinderGeometry(radius, radius * 0.9, height, 14),
        colour: ["#b45309", "#9a3412", "#a16207"][drum],
        position: [x, height / 2, z],
      },
      {
        geometry: new CylinderGeometry(radius * 1.02, radius * 1.02, 0.05, 14),
        colour: "#fde7c0",
        position: [x, height + 0.02, z],
      },
      {
        geometry: new TorusGeometry(radius * 0.98, 0.035, 4, 14),
        colour: "#fbbf24",
        position: [x, height * 0.55, z],
        rotation: [Math.PI / 2, 0, 0],
      },
    ]),
    {
      geometry: new ConeGeometry(0.9, 1.2, 6),
      colour: "#f5d0a9",
      position: [0.2, 0.6, -1.2],
    },
  ]);

const buildCaravanSignpostGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new BoxGeometry(1.4, 0.4, 0.7),
      colour: "#8a5a32",
      position: [0, 0.55, 0],
    },
    {
      geometry: new CylinderGeometry(0.42, 0.42, 1.4, 12, 1, false, 0, Math.PI),
      colour: "#f5ead6",
      position: [0, 0.75, 0],
      rotation: [0, 0, Math.PI / 2],
    },
    ...[
      [-0.45, 0.38],
      [0.45, 0.38],
      [-0.45, -0.38],
      [0.45, -0.38],
    ].map(([x, z]): ModelPart => ({
      geometry: new TorusGeometry(0.22, 0.05, 5, 12),
      colour: "#4a2f1a",
      position: [x, 0.25, z],
    })),
    {
      geometry: new CylinderGeometry(0.05, 0.06, 2, 6),
      colour: "#6b4423",
      position: [1.3, 1, 0.5],
    },
    ...[0, 1, 2].map((board): ModelPart => ({
      geometry: new BoxGeometry(0.75, 0.16, 0.04),
      colour: ["#fde68a", "#fca5a5", "#93c5fd"][board],
      position: [1.3, 1.75 - board * 0.25, 0.5],
      rotation: [0, board * 1.1 - 0.6, 0],
    })),
    {
      geometry: new CylinderGeometry(0.5, 0.5, 0.04, 16),
      colour: "#d6b582",
      position: [-1.3, 0.03, 0.6],
    },
    {
      geometry: new ConeGeometry(0.1, 0.8, 4),
      colour: "#dc2626",
      position: [-1.3, 0.07, 0.6],
      rotation: [Math.PI / 2, 0, 0],
    },
  ]);

const buildSteppedPyramidGeometry = (): BufferGeometry =>
  buildModelGeometry([
    ...Array.from({ length: 5 }, (_, step): ModelPart => ({
      geometry: new BoxGeometry(3 - step * 0.55, 0.45, 3 - step * 0.55),
      colour: step % 2 === 0 ? sandstone : "#cf9a5c",
      position: [0, 0.22 + step * 0.45, 0],
      roughen: 0.03,
    })),
    {
      geometry: new BoxGeometry(0.6, 2.25, 1.6),
      colour: "#e8c58f",
      position: [0, 0.6, 1.1],
      rotation: [-0.7, 0, 0],
    },
    {
      geometry: new ConeGeometry(0.4, 0.5, 4),
      colour: "#fbbf24",
      position: [0, 2.5, 0],
      rotation: [0, Math.PI / 4, 0],
    },
  ]);

const buildRelayMastGeometry = (): BufferGeometry =>
  buildModelGeometry([
    ...[
      [-0.3, -0.3],
      [0.3, -0.3],
      [-0.3, 0.3],
      [0.3, 0.3],
    ].map(([x, z]): ModelPart => ({
      geometry: new CylinderGeometry(0.03, 0.05, 3.4, 5),
      colour: "#94a3b8",
      position: [x * 0.6, 1.7, z * 0.6],
      rotation: [z * 0.12, 0, -x * 0.12],
    })),
    ...[0.6, 1.4, 2.2, 3].map((height): ModelPart => ({
      geometry: new BoxGeometry(
        0.42 - height * 0.06,
        0.04,
        0.42 - height * 0.06,
      ),
      colour: "#cbd5e1",
      position: [0, height, 0],
    })),
    {
      geometry: new SphereGeometry(
        0.5,
        14,
        8,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2.6,
      ),
      colour: "#f1f5f9",
      position: [0, 2.7, 0.35],
      rotation: [-1.1, 0, 0],
    },
    {
      geometry: new SphereGeometry(0.08, 8, 6),
      colour: "#ef4444",
      position: [0, 3.5, 0],
    },
    {
      geometry: new BoxGeometry(1, 0.05, 0.7),
      colour: "#1e3a8a",
      position: [1, 0.55, 0.3],
      rotation: [0.5, 0, 0],
    },
    {
      geometry: new BoxGeometry(0.08, 0.5, 0.08),
      colour: "#64748b",
      position: [1, 0.25, 0.3],
    },
  ]);

const buildObeliskGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new BoxGeometry(1.4, 0.3, 1.4),
      colour: "#b08d57",
      position: [0, 0.15, 0],
    },
    {
      geometry: new CylinderGeometry(0.28, 0.42, 3.6, 4),
      colour: "#d9b77a",
      position: [0, 2.1, 0],
      rotation: [0, Math.PI / 4, 0],
    },
    {
      geometry: new ConeGeometry(0.4, 0.5, 4),
      colour: "#facc15",
      position: [0, 4.15, 0],
      rotation: [0, Math.PI / 4, 0],
    },
    ...[0.9, 1.6, 2.3, 3].map((height): ModelPart => ({
      geometry: new BoxGeometry(0.16, 0.16, 0.04),
      colour: "#7c5a2e",
      position: [0, height, 0.3],
    })),
  ]);

const buildDesertCampGeometry = (): BufferGeometry =>
  buildModelGeometry([
    ...[
      [-1, -0.4, "#f97316"],
      [0.9, -0.6, "#e5e7eb"],
      [0, 0.9, "#0ea5e9"],
    ].flatMap(([x, z, colour]): ModelPart[] => [
      {
        geometry: new ConeGeometry(0.75, 1.1, 6),
        colour: String(colour),
        position: [Number(x), 0.55, Number(z)],
      },
      {
        geometry: new BoxGeometry(0.3, 0.45, 0.05),
        colour: "#3f2a1a",
        position: [Number(x), 0.23, Number(z) + 0.62],
      },
    ]),
    {
      geometry: new CylinderGeometry(0.32, 0.36, 0.12, 10),
      colour: "#57534e",
      position: [0, 0.06, -0.1],
    },
    {
      geometry: new ConeGeometry(0.2, 0.4, 6),
      colour: "#f59e0b",
      position: [0, 0.32, -0.1],
    },
  ]);

const buildDesertWellGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.75, 0.8, 0.7, 14, 1, true),
      colour: "#c2a477",
      position: [0, 0.35, 0],
    },
    {
      geometry: new CylinderGeometry(0.62, 0.62, 0.05, 14),
      colour: "#2563eb",
      position: [0, 0.5, 0],
    },
    ...[-1, 1].map((side): ModelPart => ({
      geometry: new BoxGeometry(0.12, 1.5, 0.12),
      colour: "#7c5a2e",
      position: [side * 0.7, 1, 0],
    })),
    {
      geometry: new CylinderGeometry(0.06, 0.06, 1.6, 6),
      colour: "#7c5a2e",
      position: [0, 1.7, 0],
      rotation: [0, 0, Math.PI / 2],
    },
    {
      geometry: new CylinderGeometry(0.14, 0.11, 0.24, 8),
      colour: "#9a3412",
      position: [0, 1.2, 0],
    },
    {
      geometry: new ConeGeometry(1.1, 0.5, 4),
      colour: "#b45309",
      position: [0, 2.05, 0],
      rotation: [0, Math.PI / 4, 0],
    },
  ]);

const sandsSights: IslandFeature[] = [
  {
    name: "obelisk",
    buildGeometry: buildObeliskGeometry,
    position: { x: -4.5, z: -1 },
    grain: "stone",
  },
  {
    name: "desert-camp",
    buildGeometry: buildDesertCampGeometry,
    position: { x: 11.5, z: -3.5 },
    turn: 0.6,
    grain: "timber",
  },
  {
    name: "desert-well",
    buildGeometry: buildDesertWellGeometry,
    position: { x: 21.5, z: 8 },
    grain: "stone",
  },
];

const sandsNewLandSightSpots: MapPoint[] = [
  { x: 49.5, z: -5.5 },
  { x: 70.5, z: 3 },
  { x: 40.5, z: 12.5 },
  { x: -49.5, z: 5.5 },
  { x: -60, z: 3 },
  { x: -40.5, z: 12.5 },
];

export const sandsLandmarks = {
  "oasis-fountain": {
    buildGeometry: buildOasisFountainGeometry,
    grain: "stone",
  },
  "scroll-bazaar": { buildGeometry: buildScrollBazaarGeometry, grain: "stone" },
  "mirage-prism": { buildGeometry: buildMiragePrismGeometry, grain: "metal" },
  "dune-drums": { buildGeometry: buildDuneDrumsGeometry, grain: "timber" },
  "caravan-signpost": {
    buildGeometry: buildCaravanSignpostGeometry,
    grain: "timber",
  },
  "stepped-pyramid": {
    buildGeometry: buildSteppedPyramidGeometry,
    grain: "stone",
  },
  "relay-mast": { buildGeometry: buildRelayMastGeometry, grain: "metal" },
} satisfies IslandLandmarkDesigns;

export const sunscorchSands: IslandLandform = {
  newLands: sandsNewLands,
  findHeight: findSandsHeight,
  paintGround: paintSandsGround,
  findDistanceToWater: (point) =>
    Math.min(
      findDistanceToSandsWater(point),
      findDistanceToNewLandRivers(point, sandsNewLands),
    ),
  waterCourses: [],
  pools: [oasisPool],
  listScatters: (keepClearOf, propPlaces, isClearOfTrailsAndAirfield) => {
    const clearOfTowns = [...keepClearOf, marketTownCentre, desertRuinsCentre];
    return [
      {
        name: "palms",
        things: [
          ...buildRing(
            oasisPool.centre,
            9,
            oasisPool.radius + 0.9,
            oasisPool.radius + 1.7,
          ).filter(
            (palm) =>
              keepClearOf.every(
                (place) => Math.hypot(palm.x - place.x, palm.z - place.z) > 3,
              ) &&
              isClearOfProps(palm, propPlaces) &&
              isClearOfTrailsAndAirfield(palm),
          ),
          ...scatterAcrossLand({
            count: 26,
            seed: 307,
            lowest: 0.15,
            highest: 0.7,
            keepClearOf: clearOfTowns,
            propPlaces,
            isClearOfTrailsAndAirfield,
            clearance: 3.2,
            findHeight: findSandsHeight,
            findDistanceToWater: findDistanceToSandsWater,
          }),
        ],
        buildGeometry: buildPalmGeometry,
        sink: 0.05,
        grain: "foliage",
      },
      {
        name: "sandstone-boulders",
        things: scatterAcrossLand({
          count: 60,
          seed: 311,
          lowest: 0.5,
          highest: 5,
          keepClearOf: clearOfTowns,
          propPlaces,
          isClearOfTrailsAndAirfield,
          clearance: 2.8,
          findHeight: findSandsHeight,
          findDistanceToWater: findDistanceToSandsWater,
        }),
        buildGeometry: buildSandstoneBoulderGeometry,
        sink: 0.1,
        grain: "stone",
      },
      {
        name: "market-houses",
        things: buildRing(marketTownCentre, 10, 2.4, 3.4),
        buildGeometry: buildFlatHouseGeometry,
        sink: 0.05,
        grain: "stone",
        tintSpread: 0.1,
      },
      {
        name: "ruined-columns",
        things: [
          ...buildRing(desertRuinsCentre, 9, 1.4, 2.3),
          ...buildRing({ x: -16, z: -7 }, 6, 3, 3.4),
        ],
        buildGeometry: buildBrokenColumnGeometry,
        sink: 0.05,
        grain: "stone",
      },
      {
        name: "camel-caravan",
        things: buildCaravan(),
        buildGeometry: buildCamelGeometry,
        sink: 0,
        grain: "timber",
        tintSpread: 0.08,
      },
    ];
  },
  features: [
    ...sandsSights,
    ...copySightsOntoNewLands(sandsSights, sandsNewLandSightSpots),
  ],
};
