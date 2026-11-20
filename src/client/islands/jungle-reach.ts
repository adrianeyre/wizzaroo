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
  levelAirfield,
  scatterAcrossLand,
  smoothStep,
  type Airfield,
  type MapPoint,
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

const mossyStone = "#7d8a6a";
const leafGreen = "#2f7a32";
const vineGreen = "#3f9a3a";
const bark = "#5b3a22";

export const plateauCentre: MapPoint = { x: -3, z: -11 };
export const fallsTop: MapPoint = { x: -1.6, z: -7.4 };
export const fallsBottom: MapPoint = { x: -0.6, z: -4.6 };
export const deltaFork: MapPoint = { x: 8.5, z: 8 };

export const jungleRivers: WaterCourse[] = [
  {
    name: "upper-river",
    kind: "river",
    course: [{ x: -2.4, z: -12 }, { x: -2, z: -9.6 }, fallsTop],
    halfWidth: 0.55,
  },
  {
    name: "lower-river",
    kind: "river",
    course: [fallsBottom, { x: 1.6, z: -0.4 }, { x: 5.6, z: 3.8 }, deltaFork],
    halfWidth: 0.75,
  },
  {
    name: "delta-west",
    kind: "river",
    course: [deltaFork, { x: 7.2, z: 12 }, { x: 6.6, z: 17 }],
    halfWidth: 0.6,
  },
  {
    name: "delta-middle",
    kind: "river",
    course: [deltaFork, { x: 11.6, z: 11.8 }, { x: 13.6, z: 17 }],
    halfWidth: 0.6,
  },
  {
    name: "delta-east",
    kind: "river",
    course: [deltaFork, { x: 15.4, z: 10.2 }, { x: 21, z: 12.6 }],
    halfWidth: 0.6,
  },
];

export const ropeBridgeCrossings: { at: MapPoint; turn: number }[] = [
  { at: { x: 3.6, z: 1.7 }, turn: Math.PI / 4 },
  { at: { x: 10.1, z: 10 }, turn: 0.72 },
];

export const jungleIslet: MapPoint = { x: -21, z: 14 };

const jungleCoast = [
  { x: -3, z: 1, radiusX: 24, radiusZ: 15 },
  { x: 12, z: -4, radiusX: 13, radiusZ: 12 },
  buildIsletBlob(jungleIslet),
];

const findJungleCoreHeight = (point: MapPoint): number => {
  const landShare = findCoastShare(point, jungleCoast);
  const lowland =
    0.9 +
    0.3 * Math.sin(point.x * 0.5) * Math.cos(point.z * 0.45) +
    0.6 * findLayeredNoise({ x: point.x * 0.2, z: point.z * 0.2 });
  const plateauReach = Math.hypot(
    point.x - plateauCentre.x,
    point.z - plateauCentre.z,
  );
  const plateau = 4.2 * (1 - smoothStep(4.4, 6.2, plateauReach));
  const ridge = 3.4 * findBump(point, { x: 18, z: -9.5 }, 4.2);
  const templeHill = 1.1 * findBump(point, { x: -17, z: -4 }, 3.6);
  const land = sinkIntoSea(lowland + plateau + ridge + templeHill, landShare);
  return carveCourses(land, point, jungleRivers, 0.8);
};

export const jungleNewLands = buildSideLands({
  eastJoinZ: -6,
  westJoinZ: 0,
  hillRise: 4,
  lakes: [
    { centre: { x: 55.5, z: 4.5 }, radius: 2.6 },
    { centre: { x: -50, z: -5.5 }, radius: 2.6 },
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
      { x: -59.8, z: 7.2 },
      { x: -58.5, z: 5.8 },
      { x: -56.9, z: 4.6 },
      { x: -55.3, z: 3.3 },
      { x: -54.2, z: 1.7 },
      { x: -53.6, z: -0.2 },
      { x: -53.4, z: -2.2 },
      { x: -53.1, z: -4.1 },
      { x: -52.9, z: -4.6 },
    ],
  ],
});

