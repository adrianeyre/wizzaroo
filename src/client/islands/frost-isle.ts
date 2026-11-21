import { raiseTunnelHills } from "./island-tunnel-hills.js";
import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  OctahedronGeometry,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
} from "three";
import {
  buildModelGeometry,
  type ModelPart,
  type Triple,
} from "../world-map-models.js";
import {
  buildSideLands,
  findDistanceToNewLandRivers,
  extendWithNewLands,
  findBump,
  findLayeredNoise,
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
  carveCourses,
  copySightsOntoNewLands,
  findCoastShare,
  findDistanceToCourses,
  sinkIntoSea,
  type IslandFeature,
  type IslandLandform,
  type IslandLandmarkDesigns,
  type WaterCourse,
} from "./island-landform.js";

const ice = "#bfe6f5";
const deepIce = "#7cc4e4";
const snow = "#f5f9fd";
const frostTimber = "#7a5236";

export const frozenChannel: WaterCourse = {
  name: "frozen-channel",
  kind: "ice",
  course: [
    { x: 14, z: -12 },
    { x: 12.4, z: -5 },
    { x: 11.6, z: 1 },
    { x: 12.2, z: 8 },
    { x: 13.4, z: 15 },
    { x: 14.5, z: 21 },
  ],
  halfWidth: 1,
};

export const iceBridgeCrossing: MapPoint = { x: 11.7, z: 1 };
export const iglooVillageCentre: MapPoint = { x: 7, z: 10 };

export const frostIslet: MapPoint = { x: -19, z: 16 };

const frostCoast = [
  { x: -6, z: 0, radiusX: 23, radiusZ: 16 },
  { x: 12, z: -2, radiusX: 15, radiusZ: 15 },
  { x: 6, z: 8, radiusX: 10, radiusZ: 9 },
  buildIsletBlob(frostIslet),
];

const frostPeaks = [
  { centre: { x: -15, z: -12 }, radius: 5, rise: 7.5 },
  { centre: { x: -5, z: -13 }, radius: 4.5, rise: 6 },
  { centre: { x: 6, z: -13.5 }, radius: 4, rise: 5.5 },
  { centre: { x: 19, z: -13 }, radius: 4.2, rise: 6 },
];

const findFrostCoreHeight = (point: MapPoint): number => {
  const landShare = findCoastShare(point, frostCoast);
  const drifts =
    1 +
    0.35 * Math.sin(point.x * 0.4 + point.z * 0.2) +
    0.6 * findLayeredNoise({ x: point.x * 0.16, z: point.z * 0.16 });
  const mountains = frostPeaks.reduce(
    (total, { centre, radius, rise }) =>
      total + rise * findBump(point, centre, radius),
    0,
  );
  const grottoMound = 1.6 * findBump(point, { x: -19, z: 1 }, 3.2);
  const land = sinkIntoSea(drifts + mountains + grottoMound, landShare);
  return carveCourses(land, point, [frozenChannel], 1.1);
};

export const frostNewLands = buildSideLands({
  eastJoinZ: -5,
  westJoinZ: -1.5,
  hillRise: 5,
  lakes: [
    { centre: { x: 53, z: -0.5 }, radius: 2.6 },
    { centre: { x: -49, z: -5 }, radius: 2.6 },
  ],
  rivers: [
    [
      { x: 57.2, z: -6.2 },
      { x: 59.2, z: -5.9 },
      { x: 61.2, z: -6.1 },
      { x: 63, z: -7 },
      { x: 64.5, z: -8.2 },
      { x: 66.1, z: -9.4 },
      { x: 68, z: -10.2 },
      { x: 70, z: -10.3 },
      { x: 71.4, z: -10.1 },
    ],
    [
      { x: -60, z: 8 },
      { x: -58.7, z: 6.5 },
      { x: -57, z: 5.4 },
      { x: -55.5, z: 4.1 },
      { x: -54.3, z: 2.5 },
      { x: -53.7, z: 0.6 },
      { x: -53.5, z: -1.4 },
      { x: -53.2, z: -3.4 },
      { x: -52.4, z: -5.2 },
      { x: -52.1, z: -5.6 },
    ],
  ],
});

