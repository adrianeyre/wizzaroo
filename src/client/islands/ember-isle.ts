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

const iron = "#4b5563";
const darkIron = "#2b2f36";
const basalt = "#3a3230";
const glowingOrange = "#ff7a1a";

export const emberVolcanoPosition: MapPoint = { x: 0, z: -9 };

export const lavaRivers: WaterCourse[] = [
  {
    name: "lava-river-east",
    kind: "lava",
    course: [
      { x: 1.6, z: -7.2 },
      { x: 6, z: -7.6 },
      { x: 11, z: -9.6 },
      { x: 16, z: -12 },
      { x: 21, z: -15.5 },
    ],
    halfWidth: 0.5,
  },
  {
    name: "lava-river-west",
    kind: "lava",
    course: [
      { x: -1.6, z: -7.8 },
      { x: -6, z: -10.8 },
      { x: -11, z: -13.4 },
      { x: -15, z: -17 },
    ],
    halfWidth: 0.45,
  },
];

export const steamVentPositions: MapPoint[] = [
  { x: -12, z: 0 },
  { x: 6, z: 2 },
  { x: -2, z: 1 },
  { x: 11, z: 3 },
  { x: -12, z: -9 },
];

export const emberIslet: MapPoint = { x: 22, z: 13 };

const emberCoast = [
  { x: 0, z: -1, radiusX: 25, radiusZ: 15 },
  { x: -14, z: 4, radiusX: 12, radiusZ: 11 },
  buildIsletBlob(emberIslet),
];

const findEmberCoreHeight = (point: MapPoint): number => {
  const landShare = findCoastShare(point, emberCoast);
  const ashPlain =
    0.9 + 0.7 * findLayeredNoise({ x: point.x * 0.19, z: point.z * 0.19 });
  const volcano =
    8.6 * findBump(point, emberVolcanoPosition, 5.2) -
    2.4 * findBump(point, emberVolcanoPosition, 1.3);
  const cliffShelf =
    2.4 *
    smoothStep(11, 15, point.x) *
    (1 + 0.4 * findLayeredNoise({ x: point.x * 0.5, z: point.z * 0.5 }));
  const quarryPit = -0.7 * findBump(point, { x: -17, z: 5 }, 2.2);
  const land = sinkIntoSea(
    ashPlain + volcano + cliffShelf + quarryPit,
    landShare,
  );
  return carveCourses(land, point, lavaRivers, 0.45);
};

export const emberNewLands = buildSideLands({
  eastJoinZ: -3.5,
  westJoinZ: 3,
  hillRise: 5,
  lakes: [
    { centre: { x: 53, z: 5 }, radius: 2.6 },
    { centre: { x: -49, z: -6 }, radius: 2.6 },
  ],
  rivers: [
    [
      { x: 54.3, z: -9.5 },
      { x: 54.6, z: -7.5 },
      { x: 55.3, z: -5.7 },
      { x: 56.6, z: -4.2 },
      { x: 58.2, z: -3 },
      { x: 59.8, z: -1.8 },
      { x: 61, z: -0.2 },
      { x: 61.6, z: 1.7 },
      { x: 61.8, z: 3.7 },
      { x: 62.1, z: 5.7 },
      { x: 62.9, z: 7.5 },
      { x: 64.3, z: 8.9 },
      { x: 65.9, z: 10.1 },
      { x: 67.5, z: 11.3 },
      { x: 68.6, z: 13 },
      { x: 68.8, z: 13.4 },
    ],
    [
      { x: -59.4, z: 9.4 },
      { x: -58.7, z: 11.3 },
      { x: -57.5, z: 12.9 },
      { x: -55.8, z: 14 },
      { x: -54, z: 14.7 },
      { x: -52.1, z: 15.5 },
      { x: -50.5, z: 16.7 },
      { x: -49.5, z: 18.4 },
    ],
  ],
});

export const emberAirfield: Airfield = {
  runway: { centre: { x: -56, z: -1 }, heading: 1.4, level: 1.47 },
  helipad: { centre: { x: 55, z: 13 }, heading: -1.8, level: 1.07 },
  balloonField: { centre: { x: 44, z: -13 }, heading: -1.28, level: 0.94 },
};

