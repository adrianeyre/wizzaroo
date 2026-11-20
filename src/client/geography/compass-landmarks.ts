import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  IcosahedronGeometry,
  Path,
  Shape,
  SphereGeometry,
  type BufferGeometry,
} from "three";
import type { CompassLandmark } from "../../curriculum/geography.js";
import {
  buildModelGeometry,
  type ModelPart,
  type Triple,
} from "../world-map-models.js";

const landmarkColours = {
  stone: "#d9d2c3",
  darkStone: "#a39a8a",
  slate: "#3d6aa8",
  red: "#d2453a",
  white: "#f6f2ea",
  lamp: "#ffe27a",
  ink: "#2e2e33",
  rock: "#837c73",
  darkRock: "#6a645d",
  hollow: "#17121c",
  moss: "#5f8a3c",
  sand: "#e8d39a",
  palmTrunk: "#8a6239",
  palmLeaf: "#3f9a3e",
  palmLeafLight: "#5cb84a",
  coconut: "#5a3a20",
  ash: "#6d5a52",
  lava: "#ff7a1a",
  lavaGlow: "#ffd23f",
  grass: "#5aa64e",
  bridgeStone: "#b5aa96",
  stream: "#4aa3e0",
  chestWood: "#8a5a2e",
  chestDark: "#6b4426",
  gold: "#f2c14e",
  millBody: "#f3e6cc",
  millCap: "#7a4a2a",
  sail: "#fbf6e9",
  sailFrame: "#7a4a2a",
} as const;

const buildLighthouseParts = (): ModelPart[] => [
  {
    geometry: new IcosahedronGeometry(0.15, 0),
    colour: landmarkColours.rock,
    position: [0, 0.02, 0],
    scale: [1.2, 0.45, 1.1],
    roughen: 0.3,
  },
  ...[0, 1, 2].map((band) => ({
    geometry: new CylinderGeometry(
      0.072 - band * 0.012,
      0.08 - band * 0.012,
      0.12,
      9,
    ),
    colour: band % 2 === 0 ? landmarkColours.white : landmarkColours.red,
    position: [0, 0.1 + band * 0.12, 0] satisfies Triple,
  })),
  {
    geometry: new CylinderGeometry(0.068, 0.068, 0.02, 9),
    colour: landmarkColours.ink,
    position: [0, 0.405, 0],
  },
  {
    geometry: new CylinderGeometry(0.042, 0.042, 0.06, 9),
    colour: landmarkColours.lamp,
    position: [0, 0.445, 0],
  },
  {
    geometry: new ConeGeometry(0.06, 0.08, 9),
    colour: landmarkColours.red,
    position: [0, 0.515, 0],
  },
  {
    geometry: new BoxGeometry(0.035, 0.05, 0.012),
    colour: landmarkColours.ink,
    position: [0, 0.07, 0.08],
  },
];

const buildCastleParts = (): ModelPart[] => [
  {
    geometry: new BoxGeometry(0.26, 0.2, 0.2),
    colour: landmarkColours.darkStone,
    position: [0, 0.1, -0.02],
  },
  {
    geometry: new BoxGeometry(0.13, 0.32, 0.12),
    colour: landmarkColours.stone,
    position: [0, 0.16, -0.05],
  },
  {
    geometry: new ConeGeometry(0.1, 0.12, 4),
    colour: landmarkColours.slate,
    position: [0, 0.38, -0.05],
    rotation: [0, Math.PI / 4, 0],
  },
  ...[-1, 1].flatMap((side) => [
    {
      geometry: new CylinderGeometry(0.055, 0.06, 0.3, 8),
      colour: landmarkColours.stone,
      position: [side * 0.14, 0.15, 0.08] satisfies Triple,
    },
    {
      geometry: new ConeGeometry(0.075, 0.13, 8),
      colour: landmarkColours.slate,
      position: [side * 0.14, 0.365, 0.08] satisfies Triple,
    },
  ]),
  ...[-0.09, -0.03, 0.03, 0.09].map((across) => ({
    geometry: new BoxGeometry(0.035, 0.035, 0.035),
    colour: landmarkColours.darkStone,
    position: [across, 0.215, 0.07] satisfies Triple,
  })),
  {
    geometry: new BoxGeometry(0.06, 0.09, 0.012),
    colour: landmarkColours.hollow,
    position: [0, 0.045, 0.085],
  },
  {
    geometry: new CylinderGeometry(0.004, 0.004, 0.12, 4),
    colour: landmarkColours.ink,
    position: [0, 0.49, -0.05],
  },
  {
    geometry: new BoxGeometry(0.06, 0.035, 0.006),
    colour: landmarkColours.red,
    position: [0.032, 0.53, -0.05],
  },
];