export const jungleAirfield: Airfield = {
  runway: { centre: { x: 40, z: -10 }, heading: 2.27, level: 1.14 },
  helipad: { centre: { x: 68, z: -3 }, heading: -1.53, level: 1.19 },
  balloonField: { centre: { x: -33.5, z: 3 }, heading: 1.66, level: 1.12 },
};

export const findJungleHeight = raiseTunnelHills(
  "jungle-reach",
  levelAirfield(
    extendWithNewLands(findJungleCoreHeight, jungleNewLands),
    jungleAirfield,
  ),
);

const findDistanceToJungleWater = (point: MapPoint): number =>
  findDistanceToCourses(point, jungleRivers);

const riverMud = new Color("#6f5a3a");

const paintJungleGround = buildGroundPainter({
  seabed: "#aaa27a",
  deepSeabed: "#1f6f6a",
  shore: "#d8c48e",
  lowland: "#3b7d31",
  lowlandVariant: "#2b6427",
  upland: "#58843a",
  cliff: "#5b4c3b",
  peak: "#58843a",
  uplandHeight: 3.6,
  peakHeight: 99,
  paintExtras: (colour, point, height) => {
    const fromRiver = findDistanceToJungleWater(point);
    colour.lerp(
      riverMud,
      height > 0 ? (1 - smoothStep(0.3, 1.2, fromRiver)) * 0.85 : 0,
    );
  },
});

const buildJungleTreeGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.08, 0.16, 1.8, 7),
      colour: "#6b4a2f",
      position: [0, 0.9, 0],
    },
    ...[
      { at: [0, 1.9, 0], size: 0.75, colour: "#2a6b2c" },
      { at: [0.45, 1.65, 0.2], size: 0.5, colour: "#347a33" },
      { at: [-0.4, 1.7, -0.25], size: 0.55, colour: "#245e27" },
    ].map(({ at, size, colour }): ModelPart => ({
      geometry: new IcosahedronGeometry(size, 1),
      colour,
      position: [at[0], at[1], at[2]],
      scale: [1.25, 0.6, 1.25],
      roughen: 0.3,
      isSmooth: true,
    })),
  ]);

const buildFernGeometry = (): BufferGeometry =>
  buildModelGeometry(
    Array.from({ length: 5 }, (_, frond): ModelPart => {
      const angle = (frond / 5) * Math.PI * 2;
      return {
        geometry: new ConeGeometry(0.1, 0.7, 4),
        colour: frond % 2 === 0 ? "#3f9a3a" : "#2f8030",
        position: [Math.cos(angle) * 0.22, 0.2, Math.sin(angle) * 0.22],
        rotation: [Math.sin(angle) * 1.1, 0, -Math.cos(angle) * 1.1],
        scale: [1, 1, 0.35],
      };
    }),
  );

const buildRopeBridgeGeometry = (): BufferGeometry =>
  buildModelGeometry([
    ...Array.from({ length: 13 }, (_, plank): ModelPart => {
      const along = plank / 12 - 0.5;
      return {
        geometry: new BoxGeometry(0.28, 0.05, 0.8),
        colour: plank % 2 === 0 ? "#8b6440" : "#9c7149",
        position: [along * 4.2, -0.35 * Math.cos(along * Math.PI) + 0.35, 0],
      };
    }),
    ...[-1, 1].flatMap((side) =>
      [-2.1, 2.1].map((x): ModelPart => ({
        geometry: new CylinderGeometry(0.06, 0.07, 0.9, 6),
        colour: bark,
        position: [x, 0.45, side * 0.42],
      })),
    ),
    ...[-1, 1].map((side): ModelPart => ({
      geometry: new TorusGeometry(2.2, 0.025, 4, 20, Math.PI),
      colour: "#c8a26a",
      position: [0, 0.95, side * 0.42],
      rotation: [Math.PI, 0, 0],
      scale: [0.96, 0.28, 1],
    })),
  ]);

const buildMonkeyFallsGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new IcosahedronGeometry(1.1, 1),
      colour: mossyStone,
      position: [0, 0.7, -0.5],
      scale: [1.4, 1.2, 0.9],
      roughen: 0.3,
      isSmooth: true,
    },
    ...Array.from({ length: 4 }, (_, step): ModelPart => ({
      geometry: new BoxGeometry(0.7, 0.45, 0.12),
      colour: step % 2 === 0 ? "#7dd3fc" : "#bae6fd",
      position: [0, 1.6 - step * 0.42, 0.25 + step * 0.12],
      rotation: [0.25, 0, 0],
    })),
    {
      geometry: new CylinderGeometry(0.9, 1, 0.1, 18),
      colour: "#38bdf8",
      position: [0, 0.05, 0.9],
    },
    {
      geometry: new CylinderGeometry(0.08, 0.12, 2.4, 6),
      colour: bark,
      position: [1.3, 1.2, 0.3],
      rotation: [0, 0, -0.15],
    },
    {
      geometry: new IcosahedronGeometry(0.6, 1),
      colour: leafGreen,
      position: [1.45, 2.45, 0.3],
      scale: [1.3, 0.5, 1.3],
      isSmooth: true,
    },
    {
      geometry: new SphereGeometry(0.2, 10, 8),
      colour: "#7c4a26",
      position: [1.1, 1.8, 0.45],
    },
    {
      geometry: new SphereGeometry(0.14, 10, 8),
      colour: "#7c4a26",
      position: [1.1, 2.08, 0.5],
    },
    {
      geometry: new SphereGeometry(0.09, 8, 6),
      colour: "#e9c9a0",
      position: [1.1, 2.06, 0.62],
    },
    ...[0, 1, 2].map((banana): ModelPart => ({
      geometry: new CylinderGeometry(0.04, 0.03, 0.28, 5),
      colour: "#facc15",
      position: [1.55 + banana * 0.07, 2.1, 0.45],
      rotation: [0, 0, 0.5 + banana * 0.15],
    })),
  ]);

const buildStoryvineShrineGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.55, 0.8, 2.6, 10),
      colour: "#6b4a2f",
      position: [0, 1.3, -0.3],
      roughen: 0.12,
    },
    {
      geometry: new IcosahedronGeometry(1.3, 1),
      colour: leafGreen,
      position: [0, 2.9, -0.3],
      scale: [1.3, 0.7, 1.3],
      roughen: 0.3,
      isSmooth: true,
    },
    {
      geometry: new BoxGeometry(0.55, 0.85, 0.2),
      colour: "#2a1a10",
      position: [0, 0.45, 0.36],
    },
    ...Array.from({ length: 8 }, (_, vine): ModelPart => {
      const angle = (vine / 8) * Math.PI * 2;
      return {
        geometry: new CylinderGeometry(0.025, 0.025, 1.2 + (vine % 3) * 0.3, 4),
        colour: vineGreen,
        position: [
          Math.cos(angle) * 1.25,
          1.9 - (vine % 3) * 0.15,
          Math.sin(angle) * 1.25 - 0.3,
        ],
      };
    }),
    {
      geometry: new BoxGeometry(0.5, 0.06, 0.65),
      colour: "#fef3c7",
      position: [-0.28, 0.6, 1],
      rotation: [0, 0, 0.25],
    },
    {
      geometry: new BoxGeometry(0.5, 0.06, 0.65),
      colour: "#fde68a",
      position: [0.28, 0.6, 1],
      rotation: [0, 0, -0.25],
    },
    {
      geometry: new BoxGeometry(0.3, 0.5, 0.3),
      colour: mossyStone,
      position: [0, 0.25, 1],
    },
  ]);

const buildOrchidGlasshouseGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new BoxGeometry(2.2, 0.15, 1.6),
      colour: mossyStone,
      position: [0, 0.07, 0],
    },
    {
      geometry: new BoxGeometry(2, 1.1, 1.4),
      colour: "#c9f1e8",
      position: [0, 0.7, 0],
    },
    {
      geometry: new CylinderGeometry(0.7, 0.7, 2, 14, 1, false, 0, Math.PI),
      colour: "#dff7f1",
      position: [0, 1.25, 0],
      rotation: [0, 0, Math.PI / 2],
    },
    ...[-0.7, 0, 0.7].map((x): ModelPart => ({
      geometry: new TorusGeometry(0.7, 0.03, 4, 14, Math.PI),
      colour: "#e2e8f0",
      position: [x, 1.25, 0],
      rotation: [0, Math.PI / 2, 0],
    })),
    ...[
      { x: 1.4, z: 0.6, colour: "#ec4899" },
      { x: 1.5, z: -0.4, colour: "#a855f7" },
      { x: -1.4, z: 0.7, colour: "#f472b6" },
    ].flatMap(({ x, z, colour }): ModelPart[] => [
      {
        geometry: new CylinderGeometry(0.03, 0.04, 0.9, 5),
        colour: "#3f7a2a",
        position: [x, 0.45, z],
      },
      ...Array.from({ length: 5 }, (_, petal): ModelPart => ({
        geometry: new SphereGeometry(0.16, 8, 6),
        colour,
        position: [
          x + Math.cos((petal / 5) * Math.PI * 2) * 0.17,
          0.95,
          z + Math.sin((petal / 5) * Math.PI * 2) * 0.17,
        ],
        scale: [1, 0.4, 0.6],
      })),
    ]),
  ]);

const buildBambooDrumsGeometry = (): BufferGeometry =>
  buildModelGeometry([
    ...Array.from({ length: 7 }, (_, pole): ModelPart => ({
      geometry: new CylinderGeometry(0.07, 0.07, 1.2 + pole * 0.25, 6, 3),
      colour: pole % 2 === 0 ? "#86b33a" : "#9cc54a",
      position: [-1.1 + pole * 0.22, (1.2 + pole * 0.25) / 2, -0.6],
    })),
    {
      geometry: new CylinderGeometry(0.45, 0.45, 1.4, 12),
      colour: "#8a5a32",
      position: [0.5, 0.45, 0.4],
      rotation: [0, 0.3, Math.PI / 2],
    },
    {
      geometry: new BoxGeometry(0.9, 0.06, 0.12),
      colour: "#2a1a10",
      position: [0.5, 0.9, 0.4],
      rotation: [0, 0.3, 0],
    },
    ...[
      [-0.6, 0.6, 0.35],
      [-0.1, 0.9, 0.28],
    ].flatMap(([x, z, radius]): ModelPart[] => [
      {
        geometry: new CylinderGeometry(radius, radius * 0.8, 0.6, 12),
        colour: "#b45309",
        position: [x, 0.3, z],
      },
      {
        geometry: new CylinderGeometry(radius, radius, 0.04, 12),
        colour: "#fde7c0",
        position: [x, 0.62, z],
      },
    ]),
  ]);

const buildStiltMapworksGeometry = (): BufferGeometry =>
  buildModelGeometry([
    ...[
      [-0.6, -0.5],
      [0.6, -0.5],
      [-0.6, 0.5],
      [0.6, 0.5],
    ].map(([x, z]): ModelPart => ({
      geometry: new CylinderGeometry(0.06, 0.07, 1.2, 6),
      colour: bark,
      position: [x, 0.6, z],
    })),
    {
      geometry: new BoxGeometry(1.6, 0.1, 1.4),
      colour: "#8b6440",
      position: [0, 1.2, 0],
    },
    {
      geometry: new BoxGeometry(1.2, 0.75, 1),
      colour: "#c9a46b",
      position: [0, 1.62, 0],
    },
    {
      geometry: new ConeGeometry(1.1, 0.8, 8),
      colour: "#b88a3c",
      position: [0, 2.4, 0],
    },
    {
      geometry: new CylinderGeometry(0.12, 0.12, 1.1, 10),
      colour: "#fef3c7",
      position: [0.95, 1.35, 0.6],
      rotation: [0, 0, Math.PI / 2],
    },
    ...["#ef4444", "#3b82f6", "#facc15"].flatMap(
      (colour, flag): ModelPart[] => [
        {
          geometry: new CylinderGeometry(0.015, 0.015, 0.7, 4),
          colour: "#e5e7eb",
          position: [-1.1 + flag * 0.25, 0.35, 1 - flag * 0.3],
        },
        {
          geometry: new ConeGeometry(0.1, 0.22, 3),
          colour,
          position: [-1.02 + flag * 0.25, 0.62, 1 - flag * 0.3],
          rotation: [0, 0, -Math.PI / 2],
        },
      ],
    ),
  ]);