export const findEmberHeight = raiseTunnelHills(
  "ember-isle",
  levelAirfield(
    extendWithNewLands(findEmberCoreHeight, emberNewLands),
    emberAirfield,
  ),
);

const findDistanceToLava = (point: MapPoint): number =>
  findDistanceToCourses(point, lavaRivers);

const scorchedBank = new Color("#8a2a10");

const paintEmberGround = buildGroundPainter({
  seabed: "#4b4744",
  deepSeabed: "#1b3a44",
  shore: "#2f2b2a",
  lowland: "#4d413b",
  lowlandVariant: "#3b312d",
  upland: "#2f2725",
  cliff: "#17151c",
  peak: "#241d1b",
  uplandHeight: 3.4,
  peakHeight: 6.8,
  paintExtras: (colour, point, height) => {
    const fromLava = findDistanceToLava(point);
    colour.lerp(
      scorchedBank,
      height > 0 ? (1 - smoothStep(0, 1.2, fromLava)) * 0.9 : 0,
    );
  },
});

const buildObsidianShardGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new OctahedronGeometry(0.35, 0),
      colour: "#1a1724",
      position: [0, 0.45, 0],
      scale: [0.7, 2, 0.7],
      rotation: [0.15, 0, 0.1],
    },
    {
      geometry: new OctahedronGeometry(0.22, 0),
      colour: "#2b2440",
      position: [0.3, 0.3, 0.1],
      scale: [0.7, 1.8, 0.7],
      rotation: [0, 0, -0.35],
    },
  ]);

const buildCharredTreeGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.05, 0.1, 1.3, 5),
      colour: "#2a211d",
      position: [0, 0.65, 0],
    },
    ...[
      [0.2, 1, 0, -0.8],
      [-0.18, 1.15, 0.05, 0.9],
      [0.05, 1.3, -0.15, 0.4],
    ].map(([x, y, z, lean]): ModelPart => ({
      geometry: new CylinderGeometry(0.02, 0.04, 0.55, 4),
      colour: "#2f2520",
      position: [x, y, z],
      rotation: [z * 3, 0, lean],
    })),
  ]);

const buildBasaltRockGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.35, 0.4, 0.7, 6),
      colour: basalt,
      position: [0, 0.35, 0],
    },
    {
      geometry: new CylinderGeometry(0.28, 0.32, 0.45, 6),
      colour: "#453b38",
      position: [0.45, 0.22, 0.15],
    },
  ]);

const buildSteamVentGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.3, 0.55, 0.35, 10),
      colour: "#5b4a40",
      position: [0, 0.17, 0],
      roughen: 0.25,
    },
    {
      geometry: new CylinderGeometry(0.22, 0.22, 0.05, 10),
      colour: "#e8a24a",
      position: [0, 0.34, 0],
    },
  ]);

const buildAnvilQuarryGeometry = (): BufferGeometry =>
  buildModelGeometry([
    ...[0, 1, 2].map((terrace): ModelPart => ({
      geometry: new BoxGeometry(2.4 - terrace * 0.7, 0.35, 1.6 - terrace * 0.3),
      colour: terrace % 2 === 0 ? "#6b5a52" : "#5a4a43",
      position: [-0.3 + terrace * 0.35, 0.17 + terrace * 0.35, -0.5],
      roughen: 0.05,
    })),
    {
      geometry: new BoxGeometry(0.5, 0.3, 0.3),
      colour: darkIron,
      position: [0.6, 0.4, 0.7],
    },
    {
      geometry: new BoxGeometry(0.8, 0.18, 0.4),
      colour: iron,
      position: [0.6, 0.64, 0.7],
    },
    {
      geometry: new ConeGeometry(0.2, 0.35, 4),
      colour: iron,
      position: [1.15, 0.64, 0.7],
      rotation: [0, 0, -Math.PI / 2],
    },
    {
      geometry: new BoxGeometry(0.5, 0.25, 0.4),
      colour: darkIron,
      position: [0.6, 0.12, 0.7],
    },
    ...[0, 1, 2, 3].map((block): ModelPart => ({
      geometry: new BoxGeometry(0.35, 0.35, 0.35),
      colour: ["#7c6a60", "#8b776b", "#6b5a52", "#9a8578"][block],
      position: [
        -1.2 + (block % 2) * 0.4,
        0.17 + Math.floor(block / 2) * 0.35,
        0.9,
      ],
    })),
    {
      geometry: new CylinderGeometry(0.03, 0.03, 0.9, 5),
      colour: "#8b6440",
      position: [0.15, 0.95, 0.7],
      rotation: [0, 0, 0.6],
    },
  ]);

const buildInkfireArchiveGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.85, 1, 2.6, 8),
      colour: "#4a3d39",
      position: [0, 1.3, 0],
      roughen: 0.04,
    },
    {
      geometry: new ConeGeometry(1.15, 1, 8),
      colour: "#7f1d1d",
      position: [0, 3.1, 0],
    },
    ...[0, 1, 2, 3].map((window): ModelPart => {
      const angle = (window / 4) * Math.PI * 2 + Math.PI / 8;
      return {
        geometry: new BoxGeometry(0.28, 0.5, 0.05),
        colour: "#ffb347",
        position: [Math.sin(angle) * 0.93, 1.8, Math.cos(angle) * 0.93],
        rotation: [0, angle, 0],
      };
    }),
    {
      geometry: new BoxGeometry(0.5, 0.75, 0.06),
      colour: "#1f1512",
      position: [0, 0.38, 0.98],
    },
    ...[-1, 1].flatMap((side): ModelPart[] => [
      {
        geometry: new CylinderGeometry(0.12, 0.08, 0.7, 6),
        colour: iron,
        position: [side * 1.3, 0.35, 0.7],
      },
      {
        geometry: new ConeGeometry(0.18, 0.4, 6),
        colour: glowingOrange,
        position: [side * 1.3, 0.9, 0.7],
      },
    ]),
    {
      geometry: new BoxGeometry(0.6, 0.12, 0.45),
      colour: "#f5e6c8",
      position: [0.9, 0.06, 1.3],
      rotation: [0, 0.4, 0],
    },
  ]);

const buildMagmaCrucibleGeometry = (): BufferGeometry =>
  buildModelGeometry([
    ...[0, 1, 2].map((leg): ModelPart => {
      const angle = (leg / 3) * Math.PI * 2;
      return {
        geometry: new CylinderGeometry(0.06, 0.06, 1.5, 5),
        colour: darkIron,
        position: [Math.cos(angle) * 0.75, 0.7, Math.sin(angle) * 0.75],
        rotation: [Math.sin(angle) * 0.3, 0, -Math.cos(angle) * 0.3],
      };
    }),
    {
      geometry: new SphereGeometry(
        0.85,
        16,
        10,
        0,
        Math.PI * 2,
        Math.PI / 2.4,
        Math.PI / 1.8,
      ),
      colour: iron,
      position: [0, 1.75, 0],
    },
    {
      geometry: new CylinderGeometry(0.72, 0.72, 0.06, 16),
      colour: "#ffb020",
      position: [0, 1.55, 0],
    },
    {
      geometry: new TorusGeometry(0.85, 0.06, 6, 20),
      colour: darkIron,
      position: [0, 1.6, 0],
      rotation: [Math.PI / 2, 0, 0],
    },
    {
      geometry: new CylinderGeometry(0.25, 0.4, 0.3, 10),
      colour: basalt,
      position: [0, 0.15, 0],
    },
    {
      geometry: new ConeGeometry(0.22, 0.35, 8),
      colour: glowingOrange,
      position: [0, 0.45, 0],
    },
  ]);

const buildVolcanicForgeGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new BoxGeometry(2.2, 1.3, 1.5),
      colour: "#4a3d39",
      position: [0, 0.65, 0],
      roughen: 0.05,
    },
    {
      geometry: new BoxGeometry(2.4, 0.2, 1.7),
      colour: darkIron,
      position: [0, 1.4, 0],
    },
    {
      geometry: new CylinderGeometry(0.3, 0.4, 1.8, 8),
      colour: "#3a302d",
      position: [-0.6, 2.2, -0.3],
    },
    {
      geometry: new CylinderGeometry(0.5, 0.5, 0.06, 12),
      colour: glowingOrange,
      position: [0, 0.55, 0.76],
      rotation: [Math.PI / 2, 0, 0],
    },
    {
      geometry: new BoxGeometry(0.6, 0.35, 0.35),
      colour: iron,
      position: [1.5, 0.45, 0.6],
    },
    {
      geometry: new BoxGeometry(0.4, 0.3, 0.3),
      colour: darkIron,
      position: [1.5, 0.15, 0.6],
    },
    ...[-1, 1].flatMap((side): ModelPart[] => [
      {
        geometry: new CylinderGeometry(0.04, 0.04, 1.2, 5),
        colour: "#8b6440",
        position: [1.5 + side * 0.35, 1, 1],
        rotation: [0, 0, side * 0.5],
      },
      {
        geometry: new BoxGeometry(0.3, 0.2, 0.2),
        colour: iron,
        position: [1.5 + side * 0.62, 1.52, 1],
        rotation: [0, 0, side * 0.5],
      },
    ]),
    {
      geometry: new TorusGeometry(0.35, 0.08, 6, 16),
      colour: "#b45309",
      position: [-1.5, 0.45, 0.6],
      rotation: [0, Math.PI / 2, 0],
    },
  ]);

const buildObsidianLookoutGeometry = (): BufferGeometry =>
  buildModelGeometry([
    ...[
      [0, 0, 0.5, 3.4],
      [0.8, 0.3, 0.35, 2.4],
      [-0.7, 0.4, 0.38, 2.6],
      [0.2, -0.8, 0.3, 2],
    ].map(([x, z, width, height], spire): ModelPart => ({
      geometry: new OctahedronGeometry(width, 0),
      colour: spire % 2 === 0 ? "#1a1724" : "#2d2342",
      position: [x, height / 2, z],
      scale: [1, height / width / 2, 1],
      rotation: [0, spire * 0.6, 0],
    })),
    {
      geometry: new CylinderGeometry(0.02, 0.02, 1, 4),
      colour: "#d1d5db",
      position: [0, 3.8, 0],
    },
    {
      geometry: new BoxGeometry(0.5, 0.3, 0.02),
      colour: "#ff5a1f",
      position: [0.25, 4.15, 0],
    },
    {
      geometry: new BoxGeometry(1, 0.08, 0.6),
      colour: "#5b4a40",
      position: [1.2, 1.2, 0.6],
    },
  ]);

const buildIronKeepGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new BoxGeometry(1.6, 2.4, 1.6),
      colour: iron,
      position: [0, 1.2, 0],
      roughen: 0.03,
    },
    ...Array.from({ length: 8 }, (_, merlon): ModelPart => {
      const side = Math.floor(merlon / 2);
      const offset = merlon % 2 === 0 ? -0.45 : 0.45;
      const angle = (side * Math.PI) / 2;
      return {
        geometry: new BoxGeometry(0.4, 0.35, 0.25),
        colour: darkIron,
        position: [
          Math.sin(angle) * 0.75 + Math.cos(angle) * offset,
          2.57,
          Math.cos(angle) * 0.75 - Math.sin(angle) * offset,
        ],
        rotation: [0, angle, 0],
      };
    }),
    ...[
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ].flatMap(([x, z]): ModelPart[] => [
      {
        geometry: new CylinderGeometry(0.35, 0.4, 1.6, 8),
        colour: "#3f4651",
        position: [x, 0.8, z],
      },
      {
        geometry: new ConeGeometry(0.45, 0.6, 8),
        colour: "#7f1d1d",
        position: [x, 1.9, z],
      },
    ]),
    {
      geometry: new BoxGeometry(0.55, 0.85, 0.1),
      colour: "#1f2329",
      position: [0, 0.42, 0.82],
    },
    ...Array.from({ length: 5 }, (_, rivet): ModelPart => ({
      geometry: new SphereGeometry(0.05, 6, 4),
      colour: "#9ca3af",
      position: [-0.6 + rivet * 0.3, 1.6, 0.81],
    })),
  ]);

const buildCinderCoreGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(1.1, 1.3, 0.4, 12),
      colour: basalt,
      position: [0, 0.2, 0],
    },
    {
      geometry: new IcosahedronGeometry(0.6, 1),
      colour: glowingOrange,
      position: [0, 1.45, 0],
    },
    ...[0, 1, 2].map((ring): ModelPart => ({
      geometry: new TorusGeometry(0.9 + ring * 0.12, 0.05, 6, 24),
      colour: ring === 1 ? "#22d3ee" : iron,
      position: [0, 1.45, 0],
      rotation: [Math.PI / 2 + ring * 0.6, ring * 0.9, 0],
    })),
    ...[0, 1, 2, 3].map((pillar): ModelPart => {
      const angle = (pillar / 4) * Math.PI * 2 + Math.PI / 4;
      return {
        geometry: new BoxGeometry(0.2, 1.3, 0.2),
        colour: darkIron,
        position: [Math.cos(angle) * 1, 0.85, Math.sin(angle) * 1],
      };
    }),
  ]);

const buildGeyserGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new ConeGeometry(1.2, 0.8, 10, 1, true),
      colour: "#a8a29e",
      position: [0, 0.4, 0],
      roughen: 0.2,
    },
    {
      geometry: new CylinderGeometry(0.5, 0.5, 0.06, 12),
      colour: "#38bdf8",
      position: [0, 0.62, 0],
    },
    ...[0, 1, 2].map((puff): ModelPart => ({
      geometry: new SphereGeometry(0.35 + puff * 0.12, 8, 6),
      colour: "#f1f5f9",
      position: [puff * 0.1, 1.2 + puff * 0.6, 0],
    })),
  ]);

const buildFossilDigGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new BoxGeometry(3, 0.1, 1.6),
      colour: "#a16207",
      position: [0, 0.05, 0],
    },
    ...Array.from({ length: 8 }, (_, bone): ModelPart => ({
      geometry: new SphereGeometry(0.16 - bone * 0.012, 8, 6),
      colour: "#f5f5dc",
      position: [-1.1 + bone * 0.3, 0.18, Math.sin(bone * 0.8) * 0.15],
    })),
    ...Array.from({ length: 5 }, (_, rib): ModelPart => ({
      geometry: new TorusGeometry(0.32, 0.035, 5, 10, Math.PI),
      colour: "#e7e5c9",
      position: [-0.5 + rib * 0.22, 0.12, 0],
      rotation: [0, Math.PI / 2, 0],
    })),
    {
      geometry: new BoxGeometry(0.45, 0.25, 0.3),
      colour: "#e7e5c9",
      position: [1.35, 0.2, 0],
    },
    ...[
      [-1.5, -0.8],
      [1.5, -0.8],
      [-1.5, 0.8],
      [1.5, 0.8],
    ].map(([x, z]): ModelPart => ({
      geometry: new CylinderGeometry(0.04, 0.04, 0.6, 5),
      colour: "#facc15",
      position: [x, 0.3, z],
    })),
  ]);

const buildObsidianSpiresGeometry = (): BufferGeometry =>
  buildModelGeometry(
    [
      [0, 0, 2.4],
      [0.7, 0.4, 1.6],
      [-0.6, 0.5, 1.8],
      [0.2, -0.7, 1.3],
      [-0.7, -0.5, 1.1],
    ].map(([x, z, height]): ModelPart => ({
      geometry: new OctahedronGeometry(0.4, 0),
      colour: height > 2 ? "#1e1b2e" : "#312e45",
      position: [x, height * 0.45, z],
      scale: [0.8, height * 1.4, 0.8],
      rotation: [x * 0.3, x + z, z * 0.3],
    })),
  );