export const frostAirfield: Airfield = {
  runway: { centre: { x: 40, z: -10 }, heading: 2.27, level: 1.14 },
  helipad: { centre: { x: 55, z: 13 }, heading: -1.8, level: 1.07 },
  balloonField: { centre: { x: -34, z: -1.5 }, heading: 1.53, level: 1.17 },
};

export const findFrostHeight = raiseTunnelHills(
  "frost-isle",
  levelAirfield(
    extendWithNewLands(findFrostCoreHeight, frostNewLands),
    frostAirfield,
  ),
);

const findDistanceToFrostWater = (point: MapPoint): number =>
  findDistanceToCourses(point, [frozenChannel]);

const channelIce = new Color(ice);

const paintFrostGround = buildGroundPainter({
  seabed: "#8fb4c4",
  deepSeabed: "#3d6478",
  shore: "#cbd8e3",
  lowland: "#eaf2f9",
  lowlandVariant: "#d7e5f1",
  upland: "#f7fbff",
  cliff: "#76869a",
  peak: "#ffffff",
  uplandHeight: 3,
  peakHeight: 5.5,
  paintExtras: (colour, point) => {
    const channel = findDistanceToFrostWater(point);
    colour.lerp(channelIce, (1 - smoothStep(0, 1.4, channel)) * 0.8);
  },
});

const buildSnowyPineGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.05, 0.09, 0.5, 6),
      colour: "#4a3324",
      position: [0, 0.25, 0],
    },
    ...[0, 1, 2].flatMap((tier): ModelPart[] => [
      {
        geometry: new ConeGeometry(0.6 - tier * 0.15, 0.8, 8),
        colour: ["#1f4a37", "#25543e", "#2c6046"][tier],
        position: [0, 0.6 + tier * 0.45, 0],
        roughen: 0.18,
      },
      {
        geometry: new ConeGeometry(0.46 - tier * 0.13, 0.32, 8),
        colour: snow,
        position: [0, 0.86 + tier * 0.45, 0],
      },
    ]),
  ]);

const buildIceChunkGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new IcosahedronGeometry(0.5, 0),
      colour: ice,
      position: [0, 0.2, 0],
      scale: [1.2, 0.8, 1],
      roughen: 0.4,
    },
    {
      geometry: new OctahedronGeometry(0.3, 0),
      colour: deepIce,
      position: [0.35, 0.3, 0.1],
      scale: [0.7, 1.6, 0.7],
    },
  ]);

const buildIglooGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new SphereGeometry(0.75, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      colour: "#f2f7fc",
    },
    ...[0.22, 0.44].map((height): ModelPart => ({
      geometry: new TorusGeometry(
        Math.sqrt(0.75 ** 2 - height ** 2),
        0.025,
        4,
        20,
      ),
      colour: "#c9dbea",
      position: [0, height, 0],
      rotation: [Math.PI / 2, 0, 0],
    })),
    {
      geometry: new CylinderGeometry(0.3, 0.3, 0.5, 10, 1, false, 0, Math.PI),
      colour: "#e6eff7",
      position: [0, 0.02, 0.72],
      rotation: [Math.PI / 2, 0, Math.PI / 2],
    },
    {
      geometry: new CylinderGeometry(0.2, 0.2, 0.52, 10, 1, false, 0, Math.PI),
      colour: "#29405a",
      position: [0, 0.02, 0.74],
      rotation: [Math.PI / 2, 0, Math.PI / 2],
    },
  ]);

const buildIglooVillage = (): ScatteredThing[] =>
  Array.from({ length: 8 }, (_, igloo) => {
    const angle = (igloo / 8) * Math.PI * 2;
    const reach = 1.8 + (igloo % 2) * 0.9;
    const point = {
      x: iglooVillageCentre.x + Math.cos(angle) * reach,
      z: iglooVillageCentre.z + Math.sin(angle) * reach,
    };
    return {
      ...point,
      height: findFrostHeight(point),
      scale: 0.9 + (igloo % 3) * 0.15,
      turn: Math.PI / 2 - angle,
    };
  });

const buildIceBridgeGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new TorusGeometry(2.3, 0.28, 8, 24, Math.PI),
      colour: ice,
      position: [0, -0.9, 0],
      scale: [1, 0.75, 1.6],
    },
    {
      geometry: new BoxGeometry(4.8, 0.18, 0.9),
      colour: "#e3f3fb",
      position: [0, 0.82, 0],
    },
    ...[-1, 1].flatMap((side) =>
      Array.from({ length: 6 }, (_, post): ModelPart => ({
        geometry: new ConeGeometry(0.07, 0.42, 5),
        colour: deepIce,
        position: [-2 + post * 0.8, 1.05, side * 0.42],
      })),
    ),
    ...Array.from({ length: 7 }, (_, icicle): ModelPart => ({
      geometry: new ConeGeometry(0.06, 0.4 + (icicle % 3) * 0.15, 5),
      colour: "#d9f1fb",
      position: [-1.8 + icicle * 0.6, 0.55 - (icicle % 3) * 0.07, 0],
      rotation: [Math.PI, 0, 0],
    })),
  ]);

const buildIcicleRow = (
  count: number,
  from: Triple,
  spacing: number,
  length: number,
): ModelPart[] =>
  Array.from({ length: count }, (_, icicle) => ({
    geometry: new ConeGeometry(0.05, length * (0.6 + (icicle % 3) * 0.25), 5),
    colour: "#dff3fb",
    position: [
      from[0] + icicle * spacing,
      from[1] - length * 0.4,
      from[2],
    ] satisfies Triple,
    rotation: [Math.PI, 0, 0] satisfies Triple,
  }));

const buildIceHarbourGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new BoxGeometry(2.6, 0.12, 0.8),
      colour: frostTimber,
      position: [0, 0.35, 0.4],
    },
    ...[-1.1, 0, 1.1].flatMap((x) =>
      [0.1, 0.7].map((z): ModelPart => ({
        geometry: new CylinderGeometry(0.06, 0.06, 0.6, 6),
        colour: "#5c3d28",
        position: [x, 0.1, z],
      })),
    ),
    {
      geometry: new TorusGeometry(1, 0.13, 8, 20, Math.PI),
      colour: ice,
      position: [0, 0.4, -0.4],
    },
    ...buildIcicleRow(6, [-0.75, 1.3, -0.4], 0.3, 0.45),
    {
      geometry: new BoxGeometry(0.8, 0.6, 0.7),
      colour: "#c0553c",
      position: [0.9, 0.71, 0.45],
    },
    {
      geometry: new ConeGeometry(0.62, 0.35, 4),
      colour: snow,
      position: [0.9, 1.18, 0.45],
      rotation: [0, Math.PI / 4, 0],
    },
    ...["#ef4444", "#facc15", "#22c55e", "#3b82f6"].map(
      (colour, buoy): ModelPart => ({
        geometry: new SphereGeometry(0.13, 10, 8),
        colour,
        position: [-1.2 + buoy * 0.4, 0.12, 1.15 + (buoy % 2) * 0.2],
      }),
    ),
  ]);

const buildSnowLibraryGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new BoxGeometry(2, 1.3, 1.4),
      colour: "#b9c7d8",
      position: [0, 0.65, 0],
      roughen: 0.04,
    },
    {
      geometry: new ConeGeometry(1.55, 0.9, 4),
      colour: "#4d5f7a",
      position: [0, 1.75, 0],
      rotation: [0, Math.PI / 4, 0],
      scale: [1, 1, 0.75],
    },
    {
      geometry: new ConeGeometry(1.45, 0.45, 4),
      colour: snow,
      position: [0, 2.05, 0],
      rotation: [0, Math.PI / 4, 0],
      scale: [1, 1, 0.75],
    },
    {
      geometry: new CylinderGeometry(0.3, 0.3, 0.06, 16),
      colour: "#ffd27a",
      position: [0, 1, 0.71],
      rotation: [Math.PI / 2, 0, 0],
    },
    {
      geometry: new BoxGeometry(0.45, 0.65, 0.06),
      colour: "#5a3a27",
      position: [0, 0.33, 0.71],
    },
    ...["#dc2626", "#2563eb", "#16a34a", "#f59e0b"].map(
      (colour, book): ModelPart => ({
        geometry: new BoxGeometry(0.7, 0.16, 0.5),
        colour,
        position: [1.45, 0.08 + book * 0.16, 0.55],
        rotation: [0, book * 0.25, 0],
      }),
    ),
    ...buildIcicleRow(7, [-0.9, 1.3, 0.72], 0.3, 0.3),
  ]);

const buildIceGrottoGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new IcosahedronGeometry(1.4, 1),
      colour: "#8aa3b8",
      position: [0, 0.4, -0.2],
      scale: [1.3, 0.9, 1],
      roughen: 0.35,
      isSmooth: true,
    },
    {
      geometry: new CylinderGeometry(0.6, 0.6, 0.4, 14, 1, false, 0, Math.PI),
      colour: "#1c2c40",
      position: [0, 0.3, 0.95],
      rotation: [Math.PI / 2, 0, Math.PI / 2],
    },
    ...[
      [-0.9, 0.9, 0.5, 0.9],
      [0.8, 1.1, 0.4, 1.1],
      [0.2, 1.5, -0.3, 1.3],
      [-0.4, 0.7, 1, 0.7],
      [1.2, 0.5, 0.7, 0.8],
    ].map(([x, y, z, size]): ModelPart => ({
      geometry: new OctahedronGeometry(0.28, 0),
      colour: size > 1 ? deepIce : ice,
      position: [x, y, z],
      scale: [0.7 * size, 2 * size, 0.7 * size],
      rotation: [x * 0.4, 0, z * 0.3],
    })),
  ]);

const buildAuroraLabGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(1.1, 1.2, 0.9, 16),
      colour: "#d7dee8",
      position: [0, 0.45, 0],
    },
    {
      geometry: new SphereGeometry(
        1.05,
        18,
        10,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2,
      ),
      colour: "#7fdcf0",
      position: [0, 0.9, 0],
    },
    {
      geometry: new TorusGeometry(1.06, 0.05, 6, 24),
      colour: "#64748b",
      position: [0, 0.92, 0],
      rotation: [Math.PI / 2, 0, 0],
    },
    {
      geometry: new CylinderGeometry(0.03, 0.03, 1.1, 6),
      colour: "#94a3b8",
      position: [0, 2.4, 0],
    },
    {
      geometry: new SphereGeometry(0.09, 10, 8),
      colour: "#a855f7",
      position: [0, 2.98, 0],
    },
    ...["#22d3ee", "#a3e635", "#f472b6"].flatMap(
      (colour, flask): ModelPart[] => [
        {
          geometry: new SphereGeometry(0.18, 10, 8),
          colour,
          position: [1.35, 0.18, -0.45 + flask * 0.45],
        },
        {
          geometry: new CylinderGeometry(0.05, 0.05, 0.22, 6),
          colour: "#e2e8f0",
          position: [1.35, 0.42, -0.45 + flask * 0.45],
        },
      ],
    ),
  ]);

const buildFrozenWaterfallGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new BoxGeometry(2.6, 2.6, 1),
      colour: "#6f7f92",
      position: [0, 1.3, -0.6],
      roughen: 0.25,
    },
    {
      geometry: new BoxGeometry(2.7, 0.25, 1.2),
      colour: snow,
      position: [0, 2.65, -0.55],
      roughen: 0.2,
    },
    ...Array.from({ length: 5 }, (_, column): ModelPart => ({
      geometry: new CylinderGeometry(0.16, 0.24, 2.4, 7),
      colour: column % 2 === 0 ? ice : "#d6f0fa",
      position: [-0.6 + column * 0.3, 1.25, 0],
      roughen: 0.15,
    })),
    {
      geometry: new CylinderGeometry(1.1, 1.2, 0.12, 18),
      colour: "#a9dcef",
      position: [0, 0.06, 0.6],
    },
    {
      geometry: new BoxGeometry(2.2, 0.08, 0.08),
      colour: frostTimber,
      position: [0, 1.9, 0.75],
    },
    ...Array.from({ length: 6 }, (_, chime): ModelPart => ({
      geometry: new CylinderGeometry(0.05, 0.05, 0.4 + chime * 0.12, 6),
      colour: [
        "#e0f2fe",
        "#bae6fd",
        "#a5b4fc",
        "#c4b5fd",
        "#f0abfc",
        "#fbcfe8",
      ][chime],
      position: [-0.9 + chime * 0.36, 1.66 - chime * 0.06, 0.75],
    })),
  ]);