const buildOvergrownTempleGeometry = (): BufferGeometry =>
  buildModelGeometry([
    ...Array.from({ length: 4 }, (_, tier): ModelPart => ({
      geometry: new BoxGeometry(2.8 - tier * 0.6, 0.55, 2.8 - tier * 0.6),
      colour: tier % 2 === 0 ? mossyStone : "#6f7c5d",
      position: [0, 0.27 + tier * 0.55, 0],
      roughen: 0.04,
    })),
    {
      geometry: new BoxGeometry(1, 0.9, 0.95),
      colour: "#8a957a",
      position: [0, 2.6, 0],
    },
    {
      geometry: new BoxGeometry(0.4, 0.55, 0.1),
      colour: "#1b1f14",
      position: [0, 2.48, 0.48],
    },
    {
      geometry: new BoxGeometry(0.7, 2.2, 1.3),
      colour: "#909a80",
      position: [0, 0.75, 1.15],
      rotation: [-0.75, 0, 0],
    },
    ...Array.from({ length: 9 }, (_, moss): ModelPart => {
      const angle = (moss / 9) * Math.PI * 2;
      const reach = 1.1 - (moss % 3) * 0.25;
      return {
        geometry: new IcosahedronGeometry(0.28, 0),
        colour: moss % 2 === 0 ? leafGreen : "#3c8a35",
        position: [
          Math.cos(angle) * reach,
          0.55 + (moss % 3) * 0.55,
          Math.sin(angle) * reach,
        ],
        scale: [1.4, 0.6, 1.4],
        roughen: 0.4,
      };
    }),
    ...Array.from({ length: 6 }, (_, vine): ModelPart => ({
      geometry: new CylinderGeometry(0.03, 0.03, 1.4, 4),
      colour: vineGreen,
      position: [-1 + vine * 0.4, 1.2, -1.42 + (vine % 2) * 0.02],
    })),
  ]);

const buildFireflyTreehouseGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.3, 0.45, 3, 9),
      colour: "#6b4a2f",
      position: [0, 1.5, 0],
      roughen: 0.1,
    },
    {
      geometry: new CylinderGeometry(1.2, 1.2, 0.1, 12),
      colour: "#8b6440",
      position: [0, 1.7, 0],
    },
    {
      geometry: new BoxGeometry(1, 0.7, 0.8),
      colour: "#a7754a",
      position: [0.3, 2.1, 0.2],
    },
    {
      geometry: new ConeGeometry(0.85, 0.5, 4),
      colour: "#3f6f2a",
      position: [0.3, 2.7, 0.2],
      rotation: [0, Math.PI / 4, 0],
    },
    {
      geometry: new IcosahedronGeometry(1.3, 1),
      colour: leafGreen,
      position: [-0.2, 3.5, -0.3],
      scale: [1.3, 0.6, 1.3],
      roughen: 0.3,
      isSmooth: true,
    },
    ...Array.from({ length: 6 }, (_, lantern): ModelPart => {
      const angle = (lantern / 6) * Math.PI * 2;
      return {
        geometry: new SphereGeometry(0.1, 8, 6),
        colour: "#fde047",
        position: [Math.cos(angle) * 1.15, 1.5, Math.sin(angle) * 1.15],
      };
    }),
    ...Array.from({ length: 6 }, (_, wire): ModelPart => {
      const angle = ((wire + 0.5) / 6) * Math.PI * 2;
      return {
        geometry: new BoxGeometry(0.6, 0.02, 0.02),
        colour: "#22d3ee",
        position: [Math.cos(angle) * 1.05, 1.6, Math.sin(angle) * 1.05],
        rotation: [0, -angle + Math.PI / 2, 0],
      };
    }),
  ]);

