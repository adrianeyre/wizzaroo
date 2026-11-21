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
  buildPineGeometry,
  type ModelPart,
} from "../world-map-models.js";
import {
  buildRandom,
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
  copySightsOntoNewLands,
  findCoastShare,
  sinkIntoSea,
  type IslandFeature,
  type IslandLandform,
  type IslandLandmarkDesigns,
} from "./island-landform.js";

const moonstone = "#9a97b5";
const darkStone = "#56536e";
const starGlow = "#fff3b0";
const nebulaPurple = "#8b5cf6";

export const starCraterPosition: MapPoint = { x: 8.5, z: 9 };
export const observatoryHill: MapPoint = { x: 7, z: -10 };

export const starfallIslet: MapPoint = { x: 22, z: 14 };

const starfallCoast = [
  { x: -2, z: 0, radiusX: 23, radiusZ: 14.5 },
  { x: 15, z: 3, radiusX: 11, radiusZ: 11 },
  { x: -21, z: -10, radiusX: 4.5, radiusZ: 3.5 },
  buildIsletBlob(starfallIslet),
];

const findStarfallCoreHeight = (point: MapPoint): number => {
  const landShare = findCoastShare(point, starfallCoast);
  const moor =
    1 +
    0.35 * Math.cos(point.x * 0.3) * Math.sin(point.z * 0.38) +
    0.8 * findLayeredNoise({ x: point.x * 0.17, z: point.z * 0.17 });
  const hill = 3.2 * findBump(point, observatoryHill, 4);
  const crater =
    0.7 * findBump(point, starCraterPosition, 2.6) -
    1.3 * findBump(point, starCraterPosition, 1.3);
  return sinkIntoSea(moor + hill + crater, landShare);
};

export const starfallNewLands = buildSideLands({
  eastJoinZ: 2,
  westJoinZ: -8,
  hillRise: 4,
  lakes: [
    { centre: { x: 44.5, z: -2 }, radius: 2.6 },
    { centre: { x: -44.5, z: 2 }, radius: 2.6 },
  ],
  rivers: [
    [
      { x: 54.3, z: -9.5 },
      { x: 54, z: -7.6 },
      { x: 54.3, z: -5.6 },
      { x: 55.1, z: -3.8 },
      { x: 56.4, z: -2.2 },
      { x: 57.6, z: -0.6 },
      { x: 58.3, z: 1.2 },
      { x: 58.4, z: 3.2 },
      { x: 58.1, z: 5.2 },
      { x: 57.9, z: 7.2 },
      { x: 58.2, z: 9.1 },
      { x: 59.2, z: 10.9 },
      { x: 60.4, z: 12.4 },
      { x: 61.6, z: 14 },
      { x: 62.3, z: 15.9 },
      { x: 62.3, z: 17.4 },
    ],
    [
      { x: -56.6, z: 9.4 },
      { x: -55.7, z: 7.6 },
      { x: -54.4, z: 6.1 },
      { x: -53.2, z: 4.5 },
      { x: -52.5, z: 2.6 },
      { x: -52.4, z: 0.6 },
      { x: -52.8, z: -1.3 },
      { x: -53, z: -3.3 },
      { x: -52.6, z: -5.3 },
      { x: -51.6, z: -7 },
      { x: -50.4, z: -8.5 },
      { x: -49.2, z: -10.2 },
      { x: -48.6, z: -12.1 },
      { x: -48.6, z: -14.1 },
      { x: -49, z: -16 },
      { x: -49.1, z: -18 },
    ],
  ],
});

export const starfallAirfield: Airfield = {
  runway: { centre: { x: 38, z: 8 }, heading: 0.7, level: 1.25 },
  helipad: { centre: { x: 39, z: -10 }, heading: -1.32, level: 1.31 },
  balloonField: { centre: { x: -33.5, z: -2.5 }, heading: 1.5, level: 1.13 },
};

export const findStarfallHeight = raiseTunnelHills(
  "starfall-isle",
  levelAirfield(
    extendWithNewLands(findStarfallCoreHeight, starfallNewLands),
    starfallAirfield,
  ),
);

const findNoWater = (): number => Infinity;