const buildPolarLookoutGeometry = (): BufferGeometry =>
  buildModelGeometry([
    ...[
      [-0.5, -0.5],
      [0.5, -0.5],
      [-0.5, 0.5],
      [0.5, 0.5],
    ].map(([x, z]): ModelPart => ({
      geometry: new CylinderGeometry(0.07, 0.09, 2.4, 6),
      colour: frostTimber,
      position: [x, 1.2, z],
    })),
    {
      geometry: new BoxGeometry(1.5, 0.12, 1.5),
      colour: "#8a6142",
      position: [0, 2.4, 0],
    },
    {
      geometry: new BoxGeometry(1.1, 0.7, 1.1),
      colour: "#b4472f",
      position: [0, 2.8, 0],
    },
    {
      geometry: new ConeGeometry(0.98, 0.55, 4),
      colour: snow,
      position: [0, 3.42, 0],
      rotation: [0, Math.PI / 4, 0],
    },
    {
      geometry: new CylinderGeometry(0.07, 0.1, 0.8, 8),
      colour: "#475569",
      position: [0.65, 2.75, 0.4],
      rotation: [0, 0, Math.PI / 2.6],
    },
    {
      geometry: new CylinderGeometry(0.02, 0.02, 1.1, 5),
      colour: "#cbd5e1",
      position: [0, 4.1, 0],
    },
    {
      geometry: new BoxGeometry(0.5, 0.3, 0.02),
      colour: "#ef4444",
      position: [0.25, 4.45, 0],
    },
  ]);

const buildIceFortGeometry = (): BufferGeometry =>
  buildModelGeometry([
    ...[0, 1, 2, 3].map((wall): ModelPart => ({
      geometry: new BoxGeometry(2.2, 0.9, 0.3),
      colour: "#cfe9f4",
      position: [
        Math.sin((wall * Math.PI) / 2) * 1.05,
        0.45,
        Math.cos((wall * Math.PI) / 2) * 1.05,
      ],
      rotation: [0, (wall * Math.PI) / 2, 0],
    })),
    ...[
      [-1.1, -1.1],
      [1.1, -1.1],
      [-1.1, 1.1],
      [1.1, 1.1],
    ].flatMap(([x, z]): ModelPart[] => [
      {
        geometry: new CylinderGeometry(0.38, 0.42, 1.5, 10),
        colour: ice,
        position: [x, 0.75, z],
      },
      ...Array.from({ length: 5 }, (_, merlon): ModelPart => ({
        geometry: new BoxGeometry(0.16, 0.18, 0.16),
        colour: "#e8f6fb",
        position: [
          x + Math.cos((merlon / 5) * Math.PI * 2) * 0.32,
          1.58,
          z + Math.sin((merlon / 5) * Math.PI * 2) * 0.32,
        ],
      })),
    ]),
    {
      geometry: new BoxGeometry(0.5, 0.6, 0.34),
      colour: "#2e4a66",
      position: [0, 0.3, 1.06],
    },
    {
      geometry: new CylinderGeometry(0.025, 0.025, 1, 5),
      colour: "#cbd5e1",
      position: [1.1, 2, 1.1],
    },
    {
      geometry: new BoxGeometry(0.45, 0.28, 0.02),
      colour: "#5ec8f2",
      position: [1.33, 2.35, 1.1],
    },
  ]);

const buildSnowbotWorksGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new BoxGeometry(1.8, 1.1, 1.3),
      colour: "#64748b",
      position: [-0.3, 0.55, 0],
    },
    {
      geometry: new BoxGeometry(2, 0.2, 1.5),
      colour: snow,
      position: [-0.3, 1.2, 0],
    },
    {
      geometry: new CylinderGeometry(0.14, 0.16, 0.8, 8),
      colour: "#334155",
      position: [-0.9, 1.6, -0.3],
    },
    {
      geometry: new TorusGeometry(0.32, 0.08, 6, 12),
      colour: "#f59e0b",
      position: [-0.3, 0.65, 0.68],
    },
    {
      geometry: new SphereGeometry(0.42, 14, 10),
      colour: snow,
      position: [1.05, 0.4, 0.3],
    },
    {
      geometry: new SphereGeometry(0.3, 14, 10),
      colour: snow,
      position: [1.05, 0.98, 0.3],
    },
    {
      geometry: new BoxGeometry(0.42, 0.34, 0.36),
      colour: "#94a3b8",
      position: [1.05, 1.42, 0.3],
    },
    ...[-0.1, 0.1].map((x): ModelPart => ({
      geometry: new SphereGeometry(0.05, 8, 6),
      colour: "#22d3ee",
      position: [1.05 + x, 1.45, 0.49],
    })),
    {
      geometry: new CylinderGeometry(0.015, 0.015, 0.3, 4),
      colour: "#cbd5e1",
      position: [1.05, 1.74, 0.3],
    },
    {
      geometry: new SphereGeometry(0.05, 8, 6),
      colour: "#ef4444",
      position: [1.05, 1.9, 0.3],
    },
  ]);