const buildGiantFlowersGeometry = (): BufferGeometry =>
  buildModelGeometry(
    [
      [0, 0, "#ec4899", 1],
      [0.9, 0.5, "#f97316", 0.8],
      [-0.8, 0.4, "#a855f7", 0.9],
      [0.2, -0.9, "#ef4444", 0.75],
    ].flatMap(([x, z, colour, size]): ModelPart[] => {
      const scale = Number(size);
      return [
        {
          geometry: new CylinderGeometry(0.06, 0.09, 1.6 * scale, 6),
          colour: "#15803d",
          position: [Number(x), 0.8 * scale, Number(z)],
        },
        ...[0, 1, 2, 3, 4].map((petal): ModelPart => ({
          geometry: new SphereGeometry(0.3 * scale, 8, 6),
          colour: String(colour),
          position: [
            Number(x) + Math.cos((petal * Math.PI * 2) / 5) * 0.32 * scale,
            1.65 * scale,
            Number(z) + Math.sin((petal * Math.PI * 2) / 5) * 0.32 * scale,
          ],
          scale: [1, 0.35, 1],
        })),
        {
          geometry: new SphereGeometry(0.18 * scale, 8, 6),
          colour: "#facc15",
          position: [Number(x), 1.72 * scale, Number(z)],
        },
      ];
    }),
  );

const buildStepPyramidGeometry = (): BufferGeometry =>
  buildModelGeometry([
    ...[0, 1, 2, 3].map((step): ModelPart => ({
      geometry: new BoxGeometry(3.2 - step * 0.7, 0.55, 3.2 - step * 0.7),
      colour: step % 2 === 0 ? "#8d8a74" : "#a3a08a",
      position: [0, 0.28 + step * 0.55, 0],
      roughen: 0.06,
    })),
    {
      geometry: new BoxGeometry(0.9, 0.7, 0.9),
      colour: "#6b6a58",
      position: [0, 2.55, 0],
    },
    {
      geometry: new BoxGeometry(0.7, 2.2, 0.06),
      colour: "#5f5e4c",
      position: [0, 1.1, 1.62],
      rotation: [-0.5, 0, 0],
    },
    ...[-1, 1].map((side): ModelPart => ({
      geometry: new SphereGeometry(0.45, 8, 6),
      colour: "#2f7d32",
      position: [side * 1.2, 1.4, -0.8],
      scale: [1.2, 0.6, 1],
    })),
  ]);

const buildTreehouseGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.35, 0.55, 3.4, 8),
      colour: "#5b3a24",
      position: [0, 1.7, 0],
    },
    {
      geometry: new BoxGeometry(2, 0.12, 2),
      colour: "#8b5e3c",
      position: [0, 2.2, 0],
    },
    {
      geometry: new BoxGeometry(1.3, 0.9, 1.1),
      colour: "#a47148",
      position: [0, 2.7, 0],
    },
    {
      geometry: new ConeGeometry(1.1, 0.7, 4),
      colour: "#3f7d3a",
      position: [0, 3.5, 0],
      rotation: [0, Math.PI / 4, 0],
    },
    {
      geometry: new SphereGeometry(1.4, 10, 8),
      colour: "#2f6b2a",
      position: [0, 4.3, 0],
      scale: [1.2, 0.7, 1.2],
      roughen: 0.2,
    },
    ...Array.from({ length: 6 }, (_, rung): ModelPart => ({
      geometry: new BoxGeometry(0.5, 0.05, 0.06),
      colour: "#d6b98c",
      position: [0, 0.25 + rung * 0.35, 1.05],
    })),
  ]);