const craterGlow = new Color("#7c5cd6");

const paintStarfallGround = buildGroundPainter({
  seabed: "#6b6f8a",
  deepSeabed: "#1e2550",
  shore: "#b9b3c9",
  lowland: "#76967f",
  lowlandVariant: "#638074",
  upland: "#9095ad",
  cliff: "#66637f",
  peak: "#c7c3e8",
  uplandHeight: 3.2,
  peakHeight: 99,
  paintExtras: (colour, point) => {
    const fromCrater = Math.hypot(
      point.x - starCraterPosition.x,
      point.z - starCraterPosition.z,
    );
    colour.lerp(craterGlow, (1 - smoothStep(0.6, 2.2, fromCrater)) * 0.8);
  },
});

export const buildFloatingRockGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new IcosahedronGeometry(0.8, 1),
      colour: "#6b6889",
      position: [0, 0, 0],
      scale: [1.2, 0.55, 1],
      roughen: 0.35,
    },
    {
      geometry: new ConeGeometry(0.75, 1.1, 7),
      colour: "#4d4a66",
      position: [0, -0.7, 0],
      rotation: [Math.PI, 0, 0],
      roughen: 0.3,
    },
    {
      geometry: new IcosahedronGeometry(0.62, 1),
      colour: "#5f8a6e",
      position: [0, 0.3, 0],
      scale: [1.25, 0.25, 1.05],
      roughen: 0.2,
    },
    {
      geometry: new OctahedronGeometry(0.16, 0),
      colour: "#c4b5fd",
      position: [0.3, 0.55, 0.1],
      scale: [0.7, 1.8, 0.7],
    },
  ]);

export interface FloatingRockPlace extends MapPoint {
  height: number;
  scale: number;
  turn: number;
}

export const floatingRockPlaces: FloatingRockPlace[] = (() => {
  const random = buildRandom(613);
  return Array.from({ length: 9 }, (_, rock) => {
    const angle = (rock / 9) * Math.PI * 2 + random() * 0.4;
    const x = Math.cos(angle) * (11 + random() * 8);
    const z = Math.sin(angle) * (6 + random() * 5);
    return {
      x,
      z,
      height: 7 + random() * 4,
      scale: 0.7 + random() * 0.9,
      turn: random() * Math.PI * 2,
    };
  });
})();

const buildCrystalSpireGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new OctahedronGeometry(0.3, 0),
      colour: "#b9a6ff",
      position: [0, 0.8, 0],
      scale: [0.6, 3, 0.6],
    },
    {
      geometry: new OctahedronGeometry(0.2, 0),
      colour: "#8fd4ff",
      position: [0.3, 0.45, 0.1],
      scale: [0.6, 2.4, 0.6],
      rotation: [0, 0, -0.3],
    },
    {
      geometry: new OctahedronGeometry(0.18, 0),
      colour: "#d8c9ff",
      position: [-0.25, 0.4, -0.1],
      scale: [0.6, 2.2, 0.6],
      rotation: [0.2, 0, 0.35],
    },
  ]);

const buildMenhirGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new BoxGeometry(0.4, 1.4, 0.28),
      colour: moonstone,
      position: [0, 0.6, 0],
      roughen: 0.18,
    },
  ]);

const buildConstellationCourtGeometry = (): BufferGeometry => {
  const starPoints = Array.from({ length: 7 }, (_, star) => {
    const angle = (star / 7) * Math.PI * 2;
    return {
      x: Math.cos(angle) * 1.2,
      z: Math.sin(angle) * 1.2,
      height: 0.8 + ((star * 3) % 4) * 0.25,
    };
  });
  return buildModelGeometry([
    {
      geometry: new CylinderGeometry(1.6, 1.7, 0.18, 24),
      colour: darkStone,
      position: [0, 0.09, 0],
    },
    {
      geometry: new CylinderGeometry(1.2, 1.2, 0.02, 24),
      colour: "#312e81",
      position: [0, 0.19, 0],
    },
    ...starPoints.flatMap(({ x, z, height }): ModelPart[] => [
      {
        geometry: new CylinderGeometry(0.08, 0.1, height, 6),
        colour: moonstone,
        position: [x, height / 2 + 0.18, z],
      },
      {
        geometry: new OctahedronGeometry(0.14, 0),
        colour: starGlow,
        position: [x, height + 0.3, z],
      },
    ]),
    ...starPoints.slice(1).map((star, index): ModelPart => {
      const previous = starPoints[index];
      const length = Math.hypot(star.x - previous.x, star.z - previous.z);
      const rise = star.height - previous.height;
      return {
        geometry: new BoxGeometry(Math.hypot(length, rise), 0.02, 0.02),
        colour: "#c7d2fe",
        position: [
          (star.x + previous.x) / 2,
          (star.height + previous.height) / 2 + 0.3,
          (star.z + previous.z) / 2,
        ],
        rotation: [
          0,
          -Math.atan2(star.z - previous.z, star.x - previous.x),
          Math.atan2(rise, length),
        ],
      };
    }),
  ]);
};

const buildMoonlitScriptoriumGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new BoxGeometry(2.2, 1.4, 1.4),
      colour: "#77738f",
      position: [0, 0.7, 0],
      roughen: 0.03,
    },
    {
      geometry: new CylinderGeometry(0.72, 0.72, 2.3, 12, 1, false, 0, Math.PI),
      colour: "#3b3363",
      position: [0, 1.4, 0],
      rotation: [0, 0, Math.PI / 2],
    },
    {
      geometry: new CylinderGeometry(0.36, 0.36, 0.06, 20),
      colour: "#fef9c3",
      position: [0, 1.65, 0.72],
      rotation: [Math.PI / 2, 0, 0],
    },
    {
      geometry: new CylinderGeometry(0.3, 0.3, 0.07, 20),
      colour: "#3b3363",
      position: [0.12, 1.7, 0.73],
      rotation: [Math.PI / 2, 0, 0],
    },
    ...[-0.7, 0.7].map((x): ModelPart => ({
      geometry: new BoxGeometry(0.3, 0.6, 0.05),
      colour: "#ffd27a",
      position: [x, 0.75, 0.71],
    })),
    {
      geometry: new BoxGeometry(0.45, 0.7, 0.06),
      colour: "#231d3d",
      position: [0, 0.35, 0.71],
    },
    {
      geometry: new ConeGeometry(0.1, 1.3, 6),
      colour: "#f8fafc",
      position: [1.5, 0.75, 0.6],
      rotation: [0, 0, -0.35],
      scale: [1, 1, 0.3],
    },
    {
      geometry: new CylinderGeometry(0.18, 0.2, 0.25, 10),
      colour: "#1e1b4b",
      position: [1.3, 0.12, 0.6],
    },
  ]);

const buildObservatoryGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(1, 1.15, 1.6, 16),
      colour: "#8b88a8",
      position: [0, 0.8, 0],
      roughen: 0.03,
    },
    {
      geometry: new SphereGeometry(
        1.05,
        20,
        10,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2,
      ),
      colour: "#d6d3e8",
      position: [0, 1.6, 0],
    },
    {
      geometry: new BoxGeometry(0.35, 1.1, 0.4),
      colour: "#1e1b4b",
      position: [0, 2.15, 0.78],
      rotation: [0.6, 0, 0],
    },
    {
      geometry: new CylinderGeometry(0.14, 0.2, 1.6, 10),
      colour: "#b45309",
      position: [0, 2.6, 0.75],
      rotation: [0.8, 0, 0],
    },
    {
      geometry: new BoxGeometry(0.5, 0.7, 0.06),
      colour: "#231d3d",
      position: [0, 0.35, 1.12],
    },
    {
      geometry: new TorusGeometry(1.05, 0.05, 6, 28),
      colour: "#fbbf24",
      position: [0, 1.62, 0],
      rotation: [Math.PI / 2, 0, 0],
    },
  ]);

const buildNebulaHallGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(1.3, 1.4, 1.1, 10),
      colour: "#6b6889",
      position: [0, 0.55, 0],
    },
    {
      geometry: new SphereGeometry(1.3, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      colour: "#4c1d95",
      position: [0, 1.1, 0],
    },
    ...Array.from({ length: 7 }, (_, pipe): ModelPart => ({
      geometry: new CylinderGeometry(
        0.09,
        0.09,
        1 + Math.sin((pipe / 6) * Math.PI) * 0.9,
        8,
      ),
      colour: "#e2c56b",
      position: [
        -0.75 + pipe * 0.25,
        (1 + Math.sin((pipe / 6) * Math.PI) * 0.9) / 2 + 0.6,
        1.2,
      ],
    })),
    ...[0, 1].map((ring): ModelPart => ({
      geometry: new TorusGeometry(1.7 + ring * 0.3, 0.04, 6, 30),
      colour: ring === 0 ? nebulaPurple : "#ec4899",
      position: [0, 2.3 + ring * 0.3, 0],
      rotation: [Math.PI / 2 + 0.25 - ring * 0.5, 0, 0],
    })),
  ]);

const standingStoneReach = 1.6;
const lintelStoneHeight = 1.9;

const findStandingStone = (stone: number) => {
  const angle = (stone / 9) * Math.PI * 2;
  return {
    angle,
    x: Math.cos(angle) * standingStoneReach,
    z: Math.sin(angle) * standingStoneReach,
    height: stone < 2 ? lintelStoneHeight : 1.3 + (stone % 3) * 0.3,
  };
};

const buildStandingStonesGeometry = (): BufferGeometry => {
  const [first, second] = [findStandingStone(0), findStandingStone(1)];
  return buildModelGeometry([
    ...Array.from({ length: 9 }, (_, stone): ModelPart => {
      const { angle, x, z, height } = findStandingStone(stone);
      return {
        geometry: new BoxGeometry(0.4, height, 0.3),
        colour: stone % 2 === 0 ? moonstone : "#8a87a6",
        position: [x, height / 2, z],
        rotation: [0, -angle, 0],
        roughen: 0.16,
      };
    }),
    {
      geometry: new BoxGeometry(
        Math.hypot(second.x - first.x, second.z - first.z) + 0.5,
        0.25,
        0.36,
      ),
      colour: "#8a87a6",
      position: [
        (first.x + second.x) / 2,
        lintelStoneHeight + 0.12,
        (first.z + second.z) / 2,
      ],
      rotation: [0, -Math.atan2(second.z - first.z, second.x - first.x), 0],
    },
    {
      geometry: new BoxGeometry(0.9, 0.4, 0.6),
      colour: darkStone,
      position: [0, 0.2, 0],
    },
    {
      geometry: new BoxGeometry(standingStoneReach * 2.2, 0.03, 0.06),
      colour: starGlow,
      position: [0, 0.03, 0],
    },
  ]);
};

const buildStarfallRuinsGeometry = (): BufferGeometry =>
  buildModelGeometry([
    ...[-1.1, 1.1].flatMap((x): ModelPart[] => [
      {
        geometry: new BoxGeometry(0.35, 1.8, 0.35),
        colour: moonstone,
        position: [x, 0.9, -0.4],
        roughen: 0.1,
      },
    ]),
    {
      geometry: new TorusGeometry(1.1, 0.18, 6, 16, Math.PI * 0.7),
      colour: "#8a87a6",
      position: [0, 1.8, -0.4],
      rotation: [0, 0, Math.PI * 0.15],
    },
    {
      geometry: new BoxGeometry(0.35, 1.1, 0.35),
      colour: moonstone,
      position: [0.6, 0.18, 0.8],
      rotation: [0, 0.6, Math.PI / 2],
    },
    {
      geometry: new IcosahedronGeometry(0.45, 0),
      colour: starGlow,
      position: [-0.6, 0.35, 0.8],
    },
    ...Array.from({ length: 5 }, (_, shard): ModelPart => {
      const angle = (shard / 5) * Math.PI * 2;
      return {
        geometry: new OctahedronGeometry(0.12, 0),
        colour: "#c4b5fd",
        position: [
          -0.6 + Math.cos(angle) * 0.65,
          0.12,
          0.8 + Math.sin(angle) * 0.65,
        ],
        scale: [0.6, 1.8, 0.6],
        rotation: [Math.sin(angle) * 0.6, 0, -Math.cos(angle) * 0.6],
      };
    }),
  ]);

const buildSignalTowerGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.25, 0.6, 4, 6),
      colour: "#6b7280",
      position: [0, 2, 0],
    },
    ...[1.2, 2.2, 3.2].map((height): ModelPart => ({
      geometry: new TorusGeometry(0.55 - height * 0.08, 0.04, 5, 16),
      colour: "#22d3ee",
      position: [0, height, 0],
      rotation: [Math.PI / 2, 0, 0],
    })),
    {
      geometry: new SphereGeometry(
        0.55,
        14,
        8,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2.6,
      ),
      colour: "#e5e7eb",
      position: [0, 3.4, 0.35],
      rotation: [-1, 0, 0],
    },
    {
      geometry: new CylinderGeometry(0.02, 0.02, 0.9, 4),
      colour: "#d1d5db",
      position: [0, 4.45, 0],
    },
    {
      geometry: new SphereGeometry(0.1, 8, 6),
      colour: "#f43f5e",
      position: [0, 4.95, 0],
    },
    {
      geometry: new BoxGeometry(0.9, 0.7, 0.9),
      colour: "#4b5563",
      position: [0.9, 0.35, 0.6],
    },
  ]);

const buildRocketPadGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(1.3, 1.4, 0.25, 16),
      colour: "#64748b",
      position: [0, 0.12, 0],
    },
    {
      geometry: new CylinderGeometry(0.35, 0.35, 2.4, 12),
      colour: "#f8fafc",
      position: [0, 1.5, 0],
    },
    {
      geometry: new ConeGeometry(0.35, 0.8, 12),
      colour: "#ef4444",
      position: [0, 3.1, 0],
    },
    {
      geometry: new SphereGeometry(0.13, 10, 8),
      colour: "#38bdf8",
      position: [0, 2.1, 0.32],
    },
    ...[0, 1, 2].map((fin): ModelPart => ({
      geometry: new BoxGeometry(0.05, 0.6, 0.4),
      colour: "#ef4444",
      position: [
        Math.cos((fin * Math.PI * 2) / 3) * 0.4,
        0.6,
        Math.sin((fin * Math.PI * 2) / 3) * 0.4,
      ],
      rotation: [0, -(fin * Math.PI * 2) / 3, 0],
    })),
    {
      geometry: new BoxGeometry(0.15, 3, 0.15),
      colour: "#f59e0b",
      position: [0.95, 1.6, 0],
    },
  ]);

const buildRadioDishGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.25, 0.4, 1.6, 8),
      colour: "#cbd5e1",
      position: [0, 0.8, 0],
    },
    {
      geometry: new SphereGeometry(
        1.4,
        16,
        8,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2.6,
      ),
      colour: "#f1f5f9",
      position: [0, 2.6, 0.3],
      rotation: [Math.PI + 0.6, 0, 0],
    },
    {
      geometry: new CylinderGeometry(0.03, 0.03, 1.2, 5),
      colour: "#94a3b8",
      position: [0, 2.3, 0.8],
      rotation: [0.6, 0, 0],
    },
    {
      geometry: new SphereGeometry(0.1, 8, 6),
      colour: "#f43f5e",
      position: [0, 2.8, 1.15],
    },
  ]);

const buildOrreryGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.6, 0.8, 0.3, 12),
      colour: "#475569",
      position: [0, 0.15, 0],
    },
    {
      geometry: new CylinderGeometry(0.05, 0.05, 1.4, 6),
      colour: "#b45309",
      position: [0, 0.9, 0],
    },
    {
      geometry: new SphereGeometry(0.35, 14, 10),
      colour: "#fbbf24",
      position: [0, 1.7, 0],
    },
    ...[
      [0.7, "#a8a29e", 0.08],
      [1.05, "#3b82f6", 0.13],
      [1.4, "#ef4444", 0.1],
      [1.8, "#f59e0b", 0.2],
    ].flatMap(([reach, colour, size], orbit): ModelPart[] => [
      {
        geometry: new TorusGeometry(Number(reach), 0.012, 4, 32),
        colour: "#cbd5e1",
        position: [0, 1.7, 0],
        rotation: [Math.PI / 2, 0, 0],
      },
      {
        geometry: new SphereGeometry(Number(size), 10, 8),
        colour: String(colour),
        position: [
          Math.cos(orbit * 1.7) * Number(reach),
          1.7,
          Math.sin(orbit * 1.7) * Number(reach),
        ],
      },
    ]),
  ]);