const buildPenguinColonyGeometry = (): BufferGeometry =>
  buildModelGeometry(
    [
      [0, 0, 1],
      [0.7, 0.3, 0.9],
      [-0.6, 0.4, 0.95],
      [0.3, -0.7, 0.8],
      [-0.4, -0.6, 1.05],
      [1.1, -0.4, 0.6],
      [-1.1, -0.2, 0.55],
    ].flatMap(([x, z, size]): ModelPart[] => [
      {
        geometry: new SphereGeometry(0.22 * size, 10, 8),
        colour: "#1f2937",
        position: [x, 0.3 * size, z],
        scale: [1, 1.5, 0.9],
      },
      {
        geometry: new SphereGeometry(0.17 * size, 10, 8),
        colour: snow,
        position: [x, 0.28 * size, z + 0.08 * size],
        scale: [0.9, 1.4, 0.8],
      },
      {
        geometry: new SphereGeometry(0.13 * size, 10, 8),
        colour: "#111827",
        position: [x, 0.66 * size, z],
      },
      {
        geometry: new ConeGeometry(0.04 * size, 0.14 * size, 5),
        colour: "#f59e0b",
        position: [x, 0.64 * size, z + 0.15 * size],
        rotation: [Math.PI / 2, 0, 0],
      },
    ]),
  );

const buildSnowmanFamilyGeometry = (): BufferGeometry =>
  buildModelGeometry(
    [
      [-0.8, 0, 1],
      [0.5, 0.2, 0.8],
      [1.3, -0.3, 0.55],
    ].flatMap(([x, z, size]): ModelPart[] => [
      {
        geometry: new SphereGeometry(0.5 * size, 12, 10),
        colour: snow,
        position: [x, 0.42 * size, z],
      },
      {
        geometry: new SphereGeometry(0.36 * size, 12, 10),
        colour: snow,
        position: [x, 1.1 * size, z],
      },
      {
        geometry: new SphereGeometry(0.26 * size, 12, 10),
        colour: snow,
        position: [x, 1.6 * size, z],
      },
      {
        geometry: new ConeGeometry(0.05 * size, 0.3 * size, 6),
        colour: "#f97316",
        position: [x, 1.6 * size, z + 0.36 * size],
        rotation: [Math.PI / 2, 0, 0],
      },
      {
        geometry: new TorusGeometry(0.3 * size, 0.07 * size, 6, 14),
        colour: ["#dc2626", "#2563eb", "#16a34a"][Math.round(size * 10) % 3],
        position: [x, 1.38 * size, z],
        rotation: [Math.PI / 2, 0, 0],
      },
      {
        geometry: new CylinderGeometry(0.18 * size, 0.2 * size, 0.3 * size, 10),
        colour: "#1f2937",
        position: [x, 1.9 * size, z],
      },
    ]),
  );

const buildResearchHutGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(1, 1, 2.4, 14, 1, false, 0, Math.PI),
      colour: "#ef4444",
      position: [0, 0.05, 0],
      rotation: [Math.PI / 2, 0, Math.PI / 2],
    },
    {
      geometry: new BoxGeometry(0.5, 0.75, 0.05),
      colour: "#1e293b",
      position: [0, 0.4, 1.22],
    },
    {
      geometry: new CylinderGeometry(0.03, 0.03, 1.6, 5),
      colour: "#cbd5e1",
      position: [0.9, 1.6, -0.6],
    },
    ...[0, 1, 2].map((cup): ModelPart => ({
      geometry: new SphereGeometry(0.1, 8, 6),
      colour: "#e2e8f0",
      position: [
        0.9 + Math.cos((cup * Math.PI * 2) / 3) * 0.25,
        2.35,
        -0.6 + Math.sin((cup * Math.PI * 2) / 3) * 0.25,
      ],
    })),
    {
      geometry: new BoxGeometry(2.6, 0.12, 1.1),
      colour: snow,
      position: [0, 1.02, 0],
      scale: [1, 1, 1.6],
    },
    {
      geometry: new BoxGeometry(0.9, 0.12, 0.5),
      colour: frostTimber,
      position: [-1.7, 0.1, 0.8],
    },
  ]);