const emberSights: IslandFeature[] = [
  {
    name: "geyser",
    buildGeometry: buildGeyserGeometry,
    position: { x: 20, z: 12 },
    grain: "stone",
  },
  {
    name: "fossil-dig",
    buildGeometry: buildFossilDigGeometry,
    position: { x: -5, z: 2 },
    turn: 0.5,
    grain: "ground",
  },
  {
    name: "obsidian-spires",
    buildGeometry: buildObsidianSpiresGeometry,
    position: { x: 0.5, z: 2.5 },
    grain: "stone",
  },
];

const emberNewLandSightSpots: MapPoint[] = [
  { x: 37, z: 10 },
  { x: 70.5, z: -2 },
  { x: 43, z: 1.5 },
  { x: -44.5, z: 3 },
  { x: -54, z: 6 },
  { x: -42, z: 13 },
];

export const emberLandmarks = {
  "anvil-quarry": { buildGeometry: buildAnvilQuarryGeometry, grain: "stone" },
  "inkfire-archive": {
    buildGeometry: buildInkfireArchiveGeometry,
    grain: "stone",
  },
  "magma-crucible": {
    buildGeometry: buildMagmaCrucibleGeometry,
    grain: "metal",
  },
  "volcanic-forge": {
    buildGeometry: buildVolcanicForgeGeometry,
    grain: "stone",
  },
  "obsidian-lookout": {
    buildGeometry: buildObsidianLookoutGeometry,
    grain: "metal",
  },
  "iron-keep": { buildGeometry: buildIronKeepGeometry, grain: "metal" },
  "cinder-core": { buildGeometry: buildCinderCoreGeometry, grain: "metal" },
} satisfies IslandLandmarkDesigns;

export const emberIsle: IslandLandform = {
  newLands: emberNewLands,
  findHeight: findEmberHeight,
  paintGround: paintEmberGround,
  findDistanceToWater: (point) =>
    Math.min(
      findDistanceToLava(point),
      findDistanceToNewLandRivers(point, emberNewLands),
    ),
  waterCourses: lavaRivers,
  pools: [],
  listScatters: (keepClearOf, propPlaces, isClearOfTrailsAndAirfield) => {
    const clearOfVolcano = [
      ...keepClearOf,
      emberVolcanoPosition,
      ...steamVentPositions,
    ];
    return [
      {
        name: "obsidian-shards",
        things: scatterAcrossLand({
          count: 60,
          seed: 503,
          lowest: 1.4,
          highest: 7,
          keepClearOf: clearOfVolcano,
          propPlaces,
          isClearOfTrailsAndAirfield,
          clearance: 2.6,
          findHeight: findEmberHeight,
          findDistanceToWater: findDistanceToLava,
        }),
        buildGeometry: buildObsidianShardGeometry,
        sink: 0.1,
        grain: "metal",
      },
      {
        name: "charred-trees",
        things: scatterAcrossLand({
          count: 80,
          seed: 509,
          lowest: 0.4,
          highest: 3,
          keepClearOf: clearOfVolcano,
          propPlaces,
          isClearOfTrailsAndAirfield,
          clearance: 3.2,
          findHeight: findEmberHeight,
          findDistanceToWater: findDistanceToLava,
        }),
        buildGeometry: buildCharredTreeGeometry,
        sink: 0.05,
        grain: "timber",
      },
      {
        name: "basalt-columns",
        things: scatterAcrossLand({
          count: 60,
          seed: 521,
          lowest: 0.3,
          highest: 5,
          keepClearOf: clearOfVolcano,
          propPlaces,
          isClearOfTrailsAndAirfield,
          clearance: 2.6,
          findHeight: findEmberHeight,
          findDistanceToWater: findDistanceToLava,
        }),
        buildGeometry: buildBasaltRockGeometry,
        sink: 0.1,
        grain: "stone",
      },
      {
        name: "steam-vents",
        things: steamVentPositions.map((point, vent) => ({
          ...point,
          height: findEmberHeight(point),
          scale: 1 + (vent % 2) * 0.2,
          turn: vent,
        })),
        buildGeometry: buildSteamVentGeometry,
        sink: 0.05,
        grain: "stone",
        tintSpread: 0,
      },
    ];
  },
  features: [
    ...emberSights,
    ...copySightsOntoNewLands(emberSights, emberNewLandSightSpots),
  ],
};