const jungleSights: IslandFeature[] = [
  {
    name: "giant-flowers",
    buildGeometry: buildGiantFlowersGeometry,
    position: { x: -23, z: 13 },
    grain: "foliage",
  },
  {
    name: "step-pyramid",
    buildGeometry: buildStepPyramidGeometry,
    position: { x: -12.5, z: 1 },
    turn: 0.3,
    grain: "stone",
  },
  {
    name: "treehouse",
    buildGeometry: buildTreehouseGeometry,
    position: { x: -9.5, z: -9 },
    grain: "timber",
  },
];

const jungleNewLandSightSpots: MapPoint[] = [
  { x: 55, z: -6 },
  { x: 70.5, z: 3.5 },
  { x: 39, z: 11.5 },
  { x: -47.5, z: 5 },
  { x: -60, z: -2.5 },
  { x: -65, z: -11.5 },
];

export const jungleLandmarks = {
  "monkey-falls": { buildGeometry: buildMonkeyFallsGeometry, grain: "stone" },
  "storyvine-shrine": {
    buildGeometry: buildStoryvineShrineGeometry,
    grain: "timber",
  },
  "orchid-glasshouse": {
    buildGeometry: buildOrchidGlasshouseGeometry,
    grain: "metal",
  },
  "bamboo-drums": { buildGeometry: buildBambooDrumsGeometry, grain: "timber" },
  "stilt-mapworks": {
    buildGeometry: buildStiltMapworksGeometry,
    grain: "timber",
  },
  "overgrown-temple": {
    buildGeometry: buildOvergrownTempleGeometry,
    grain: "stone",
  },
  "firefly-treehouse": {
    buildGeometry: buildFireflyTreehouseGeometry,
    grain: "timber",
  },
} satisfies IslandLandmarkDesigns;

export const jungleReach: IslandLandform = {
  newLands: jungleNewLands,
  findHeight: findJungleHeight,
  paintGround: paintJungleGround,
  findDistanceToWater: (point) =>
    Math.min(
      findDistanceToJungleWater(point),
      findDistanceToNewLandRivers(point, jungleNewLands),
    ),
  waterCourses: jungleRivers,
  pools: [],
  listScatters: (keepClearOf, propPlaces) => {
    const clearOfBridges = [
      ...keepClearOf,
      ...ropeBridgeCrossings.map(({ at }) => at),
      fallsTop,
      fallsBottom,
    ];
    return [
      {
        name: "jungle-canopy",
        things: scatterAcrossLand({
          count: 190,
          seed: 401,
          lowest: 0.4,
          highest: 5.5,
          keepClearOf: clearOfBridges,
          propPlaces,
          clearance: 3.6,
          findHeight: findJungleHeight,
          findDistanceToWater: findDistanceToJungleWater,
        }),
        buildGeometry: buildJungleTreeGeometry,
        sink: 0.05,
        grain: "foliage",
      },
      {
        name: "ferns",
        things: scatterAcrossLand({
          count: 160,
          seed: 409,
          lowest: 0.3,
          highest: 5.5,
          keepClearOf: clearOfBridges,
          propPlaces,
          clearance: 2.6,
          findHeight: findJungleHeight,
          findDistanceToWater: findDistanceToJungleWater,
        }),
        buildGeometry: buildFernGeometry,
        sink: 0.02,
        grain: "foliage",
      },
    ];
  },
  features: [
    ...ropeBridgeCrossings.map(({ at, turn }, bridge): IslandFeature => ({
      name: `rope-bridge-${String(bridge + 1)}`,
      buildGeometry: buildRopeBridgeGeometry,
      position: at,
      lift: 0.75,
      turn,
      grain: "timber",
    })),
    ...jungleSights,
    ...copySightsOntoNewLands(jungleSights, jungleNewLandSightSpots),
  ],
};