const buildWindmillParts = (): ModelPart[] => [
  {
    geometry: new CylinderGeometry(0.12, 0.13, 0.04, 10),
    colour: landmarkColours.darkStone,
    position: [0, 0.02, 0],
  },
  {
    geometry: new CylinderGeometry(0.07, 0.105, 0.32, 10),
    colour: landmarkColours.millBody,
    position: [0, 0.2, 0],
  },
  {
    geometry: new ConeGeometry(0.09, 0.12, 10),
    colour: landmarkColours.millCap,
    position: [0, 0.42, 0],
  },
  {
    geometry: new BoxGeometry(0.05, 0.08, 0.012),
    colour: landmarkColours.millCap,
    position: [0, 0.08, 0.1],
  },
  {
    geometry: new BoxGeometry(0.035, 0.035, 0.012),
    colour: landmarkColours.slate,
    position: [0, 0.22, 0.087],
  },
];

export const windmillHubHeight = 0.34;

export const buildWindmillSailsGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.022, 0.022, 0.04, 8),
      colour: landmarkColours.sailFrame,
      rotation: [Math.PI / 2, 0, 0],
    },
    ...[0, 1, 2, 3].flatMap((blade) => {
      const angle = (blade / 4) * Math.PI * 2;
      const reachX = -Math.sin(angle);
      const reachY = Math.cos(angle);
      return [
        {
          geometry: new BoxGeometry(0.012, 0.22, 0.01),
          colour: landmarkColours.sailFrame,
          position: [reachX * 0.11, reachY * 0.11, 0.02] satisfies Triple,
          rotation: [0, 0, angle] satisfies Triple,
        },
        {
          geometry: new BoxGeometry(0.05, 0.16, 0.006),
          colour: landmarkColours.sail,
          position: [
            reachX * 0.13 + Math.cos(angle) * 0.03,
            reachY * 0.13 + Math.sin(angle) * 0.03,
            0.022,
          ] satisfies Triple,
          rotation: [0, 0, angle] satisfies Triple,
        },
      ];
    }),
  ]);

const buildFrondPart = (
  top: Triple,
  turn: number,
  droop: number,
  colour: string,
): ModelPart => {
  const length = 0.2;
  const outward = Math.cos(droop) * (length / 2);
  return {
    geometry: new ConeGeometry(0.035, length, 4),
    colour,
    position: [
      top[0] + Math.cos(turn) * outward,
      top[1] - Math.sin(droop) * (length / 2),
      top[2] - Math.sin(turn) * outward,
    ],
    rotation: [0, turn, -(Math.PI / 2 + droop)],
    scale: [0.35, 1, 1],
  };
};