const starfallSights: IslandFeature[] = [
  {
    name: "rocket-pad",
    buildGeometry: buildRocketPadGeometry,
    position: { x: 10.5, z: 10 },
    grain: "metal",
  },
  {
    name: "radio-dish",
    buildGeometry: buildRadioDishGeometry,
    position: { x: 20, z: 13 },
    turn: -0.8,
    grain: "metal",
  },
  {
    name: "orrery",
    buildGeometry: buildOrreryGeometry,
    position: { x: -1, z: 6 },
    grain: "metal",
  },
];

const starfallNewLandSightSpots: MapPoint[] = [
  { x: 53, z: 5.5 },
  { x: 70.5, z: -2 },
  { x: 49, z: 15 },
  { x: -32.5, z: 2.5 },
  { x: -60, z: -1.5 },
  { x: -70.5, z: -2.5 },
];

export const starfallLandmarks = {
  "constellation-court": {
    buildGeometry: buildConstellationCourtGeometry,
    grain: "stone",
  },
  "moonlit-scriptorium": {
    buildGeometry: buildMoonlitScriptoriumGeometry,
    grain: "stone",
  },
  observatory: { buildGeometry: buildObservatoryGeometry, grain: "metal" },
  "nebula-hall": { buildGeometry: buildNebulaHallGeometry, grain: "stone" },
  "standing-stones": {
    buildGeometry: buildStandingStonesGeometry,
    grain: "stone",
  },
  "starfall-ruins": {
    buildGeometry: buildStarfallRuinsGeometry,
    grain: "stone",
  },
  "signal-tower": { buildGeometry: buildSignalTowerGeometry, grain: "metal" },
} satisfies IslandLandmarkDesigns;

export const starfallIsle: IslandLandform = {
  newLands: starfallNewLands,
  findHeight: findStarfallHeight,
  paintGround: paintStarfallGround,
  findDistanceToWater: (point) =>
    findDistanceToNewLandRivers(point, starfallNewLands),
  waterCourses: [],
  pools: [],
  listScatters: (keepClearOf, propPlaces, isClearOfTrailsAndAirfield) => {
    const clearOfCrater = [...keepClearOf, starCraterPosition];
    return [
      {
        name: "night-pines",
        things: scatterAcrossLand({
          count: 140,
          seed: 601,
          lowest: 0.6,
          highest: 4,
          keepClearOf: clearOfCrater,
          propPlaces,
          isClearOfTrailsAndAirfield,
          clearance: 3.6,
          findHeight: findStarfallHeight,
          findDistanceToWater: findNoWater,
        }),
        buildGeometry: buildPineGeometry,
        sink: 0.05,
        grain: "foliage",
      },
      {
        name: "crystal-spires",
        things: scatterAcrossLand({
          count: 34,
          seed: 607,
          lowest: 0.5,
          highest: 5,
          keepClearOf: clearOfCrater,
          propPlaces,
          isClearOfTrailsAndAirfield,
          clearance: 3,
          findHeight: findStarfallHeight,
          findDistanceToWater: findNoWater,
        }),
        buildGeometry: buildCrystalSpireGeometry,
        sink: 0.1,
        grain: "metal",
        glow: "#7c5cff",
      },
      {
        name: "menhirs",
        things: scatterAcrossLand({
          count: 26,
          seed: 619,
          lowest: 0.4,
          highest: 4,
          keepClearOf: clearOfCrater,
          propPlaces,
          isClearOfTrailsAndAirfield,
          clearance: 3,
          findHeight: findStarfallHeight,
          findDistanceToWater: findNoWater,
        }),
        buildGeometry: buildMenhirGeometry,
        sink: 0.1,
        grain: "stone",
      },
    ];
  },
  features: [
    ...starfallSights,
    ...copySightsOntoNewLands(starfallSights, starfallNewLandSightSpots),
  ],
};