const frostSights: IslandFeature[] = [
  {
    name: "penguin-colony",
    buildGeometry: buildPenguinColonyGeometry,
    position: { x: -21, z: 15 },
    grain: "ground",
  },
  {
    name: "snowman-family",
    buildGeometry: buildSnowmanFamilyGeometry,
    position: { x: -10, z: 7.5 },
    turn: 0.4,
    grain: "ground",
  },
  {
    name: "research-hut",
    buildGeometry: buildResearchHutGeometry,
    position: { x: 0.5, z: -3 },
    turn: -0.5,
    grain: "metal",
  },
];

const frostNewLandSightSpots: MapPoint[] = [
  { x: 71, z: -2 },
  { x: 43.5, z: -2 },
  { x: 38, z: 10.5 },
  { x: -60, z: -1.5 },
  { x: -40.5, z: 12.5 },
  { x: -47.5, z: 5.5 },
];

export const frostLandmarks = {
  "ice-harbour": { buildGeometry: buildIceHarbourGeometry, grain: "timber" },
  "snow-library": { buildGeometry: buildSnowLibraryGeometry, grain: "stone" },
  "ice-grotto": { buildGeometry: buildIceGrottoGeometry, grain: "stone" },
  "aurora-lab": { buildGeometry: buildAuroraLabGeometry, grain: "metal" },
  "frozen-waterfall": {
    buildGeometry: buildFrozenWaterfallGeometry,
    grain: "stone",
  },
  "polar-lookout": {
    buildGeometry: buildPolarLookoutGeometry,
    grain: "timber",
  },
  "ice-fort": { buildGeometry: buildIceFortGeometry, grain: "stone" },
  "snowbot-works": { buildGeometry: buildSnowbotWorksGeometry, grain: "metal" },
} satisfies IslandLandmarkDesigns;

export const frostIsle: IslandLandform = {
  newLands: frostNewLands,
  findHeight: findFrostHeight,
  paintGround: paintFrostGround,
  findDistanceToWater: (point) =>
    Math.min(
      findDistanceToFrostWater(point),
      findDistanceToNewLandRivers(point, frostNewLands),
    ),
  waterCourses: [frozenChannel],
  pools: [],
  listScatters: (keepClearOf, propPlaces, isClearOfTrailsAndAirfield) => {
    const clearOfVillage = [
      ...keepClearOf,
      iglooVillageCentre,
      iceBridgeCrossing,
    ];
    return [
      {
        name: "snowy-pines",
        things: scatterAcrossLand({
          count: 170,
          seed: 211,
          lowest: 0.9,
          highest: 4.6,
          keepClearOf: clearOfVillage,
          propPlaces,
          isClearOfTrailsAndAirfield,
          clearance: 3.6,
          findHeight: findFrostHeight,
          findDistanceToWater: findDistanceToFrostWater,
        }),
        buildGeometry: buildSnowyPineGeometry,
        sink: 0.05,
        grain: "foliage",
      },
      {
        name: "ice-chunks",
        things: scatterAcrossLand({
          count: 40,
          seed: 223,
          lowest: 0.2,
          highest: 6,
          keepClearOf: clearOfVillage,
          propPlaces,
          isClearOfTrailsAndAirfield,
          clearance: 3,
          findHeight: findFrostHeight,
          findDistanceToWater: findDistanceToFrostWater,
        }),
        buildGeometry: buildIceChunkGeometry,
        sink: 0.1,
        grain: "stone",
      },
      {
        name: "igloos",
        things: buildIglooVillage(),
        buildGeometry: buildIglooGeometry,
        sink: 0.05,
        grain: "stone",
        tintSpread: 0.06,
      },
    ];
  },
  features: [
    {
      name: "ice-bridge",
      buildGeometry: buildIceBridgeGeometry,
      position: iceBridgeCrossing,
      lift: 0.3,
      grain: "stone",
    },
    ...frostSights,
    ...copySightsOntoNewLands(frostSights, frostNewLandSightSpots),
  ],
};