const buildPalmTreeParts = (): ModelPart[] => {
  const segments = 4;
  const trunk = Array.from({ length: segments }, (_, segment) => {
    const lean = segment * 0.012 + segment * segment * 0.004;
    return {
      geometry: new CylinderGeometry(
        0.022 - segment * 0.002,
        0.026 - segment * 0.002,
        0.105,
        5,
      ),
      colour: segment % 2 === 0 ? landmarkColours.palmTrunk : "#9d7246",
      position: [lean, 0.07 + segment * 0.1, 0] satisfies Triple,
      rotation: [0, 0, -0.08 - segment * 0.04] satisfies Triple,
    };
  });
  const top: Triple = [0.085, 0.44, 0];
  return [
    {
      geometry: new IcosahedronGeometry(0.11, 0),
      colour: landmarkColours.sand,
      position: [0.02, 0.0, 0],
      scale: [1.3, 0.35, 1.2],
      roughen: 0.2,
    },
    ...trunk,
    ...[0, 1, 2, 3, 4, 5].map((frond) =>
      buildFrondPart(
        top,
        (frond / 6) * Math.PI * 2 + 0.3,
        0.35 + (frond % 2) * 0.25,
        frond % 2 === 0
          ? landmarkColours.palmLeaf
          : landmarkColours.palmLeafLight,
      ),
    ),
    ...[0, 1, 2].map((nut) => ({
      geometry: new IcosahedronGeometry(0.02, 0),
      colour: landmarkColours.coconut,
      position: [
        top[0] + Math.cos(nut * 2.1) * 0.025,
        top[1] - 0.03,
        top[2] + Math.sin(nut * 2.1) * 0.025,
      ] satisfies Triple,
    })),
  ];
};

const buildCaveParts = (): ModelPart[] => [
  {
    geometry: new IcosahedronGeometry(0.2, 1),
    colour: landmarkColours.rock,
    position: [0, 0.08, -0.03],
    scale: [1.25, 0.95, 1],
    roughen: 0.3,
    isSmooth: true,
  },
  {
    geometry: new IcosahedronGeometry(0.11, 0),
    colour: landmarkColours.darkRock,
    position: [0.2, 0.04, 0.04],
    roughen: 0.3,
  },
  {
    geometry: new IcosahedronGeometry(0.15, 0),
    colour: landmarkColours.moss,
    position: [-0.02, 0.24, -0.06],
    scale: [1.2, 0.35, 1],
    roughen: 0.25,
    isSmooth: true,
  },
  {
    geometry: new SphereGeometry(0.095, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2),
    colour: landmarkColours.hollow,
    position: [0, 0, 0.13],
    scale: [1, 1.35, 0.6],
  },
];

const buildVolcanoParts = (): ModelPart[] => [
  {
    geometry: new CylinderGeometry(0.07, 0.25, 0.34, 11, 2),
    colour: landmarkColours.ash,
    position: [0, 0.17, 0],
    roughen: 0.12,
  },
  {
    geometry: new CylinderGeometry(0.26, 0.28, 0.04, 11),
    colour: landmarkColours.grass,
    position: [0, 0.02, 0],
  },
  {
    geometry: new CylinderGeometry(0.058, 0.058, 0.012, 11),
    colour: landmarkColours.lava,
    position: [0, 0.342, 0],
  },
  ...[0.4, -0.5].map((turn) => ({
    geometry: new BoxGeometry(0.012, 0.18, 0.03),
    colour: landmarkColours.lava,
    position: [
      Math.sin(turn) * 0.15,
      0.2,
      Math.cos(turn) * 0.15,
    ] satisfies Triple,
    rotation: [0, turn - Math.PI / 2, 0.49] satisfies Triple,
  })),
];

export const volcanoCraterHeight = 0.36;

export const buildSmokePuffGeometry = (): BufferGeometry =>
  buildModelGeometry(
    [
      { at: [0, 0, 0], size: 0.06 },
      { at: [0.05, 0.03, 0.01], size: 0.045 },
      { at: [-0.04, 0.04, -0.01], size: 0.04 },
    ].map(({ at, size }) => ({
      geometry: new IcosahedronGeometry(size, 0),
      colour: "#e9e4df",
      position: [at[0], at[1], at[2]] satisfies Triple,
      isSmooth: true,
    })),
  );

const buildBridgeSideShape = (): Shape => {
  const span = 0.38;
  const deck = 0.11;
  const side = new Shape();
  side.moveTo(-span / 2, 0);
  side.lineTo(-span / 2, deck * 0.55);
  side.quadraticCurveTo(0, deck * 1.5, span / 2, deck * 0.55);
  side.lineTo(span / 2, 0);
  side.closePath();
  const arch = new Path();
  arch.moveTo(0.085, 0);
  arch.absarc(0, 0, 0.085, 0, Math.PI, false);
  arch.lineTo(-0.085, 0);
  side.holes.push(arch);
  return side;
};

const buildBridgeParts = (): ModelPart[] => {
  const body = new ExtrudeGeometry(buildBridgeSideShape(), {
    depth: 0.12,
    bevelEnabled: false,
    curveSegments: 6,
  });
  body.translate(0, 0, -0.06);
  return [
    {
      geometry: new BoxGeometry(0.15, 0.012, 0.42),
      colour: landmarkColours.stream,
      position: [0, 0.006, 0],
    },
    { geometry: body, colour: landmarkColours.bridgeStone },
    ...[-1, 1].flatMap((edge) =>
      [-1, 0, 1].map((along) => ({
        geometry: new BoxGeometry(0.13, 0.03, 0.016),
        colour: "#9b9284",
        position: [
          along * 0.125,
          0.128 - Math.abs(along) * 0.023,
          edge * 0.052,
        ] satisfies Triple,
        rotation: [0, 0, -along * 0.2] satisfies Triple,
      })),
    ),
  ];
};

const buildTreasureChestParts = (): ModelPart[] => [
  {
    geometry: new BoxGeometry(0.2, 0.1, 0.13),
    colour: landmarkColours.chestWood,
    position: [0, 0.05, 0],
  },
  {
    geometry: new CylinderGeometry(0.065, 0.065, 0.2, 9, 1, false, 0, Math.PI),
    colour: landmarkColours.chestDark,
    position: [0, 0.1, 0],
    rotation: [0, Math.PI / 2, Math.PI / 2],
  },
  ...[-0.07, 0.07].flatMap((across) => [
    {
      geometry: new BoxGeometry(0.022, 0.102, 0.134),
      colour: landmarkColours.gold,
      position: [across, 0.05, 0] satisfies Triple,
    },
    {
      geometry: new CylinderGeometry(
        0.068,
        0.068,
        0.022,
        9,
        1,
        false,
        0,
        Math.PI,
      ),
      colour: landmarkColours.gold,
      position: [across, 0.1, 0] satisfies Triple,
      rotation: [0, Math.PI / 2, Math.PI / 2] satisfies Triple,
    },
  ]),
  {
    geometry: new BoxGeometry(0.035, 0.045, 0.015),
    colour: landmarkColours.gold,
    position: [0, 0.1, 0.07],
  },
  ...[
    [0.15, 0.06],
    [0.17, 0.0],
    [0.155, 0.03],
  ].map(([x, z], coin) => ({
    geometry: new CylinderGeometry(0.022, 0.022, 0.008, 6),
    colour: landmarkColours.gold,
    position: [x, 0.004 + (coin === 2 ? 0.008 : 0), z] satisfies Triple,
  })),
];

const landmarkBuilders: Record<CompassLandmark, () => ModelPart[]> = {
  lighthouse: buildLighthouseParts,
  castle: buildCastleParts,
  windmill: buildWindmillParts,
  "palm-tree": buildPalmTreeParts,
  cave: buildCaveParts,
  volcano: buildVolcanoParts,
  bridge: buildBridgeParts,
  "treasure-chest": buildTreasureChestParts,
};

export const buildLandmarkGeometry = (
  landmark: CompassLandmark,
): BufferGeometry => buildModelGeometry(landmarkBuilders[landmark]());
