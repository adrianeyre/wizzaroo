import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  SphereGeometry,
  TetrahedronGeometry,
  TorusGeometry,
} from "three";
import {
  buildFlame,
  buildGableRoof,
  type HistoryPropParts,
} from "./history-prop-parts.js";
import type { ModelPart, Triple } from "./world-map-models.js";

const buildBlock = (
  size: Triple,
  colour: string,
  position: Triple,
  rotation: Triple = [0, 0, 0],
): ModelPart => ({
  geometry: new BoxGeometry(size[0], size[1], size[2]),
  colour,
  position,
  rotation,
});

const buildDrum = (
  radii: [number, number],
  height: number,
  segments: number,
  colour: string,
  position: Triple,
  rotation: Triple = [0, 0, 0],
): ModelPart => ({
  geometry: new CylinderGeometry(radii[0], radii[1], height, segments),
  colour,
  position,
  rotation,
});

const buildSpike = (
  radius: number,
  height: number,
  segments: number,
  colour: string,
  position: Triple,
  rotation: Triple = [0, 0, 0],
): ModelPart => ({
  geometry: new ConeGeometry(radius, height, segments),
  colour,
  position,
  rotation,
});

const buildLump = (
  radius: number,
  colour: string,
  position: Triple,
  scale: Triple | number = 1,
  roughen = 0.25,
): ModelPart => ({
  geometry: new IcosahedronGeometry(radius, 0),
  colour,
  position,
  scale,
  roughen,
  isSmooth: true,
});

const buildDome = (
  radius: number,
  segments: number,
  colour: string,
  position: Triple,
  scale: Triple | number = 1,
): ModelPart => ({
  geometry: new SphereGeometry(
    radius,
    segments,
    4,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  ),
  colour,
  position,
  scale,
});

const buildHullParts = (
  wood: string,
  deck: string,
  size: Triple,
): ModelPart[] => [
  {
    geometry: new SphereGeometry(
      1,
      12,
      4,
      0,
      Math.PI * 2,
      Math.PI / 2,
      Math.PI / 2,
    ),
    colour: wood,
    position: [0, size[1], 0],
    scale: size,
  },
  {
    geometry: new CylinderGeometry(1, 1, 0.05, 12),
    colour: deck,
    position: [0, size[1] - 0.04, 0],
    scale: [size[0] * 0.97, 1, size[2] * 0.97],
  },
];

const buildSmokeParts = (at: Triple): ModelPart[] => [
  buildLump(0.32, "#cfcac0", at),
  buildLump(0.26, "#dcd8d0", [at[0] + 0.25, at[1] + 0.5, at[2] - 0.1]),
  buildLump(0.2, "#e8e4dc", [at[0] + 0.55, at[1] + 0.95, at[2] - 0.15]),
];

const buildRoundhouseParts = (wall: string, thatch: string): ModelPart[] => [
  buildDrum([1.5, 1.55], 1.2, 10, wall, [0, 0.6, 0]),
  {
    geometry: new ConeGeometry(2.0, 2.2, 10),
    colour: thatch,
    position: [0, 2.3, 0],
    roughen: 0.05,
  },
  buildBlock([0.62, 0.95, 0.3], "#3a2a1e", [0, 0.48, 1.42]),
  buildBlock([0.82, 0.12, 0.34], "#5a3a22", [0, 1.0, 1.46]),
  ...buildSmokeParts([0.2, 3.6, 0]),
];

const buildBroadleafTreeParts = (
  trunk: string,
  leaves: [string, string, string],
): ModelPart[] => [
  buildDrum([0.14, 0.22], 1.8, 6, trunk, [0, 0.9, 0]),
  buildDrum([0.05, 0.09], 0.9, 5, trunk, [0.3, 1.7, 0], [0, 0, -0.7]),
  buildLump(1.0, leaves[0], [0, 2.5, 0], [1.2, 0.95, 1.1]),
  buildLump(0.75, leaves[1], [0.7, 2.2, 0.3]),
  buildLump(0.7, leaves[2], [-0.65, 2.25, -0.2]),
  buildLump(0.6, leaves[1], [0.1, 3.1, 0.2]),
];

const buildSpokedWheelParts = (
  radius: number,
  z: number,
  rim: string,
  spokes: number,
): ModelPart[] => [
  {
    geometry: new TorusGeometry(radius, 0.05, 4, 14),
    colour: rim,
    position: [0, radius, z],
  },
  buildDrum([0.09, 0.09], 0.16, 6, rim, [0, radius, z], [Math.PI / 2, 0, 0]),
  ...Array.from({ length: spokes }, (_, index): ModelPart =>
    buildBlock(
      [0.04, radius * 2, 0.04],
      rim,
      [0, radius, z],
      [0, 0, (index / spokes) * Math.PI],
    ),
  ),
];

const buildSolidWheel = (radius: number, at: Triple): ModelPart =>
  buildDrum([radius, radius], 0.12, 10, "#6b4a2c", at, [Math.PI / 2, 0, 0]);

const buildPyramidRoof = (
  halfWidth: number,
  height: number,
  colour: string,
  at: Triple,
): ModelPart =>
  buildSpike(
    halfWidth * Math.SQRT2,
    height,
    4,
    colour,
    [at[0], at[1] + height / 2, at[2]],
    [0, Math.PI / 4, 0],
  );

const getRidgeHeight = (x: number, z: number): number =>
  2 * Math.sqrt(Math.max(0, 1 - (x / 7) ** 2 - (z / 3.5) ** 2));

const getWallLine = (x: number): number => 0.4 * Math.sin(x * 0.6);

const buildRidgeWallParts = (): ModelPart[] =>
  Array.from({ length: 12 }, (_, index): ModelPart[] => {
    const x = -6.05 + index * 1.1;
    const z = getWallLine(x);
    const rise =
      getRidgeHeight(x + 0.55, getWallLine(x + 0.55)) -
      getRidgeHeight(x - 0.55, getWallLine(x - 0.55));
    const veer = getWallLine(x + 0.55) - getWallLine(x - 0.55);
    const slope = Math.atan2(rise, 1.1);
    const bend = -Math.atan2(veer, 1.1);
    const height = getRidgeHeight(x, z) + 0.3;
    return [
      buildBlock(
        [1.16, 1.0, 0.55],
        "#a39a88",
        [x, height, z],
        [0, bend, slope],
      ),
      buildBlock(
        [1.18, 0.08, 0.6],
        "#eef3f4",
        [x - Math.sin(slope) * 0.54, height + Math.cos(slope) * 0.54, z],
        [0, bend, slope],
      ),
    ];
  }).flat();

const buildLongshipParts = (): ModelPart[] => {
  const wood = "#5a3a22";
  const dragon = "#c9a14a";
  const shieldColours = ["#d9a93c", "#2f5f9e", "#b8322a", "#efe3c4"];
  const sailColours = ["#b8322a", "#f2ead8"];
  return [
    ...buildHullParts(wood, "#8a6440", [3.2, 0.55, 0.7]),
    buildDrum([0.09, 0.12], 0.7, 6, wood, [3.05, 0.75, 0], [0, 0, -0.6]),
    buildDrum([0.08, 0.09], 0.6, 6, wood, [3.3, 1.25, 0], [0, 0, -0.2]),
    buildBlock([0.42, 0.24, 0.2], dragon, [3.5, 1.62, 0], [0, 0, -0.2]),
    buildBlock([0.24, 0.1, 0.16], "#b8322a", [3.75, 1.55, 0], [0, 0, -0.3]),
    buildSpike(0.06, 0.24, 4, dragon, [3.36, 1.86, 0.06], [0, 0, 0.5]),
    buildSpike(0.06, 0.24, 4, dragon, [3.36, 1.86, -0.06], [0, 0, 0.5]),
    buildDrum([0.09, 0.12], 0.7, 6, wood, [-3.05, 0.75, 0], [0, 0, 0.6]),
    buildDrum([0.06, 0.09], 0.6, 6, wood, [-3.3, 1.25, 0], [0, 0, 0.2]),
    buildSpike(0.08, 0.4, 5, dragon, [-3.32, 1.7, 0], [0, 0, -0.9]),
    buildDrum([0.06, 0.08], 3.4, 6, wood, [0, 2.2, 0]),
    buildDrum([0.05, 0.05], 3.0, 5, wood, [0, 3.65, 0.05], [0, 0, Math.PI / 2]),
    ...[-1.12, -0.56, 0, 0.56, 1.12].map((x, index): ModelPart =>
      buildBlock([0.57, 2.2, 0.04], sailColours[index % 2], [x, 2.5, 0.08]),
    ),
    ...[-2.1, -1.5, -0.9, -0.3, 0.3, 0.9, 1.5, 2.1].map((x, index): ModelPart =>
      buildDrum(
        [0.2, 0.2],
        0.05,
        8,
        shieldColours[index % 4],
        [x, 0.5, 0.7 * Math.sqrt(1 - (x / 3.2) ** 2) + 0.02],
        [Math.PI / 2, 0, 0],
      ),
    ),
  ];
};

const buildParthenonParts = (): ModelPart[] => {
  const marble = "#ece4d2";
  return [
    buildBlock([6.8, 0.2, 9.6], "#ddd4c0", [0, 0.1, 0]),
    buildBlock([6.4, 0.2, 9.2], "#e4dccb", [0, 0.3, 0]),
    buildBlock([6.0, 0.2, 8.8], marble, [0, 0.5, 0]),
    buildBlock([4.4, 2.6, 7.4], "#dccfb6", [0, 1.9, -0.2]),
    buildBlock([1.2, 1.9, 0.05], "#5a4a3a", [0, 1.55, 3.52]),
    ...[-2.7, -1.93, -1.16, -0.39, 0.39, 1.16, 1.93, 2.7].map((x): ModelPart =>
      buildDrum([0.17, 0.21], 2.6, 8, marble, [x, 1.9, 4.0]),
    ),
    ...[-2.6, -1.3, 0, 1.3, 2.6].flatMap((z): ModelPart[] => [
      buildDrum([0.17, 0.21], 2.6, 8, marble, [-2.7, 1.9, z]),
      buildDrum([0.17, 0.21], 2.6, 8, marble, [2.7, 1.9, z]),
    ]),
    buildBlock([6.0, 0.3, 8.8], marble, [0, 3.35, 0]),
    buildBlock([6.04, 0.2, 8.84], "#d4c7aa", [0, 3.6, 0]),
    {
      geometry: buildGableRoof(6.2, 1.0, 9.0),
      colour: "#e6decc",
      position: [0, 3.7, 0],
      rotation: [0, Math.PI / 2, 0],
    },
    buildBlock([2.2, 0.35, 0.04], "#8fb0c8", [0, 3.95, 4.52]),
  ];
};

export const ancientPropBuilders = {
  "cave-mouth-arch": (): HistoryPropParts => ({
    body: [
      buildLump(2.2, "#5e4f45", [-10.2, 1.2, 0], [1, 1.1, 1]),
      buildLump(2.0, "#6b5a4e", [-10.6, 3.8, -0.3]),
      buildLump(1.9, "#54463d", [-9.8, 6.0, 0.2]),
      buildLump(1.4, "#77655a", [-8.4, 0.6, 0.6]),
      buildLump(2.3, "#5e4f45", [10.3, 1.3, 0], [1, 1.1, 1]),
      buildLump(2.1, "#6b5a4e", [10.7, 4.0, -0.2]),
      buildLump(2.0, "#54463d", [9.9, 6.2, 0.1]),
      buildLump(1.3, "#77655a", [8.6, 0.7, 0.5]),
      buildLump(2.2, "#54463d", [-7.4, 7.8, 0], [1.4, 0.7, 1]),
      buildLump(2.2, "#5e4f45", [-3.4, 8.2, -0.2], [1.5, 0.6, 1]),
      buildLump(2.2, "#4c3f37", [0.6, 8.3, 0.1], [1.5, 0.6, 1]),
      buildLump(2.2, "#5e4f45", [4.6, 8.1, -0.1], [1.5, 0.6, 1]),
      buildLump(2.1, "#54463d", [8.0, 7.8, 0], [1.3, 0.7, 1]),
      buildSpike(0.35, 1.1, 5, "#6b5a4e", [-5.2, 6.6, 0.3], [Math.PI, 0, 0]),
      buildSpike(0.28, 0.8, 5, "#77655a", [-1.6, 6.9, 0.2], [Math.PI, 0, 0]),
      buildSpike(0.32, 1.0, 5, "#6b5a4e", [2.6, 6.8, 0.3], [Math.PI, 0, 0]),
      buildSpike(0.3, 0.9, 5, "#77655a", [6.1, 6.6, 0.2], [Math.PI, 0, 0]),
    ],
  }),
  "cave-painted-slab": (): HistoryPropParts => ({
    body: [
      buildLump(0.7, "#6b5a4e", [0, 0.35, 0], [1.6, 0.7, 0.9]),
      {
        geometry: new BoxGeometry(2.2, 1.6, 0.25),
        colour: "#c2ad90",
        position: [0, 1.45, 0],
        roughen: 0.05,
      },
      buildBlock([0.72, 0.36, 0.04], "#a0472a", [-0.35, 1.55, 0.17]),
      buildBlock([0.26, 0.24, 0.04], "#a0472a", [0.08, 1.62, 0.17]),
      buildBlock([0.18, 0.18, 0.04], "#7a3220", [-0.42, 1.8, 0.17]),
      ...[-0.6, -0.42, -0.24, -0.08].map((x): ModelPart =>
        buildBlock([0.07, 0.26, 0.04], "#8a3a22", [x, 1.28, 0.17]),
      ),
      buildBlock([0.44, 0.2, 0.04], "#d9952e", [0.55, 1.95, 0.15]),
      buildBlock([0.12, 0.14, 0.04], "#d9952e", [0.82, 2.02, 0.15]),
      buildBlock(
        [0.04, 0.22, 0.04],
        "#d9952e",
        [0.85, 2.18, 0.15],
        [0, 0, 0.4],
      ),
      buildDrum(
        [0.13, 0.13],
        0.04,
        8,
        "#8f2e1e",
        [0.55, 1.1, 0.18],
        [Math.PI / 2, 0, 0],
      ),
      ...[-0.8, -0.65, -0.5].map((x): ModelPart =>
        buildBlock([0.07, 0.07, 0.04], "#2a211c", [x, 2.05, 0.15]),
      ),
    ],
  }),
  "stone-age-campfire": (): HistoryPropParts => ({
    body: [
      ...[0, 1, 2, 3, 4, 5, 6].map((stone): ModelPart =>
        buildLump(0.15, stone % 2 === 0 ? "#6f6a62" : "#857d72", [
          Math.cos((stone / 7) * Math.PI * 2) * 0.5,
          0.08,
          Math.sin((stone / 7) * Math.PI * 2) * 0.5,
        ]),
      ),
      ...[0, 1.05, 2.1].map((turn): ModelPart =>
        buildDrum(
          [0.06, 0.06],
          0.9,
          6,
          "#5a3a22",
          [0, 0.1, 0],
          [0, turn, Math.PI / 2],
        ),
      ),
      buildDrum([0.03, 0.04], 1.0, 4, "#4a3020", [-0.75, 0.5, 0]),
      buildDrum([0.03, 0.04], 1.0, 4, "#4a3020", [0.75, 0.5, 0]),
      buildDrum(
        [0.025, 0.025],
        1.6,
        4,
        "#5a3a22",
        [0, 0.98, 0],
        [0, 0, Math.PI / 2],
      ),
    ],
    glow: [
      buildDrum([0.34, 0.38], 0.06, 8, "#ff5a1a", [0, 0.04, 0]),
      buildFlame([0, 0.1, 0], 0.9, "#ff9a2e"),
      buildFlame([0.13, 0.1, 0.08], 0.6, "#ffd25a"),
      buildFlame([-0.14, 0.1, -0.06], 0.7, "#ff7a1a"),
    ],
    motion: "flicker",
  }),
  "hide-shelter": (): HistoryPropParts => ({
    body: [
      {
        geometry: new ConeGeometry(1.4, 2.6, 7),
        colour: "#9a7148",
        position: [0, 1.3, 0],
        roughen: 0.04,
      },
      buildDrum([1.42, 1.44], 0.35, 7, "#b8905e", [0, 0.6, 0]),
      {
        geometry: new ConeGeometry(0.45, 1.3, 3),
        colour: "#3a2a1e",
        position: [0, 0.62, 1.0],
        rotation: [-0.5, 0, 0],
        scale: [1, 1, 0.15],
      },
      ...[0, 2.1, 4.2].map((turn): ModelPart =>
        buildDrum(
          [0.03, 0.03],
          1.0,
          4,
          "#6b4a2c",
          [Math.cos(turn) * 0.18, 2.75, Math.sin(turn) * 0.18],
          [Math.sin(turn) * 0.35, 0, -Math.cos(turn) * 0.35],
        ),
      ),
      ...[0, 1, 2, 3, 4, 5].map((stone): ModelPart =>
        buildLump(0.18, "#77716a", [
          Math.cos((stone / 6) * Math.PI * 2 + 0.3) * 1.45,
          0.1,
          Math.sin((stone / 6) * Math.PI * 2 + 0.3) * 1.45,
        ]),
      ),
      buildDrum([0.04, 0.04], 1.4, 4, "#6b4a2c", [1.9, 0.7, 0.2]),
      buildDrum([0.04, 0.04], 1.4, 4, "#6b4a2c", [2.9, 0.7, 0.2]),
      buildDrum(
        [0.04, 0.04],
        1.1,
        4,
        "#6b4a2c",
        [2.4, 1.35, 0.2],
        [0, 0, Math.PI / 2],
      ),
      buildBlock([0.85, 0.9, 0.04], "#c49a66", [2.4, 0.85, 0.2]),
    ],
  }),
  "flint-knapping-stone": (): HistoryPropParts => ({
    body: [
      buildLump(0.4, "#857a6c", [0, 0.2, 0], [1.3, 0.6, 1]),
      ...[
        [-0.15, 0.48, 0.05, 0.3],
        [0.18, 0.46, -0.1, 1.2],
        [0.05, 0.47, 0.22, 2.1],
      ].map(([x, y, z, turn]): ModelPart => ({
        geometry: new TetrahedronGeometry(0.14, 0),
        colour: "#3e4a5c",
        position: [x, y, z],
        rotation: [0.4, turn, 0.2],
        scale: [1, 0.5, 1.6],
      })),
      buildSpike(
        0.13,
        0.32,
        4,
        "#4f5a6a",
        [0.6, 0.12, 0.2],
        [Math.PI / 2, 0, 0.5],
      ),
      buildDrum(
        [0.025, 0.03],
        1.6,
        4,
        "#8a6a44",
        [-0.55, 0.75, -0.1],
        [0, 0, 0.35],
      ),
      buildSpike(0.06, 0.2, 4, "#3e4a5c", [-0.83, 1.6, -0.1], [0, 0, 0.35]),
      buildDrum(
        [0.035, 0.05],
        0.55,
        5,
        "#e8dcc4",
        [0.45, 0.06, -0.3],
        [0, 0.6, Math.PI / 2],
      ),
    ],
  }),
  "woolly-mammoth": (): HistoryPropParts => ({
    body: [
      buildLump(1.0, "#6b4a2e", [0, 1.95, 0], [1.5, 1.05, 0.95], 0.15),
      buildLump(0.5, "#5e3f26", [0.85, 2.85, 0], [1, 0.9, 0.9], 0.15),
      buildLump(0.6, "#714e30", [1.35, 2.35, 0], [1, 1.1, 0.9], 0.15),
      buildLump(0.32, "#5e3f26", [1.2, 2.45, 0.42], [0.6, 1, 0.4]),
      buildLump(0.32, "#5e3f26", [1.2, 2.45, -0.42], [0.6, 1, 0.4]),
      buildDrum([0.14, 0.12], 0.6, 6, "#6b4a2e", [1.85, 1.8, 0], [0, 0, 0.15]),
      buildDrum([0.12, 0.1], 0.5, 6, "#6b4a2e", [1.92, 1.3, 0]),
      buildDrum([0.1, 0.07], 0.4, 6, "#6b4a2e", [2.02, 0.92, 0], [0, 0, -0.4]),
      ...[0.24, -0.24].map((z): ModelPart => ({
        geometry: new TorusGeometry(0.45, 0.05, 4, 8, Math.PI * 1.15),
        colour: "#efe6d2",
        position: [1.9, 1.9, z],
        rotation: [0, 0, Math.PI],
      })),
      ...[
        [0.75, 0.38],
        [0.75, -0.38],
        [-0.75, 0.38],
        [-0.75, -0.38],
      ].map(([x, z]): ModelPart =>
        buildDrum([0.24, 0.22], 1.3, 6, "#5a3c24", [x, 0.65, z]),
      ),
      buildDrum([0.03, 0.05], 0.6, 4, "#5a3c24", [-1.5, 1.75, 0], [0, 0, -0.4]),
    ],
  }),
  "icy-ridge": (): HistoryPropParts => ({
    body: [
      {
        geometry: new ConeGeometry(3.5, 5, 6),
        colour: "#a9bccb",
        position: [0, 2.5, 0],
        roughen: 0.06,
      },
      buildSpike(1.45, 2.05, 6, "#f4f8fb", [0, 4.0, 0]),
      {
        geometry: new ConeGeometry(2.4, 3.4, 6),
        colour: "#b8c8d6",
        position: [3.2, 1.7, -0.8],
        rotation: [0, 0.5, 0],
        roughen: 0.06,
      },
      buildSpike(1.0, 1.43, 6, "#f4f8fb", [3.2, 2.69, -0.8], [0, 0.5, 0]),
      buildLump(1.2, "#e6eef4", [-2.4, 0.3, 1.0], [1.6, 0.5, 1]),
      buildLump(1.0, "#dfe8ef", [1.8, 0.25, 1.4], [1.6, 0.5, 1]),
    ],
  }),
  "skara-brae-house": (): HistoryPropParts => ({
    body: [
      buildDome(2.4, 10, "#7e8a55", [0, 0, 0], [1, 0.28, 1]),
      {
        geometry: new CylinderGeometry(1.7, 1.8, 0.8, 10),
        colour: "#a39a8a",
        position: [0, 0.4, 0],
        roughen: 0.05,
      },
      buildDome(1.9, 10, "#6f8f4a", [0, 0.75, 0], [1, 0.42, 1]),
      buildLump(0.5, "#7fa058", [0.3, 1.45, -0.2], [1.4, 0.4, 1.2]),
      buildBlock([0.45, 0.5, 0.3], "#2e261e", [0, 0.26, 1.72]),
      buildBlock([0.75, 0.12, 0.36], "#8c8476", [0, 0.56, 1.74]),
      buildDrum([0.2, 0.2], 0.08, 6, "#3a3028", [0, 1.55, 0]),
    ],
  }),
  "skara-brae-house-ruin": (): HistoryPropParts => {
    const stone = "#a8a090";
    return {
      body: [
        buildDrum([1.85, 1.85], 0.06, 10, "#6b5a46", [0, 0.03, 0]),
        ...[0, 1, 2, 3, 4, 5, 6].map((index): ModelPart => {
          const angle = Math.PI / 2 + ((index + 0.5) / 7) * Math.PI;
          return buildBlock(
            [0.9, 1.1, 0.35],
            index % 2 === 0 ? stone : "#9a9282",
            [Math.sin(angle) * 1.9, 0.55, Math.cos(angle) * 1.9],
            [0, angle, 0],
          );
        }),
        ...[0, 1, 2, 3, 4].map((index): ModelPart => {
          const angle = -Math.PI / 2 + ((index + 0.5) / 5) * Math.PI;
          return buildBlock(
            [1.2, 0.35, 0.35],
            index === 2 ? "#6b5a46" : "#9a9282",
            [
              Math.sin(angle) * 1.9,
              index === 2 ? 0.05 : 0.18,
              Math.cos(angle) * 1.9,
            ],
            [0, angle, 0],
          );
        }),
        buildBlock([0.12, 1.4, 0.4], "#958d7d", [-0.55, 0.7, -1.35]),
        buildBlock([0.12, 1.4, 0.4], "#958d7d", [0.55, 0.7, -1.35]),
        ...[0.45, 0.95, 1.4].map((y): ModelPart =>
          buildBlock([1.25, 0.08, 0.44], "#b3ab9b", [0, y, -1.35]),
        ),
        buildDrum([0.1, 0.08], 0.22, 6, "#b5663b", [-0.28, 1.1, -1.3]),
        buildDrum([0.08, 0.07], 0.18, 6, "#c98a4a", [0.2, 0.58, -1.3]),
        buildLump(0.09, "#efe6d2", [0.25, 1.05, -1.3]),
        buildBlock([0.8, 0.12, 0.08], "#8c8476", [0, 0.06, 0.4]),
        buildBlock([0.8, 0.12, 0.08], "#8c8476", [0, 0.06, -0.4]),
        buildBlock([0.08, 0.12, 0.8], "#8c8476", [0.4, 0.06, 0]),
        buildBlock([0.08, 0.12, 0.8], "#8c8476", [-0.4, 0.06, 0]),
        buildBlock([0.7, 0.04, 0.7], "#4a3a2e", [0, 0.04, 0]),
        buildBlock([0.08, 0.6, 1.1], "#958d7d", [1.2, 0.3, -0.3]),
        buildBlock([0.08, 0.6, 1.1], "#958d7d", [-1.2, 0.3, -0.3]),
      ],
    };
  },
  "skara-brae-passage": (): HistoryPropParts => ({
    body: [
      buildBlock([3, 0.7, 0.3], "#a39a8a", [0, 0.35, 0.45]),
      buildBlock([3, 0.7, 0.3], "#9a9282", [0, 0.35, -0.45]),
      buildBlock([3.1, 0.14, 1.3], "#8c8476", [0, 0.77, 0]),
      buildLump(0.8, "#6f8f4a", [0, 0.86, 0], [2.0, 0.25, 0.85]),
      buildBlock([0.4, 0.5, 0.62], "#2e261e", [1.42, 0.25, 0]),
    ],
  }),
  "orkney-sheep": (): HistoryPropParts => ({
    body: [
      buildLump(0.45, "#ece4d2", [0, 0.62, 0], [1.3, 0.9, 0.9], 0.2),
      buildBlock([0.26, 0.28, 0.22], "#3a322c", [0.62, 0.78, 0], [0, 0, -0.3]),
      buildBlock([0.14, 0.05, 0.08], "#3a322c", [0.55, 0.9, 0.16], [0, 0.4, 0]),
      buildBlock(
        [0.14, 0.05, 0.08],
        "#3a322c",
        [0.55, 0.9, -0.16],
        [0, -0.4, 0],
      ),
      ...[
        [0.3, 0.18],
        [0.3, -0.18],
        [-0.3, 0.18],
        [-0.3, -0.18],
      ].map(([x, z]): ModelPart =>
        buildDrum([0.05, 0.05], 0.4, 4, "#3a322c", [x, 0.2, z]),
      ),
    ],
  }),
  "grass-dune": (): HistoryPropParts => ({
    body: [
      buildDome(1, 10, "#d9caa0", [0, 0, 0], [3.9, 0.7, 2.1]),
      buildDome(1, 10, "#93a865", [0.2, 0.05, -0.1], [3.4, 1.0, 1.7]),
      ...[-1.6, -0.6, 0.5, 1.4, 2.2].map((x, index): ModelPart =>
        buildSpike(
          0.08,
          0.6,
          4,
          "#b5b56a",
          [x, 0.85 - Math.abs(x) * 0.18, 0.4 + (index % 2) * 0.3],
          [0, 0, x * 0.08],
        ),
      ),
    ],
  }),
  "orkney-sea-stack": (): HistoryPropParts => ({
    body: [
      {
        geometry: new CylinderGeometry(0.85, 1.25, 5, 6),
        colour: "#8c5a44",
        position: [0, 2.3, 0],
        roughen: 0.1,
      },
      {
        geometry: new CylinderGeometry(0.6, 0.85, 1.2, 6),
        colour: "#9a6a50",
        position: [0.1, 5.3, 0],
        rotation: [0, 0.4, 0.05],
        roughen: 0.1,
      },
      buildDome(0.62, 6, "#6f8f4a", [0.12, 5.88, 0], [1, 0.4, 1]),
      buildLump(0.9, "#7a4e3a", [1.0, 0.2, 0.6], [1.2, 0.6, 1]),
    ],
  }),
  "sarsen-trilithon": (): HistoryPropParts => ({
    body: [
      {
        geometry: new BoxGeometry(0.9, 3.6, 0.7),
        colour: "#a8a08c",
        position: [-0.75, 1.8, 0],
        rotation: [0, 0.05, 0.02],
        roughen: 0.06,
      },
      {
        geometry: new BoxGeometry(0.9, 3.6, 0.7),
        colour: "#9f9784",
        position: [0.75, 1.8, 0],
        rotation: [0, -0.04, -0.02],
        roughen: 0.06,
      },
      {
        geometry: new BoxGeometry(2.6, 0.55, 0.8),
        colour: "#b0a893",
        position: [0, 3.86, 0],
        roughen: 0.04,
      },
    ],
  }),
  "great-trilithon": (): HistoryPropParts => ({
    body: [
      {
        geometry: new BoxGeometry(1.1, 5.2, 0.85),
        colour: "#9f9784",
        position: [-0.85, 2.6, 0],
        roughen: 0.06,
      },
      {
        geometry: new BoxGeometry(1.1, 5.2, 0.85),
        colour: "#a8a08c",
        position: [0.85, 2.6, 0],
        roughen: 0.06,
      },
      {
        geometry: new BoxGeometry(3.0, 0.65, 0.95),
        colour: "#b0a893",
        position: [0, 5.5, 0],
        roughen: 0.04,
      },
    ],
  }),
  "stonehenge-bluestone": (): HistoryPropParts => ({
    body: [
      [-0.5, 1.6, 0.1],
      [0.1, 1.3, -0.2],
      [0.6, 1.5, -0.1],
    ].map(([x, height, tilt]): ModelPart => ({
      geometry: new BoxGeometry(0.45, height, 0.35),
      colour: "#7d8a96",
      position: [x, height / 2, 0],
      rotation: [0, x, tilt],
      roughen: 0.08,
    })),
  }),
  "heel-stone": (): HistoryPropParts => ({
    body: [
      {
        geometry: new IcosahedronGeometry(1, 1),
        colour: "#a59b84",
        position: [0, 2.0, 0],
        rotation: [0, 0, 0.22],
        scale: [0.9, 2.4, 0.8],
        roughen: 0.18,
      },
    ],
  }),
  "henge-earth-bank": (): HistoryPropParts => ({
    body: [
      {
        geometry: new TorusGeometry(7.4, 0.8, 4, 28),
        colour: "#7c9a50",
        rotation: [Math.PI / 2, 0, 0],
        scale: [1, 1, 0.4],
      },
      {
        geometry: new TorusGeometry(6.3, 0.5, 4, 28),
        colour: "#5e7a3c",
        rotation: [Math.PI / 2, 0, 0],
        scale: [1, 1, 0.08],
      },
    ],
  }),
  "round-barrow": (): HistoryPropParts => ({
    body: [
      buildDome(1, 10, "#7e9a52", [0, 0, 0], [2.4, 0.9, 2.4]),
      {
        geometry: new TorusGeometry(2.6, 0.25, 4, 18),
        colour: "#5e7a3c",
        rotation: [Math.PI / 2, 0, 0],
        scale: [1, 1, 0.2],
      },
    ],
  }),
  "hillfort-hill": (): HistoryPropParts => {
    const posts = 20;
    return {
      body: [
        {
          geometry: new SphereGeometry(
            1,
            14,
            5,
            0,
            Math.PI * 2,
            0,
            Math.PI / 2,
          ),
          colour: "#6f9a46",
          scale: [9, 2.4, 5],
          roughen: 0.03,
          isSmooth: true,
        },
        ...[
          [0.9, 0.927],
          [1.6, 0.745],
        ].map(([y, spread]): ModelPart => ({
          geometry: new TorusGeometry(1, 0.1, 4, 20),
          colour: "#86ad55",
          position: [0, y, 0],
          rotation: [Math.PI / 2, 0, 0],
          scale: [9 * spread, 5 * spread, 3],
        })),
        ...Array.from({ length: posts }, (_, index): ModelPart[] => {
          const angle = (index / posts) * Math.PI * 2;
          const x = Math.sin(angle) * 4.98;
          const z = Math.cos(angle) * 2.77;
          const facing = Math.atan2(
            Math.sin(angle) / 4.98,
            Math.cos(angle) / 2.77,
          );
          return Math.abs(angle - Math.PI * 2) < 0.2 || angle < 0.2
            ? []
            : [
                buildBlock(
                  [1.45, 0.9, 0.16],
                  "#7a5432",
                  [x, 2.4, z],
                  [0, facing, 0],
                ),
                buildSpike(0.12, 0.3, 4, "#8a6440", [x, 3.0, z]),
              ];
        }).flat(),
      ],
    };
  },
  "hillfort-gate": (): HistoryPropParts => {
    const timber = "#6e4a2c";
    return {
      body: [
        buildBlock([0.8, 2.6, 0.8], timber, [-1.1, 1.3, 0]),
        buildBlock([0.8, 2.6, 0.8], timber, [1.1, 1.3, 0]),
        buildBlock([3.2, 0.2, 1.0], "#7e5a38", [0, 2.2, 0]),
        buildBlock([3.2, 0.5, 0.08], "#5a3a20", [0, 2.55, 0.46]),
        buildBlock(
          [0.68, 1.6, 0.12],
          "#5a3a20",
          [-0.36, 0.8, 0.1],
          [0, 0.15, 0],
        ),
        buildBlock(
          [0.68, 1.6, 0.12],
          "#5a3a20",
          [0.36, 0.8, 0.1],
          [0, -0.15, 0],
        ),
        buildBlock(
          [0.68, 0.1, 0.14],
          "#3e2814",
          [-0.36, 1.2, 0.12],
          [0, 0.15, 0],
        ),
        buildBlock(
          [0.68, 0.1, 0.14],
          "#3e2814",
          [0.36, 1.2, 0.12],
          [0, -0.15, 0],
        ),
        buildPyramidRoof(0.62, 0.8, "#c49a55", [-1.1, 2.6, 0]),
        buildPyramidRoof(0.62, 0.8, "#c49a55", [1.1, 2.6, 0]),
      ],
    };
  },
  "celtic-roundhouse": (): HistoryPropParts => ({
    body: buildRoundhouseParts("#c9b08a", "#b58d4e"),
  }),
  "iron-age-chariot": (): HistoryPropParts => ({
    body: [
      ...buildSpokedWheelParts(0.55, 0.6, "#5a3a22", 4),
      ...buildSpokedWheelParts(0.55, -0.6, "#5a3a22", 4),
      buildDrum(
        [0.04, 0.04],
        1.3,
        5,
        "#4a3020",
        [0, 0.55, 0],
        [Math.PI / 2, 0, 0],
      ),
      buildBlock([0.9, 0.08, 1.0], "#a87a48", [0, 0.62, 0]),
      ...[0.48, -0.48].map((z): ModelPart => ({
        geometry: new TorusGeometry(0.4, 0.035, 4, 8, Math.PI),
        colour: "#c49a5a",
        position: [0, 0.66, z],
      })),
      buildDrum(
        [0.035, 0.04],
        2.2,
        5,
        "#5a3a22",
        [1.5, 0.75, 0],
        [0, 0, Math.PI / 2 - 0.1],
      ),
      buildDrum(
        [0.035, 0.035],
        1.2,
        5,
        "#5a3a22",
        [2.55, 0.86, 0],
        [Math.PI / 2, 0, 0],
      ),
      buildBlock([0.1, 0.1, 0.1], "#c98a3a", [2.6, 0.95, 0.4]),
      buildBlock([0.1, 0.1, 0.1], "#c98a3a", [2.6, 0.95, -0.4]),
    ],
  }),
  "stilt-granary": (): HistoryPropParts => ({
    body: [
      ...[
        [0.6, 0.6],
        [0.6, -0.6],
        [-0.6, 0.6],
        [-0.6, -0.6],
      ].map(([x, z]): ModelPart =>
        buildDrum([0.07, 0.08], 1.1, 5, "#5a3a22", [x, 0.55, z]),
      ),
      buildBlock([1.6, 0.12, 1.6], "#7e5a38", [0, 1.12, 0]),
      buildDrum([0.75, 0.75], 0.9, 8, "#c9ad7e", [0, 1.63, 0]),
      {
        geometry: new ConeGeometry(1.05, 1.1, 8),
        colour: "#c49a55",
        position: [0, 2.63, 0],
        roughen: 0.05,
      },
      buildBlock([0.06, 1.5, 0.06], "#6b4a2c", [0.95, 0.6, 0.65], [0, 0, 0.35]),
      buildBlock([0.06, 1.5, 0.06], "#6b4a2c", [0.95, 0.6, 0.35], [0, 0, 0.35]),
      ...[0.3, 0.65, 1.0].map((y): ModelPart =>
        buildBlock([0.05, 0.05, 0.34], "#6b4a2c", [1.17 - y * 0.36, y, 0.5]),
      ),
    ],
  }),
  "wooden-palisade-run": (): HistoryPropParts => ({
    body: [
      ...[-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2].flatMap((x): ModelPart[] => [
        buildBlock([0.4, 1.5, 0.2], x % 1 === 0 ? "#7a5432" : "#6e4a2c", [
          x,
          0.75,
          0,
        ]),
        buildSpike(0.2, 0.35, 4, "#8a6440", [x, 1.67, 0], [0, Math.PI / 4, 0]),
      ]),
      buildBlock([4.4, 0.12, 0.08], "#4a3020", [0, 0.5, 0.13]),
      buildBlock([4.4, 0.12, 0.08], "#4a3020", [0, 1.15, 0.13]),
    ],
  }),
  "painted-tomb-column": (): HistoryPropParts => ({
    body: [
      buildBlock([1.1, 0.3, 1.1], "#b89366", [0, 0.15, 0]),
      buildBlock([0.8, 3.6, 0.8], "#e2c08a", [0, 2.1, 0]),
      buildBlock([0.84, 0.18, 0.84], "#2f5f9e", [0, 0.6, 0]),
      buildBlock([0.84, 0.12, 0.84], "#b8432f", [0, 0.78, 0]),
      buildBlock([0.84, 0.1, 0.84], "#e9b730", [0, 0.92, 0]),
      buildBlock([0.84, 0.16, 0.84], "#2f5f9e", [0, 3.6, 0]),
      buildBlock([0.84, 0.1, 0.84], "#b8432f", [0, 3.78, 0]),
      buildDrum([0.62, 0.42], 0.6, 8, "#3f8f6a", [0, 4.2, 0]),
      buildBlock([1.2, 0.2, 1.2], "#e2c08a", [0, 4.6, 0]),
      buildBlock([0.5, 1.2, 0.02], "#f0dcb0", [0, 2.2, 0.41]),
      {
        geometry: new TorusGeometry(0.1, 0.03, 4, 8),
        colour: "#e9b730",
        position: [0, 2.55, 0.43],
        scale: [0.8, 1.1, 1],
      },
      buildBlock([0.06, 0.45, 0.03], "#e9b730", [0, 2.2, 0.43]),
      buildBlock([0.3, 0.06, 0.03], "#e9b730", [0, 2.38, 0.43]),
    ],
  }),
  "golden-sarcophagus": (): HistoryPropParts => {
    const gold = "#e2b03a";
    const blue = "#2f5f9e";
    return {
      body: [
        buildBlock([3.0, 0.6, 1.2], "#5a4636", [0, 0.3, 0]),
        buildBlock([3.04, 0.08, 1.24], "#c9952e", [0, 0.6, 0]),
        {
          geometry: new CylinderGeometry(0.42, 0.38, 2.4, 8),
          colour: gold,
          position: [-0.1, 1.02, 0],
          rotation: [0, 0, Math.PI / 2],
          scale: [1, 1, 0.85],
        },
        buildBlock([0.55, 0.6, 0.8], blue, [1.25, 1.05, 0]),
        ...[-0.2, 0, 0.2].map((z): ModelPart =>
          buildBlock([0.57, 0.62, 0.06], gold, [1.25, 1.05, z]),
        ),
        buildBlock([0.4, 0.2, 0.42], "#f0c75a", [1.3, 1.4, 0]),
        buildBlock([0.06, 0.08, 0.06], blue, [1.4, 1.52, 0.1]),
        buildBlock([0.06, 0.08, 0.06], blue, [1.4, 1.52, -0.1]),
        buildBlock([0.12, 0.08, 0.6], blue, [0.45, 1.42, 0], [0, 0.5, 0]),
        buildBlock([0.12, 0.08, 0.6], "#b8432f", [0.45, 1.43, 0], [0, -0.5, 0]),
        ...[-0.3, -0.75].map((x): ModelPart =>
          buildDrum(
            [0.43, 0.43],
            0.1,
            8,
            blue,
            [x, 1.02, 0],
            [0, 0, Math.PI / 2],
          ),
        ),
        buildDrum(
          [0.3, 0.3],
          0.3,
          8,
          gold,
          [-1.4, 1.1, 0],
          [0, 0, Math.PI / 2],
        ),
      ],
    };
  },
  "canopic-jar-set": (): HistoryPropParts => ({
    body: [
      buildBlock([1.7, 0.7, 0.62], "#7a4a2a", [0, 0.35, 0]),
      buildBlock([1.74, 0.06, 0.66], "#d9a93c", [0, 0.7, 0]),
      ...[
        { x: -0.6, head: "#d9a86a" },
        { x: -0.2, head: "#8f8a80" },
        { x: 0.2, head: "#2a2522" },
        { x: 0.6, head: "#8a5a30" },
      ].flatMap(({ x, head }): ModelPart[] => [
        buildDrum([0.15, 0.12], 0.44, 8, "#efe6d2", [x, 0.95, 0]),
        {
          geometry: new SphereGeometry(0.14, 8, 5),
          colour: head,
          position: [x, 1.27, 0],
        },
      ]),
      buildSpike(0.04, 0.16, 4, "#2a2522", [0.15, 1.45, 0]),
      buildSpike(0.04, 0.16, 4, "#2a2522", [0.25, 1.45, 0]),
    ],
  }),
  "anubis-shrine": (): HistoryPropParts => {
    const jackal = "#1f1c1c";
    const gold = "#d9a93c";
    return {
      body: [
        buildBlock([1.7, 0.9, 0.85], gold, [0, 0.45, 0]),
        buildBlock([1.3, 0.55, 0.02], "#25304a", [0, 0.45, 0.43]),
        buildBlock([1.84, 0.12, 0.95], "#c9952e", [0, 0.96, 0]),
        buildDrum(
          [0.05, 0.05],
          2.6,
          5,
          gold,
          [0, 0.2, 0.5],
          [0, 0, Math.PI / 2],
        ),
        buildDrum(
          [0.05, 0.05],
          2.6,
          5,
          gold,
          [0, 0.2, -0.5],
          [0, 0, Math.PI / 2],
        ),
        buildBlock([1.0, 0.36, 0.38], jackal, [-0.15, 1.2, 0]),
        buildBlock([0.5, 0.1, 0.1], jackal, [0.55, 1.08, 0.12]),
        buildBlock([0.5, 0.1, 0.1], jackal, [0.55, 1.08, -0.12]),
        buildBlock([0.22, 0.5, 0.24], jackal, [0.3, 1.5, 0], [0, 0, -0.25]),
        buildBlock([0.3, 0.2, 0.2], jackal, [0.5, 1.78, 0]),
        buildBlock([0.24, 0.1, 0.12], jackal, [0.72, 1.74, 0]),
        buildSpike(0.06, 0.3, 4, jackal, [0.42, 2.0, 0.07]),
        buildSpike(0.06, 0.3, 4, jackal, [0.42, 2.0, -0.07]),
        buildBlock([0.26, 0.06, 0.28], gold, [0.34, 1.62, 0], [0, 0, -0.25]),
        buildDrum([0.03, 0.04], 0.5, 4, jackal, [-0.75, 1.1, 0], [0, 0, 1.2]),
      ],
    };
  },
  "tomb-gilded-chest": (): HistoryPropParts => ({
    body: [
      buildBlock([1.3, 0.75, 0.8], "#d9a93c", [0, 0.375, 0]),
      buildBlock([1.0, 0.45, 0.02], "#2f5f9e", [0, 0.4, 0.41]),
      buildDrum(
        [0.4, 0.4],
        1.3,
        8,
        "#e2b03a",
        [0, 0.75, 0],
        [0, 0, Math.PI / 2],
      ),
      buildLump(0.18, "#f0c75a", [-0.85, 0.12, 0.3], [1, 0.6, 1]),
      buildLump(0.14, "#e2b03a", [-0.7, 0.1, 0.55], [1, 0.6, 1]),
      buildDrum([0.18, 0.24], 0.6, 8, "#c06a3a", [0.95, 0.3, 0.2]),
      buildDrum([0.12, 0.14], 0.12, 8, "#9a4c27", [0.95, 0.66, 0.2]),
    ],
  }),
  "tomb-wall-torch": (): HistoryPropParts => ({
    body: [
      buildBlock([0.3, 0.5, 0.1], "#4a3a2e", [0, 2.2, -0.1]),
      buildBlock([0.08, 0.08, 0.35], "#3a2e24", [0, 2.3, 0.1]),
      buildDrum([0.06, 0.04], 0.8, 6, "#6b4426", [0, 2.55, 0.28], [0.25, 0, 0]),
      buildDrum([0.12, 0.08], 0.16, 6, "#3b2a1e", [0, 2.95, 0.38]),
    ],
    glow: [
      buildFlame([0, 3.0, 0.38], 0.55, "#ff9a2e"),
      buildFlame([0.03, 3.0, 0.4], 0.35, "#ffe08a"),
    ],
    motion: "flicker",
  }),
  "hieroglyph-panel": (): HistoryPropParts => {
    const glyphColours = ["#2a2522", "#b8432f", "#2f5f9e", "#3f8f6a"];
    return {
      body: [
        buildBlock([3.4, 2.6, 0.06], "#2f5f9e", [0, 3.0, 0]),
        buildBlock([3.2, 2.4, 0.08], "#e2c896", [0, 3.0, 0.02]),
        buildDrum(
          [0.26, 0.26],
          0.04,
          10,
          "#e9b730",
          [0, 3.95, 0.08],
          [Math.PI / 2, 0, 0],
        ),
        buildBlock(
          [0.9, 0.16, 0.04],
          "#2f5f9e",
          [-0.7, 3.98, 0.08],
          [0, 0, 0.12],
        ),
        buildBlock(
          [0.9, 0.16, 0.04],
          "#2f5f9e",
          [0.7, 3.98, 0.08],
          [0, 0, -0.12],
        ),
        ...[3.4, 2.85, 2.3].flatMap((y, row): ModelPart[] =>
          [-1.3, -0.9, -0.5, -0.1, 0.3, 0.7, 1.1].map((x, column): ModelPart =>
            buildBlock(
              [
                0.18 + ((row + column) % 3) * 0.06,
                0.28 - (column % 2) * 0.08,
                0.03,
              ],
              glyphColours[(row * 3 + column) % 4],
              [x, y, 0.08],
            ),
          ),
        ),
      ],
    };
  },
  "roman-fort-gatehouse": (): HistoryPropParts => {
    const stone = "#cbbd9e";
    return {
      body: [
        buildBlock([1.8, 4.4, 1.8], stone, [-2.0, 2.2, 0]),
        buildBlock([1.8, 4.4, 1.8], stone, [2.0, 2.2, 0]),
        buildPyramidRoof(1.05, 1.1, "#b5482f", [-2.0, 4.4, 0]),
        buildPyramidRoof(1.05, 1.1, "#b5482f", [2.0, 4.4, 0]),
        buildBlock([2.2, 1.4, 1.4], "#c2b394", [0, 3.0, 0]),
        ...[-0.7, 0, 0.7].map((x): ModelPart =>
          buildBlock([0.4, 0.45, 1.4], stone, [x, 3.92, 0]),
        ),
        buildBlock([0.86, 2.1, 0.12], "#6b4426", [-0.44, 1.05, 0.3]),
        buildBlock([0.86, 2.1, 0.12], "#6b4426", [0.44, 1.05, 0.3]),
        {
          geometry: new TorusGeometry(0.95, 0.12, 4, 6, Math.PI),
          colour: "#e0d3b6",
          position: [0, 2.2, 0.72],
        },
        ...[-2.0, 2.0].flatMap((x): ModelPart[] => [
          buildBlock([0.3, 0.5, 0.04], "#2e241c", [x, 3.4, 0.91]),
          buildBlock([0.3, 0.5, 0.04], "#2e241c", [x, 1.6, 0.91]),
        ]),
        buildBlock([0.6, 0.9, 0.04], "#a3222a", [0, 3.0, 0.72]),
      ],
    };
  },
  "roman-fort-curtain-wall": (): HistoryPropParts => ({
    body: [
      buildBlock([5.2, 0.4, 1.2], "#b8aa8c", [0, 0.2, 0]),
      buildBlock([5, 2.6, 1], "#cbbd9e", [0, 1.5, 0]),
      ...[-2.1, -1.26, -0.42, 0.42, 1.26, 2.1].map((x): ModelPart =>
        buildBlock([0.5, 0.5, 0.3], "#c2b394", [x, 3.05, 0.35]),
      ),
      buildBlock([5.02, 0.08, 1.02], "#a89a7e", [0, 1.2, 0]),
    ],
  }),
  "legionary-tent": (): HistoryPropParts => ({
    body: [
      buildBlock([1.8, 0.35, 2.2], "#94683c", [0, 0.17, 0]),
      {
        geometry: buildGableRoof(1.9, 1.3, 2.3),
        colour: "#b08654",
        position: [0, 0.34, 0],
        rotation: [0, Math.PI / 2, 0],
      },
      {
        geometry: new ConeGeometry(0.42, 1.1, 3),
        colour: "#5a3e24",
        position: [0, 0.55, 1.16],
        scale: [1, 1, 0.1],
      },
      buildDrum([0.02, 0.02], 0.4, 4, "#5a3e24", [0, 1.8, 1.1]),
    ],
  }),
  "roman-shield-stand": (): HistoryPropParts => ({
    body: [
      buildBlock([0.1, 1.3, 0.1], "#6b4426", [-1.1, 0.65, -0.3]),
      buildBlock([0.1, 1.3, 0.1], "#6b4426", [1.1, 0.65, -0.3]),
      buildBlock([2.4, 0.1, 0.1], "#6b4426", [0, 1.2, -0.3]),
      ...[-0.72, 0, 0.72].flatMap((x): ModelPart[] => [
        buildBlock([0.62, 1.05, 0.08], "#a3222a", [x, 0.6, 0], [-0.2, 0, 0]),
        buildBlock([0.66, 0.06, 0.1], "#d9a93c", [x, 1.11, -0.1], [-0.2, 0, 0]),
        buildBlock([0.66, 0.06, 0.1], "#d9a93c", [x, 0.09, 0.1], [-0.2, 0, 0]),
        buildBlock([0.06, 0.9, 0.09], "#e3b84c", [x, 0.6, 0.01], [-0.2, 0, 0]),
        {
          geometry: new SphereGeometry(
            0.11,
            8,
            4,
            0,
            Math.PI * 2,
            0,
            Math.PI / 2,
          ),
          colour: "#e9c55a",
          position: [x, 0.6, 0.06],
          rotation: [Math.PI / 2 - 0.2, 0, 0],
        },
      ]),
      buildDrum(
        [0.02, 0.025],
        2.0,
        4,
        "#7a5230",
        [1.45, 1.0, -0.1],
        [0.1, 0, -0.15],
      ),
      buildSpike(0.04, 0.3, 4, "#6f7378", [1.6, 2.1, -0.0], [0.1, 0, -0.15]),
    ],
  }),
  "aquila-standard": (): HistoryPropParts => ({
    body: [
      buildDrum([0.05, 0.05], 3.6, 6, "#7a5230", [0, 1.8, 0]),
      buildDrum(
        [0.03, 0.03],
        1.0,
        4,
        "#d9a93c",
        [0, 2.95, 0],
        [0, 0, Math.PI / 2],
      ),
      buildBlock([0.9, 0.7, 0.03], "#a3222a", [0, 2.55, 0.03]),
      buildBlock([0.9, 0.08, 0.04], "#e9b730", [0, 2.18, 0.03]),
      ...[-0.25, -0.08, 0.08, 0.25].map((x): ModelPart =>
        buildBlock([0.1, 0.16, 0.02], "#e9b730", [x, 2.6, 0.06]),
      ),
      {
        geometry: new TorusGeometry(0.18, 0.03, 4, 10),
        colour: "#e9b730",
        position: [0, 3.45, 0],
      },
      buildLump(0.18, "#e2b03a", [0, 3.78, 0], [1, 0.8, 0.7], 0.1),
      buildLump(0.08, "#e2b03a", [0.12, 3.95, 0], 1, 0.1),
      buildBlock([0.5, 0.06, 0.22], "#e9c55a", [-0.28, 3.98, 0], [0, 0, -0.7]),
      buildBlock([0.5, 0.06, 0.22], "#e9c55a", [0.28, 3.98, 0], [0, 0, 0.7]),
    ],
    motion: "sway",
  }),
  "roman-ballista": (): HistoryPropParts => {
    const wood = "#7a5230";
    const iron = "#4a4a4e";
    return {
      body: [
        buildBlock([0.12, 1.0, 0.12], wood, [0, 0.5, 0.35], [0.25, 0, 0]),
        buildBlock([0.12, 1.0, 0.12], wood, [0, 0.5, -0.35], [-0.25, 0, 0]),
        buildBlock([0.12, 0.12, 0.8], wood, [0, 0.95, 0]),
        buildBlock([2.2, 0.18, 0.26], wood, [0.2, 1.15, 0], [0, 0, 0.12]),
        buildBlock([0.3, 0.7, 0.9], "#8a6440", [0.95, 1.35, 0], [0, 0, 0.12]),
        buildDrum(
          [0.09, 0.09],
          0.6,
          6,
          "#c9b48a",
          [0.98, 1.4, 0.32],
          [0, 0, 0.12],
        ),
        buildDrum(
          [0.09, 0.09],
          0.6,
          6,
          "#c9b48a",
          [0.98, 1.4, -0.32],
          [0, 0, 0.12],
        ),
        buildBlock([0.08, 0.08, 0.7], wood, [0.7, 1.45, 0.62], [0, 0.9, 0]),
        buildBlock([0.08, 0.08, 0.7], wood, [0.7, 1.45, -0.62], [0, -0.9, 0]),
        buildBlock([0.02, 0.02, 1.7], "#e8dcc4", [0.35, 1.45, 0]),
        buildDrum(
          [0.025, 0.025],
          1.4,
          4,
          wood,
          [0.6, 1.32, 0],
          [0, 0, Math.PI / 2 + 0.12],
        ),
        buildSpike(
          0.05,
          0.2,
          4,
          iron,
          [1.36, 1.41, 0],
          [0, 0, -Math.PI / 2 + 0.12],
        ),
      ],
    };
  },
  "roman-granary": (): HistoryPropParts => ({
    body: [
      buildBlock([6.2, 0.5, 2.8], "#b8aa8c", [0, 0.25, 0]),
      buildBlock([5.8, 2.2, 2.4], "#d2c3a2", [0, 1.6, 0]),
      ...[-2.4, -1.2, 0, 1.2, 2.4].map((x): ModelPart =>
        buildBlock([0.4, 2.0, 0.4], "#c2b394", [x, 1.4, 1.3]),
      ),
      ...[-1.8, -0.6, 0.6, 1.8].map((x): ModelPart =>
        buildBlock([0.2, 0.3, 0.04], "#3a2e24", [x, 0.65, 1.22]),
      ),
      {
        geometry: buildGableRoof(2.9, 1.1, 6.2),
        colour: "#b5482f",
        position: [0, 2.7, 0],
      },
    ],
  }),
  "hadrian-wall-ridge": (): HistoryPropParts => ({
    body: [
      {
        geometry: new SphereGeometry(1, 12, 4, 0, Math.PI * 2, 0, Math.PI / 2),
        colour: "#8fa486",
        scale: [7, 2, 3.5],
      },
      {
        geometry: new SphereGeometry(1, 12, 2, 0, Math.PI * 2, 0, Math.PI / 4),
        colour: "#e8eef0",
        scale: [7.05, 2.02, 3.55],
      },
      ...buildRidgeWallParts(),
      buildBlock([1.5, 1.8, 1.3], "#a8a08e", [1.6, 2.6, 0.33]),
      buildBlock([1.6, 0.1, 1.4], "#eef3f4", [1.6, 3.55, 0.33]),
      buildBlock([0.14, 0.4, 0.04], "#2e2a26", [1.6, 2.9, 1.0]),
    ],
  }),
  "roman-milecastle": (): HistoryPropParts => {
    const stone = "#a39a88";
    const snow = "#eef3f4";
    return {
      body: [
        buildBlock([3.4, 1.6, 0.45], stone, [0, 0.8, -1.4]),
        buildBlock([0.45, 1.6, 2.8], stone, [-1.5, 0.8, 0]),
        buildBlock([0.45, 1.6, 2.8], stone, [1.5, 0.8, 0]),
        buildBlock([1.2, 1.6, 0.45], stone, [-1.1, 0.8, 1.4]),
        buildBlock([1.2, 1.6, 0.45], stone, [1.1, 0.8, 1.4]),
        buildBlock([1.4, 1.0, 0.6], "#988f7c", [0, 2.1, 1.4]),
        buildBlock([0.9, 1.6, 0.1], "#5a3e2a", [0, 0.8, 1.42]),
        buildBlock([3.0, 0.08, 0.5], snow, [0, 1.64, -1.4]),
        buildBlock([0.5, 0.08, 2.8], snow, [-1.5, 1.64, 0]),
        buildBlock([0.5, 0.08, 2.8], snow, [1.5, 1.64, 0]),
        buildBlock([1.5, 0.08, 0.7], snow, [0, 2.64, 1.4]),
        buildBlock([2.4, 1.2, 0.45], stone, [-2.9, 0.6, -1.4]),
        buildBlock([2.4, 1.2, 0.45], stone, [2.9, 0.6, -1.4]),
        buildBlock([1.6, 0.8, 1.0], "#cdbfa4", [0, 0.4, -0.5]),
        {
          geometry: buildGableRoof(1.1, 0.5, 1.7),
          colour: "#b5482f",
          position: [0, 0.8, -0.5],
        },
      ],
    };
  },
  "roman-brazier": (): HistoryPropParts => ({
    body: [
      ...[0, 2.1, 4.2].map((turn): ModelPart =>
        buildDrum(
          [0.03, 0.03],
          1.1,
          4,
          "#3d3a38",
          [Math.cos(turn) * 0.2, 0.5, Math.sin(turn) * 0.2],
          [-Math.sin(turn) * 0.3, 0, Math.cos(turn) * 0.3],
        ),
      ),
      buildDrum([0.42, 0.22], 0.3, 8, "#3d3a38", [0, 1.1, 0]),
    ],
    glow: [
      buildDrum([0.38, 0.38], 0.04, 8, "#ff5a1a", [0, 1.24, 0]),
      buildFlame([0, 1.24, 0], 0.7, "#ff9a2e"),
      buildFlame([0.14, 1.24, 0.06], 0.45, "#ffd25a"),
      buildFlame([-0.12, 1.24, -0.08], 0.5, "#ff7a1a"),
    ],
    motion: "flicker",
  }),
  "bare-winter-tree": (): HistoryPropParts => ({
    body: [
      buildDrum([0.12, 0.2], 2.4, 6, "#4a3a30", [0, 1.2, 0]),
      ...[
        [0.35, 2.3, 0.1, -0.7],
        [-0.3, 2.5, -0.1, 0.6],
        [0.1, 2.8, 0.3, -0.2],
        [-0.15, 2.2, 0.3, 0.9],
        [0.25, 2.0, -0.3, -1.0],
      ].map(([x, y, z, lean]): ModelPart =>
        buildDrum([0.03, 0.06], 1.2, 4, "#4a3a30", [x, y, z], [z, 0, lean]),
      ),
      buildLump(0.2, "#eef3f4", [0, 2.45, 0], [1.2, 0.4, 1.2]),
    ],
    motion: "sway",
  }),
  "roman-villa": (): HistoryPropParts => {
    const plaster = "#efe2c6";
    const tile = "#b5482f";
    return {
      body: [
        buildBlock([4.6, 0.3, 3.2], "#cbbd9e", [0, 0.15, 0.2]),
        buildBlock([4.2, 2.0, 2.4], plaster, [0, 1.3, -0.2]),
        buildBlock([4.22, 0.2, 2.42], "#a3322a", [0, 2.0, -0.2]),
        {
          geometry: buildGableRoof(2.8, 1.0, 4.5),
          colour: tile,
          position: [0, 2.3, -0.2],
        },
        ...[-1.8, -0.9, 0, 0.9, 1.8].map((x): ModelPart =>
          buildDrum([0.12, 0.14], 1.7, 6, "#f7f2e6", [x, 1.15, 1.45]),
        ),
        buildBlock([4.4, 0.14, 1.0], tile, [0, 2.05, 1.35], [0.22, 0, 0]),
        buildBlock([0.7, 1.3, 0.05], "#5a3a26", [0, 0.95, 1.0]),
        buildBlock([0.4, 0.4, 0.05], "#3a2e24", [-1.3, 1.5, 1.0]),
        buildBlock([0.4, 0.4, 0.05], "#3a2e24", [1.3, 1.5, 1.0]),
        buildBlock([1.6, 1.6, 2.0], plaster, [3.0, 1.1, -0.6]),
        {
          geometry: buildGableRoof(2.3, 0.8, 1.8),
          colour: "#a8432f",
          position: [3.0, 1.9, -0.6],
          rotation: [0, Math.PI / 2, 0],
        },
      ],
    };
  },
  "roman-bath-house": (): HistoryPropParts => ({
    body: [
      buildBlock([3.6, 0.3, 2.4], "#cbbd9e", [0, 0.15, 0]),
      buildBlock([3.4, 1.8, 2.2], "#e6d6b6", [0, 1.2, 0]),
      {
        geometry: new CylinderGeometry(1.1, 1.1, 3.4, 8, 1, false, 0, Math.PI),
        colour: "#c4643f",
        position: [0, 2.1, 0],
        rotation: [0, 0, Math.PI / 2],
      },
      buildDrum([1.0, 1.0], 1.8, 8, "#e6d6b6", [1.8, 1.2, 0]),
      buildDome(1.0, 8, "#c4643f", [1.8, 2.1, 0]),
      ...[-1.0, 0, 1.0].flatMap((x): ModelPart[] => [
        buildBlock([0.4, 0.6, 0.04], "#3a2e24", [x - 0.3, 1.2, 1.11]),
        buildDrum(
          [0.2, 0.2],
          0.04,
          8,
          "#3a2e24",
          [x - 0.3, 1.5, 1.11],
          [Math.PI / 2, 0, 0],
        ),
      ]),
      buildBlock([0.4, 1.2, 0.4], "#b8aa8c", [-1.3, 3.0, -0.6]),
      buildLump(0.3, "#f2f2ee", [-1.2, 3.85, -0.6]),
      buildLump(0.24, "#f6f6f2", [-1.0, 4.3, -0.7]),
    ],
  }),
  "roman-paved-road": (): HistoryPropParts => ({
    body: [
      buildBlock([2.2, 0.1, 12], "#8e8a84", [0, 0.05, 0]),
      buildBlock([0.7, 0.12, 12], "#a19c94", [0, 0.06, 0]),
      buildBlock([0.2, 0.18, 12], "#b5aea2", [-1.15, 0.09, 0]),
      buildBlock([0.2, 0.18, 12], "#b5aea2", [1.15, 0.09, 0]),
      ...[-5, -3, -1, 1, 3, 5].map((z): ModelPart =>
        buildBlock([2.1, 0.13, 0.06], "#6f6b66", [0, 0.06, z]),
      ),
    ],
  }),
  "roman-aqueduct": (): HistoryPropParts => {
    const stone = "#cdb48a";
    return {
      body: [
        ...[-5, -3, -1, 1, 3, 5].map((x): ModelPart =>
          buildBlock([0.6, 3.0, 0.7], stone, [x, 1.5, 0]),
        ),
        ...[-4, -2, 0, 2, 4].map((x): ModelPart => ({
          geometry: new TorusGeometry(0.7, 0.32, 4, 6, Math.PI),
          colour: "#c4a97e",
          position: [x, 3.0, 0],
          scale: [1, 1, 1.1],
        })),
        buildBlock([11.2, 0.6, 0.75], stone, [0, 3.9, 0]),
        buildBlock([11.2, 0.12, 0.5], "#4f8aa8", [0, 4.22, 0]),
      ],
    };
  },
  "roman-mosaic": (): HistoryPropParts => ({
    body: [
      buildBlock([2.6, 0.12, 2.6], "#8a2e22", [0, 0.06, 0]),
      buildBlock([2.2, 0.13, 2.2], "#efe2c6", [0, 0.07, 0]),
      buildBlock(
        [0.9, 0.14, 0.9],
        "#2f5f9e",
        [0, 0.08, 0],
        [0, Math.PI / 4, 0],
      ),
      buildBlock(
        [0.4, 0.15, 0.4],
        "#e9b730",
        [0, 0.09, 0],
        [0, Math.PI / 4, 0],
      ),
      ...[
        [-0.8, -0.8],
        [0.8, -0.8],
        [-0.8, 0.8],
        [0.8, 0.8],
      ].map(([x, z], index): ModelPart =>
        buildBlock(
          [0.36, 0.14, 0.36],
          index % 2 === 0 ? "#a3322a" : "#2a2522",
          [x, 0.08, z],
        ),
      ),
    ],
  }),
  "cypress-tree": (): HistoryPropParts => ({
    body: [
      buildDrum([0.08, 0.1], 0.6, 5, "#5a4030", [0, 0.3, 0]),
      {
        geometry: new ConeGeometry(0.5, 3.4, 7),
        colour: "#2f5a34",
        position: [0, 2.1, 0],
        roughen: 0.08,
      },
      {
        geometry: new ConeGeometry(0.36, 1.8, 7),
        colour: "#3a6a3e",
        position: [0, 3.3, 0],
        roughen: 0.08,
      },
    ],
    motion: "sway",
  }),
  "parthenon-temple": (): HistoryPropParts => ({
    body: buildParthenonParts(),
  }),
  "acropolis-rock": (): HistoryPropParts => ({
    body: [
      {
        geometry: new CylinderGeometry(1, 1.15, 1, 9),
        colour: "#c7b08a",
        position: [0, 1.1, 0],
        scale: [6.8, 2.2, 4.2],
        roughen: 0.05,
      },
      buildLump(1, "#b39a74", [-5.6, 0.6, 1.4], [2.2, 1.3, 1.6]),
      buildLump(1, "#bba27c", [5.4, 0.5, 1.8], [2.0, 1.1, 1.5]),
      buildLump(1, "#a88f6a", [1.0, 0.4, 3.6], [2.6, 0.9, 1.2]),
      buildLump(1, "#b39a74", [-2.8, 0.5, 3.4], [1.8, 1.0, 1.2]),
      buildLump(0.5, "#7a8f55", [-4.6, 1.6, 2.4], [1.2, 0.6, 1]),
      buildLump(0.5, "#86995e", [4.2, 1.4, 3.0], [1.2, 0.6, 1]),
    ],
  }),
  "olive-tree": (): HistoryPropParts => ({
    body: [
      buildDrum([0.14, 0.22], 1.0, 6, "#6b5a46", [0, 0.5, 0], [0, 0, 0.15]),
      buildDrum([0.1, 0.14], 0.9, 6, "#6b5a46", [-0.15, 1.3, 0], [0, 0, -0.35]),
      buildDrum([0.06, 0.09], 0.8, 5, "#6b5a46", [0.3, 1.3, 0.1], [0, 0, -0.8]),
      buildLump(0.7, "#8a9e6c", [0, 2.0, 0], [1.3, 0.7, 1.1]),
      buildLump(0.55, "#9fb07f", [0.65, 1.75, 0.2], [1.2, 0.7, 1]),
      buildLump(0.55, "#7c905e", [-0.6, 1.8, -0.15], [1.2, 0.7, 1]),
      buildLump(0.45, "#a9b98a", [0.15, 2.4, 0.15], [1.2, 0.7, 1]),
    ],
    motion: "sway",
  }),
  "greek-amphitheatre": (): HistoryPropParts => {
    const segments = 7;
    return {
      body: [
        buildDrum([1.3, 1.3], 0.06, 10, "#e8dcc4", [0, 0.03, 0]),
        ...[0, 1, 2, 3].flatMap((tier): ModelPart[] => {
          const radius = 1.8 + tier * 0.55;
          const height = 0.3 * (tier + 1);
          return Array.from({ length: segments }, (_, index): ModelPart => {
            const angle = Math.PI / 2 + ((index + 0.5) / segments) * Math.PI;
            return buildBlock(
              [
                2 * radius * Math.sin(Math.PI / (2 * segments)) * 1.08,
                height,
                0.58,
              ],
              tier % 2 === 0 ? "#ddd0b6" : "#d2c4a8",
              [Math.sin(angle) * radius, height / 2, Math.cos(angle) * radius],
              [0, angle, 0],
            );
          });
        }),
        buildBlock([3.2, 0.4, 0.6], "#cbbd9e", [0, 0.2, 1.7]),
      ],
    };
  },
  "greek-statue": (): HistoryPropParts => {
    const marble = "#f2ede2";
    return {
      body: [
        buildBlock([0.75, 0.9, 0.75], "#d8cfbd", [0, 0.45, 0]),
        buildDrum([0.14, 0.22], 0.95, 6, marble, [0, 1.38, 0]),
        buildDrum([0.18, 0.22], 0.7, 6, marble, [0, 2.2, 0]),
        {
          geometry: new SphereGeometry(0.15, 8, 6),
          colour: marble,
          position: [0, 2.72, 0],
        },
        buildBlock([0.1, 0.6, 0.1], marble, [0.28, 2.6, 0], [0, 0, -0.3]),
        buildBlock([0.1, 0.55, 0.1], marble, [-0.26, 2.05, 0], [0, 0, 0.2]),
        buildDrum([0.025, 0.025], 2.2, 4, "#e4dccb", [0.42, 2.1, 0]),
      ],
    };
  },
  "aegean-islet": (): HistoryPropParts => ({
    body: [
      buildLump(1, "#c9b48e", [0, 0.2, 0], [3.2, 1.2, 1.6]),
      buildLump(1, "#7f9a5a", [0.4, 0.9, 0], [2.2, 0.7, 1.2]),
      buildLump(0.8, "#b8a27e", [2.2, 0.1, 0.4], [1.6, 0.8, 1]),
    ],
  }),
  "stadium-earth-bank": (): HistoryPropParts => ({
    body: [
      {
        geometry: buildGableRoof(3.2, 1.3, 12),
        colour: "#86a55a",
      },
      buildBlock([12, 0.25, 0.3], "#d8cdb5", [0, 0.12, 1.6]),
      buildBlock([1.4, 0.5, 0.8], "#e2d8c2", [2.0, 1.0, 0.4]),
    ],
  }),
  "olympic-starting-line": (): HistoryPropParts => ({
    body: [
      buildBlock([9, 0.1, 0.55], "#e6dcc6", [0, 0.05, 0]),
      buildBlock([9, 0.11, 0.05], "#8a7f6c", [0, 0.06, -0.08]),
      buildBlock([9, 0.11, 0.05], "#8a7f6c", [0, 0.06, 0.1]),
      ...[-4.4, -3.4, -2.4, -1.4, -0.4, 0.6, 1.6, 2.6, 3.6, 4.4].map(
        (x): ModelPart =>
          buildBlock([0.14, 0.9, 0.14], "#d9cfb8", [x, 0.45, -0.22]),
      ),
    ],
  }),
  "olympic-altar": (): HistoryPropParts => ({
    body: [
      buildBlock([1.8, 0.35, 1.4], "#cdbfa4", [0, 0.17, 0]),
      buildBlock([1.4, 0.7, 1.0], "#ddd2bc", [0, 0.7, 0]),
      buildBlock([1.6, 0.12, 1.2], "#e8dfcc", [0, 1.1, 0]),
      buildBlock([1.0, 0.25, 0.02], "#a3322a", [0, 0.75, 0.51]),
    ],
    glow: [
      buildDrum([0.45, 0.45], 0.05, 8, "#ff5a1a", [0, 1.18, 0]),
      buildFlame([0, 1.18, 0], 1.0, "#ff9a2e"),
      buildFlame([0.2, 1.18, 0.1], 0.7, "#ffd25a"),
      buildFlame([-0.2, 1.18, -0.05], 0.75, "#ff7a1a"),
    ],
    motion: "flicker",
  }),
  "ship-burial-trench": (): HistoryPropParts => {
    const getShipHalfWidth = (x: number): number => 1.0 * (1 - (x / 3.4) ** 2);
    const rivetXs = [-3, -2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3];
    return {
      body: [
        {
          geometry: new SphereGeometry(
            1,
            12,
            2,
            0,
            Math.PI * 2,
            0,
            Math.PI / 2,
          ),
          colour: "#6b4e34",
          scale: [3.6, 0.06, 1.15],
        },
        {
          geometry: buildGableRoof(0.9, 0.45, 7.2),
          colour: "#c9a46a",
          position: [0, 0, -1.6],
        },
        ...rivetXs.flatMap((x): ModelPart[] => [
          buildBlock([0.16, 0.14, 0.16], "#a5582a", [
            x,
            0.1,
            getShipHalfWidth(x),
          ]),
          buildBlock([0.16, 0.14, 0.16], "#a5582a", [
            x,
            0.1,
            -getShipHalfWidth(x),
          ]),
        ]),
        ...[-2.4, -1.2, 0, 1.2, 2.4].map((x): ModelPart =>
          buildBlock([0.07, 0.07, getShipHalfWidth(x) * 2], "#8a4a24", [
            x,
            0.08,
            0,
          ]),
        ),
        buildBlock([0.4, 0.05, 2.6], "#a0784a", [3.6, 0.04, 0.4]),
      ],
    };
  },
  "excavation-wheelbarrow": (): HistoryPropParts => ({
    body: [
      {
        geometry: new CylinderGeometry(0.5, 0.34, 0.35, 4),
        colour: "#8a6a44",
        position: [0, 0.6, 0],
        rotation: [0, Math.PI / 4, 0],
        scale: [1.2, 1, 0.9],
      },
      buildLump(0.32, "#7a5a3a", [0, 0.75, 0], [1.3, 0.5, 1]),
      buildSolidWheel(0.22, [0.7, 0.22, 0]),
      buildDrum(
        [0.03, 0.03],
        1.5,
        5,
        "#6b4426",
        [-0.2, 0.48, 0.28],
        [0, 0, Math.PI / 2 + 0.15],
      ),
      buildDrum(
        [0.03, 0.03],
        1.5,
        5,
        "#6b4426",
        [-0.2, 0.48, -0.28],
        [0, 0, Math.PI / 2 + 0.15],
      ),
      buildBlock([0.05, 0.4, 0.05], "#6b4426", [-0.35, 0.2, 0.28]),
      buildBlock([0.05, 0.4, 0.05], "#6b4426", [-0.35, 0.2, -0.28]),
    ],
  }),
  "excavation-tent-1939": (): HistoryPropParts => ({
    body: [
      {
        geometry: buildGableRoof(2.2, 1.6, 2.6),
        colour: "#c9bd94",
      },
      {
        geometry: new ConeGeometry(0.5, 1.2, 3),
        colour: "#7a6e4c",
        position: [1.31, 0.6, 0],
        rotation: [0, Math.PI / 2, 0],
        scale: [1, 1, 0.1],
      },
      buildDrum([0.025, 0.025], 2.0, 4, "#5a4a30", [1.32, 1.0, 0]),
      buildDrum([0.025, 0.025], 2.0, 4, "#5a4a30", [-1.32, 1.0, 0]),
      buildDrum([0.01, 0.01], 1.5, 3, "#e8dcc4", [1.8, 0.85, 0], [0, 0, 0.9]),
      buildDrum([0.01, 0.01], 1.5, 3, "#e8dcc4", [-1.8, 0.85, 0], [0, 0, -0.9]),
      buildBlock([0.7, 0.5, 0.5], "#6b4a2c", [2.1, 0.25, 0.9]),
    ],
  }),
  "sutton-hoo-helmet-plinth": (): HistoryPropParts => {
    const iron = "#8a8e8c";
    const gold = "#d9a93c";
    return {
      body: [
        buildBlock([0.9, 1.2, 0.9], "#5a3d28", [0, 0.6, 0]),
        buildBlock([1.0, 0.08, 1.0], "#7a5638", [0, 1.22, 0]),
        buildDome(0.42, 10, iron, [0, 1.6, 0], [1, 1.05, 1.1]),
        {
          geometry: new TorusGeometry(0.44, 0.04, 4, 8, Math.PI),
          colour: gold,
          position: [0, 1.6, 0],
          rotation: [0, Math.PI / 2, 0],
          scale: [1.1, 1.05, 1],
        },
        buildBlock([0.46, 0.48, 0.1], "#9a9e9c", [0, 1.42, 0.42]),
        buildBlock([0.2, 0.05, 0.04], gold, [-0.11, 1.6, 0.48], [0, 0, 0.2]),
        buildBlock([0.2, 0.05, 0.04], gold, [0.11, 1.6, 0.48], [0, 0, -0.2]),
        buildBlock([0.06, 0.22, 0.05], gold, [0, 1.48, 0.49]),
        buildBlock([0.24, 0.05, 0.04], gold, [0, 1.34, 0.48]),
        buildBlock([0.04, 0.04, 0.04], "#a3222a", [-0.22, 1.6, 0.49]),
        buildBlock([0.04, 0.04, 0.04], "#a3222a", [0.22, 1.6, 0.49]),
        buildBlock([0.1, 0.42, 0.34], iron, [0.4, 1.38, 0.12]),
        buildBlock([0.1, 0.42, 0.34], iron, [-0.4, 1.38, 0.12]),
        buildBlock([0.7, 0.36, 0.1], iron, [0, 1.4, -0.42]),
      ],
    };
  },
  "scots-pine": (): HistoryPropParts => ({
    body: [
      buildDrum([0.12, 0.18], 3.2, 6, "#a0603a", [0, 1.6, 0]),
      buildDrum([0.04, 0.06], 0.8, 4, "#a0603a", [0.3, 3.0, 0], [0, 0, -1.0]),
      buildLump(0.9, "#2f5a3a", [0, 3.4, 0], [1.4, 0.55, 1.1]),
      buildLump(0.7, "#3a6a44", [0.7, 3.05, 0.1], [1.3, 0.5, 1]),
      buildLump(0.6, "#2a5034", [-0.5, 3.8, -0.1], [1.3, 0.5, 1]),
    ],
    motion: "sway",
  }),
  "heath-gorse-bush": (): HistoryPropParts => ({
    body: [
      buildLump(0.5, "#4f7a3a", [0, 0.3, 0], [1.3, 0.75, 1], 0.35),
      buildLump(0.35, "#5c8a40", [0.5, 0.22, 0.1], 1, 0.35),
      ...[
        [-0.3, 0.6, 0.25],
        [0.1, 0.68, 0.1],
        [0.45, 0.45, 0.3],
        [-0.45, 0.4, -0.1],
        [0.25, 0.55, -0.25],
      ].map(([x, y, z]): ModelPart =>
        buildLump(0.09, "#f2c72e", [x, y, z], 1, 0),
      ),
    ],
  }),
  "saxon-timber-hall": (): HistoryPropParts => ({
    body: [
      buildBlock([4, 1.6, 2.2], "#7a5a3a", [0, 0.8, 0]),
      ...[-1.6, -1.0, 1.0, 1.6].map((x): ModelPart =>
        buildBlock([0.08, 1.6, 0.04], "#4a3424", [x, 0.8, 1.11]),
      ),
      buildBlock([0.8, 1.3, 0.06], "#3a2a1e", [0, 0.65, 1.12]),
      buildBlock([1.0, 0.12, 0.1], "#4a3424", [0, 1.35, 1.14]),
      {
        geometry: buildGableRoof(3.0, 1.9, 4.6),
        colour: "#c49a55",
        position: [0, 1.6, 0],
        roughen: 0.04,
      },
      buildBlock([0.08, 0.9, 0.08], "#4a3424", [2.25, 3.55, 0.25], [0.5, 0, 0]),
      buildBlock(
        [0.08, 0.9, 0.08],
        "#4a3424",
        [2.25, 3.55, -0.25],
        [-0.5, 0, 0],
      ),
      buildBlock(
        [0.08, 0.9, 0.08],
        "#4a3424",
        [-2.25, 3.55, 0.25],
        [0.5, 0, 0],
      ),
      buildBlock(
        [0.08, 0.9, 0.08],
        "#4a3424",
        [-2.25, 3.55, -0.25],
        [-0.5, 0, 0],
      ),
      ...buildSmokeParts([0.6, 3.9, 0]),
    ],
  }),
  "wattle-fence": (): HistoryPropParts => ({
    body: [
      ...[-2, -1, 0, 1, 2].map((x): ModelPart =>
        buildDrum([0.05, 0.06], 1.0, 5, "#5a3e24", [x, 0.5, 0]),
      ),
      ...[0.25, 0.45, 0.65, 0.85].map((y, index): ModelPart =>
        buildBlock([4.2, 0.13, 0.07], index % 2 === 0 ? "#9a7448" : "#8a6440", [
          0,
          y,
          index % 2 === 0 ? 0.04 : -0.04,
        ]),
      ),
    ],
  }),
  "strip-field": (): HistoryPropParts => {
    const stripColours = ["#8a6a3e", "#a8b25a", "#c9b05a", "#7f9a48"];
    return {
      body: [-2.1, -1.4, -0.7, 0, 0.7, 1.4, 2.1].map((x, index): ModelPart =>
        buildBlock(
          [0.66, 0.1 + (index % 2) * 0.06, 4.5],
          stripColours[index % 4],
          [x, 0.05, 0],
        ),
      ),
    };
  },
  "saxon-stone-church": (): HistoryPropParts => ({
    body: [
      buildBlock([3, 1.8, 1.8], "#bdb3a0", [0.4, 0.9, 0]),
      {
        geometry: buildGableRoof(2.0, 0.9, 3.2),
        colour: "#6a625a",
        position: [0.4, 1.8, 0],
      },
      buildBlock([1.2, 3.4, 1.2], "#b3a994", [-1.6, 1.7, 0]),
      buildPyramidRoof(0.65, 0.9, "#5d5a58", [-1.6, 3.4, 0]),
      buildBlock([0.2, 0.5, 0.04], "#2e2a26", [-1.6, 2.6, 0.61]),
      buildBlock([0.2, 0.45, 0.04], "#2e2a26", [0.0, 1.1, 0.91]),
      buildBlock([0.2, 0.45, 0.04], "#2e2a26", [1.0, 1.1, 0.91]),
      buildBlock([0.5, 0.9, 0.04], "#4a3424", [-1.6, 0.45, 0.61]),
    ],
  }),
  "jorvik-market-stall": (): HistoryPropParts => ({
    body: [
      ...[
        [-0.9, 0.45],
        [0.9, 0.45],
        [-0.9, -0.45],
        [0.9, -0.45],
      ].map(([x, z]): ModelPart =>
        buildBlock([0.08, 1.9, 0.08], "#5a3e24", [x, 0.95, z]),
      ),
      buildBlock([1.8, 0.8, 0.8], "#8a6440", [0, 0.4, 0]),
      ...[-0.72, -0.36, 0, 0.36, 0.72].map((x, index): ModelPart =>
        buildBlock(
          [0.37, 0.06, 1.15],
          index % 2 === 0 ? "#b8432f" : "#efe3c4",
          [x, 1.95, 0.05],
          [0.25, 0, 0],
        ),
      ),
      buildDrum([0.14, 0.11], 0.3, 8, "#b5663b", [-0.55, 0.95, 0.1]),
      buildDrum([0.12, 0.1], 0.24, 8, "#8a4a2a", [-0.25, 0.92, 0.15]),
      buildDrum(
        [0.1, 0.1],
        0.6,
        6,
        "#2f5f9e",
        [0.3, 0.9, 0.1],
        [0, 0.3, Math.PI / 2],
      ),
      buildDrum(
        [0.1, 0.1],
        0.6,
        6,
        "#3f8f6a",
        [0.4, 1.08, 0.0],
        [0, -0.2, Math.PI / 2],
      ),
    ],
  }),
  "saxon-oak-tree": (): HistoryPropParts => ({
    body: buildBroadleafTreeParts("#5b4030", ["#3f7a32", "#4a8a38", "#386e2d"]),
    motion: "sway",
  }),
  "fjord-cliff": (): HistoryPropParts => ({
    body: [
      {
        geometry: new CylinderGeometry(1.4, 2.2, 7, 6),
        colour: "#5f6670",
        position: [0, 3.5, 0],
        roughen: 0.12,
      },
      {
        geometry: new CylinderGeometry(1.1, 1.8, 5.5, 6),
        colour: "#6a707a",
        position: [1.6, 2.75, 0.6],
        rotation: [0, 0.6, 0],
        roughen: 0.12,
      },
      buildLump(1.3, "#5f7d4a", [0, 7.0, 0], [1.1, 0.4, 1.1]),
      buildLump(1.0, "#6d8a5a", [1.6, 5.5, 0.6], [1.1, 0.4, 1.1]),
      buildSpike(0.9, 0.7, 6, "#f2f6f8", [0, 7.45, 0]),
      buildLump(1.4, "#555c66", [-1.0, 0.4, 1.0], [1.3, 0.6, 1]),
    ],
  }),
  "snowy-peak": (): HistoryPropParts => ({
    body: [
      {
        geometry: new ConeGeometry(4.5, 6.5, 7),
        colour: "#6b7686",
        position: [0, 3.25, 0],
        roughen: 0.05,
      },
      buildSpike(2.05, 2.9, 7, "#f4f8fb", [0, 5.08, 0]),
      {
        geometry: new ConeGeometry(3.0, 4.4, 7),
        colour: "#76818f",
        position: [3.8, 2.2, -1.0],
        rotation: [0, 0.4, 0],
        roughen: 0.05,
      },
      buildSpike(1.25, 1.8, 7, "#f4f8fb", [3.8, 3.52, -1.0], [0, 0.4, 0]),
    ],
  }),
  "viking-longship": (): HistoryPropParts => ({
    body: buildLongshipParts(),
    motion: "bob",
  }),
  "viking-longhouse": (): HistoryPropParts => ({
    body: [
      buildBlock([5.0, 1.2, 2.2], "#5a3e2a", [0, 0.6, 0]),
      {
        geometry: buildGableRoof(2.9, 1.4, 5.4),
        colour: "#6f8f48",
        position: [0, 1.2, 0],
        roughen: 0.05,
      },
      buildBlock([0.7, 1.0, 0.06], "#2e2218", [0.6, 0.5, 1.12]),
      buildBlock([0.08, 1.0, 0.08], "#3e2a1a", [2.75, 2.6, 0.2], [0.5, 0, 0]),
      buildBlock([0.08, 1.0, 0.08], "#3e2a1a", [2.75, 2.6, -0.2], [-0.5, 0, 0]),
      ...buildSmokeParts([-1.0, 2.9, 0]),
    ],
  }),
  "rune-stone": (): HistoryPropParts => ({
    body: [
      {
        geometry: new BoxGeometry(0.9, 2.0, 0.3),
        colour: "#8a8a80",
        position: [0, 1.0, 0],
        roughen: 0.04,
      },
      buildLump(0.48, "#8a8a80", [0, 2.0, 0], [1, 0.6, 0.35], 0.05),
      {
        geometry: new TorusGeometry(0.34, 0.05, 4, 12, Math.PI * 1.6),
        colour: "#b8322a",
        position: [0, 1.2, 0.16],
        rotation: [0, 0, -Math.PI * 0.3],
        scale: [1, 1.7, 1],
      },
      ...[0.85, 1.1, 1.35, 1.6].map((y): ModelPart =>
        buildBlock([0.05, 0.16, 0.03], "#2e2a26", [0, y, 0.16]),
      ),
      buildLump(0.4, "#5f7d4a", [0.3, 0.1, 0.2], [1.2, 0.4, 1]),
    ],
  }),
  "fjord-pine": (): HistoryPropParts => ({
    body: [
      buildDrum([0.07, 0.1], 0.8, 5, "#4a3424", [0, 0.4, 0]),
      ...[0, 1, 2].map((tier): ModelPart => ({
        geometry: new ConeGeometry(0.85 - tier * 0.2, 1.2 - tier * 0.15, 7),
        colour: ["#24432f", "#2a4a35", "#31553c"][tier],
        position: [0, 1.2 + tier * 0.6, 0],
        rotation: [0, tier * 0.6, 0],
        roughen: 0.15,
      })),
      buildSpike(0.22, 0.3, 7, "#eef3f4", [0, 2.75, 0]),
    ],
    motion: "sway",
  }),
  "maya-temple-pyramid": (): HistoryPropParts => ({
    body: [
      ...[0, 1, 2, 3, 4, 5].map((tier): ModelPart =>
        buildBlock(
          [7 - tier, 0.85, 7 - tier],
          tier % 2 === 0 ? "#cbbd9a" : "#b5a985",
          [0, 0.425 + tier * 0.85, 0],
        ),
      ),
      buildBlock([1.4, 0.3, 5.7], "#ddd0b0", [0, 2.55, 2.25], [1.115, 0, 0]),
      buildBlock([1.8, 1.2, 1.4], "#d8c9a6", [0, 5.7, 0]),
      buildBlock([0.5, 0.8, 0.04], "#2e261e", [0, 5.5, 0.71]),
      buildBlock([1.84, 0.16, 1.44], "#a8432f", [0, 6.2, 0]),
      buildBlock([1.4, 1.4, 0.3], "#c4b48f", [0, 7.0, -0.2]),
      buildBlock([0.3, 0.3, 0.04], "#a8432f", [0, 7.0, -0.04]),
    ],
  }),
  "maya-ball-court": (): HistoryPropParts => {
    const stone = "#d8c9a6";
    return {
      body: [
        buildBlock([5.2, 0.06, 2.2], "#e2d6b8", [0, 0.03, 0]),
        ...[1.5, -1.5].flatMap((z): ModelPart[] => [
          buildBlock(
            [5, 0.5, 1.0],
            stone,
            [0, 0.25, z * 0.93],
            [Math.sign(z) * -0.3, 0, 0],
          ),
          buildBlock([5, 2.0, 0.8], "#cdbd98", [0, 1.0, z * 1.25]),
          buildBlock([5.04, 0.14, 0.84], "#a8432f", [0, 2.0, z * 1.25]),
          {
            geometry: new TorusGeometry(0.3, 0.08, 4, 10),
            colour: "#e8dcc0",
            position: [0, 1.65, z * 1.25 - Math.sign(z) * 0.45],
          },
        ]),
      ],
    };
  },
  "maya-stela": (): HistoryPropParts => ({
    body: [
      {
        geometry: new BoxGeometry(0.9, 2.6, 0.4),
        colour: "#b9ab8a",
        position: [0, 1.3, 0],
        roughen: 0.03,
      },
      buildBlock([0.24, 0.24, 0.06], "#a89878", [0, 2.0, 0.22]),
      {
        geometry: new ConeGeometry(0.35, 0.5, 5),
        colour: "#4f8a6a",
        position: [0, 2.35, 0.22],
        scale: [1, 1, 0.2],
      },
      buildBlock([0.36, 0.7, 0.06], "#a89878", [0, 1.45, 0.22]),
      buildBlock([0.6, 0.1, 0.06], "#a8432f", [0, 1.75, 0.23]),
      ...[0.5, 0.75].flatMap((y): ModelPart[] => [
        buildBlock([0.16, 0.16, 0.05], "#8a7c60", [-0.2, y, 0.22]),
        buildBlock([0.16, 0.16, 0.05], "#8a7c60", [0.2, y, 0.22]),
      ]),
      buildDrum([0.55, 0.6], 0.4, 8, "#c4b693", [0, 0.2, 0.9]),
    ],
  }),
  "jungle-tree": (): HistoryPropParts => ({
    body: [
      buildDrum([0.25, 0.4], 5.5, 6, "#6b5440", [0, 2.75, 0]),
      ...[0, 2.1, 4.2].map((turn): ModelPart =>
        buildBlock(
          [0.12, 0.9, 0.7],
          "#5e4836",
          [Math.cos(turn) * 0.35, 0.4, Math.sin(turn) * 0.35],
          [0, -turn, 0],
        ),
      ),
      buildLump(1.6, "#2f6a35", [0, 5.9, 0], [1.3, 0.7, 1.2]),
      buildLump(1.2, "#3b7a3e", [1.3, 5.4, 0.4], [1.3, 0.7, 1.1]),
      buildLump(1.2, "#285a2e", [-1.3, 5.5, -0.3], [1.3, 0.7, 1.1]),
      buildLump(1.0, "#468a44", [0.3, 6.6, 0.3], [1.3, 0.7, 1.1]),
      buildLump(1.0, "#2f6a35", [-0.5, 5.2, 1.0], [1.3, 0.7, 1.1]),
      ...[
        [1.4, 0.6],
        [-1.2, 0.5],
        [0.4, 1.1],
      ].map(([x, z]): ModelPart =>
        buildDrum([0.02, 0.02], 2.4, 3, "#3f7a3a", [x, 3.8, z]),
      ),
    ],
    motion: "sway",
  }),
  "jungle-fern": (): HistoryPropParts => ({
    body: [
      buildLump(0.2, "#3a6a30", [0, 0.1, 0]),
      ...[0, 1, 2, 3, 4, 5, 6].map((leaf): ModelPart => {
        const angle = (leaf / 7) * Math.PI * 2;
        return {
          geometry: new ConeGeometry(0.18, 1.4, 4),
          colour: leaf % 2 === 0 ? "#3f8a3a" : "#56a046",
          position: [Math.cos(angle) * 0.45, 0.45, Math.sin(angle) * 0.45],
          rotation: [Math.sin(angle) * 0.9, 0, -Math.cos(angle) * 0.9],
          scale: [1, 1, 0.25],
        };
      }),
    ],
    motion: "sway",
  }),
  "round-city-wall": (): HistoryPropParts => {
    const brick = "#c9a26a";
    const angles = [-0.455, -0.325, -0.195, -0.065, 0.065, 0.195, 0.325, 0.455];
    return {
      body: [
        ...angles.flatMap((angle): ModelPart[] => {
          const x = Math.sin(angle) * 9;
          const z = Math.cos(angle) * 9 - 9;
          return [
            buildBlock([1.25, 2.4, 0.8], brick, [x, 1.2, z], [0, angle, 0]),
            buildBlock(
              [0.3, 0.4, 0.3],
              "#d6b47e",
              [x - Math.cos(angle) * 0.3, 2.6, z + Math.sin(angle) * 0.3],
              [0, angle, 0],
            ),
            buildBlock(
              [0.3, 0.4, 0.3],
              "#d6b47e",
              [x + Math.cos(angle) * 0.3, 2.6, z - Math.sin(angle) * 0.3],
              [0, angle, 0],
            ),
          ];
        }),
        ...[-0.52, 0, 0.52].map((angle): ModelPart =>
          buildDrum([0.7, 0.8], 3.2, 8, "#bf955e", [
            Math.sin(angle) * 9,
            1.6,
            Math.cos(angle) * 9 - 9 + 0.2,
          ]),
        ),
        buildBlock([1.1, 1.6, 0.1], "#4a3426", [0, 0.8, 0.85]),
      ],
    };
  },
  "green-dome-palace": (): HistoryPropParts => ({
    body: [
      buildBlock([3.4, 2.0, 3.4], "#e2c99a", [0, 1.0, 0]),
      buildBlock([1.0, 1.3, 0.05], "#4a3426", [0, 0.65, 1.71]),
      buildDrum(
        [0.5, 0.5],
        0.05,
        8,
        "#4a3426",
        [0, 1.3, 1.71],
        [Math.PI / 2, 0, 0],
      ),
      buildBlock([3.44, 0.2, 3.44], "#2f6fa0", [0, 1.9, 0]),
      buildDrum([1.2, 1.2], 0.8, 10, "#e8d3a6", [0, 2.4, 0]),
      buildDome(1.3, 10, "#3f9a6a", [0, 2.8, 0], [1, 1.25, 1]),
      buildDrum([0.04, 0.04], 0.6, 4, "#e9b730", [0, 4.7, 0]),
      {
        geometry: new SphereGeometry(0.1, 6, 4),
        colour: "#e9b730",
        position: [0, 5.0, 0],
      },
    ],
  }),
  "abbasid-minaret": (): HistoryPropParts => ({
    body: [
      buildBlock([1.0, 0.6, 1.0], "#c9a26a", [0, 0.3, 0]),
      buildDrum([0.32, 0.42], 5.0, 8, "#d9b98a", [0, 3.1, 0]),
      buildDrum([0.43, 0.43], 0.14, 8, "#a8784a", [0, 2.0, 0]),
      buildDrum([0.38, 0.38], 0.14, 8, "#2f6fa0", [0, 3.8, 0]),
      buildDrum([0.6, 0.45], 0.22, 8, "#c9a26a", [0, 5.65, 0]),
      buildDrum([0.24, 0.27], 0.9, 8, "#e8d3a6", [0, 6.2, 0]),
      buildSpike(0.32, 0.6, 8, "#3f9a6a", [0, 6.95, 0]),
    ],
  }),
  "house-of-wisdom": (): HistoryPropParts => ({
    body: [
      buildBlock([5.0, 2.2, 2.0], "#e8d3a6", [0, 1.1, 0]),
      ...[-1.8, -0.9, 0, 0.9, 1.8].flatMap((x): ModelPart[] => [
        buildBlock([0.5, 0.9, 0.05], "#5a3a26", [x, 0.75, 1.01]),
        buildDrum(
          [0.25, 0.25],
          0.05,
          8,
          "#5a3a26",
          [x, 1.2, 1.01],
          [Math.PI / 2, 0, 0],
        ),
      ]),
      buildBlock([5.04, 0.22, 2.04], "#2f6fa0", [0, 2.0, 0]),
      buildDome(0.5, 8, "#3f8aa0", [-1.5, 2.2, 0]),
      buildDome(0.6, 8, "#e8d3a6", [0, 2.2, 0]),
      buildDome(0.5, 8, "#3f8aa0", [1.5, 2.2, 0]),
    ],
  }),
  "baghdad-domed-house": (): HistoryPropParts => ({
    body: [
      buildBlock([1.4, 1.3, 1.4], "#dcc08e", [0, 0.65, 0]),
      buildDome(0.6, 8, "#e8d3a6", [0, 1.3, 0]),
      buildBlock([0.4, 0.7, 0.04], "#5a3a26", [0, 0.35, 0.71]),
      buildBlock([0.24, 0.24, 0.04], "#2f6fa0", [0.42, 0.95, 0.71]),
    ],
  }),
  "trading-dhow": (): HistoryPropParts => ({
    body: [
      ...buildHullParts("#7a4a2a", "#a87a4a", [2.2, 0.5, 0.6]),
      buildBlock([0.5, 0.3, 0.6], "#8a5a34", [-1.6, 0.65, 0]),
      buildDrum([0.04, 0.06], 2.8, 6, "#5a3a22", [0.2, 1.8, 0], [0, 0, 0.12]),
      {
        geometry: new CylinderGeometry(1, 1, 0.04, 3).rotateX(Math.PI / 2),
        colour: "#efe3c4",
        position: [0.3, 2.2, 0.06],
        rotation: [0, 0, 0.25],
        scale: [1.8, 1.6, 1],
      },
      buildDrum(
        [0.03, 0.03],
        3.4,
        4,
        "#5a3a22",
        [0.15, 2.95, 0.06],
        [0, 0, Math.PI / 2 + 0.25],
      ),
      buildBlock([0.4, 0.15, 0.02], "#b8322a", [0.0, 3.3, 0], [0, 0, 0.1]),
    ],
    motion: "bob",
  }),
  "benin-palace-hall": (): HistoryPropParts => {
    const earth = "#a8452c";
    const bronze = "#b07a3a";
    return {
      body: [
        buildBlock([4.6, 2.0, 2.6], earth, [0, 1.0, 0]),
        ...[0.5, 0.9, 1.3].map((y): ModelPart =>
          buildBlock([4.62, 0.08, 2.62], "#8a3622", [0, y, 0]),
        ),
        buildBlock([0.8, 1.4, 0.05], "#2e1e16", [0, 0.7, 1.31]),
        {
          geometry: buildGableRoof(3.2, 2.2, 5.0),
          colour: "#6a4a32",
          position: [0, 2.0, 0],
        },
        buildBlock([1.0, 0.6, 1.0], "#8a3622", [0, 4.2, 0]),
        buildPyramidRoof(0.6, 1.6, "#5a3e2a", [0, 4.5, 0]),
        buildLump(0.25, bronze, [0, 6.25, 0], [1.4, 0.8, 0.8], 0.05),
        buildLump(0.12, bronze, [0.32, 6.45, 0], 1, 0.05),
        buildSpike(
          0.05,
          0.2,
          4,
          "#c98a3a",
          [0.48, 6.45, 0],
          [0, 0, -Math.PI / 2],
        ),
        buildBlock(
          [0.3, 0.06, 0.3],
          "#c98a3a",
          [-0.05, 6.35, 0.25],
          [0.4, 0, 0],
        ),
        buildBlock(
          [0.3, 0.06, 0.3],
          "#c98a3a",
          [-0.05, 6.35, -0.25],
          [-0.4, 0, 0],
        ),
        buildBlock([0.3, 0.06, 0.16], bronze, [-0.4, 6.22, 0], [0, 0, 0.4]),
      ],
    };
  },
  "benin-earth-wall": (): HistoryPropParts => ({
    body: [
      buildBlock([5, 1.8, 0.6], "#b04a2e", [0, 0.9, 0]),
      ...[0.4, 0.75, 1.1, 1.45].map((y): ModelPart =>
        buildBlock([5.02, 0.07, 0.64], "#8a3622", [0, y, 0]),
      ),
      {
        geometry: buildGableRoof(0.9, 0.4, 5.1),
        colour: "#c9a05a",
        position: [0, 1.8, 0],
      },
    ],
  }),
  "benin-carved-veranda": (): HistoryPropParts => ({
    body: [
      ...[-2.4, -0.8, 0.8, 2.4].flatMap((x): ModelPart[] => [
        buildBlock([0.5, 0.2, 0.5], "#6b4426", [x, 0.1, 0]),
        buildBlock([0.4, 2.8, 0.4], "#5a3420", [x, 1.5, 0]),
        ...[0.8, 1.35, 1.9, 2.45].map((y): ModelPart =>
          buildBlock([0.34, 0.4, 0.03], "#c9953f", [x, y, 0.21]),
        ),
      ]),
      buildBlock([5.6, 0.3, 0.6], "#5a3420", [0, 3.05, 0]),
      buildBlock([5.8, 0.12, 1.5], "#6a4a32", [0, 3.35, -0.4], [0.3, 0, 0]),
    ],
  }),
  "benin-earthwork": (): HistoryPropParts => ({
    body: [
      {
        geometry: buildGableRoof(3.4, 1.4, 10),
        colour: "#7a8a40",
      },
      buildBlock([10, 0.06, 0.8], "#7a3a22", [0, 0.03, 2.0]),
    ],
  }),
  "oil-palm": (): HistoryPropParts => ({
    body: [
      ...[0, 1, 2, 3].map((segment): ModelPart =>
        buildDrum(
          [0.18, 0.22],
          0.62,
          6,
          segment % 2 === 0 ? "#6b5236" : "#5e4630",
          [segment * 0.05, 0.31 + segment * 0.6, 0],
        ),
      ),
      ...[0, 1, 2, 3, 4, 5, 6, 7, 8].map((leaf): ModelPart => {
        const angle = (leaf / 9) * Math.PI * 2;
        return {
          geometry: new ConeGeometry(0.16, 1.9, 4),
          colour: leaf % 2 === 0 ? "#2f6a2a" : "#3f7f30",
          position: [0.2 + Math.cos(angle) * 0.7, 2.55, Math.sin(angle) * 0.7],
          rotation: [Math.sin(angle) * 1.4, 0, -Math.cos(angle) * 1.4],
          scale: [1, 1, 0.3],
        };
      }),
      buildLump(0.22, "#c9502a", [0.2, 2.35, 0.1]),
    ],
    motion: "sway",
  }),
  "ziggurat-of-ur": (): HistoryPropParts => {
    const stair = "#d8b47a";
    return {
      body: [
        buildBlock([8, 1.6, 5.6], "#c99a62", [0, 0.8, 0]),
        ...[-3.5, -2.5, -1.5, 1.5, 2.5, 3.5].map((x): ModelPart =>
          buildBlock([0.22, 1.6, 0.1], "#b8875a", [x, 0.8, 2.82]),
        ),
        buildBlock([5.6, 1.2, 3.8], "#c4935c", [0, 2.2, -0.3]),
        buildBlock([3.4, 1.0, 2.4], "#bf8e58", [0, 3.3, -0.5]),
        buildBlock([1.6, 1.0, 1.2], "#d8b47a", [0, 4.3, -0.5]),
        buildBlock([1.64, 0.2, 1.24], "#2f6fa0", [0, 4.55, -0.5]),
        buildBlock([0.4, 0.6, 0.04], "#3a2a1e", [0, 4.1, 0.11]),
        buildBlock([1.0, 0.2, 2.9], stair, [0, 0.8, 4.0], [0.588, 0, 0]),
        buildBlock([3.05, 0.2, 0.8], stair, [-2.1, 0.8, 3.2], [0, 0, 0.552]),
        buildBlock([3.05, 0.2, 0.8], stair, [2.1, 0.8, 3.2], [0, 0, -0.552]),
        buildBlock([1.0, 0.2, 1.5], stair, [0, 2.2, 2.35], [0.927, 0, 0]),
        buildBlock([1.2, 0.8, 0.8], "#b8875a", [0, 2.0, 2.6]),
      ],
    };
  },
  "sumer-mud-brick-house": (): HistoryPropParts => ({
    body: [
      buildBlock([2, 1.4, 1.8], "#c9a06a", [0, 0.7, 0]),
      buildBlock([2.1, 0.15, 1.9], "#b88a58", [0, 1.45, 0]),
      buildBlock([1.2, 1.0, 1.2], "#c4975f", [1.4, 0.5, -0.2]),
      buildBlock([0.45, 0.8, 0.04], "#3a2a1e", [-0.3, 0.4, 0.91]),
      buildBlock([0.22, 0.22, 0.04], "#3a2a1e", [0.5, 1.0, 0.91]),
      buildDrum([0.15, 0.12], 0.4, 6, "#b5663b", [1.6, 1.2, 0.0]),
    ],
  }),
  "sumerian-reed-boat": (): HistoryPropParts => {
    const reed = "#c9a560";
    return {
      body: [
        buildDrum(
          [0.22, 0.22],
          2.4,
          6,
          reed,
          [0, 0.25, 0],
          [0, 0, Math.PI / 2],
        ),
        buildDrum([0.12, 0.2], 0.9, 6, reed, [1.45, 0.55, 0], [0, 0, -0.9]),
        buildDrum([0.12, 0.2], 0.9, 6, reed, [-1.45, 0.55, 0], [0, 0, 0.9]),
        buildSpike(0.12, 0.4, 6, reed, [1.82, 1.05, 0], [0, 0, 0.5]),
        buildSpike(0.12, 0.4, 6, reed, [-1.82, 1.05, 0], [0, 0, -0.5]),
        ...[-0.8, 0, 0.8].map((x): ModelPart =>
          buildDrum(
            [0.23, 0.23],
            0.06,
            6,
            "#8a6a3a",
            [x, 0.25, 0],
            [0, 0, Math.PI / 2],
          ),
        ),
        buildDrum([0.12, 0.09], 0.3, 6, "#b5663b", [-0.4, 0.6, 0]),
        buildDrum(
          [0.02, 0.02],
          2.4,
          4,
          "#6b4a2c",
          [0.7, 1.2, 0.1],
          [0, 0, 0.3],
        ),
      ],
    };
  },
  "sumerian-cart": (): HistoryPropParts => ({
    body: [
      buildBlock([1.2, 0.5, 0.9], "#8a6a44", [0, 0.7, 0]),
      buildBlock([1.22, 0.1, 0.92], "#6b4a2c", [0, 0.95, 0]),
      buildSolidWheel(0.4, [0.35, 0.4, 0.52]),
      buildSolidWheel(0.4, [-0.35, 0.4, 0.52]),
      buildSolidWheel(0.4, [0.35, 0.4, -0.52]),
      buildSolidWheel(0.4, [-0.35, 0.4, -0.52]),
      buildDrum(
        [0.04, 0.04],
        1.6,
        5,
        "#6b4a2c",
        [1.35, 0.6, 0],
        [0, 0, Math.PI / 2 + 0.15],
      ),
      buildLump(0.3, "#d9c49a", [-0.2, 1.15, 0.1], [1.2, 0.8, 1]),
      buildLump(0.25, "#cdb88a", [0.3, 1.1, -0.1], [1.2, 0.8, 1]),
    ],
  }),
  "indus-brick-block": (): HistoryPropParts => ({
    body: [
      buildBlock([2.6, 2.0, 2.2], "#b86a42", [0, 1.0, 0]),
      buildBlock([1.6, 1.4, 1.8], "#c27a4c", [2.0, 0.7, 0.1]),
      buildBlock([2.66, 0.15, 2.26], "#a85e3a", [0, 2.07, 0]),
      buildBlock([1.66, 0.12, 1.86], "#b06a42", [2.0, 1.46, 0.1]),
      buildBlock([2.62, 0.05, 2.22], "#9a5232", [0, 0.7, 0]),
      buildBlock([0.5, 0.9, 0.04], "#3a2418", [-0.5, 0.45, 1.11]),
      buildBlock([0.25, 0.25, 0.04], "#3a2418", [0.6, 1.4, 1.11]),
      buildBlock([0.4, 0.7, 0.04], "#3a2418", [2.0, 0.35, 1.01]),
    ],
  }),
  "great-bath": (): HistoryPropParts => {
    const brick = "#b46a44";
    return {
      body: [
        buildBlock([5, 0.7, 0.8], brick, [0, 0.35, 1.3]),
        buildBlock([5, 0.7, 0.8], brick, [0, 0.35, -1.3]),
        buildBlock([0.8, 0.7, 1.8], brick, [2.1, 0.35, 0]),
        buildBlock([0.8, 0.7, 1.8], brick, [-2.1, 0.35, 0]),
        buildBlock([3.4, 0.55, 1.8], "#3f9ac0", [0, 0.275, 0]),
        ...[0, 1, 2].flatMap((step): ModelPart[] => [
          buildBlock([0.25, 0.6 - step * 0.15, 0.9], "#c27a4c", [
            1.58 - step * 0.25,
            0.3 - step * 0.075,
            0,
          ]),
          buildBlock([0.25, 0.6 - step * 0.15, 0.9], "#c27a4c", [
            -1.58 + step * 0.25,
            0.3 - step * 0.075,
            0,
          ]),
        ]),
        buildBlock([5, 1.3, 0.3], "#c27a4c", [0, 0.65, -1.85]),
        ...[-1.6, 0, 1.6].map((x): ModelPart =>
          buildBlock([0.5, 0.8, 0.04], "#3a2418", [x, 0.4, -1.69]),
        ),
      ],
    };
  },
  "citadel-stupa-mound": (): HistoryPropParts => ({
    body: [
      {
        geometry: new CylinderGeometry(2.6, 3.4, 1.6, 9),
        colour: "#b06a44",
        position: [0, 0.8, 0],
        roughen: 0.04,
      },
      buildDrum([2.62, 2.62], 0.15, 9, "#9a5232", [0, 1.55, 0]),
      buildDrum([1.0, 1.1], 0.6, 9, "#c98a5a", [0, 1.9, 0]),
      buildDome(1.0, 9, "#d49a68", [0, 2.2, 0]),
      buildBlock([0.3, 0.3, 0.3], "#b06a44", [0, 3.3, 0]),
      buildDrum([0.06, 0.08], 0.6, 5, "#9a5232", [0, 3.7, 0]),
      buildBlock([1.0, 0.2, 1.8], "#c27a4c", [0, 0.8, 3.0], [0.6, 0, 0]),
    ],
  }),
  "indus-covered-drain": (): HistoryPropParts => ({
    body: [
      buildBlock([4.4, 0.04, 1.2], "#c9946a", [0, 0.02, 0]),
      buildBlock([4, 0.25, 0.15], "#b46a44", [0, 0.12, 0.28]),
      buildBlock([4, 0.25, 0.15], "#b46a44", [0, 0.12, -0.28]),
      buildBlock([4, 0.1, 0.4], "#4f8aa0", [0, 0.06, 0]),
      ...[-1.6, -1.0, -0.4, 0.8, 1.4].map((x): ModelPart =>
        buildBlock([0.55, 0.08, 0.72], "#9a8a76", [x, 0.28, 0]),
      ),
    ],
  }),
  "bullock-cart": (): HistoryPropParts => {
    const bull = "#e8e0d2";
    return {
      body: [
        buildBlock([1.4, 0.3, 0.9], "#8a6a44", [-0.6, 0.6, 0]),
        buildBlock([1.4, 0.3, 0.06], "#6b4a2c", [-0.6, 0.85, 0.44]),
        buildBlock([1.4, 0.3, 0.06], "#6b4a2c", [-0.6, 0.85, -0.44]),
        buildSolidWheel(0.45, [-0.6, 0.45, 0.55]),
        buildSolidWheel(0.45, [-0.6, 0.45, -0.55]),
        buildDrum(
          [0.04, 0.04],
          1.4,
          5,
          "#6b4a2c",
          [0.6, 0.7, 0],
          [0, 0, Math.PI / 2],
        ),
        buildLump(0.45, bull, [1.6, 0.85, 0], [1.4, 0.75, 0.8], 0.1),
        buildLump(0.2, "#d8cfc0", [1.25, 1.2, 0], 1, 0.1),
        buildBlock([0.32, 0.28, 0.24], bull, [2.25, 1.0, 0], [0, 0, -0.3]),
        buildSpike(0.04, 0.3, 4, "#4a3a30", [2.25, 1.25, 0.12], [0.4, 0, 0]),
        buildSpike(0.04, 0.3, 4, "#4a3a30", [2.25, 1.25, -0.12], [-0.4, 0, 0]),
        ...[
          [1.95, 0.2],
          [1.95, -0.2],
          [1.25, 0.2],
          [1.25, -0.2],
        ].map(([x, z]): ModelPart =>
          buildDrum([0.06, 0.06], 0.6, 4, "#cfc6b6", [x, 0.3, z]),
        ),
      ],
    };
  },
  "neem-tree": (): HistoryPropParts => ({
    body: buildBroadleafTreeParts("#6b5440", ["#4f8a3a", "#5f9a45", "#447a32"]),
    motion: "sway",
  }),
  "rammed-earth-palace": (): HistoryPropParts => {
    const thatch = "#b89a5a";
    return {
      body: [
        buildBlock([8, 0.7, 4.4], "#b89a6a", [0, 0.35, 0]),
        buildBlock([8.02, 0.05, 4.42], "#9f8258", [0, 0.22, 0]),
        buildBlock([8.02, 0.05, 4.42], "#9f8258", [0, 0.48, 0]),
        ...[0, 1, 2].map((step): ModelPart =>
          buildBlock([1.6, 0.23, 0.3], "#c4a676", [
            0,
            0.115 + step * 0.23,
            2.5 - step * 0.3,
          ]),
        ),
        buildBlock([6.4, 1.6, 3.0], "#d9c49a", [0, 1.5, -0.2]),
        ...[-3, -2, -1, 0, 1, 2, 3].map((x): ModelPart =>
          buildDrum([0.1, 0.12], 1.6, 6, "#7a3a22", [x, 1.5, 1.55]),
        ),
        {
          geometry: buildGableRoof(4.2, 1.6, 4.0),
          colour: thatch,
          position: [0, 2.3, 0],
          roughen: 0.03,
        },
        buildPyramidRoof(2.1, 1.6, "#a88a4e", [-2.0, 2.3, 0]),
        buildPyramidRoof(2.1, 1.6, "#a88a4e", [2.0, 2.3, 0]),
      ],
    };
  },
  "bronze-ding": (): HistoryPropParts => {
    const bronze = "#a8823a";
    return {
      body: [
        ...[
          [0.35, 0.25],
          [0.35, -0.25],
          [-0.35, 0.25],
          [-0.35, -0.25],
        ].map(([x, z]): ModelPart =>
          buildDrum([0.07, 0.07], 0.55, 6, bronze, [x, 0.27, z]),
        ),
        buildBlock([0.95, 0.7, 0.72], bronze, [0, 0.9, 0]),
        buildBlock([0.97, 0.12, 0.74], "#5f8a6a", [0, 1.15, 0]),
        buildBlock([0.97, 0.06, 0.74], "#7a6a3a", [0, 0.68, 0]),
        buildBlock([0.12, 0.1, 0.03], "#5a4a2a", [-0.15, 0.92, 0.37]),
        buildBlock([0.12, 0.1, 0.03], "#5a4a2a", [0.15, 0.92, 0.37]),
        buildBlock([0.06, 0.3, 0.03], "#5a4a2a", [0, 0.85, 0.37]),
        ...[0.3, -0.3].map((x): ModelPart => ({
          geometry: new TorusGeometry(0.15, 0.04, 4, 6, Math.PI),
          colour: bronze,
          position: [x, 1.25, 0],
          rotation: [0, Math.PI / 2, 0],
        })),
      ],
    };
  },
  "shang-chariot": (): HistoryPropParts => ({
    body: [
      ...buildSpokedWheelParts(0.7, 0.85, "#5a3a22", 6),
      ...buildSpokedWheelParts(0.7, -0.85, "#5a3a22", 6),
      buildDrum(
        [0.04, 0.04],
        1.9,
        5,
        "#4a3020",
        [0, 0.7, 0],
        [Math.PI / 2, 0, 0],
      ),
      buildBlock([0.9, 0.12, 1.0], "#7a4a2a", [0, 0.85, 0]),
      buildBlock([0.9, 0.4, 0.05], "#8a5a34", [0, 1.1, 0.48]),
      buildBlock([0.9, 0.4, 0.05], "#8a5a34", [0, 1.1, -0.48]),
      buildBlock([0.05, 0.4, 1.0], "#8a5a34", [-0.44, 1.1, 0]),
      buildDrum(
        [0.04, 0.05],
        2.6,
        5,
        "#5a3a22",
        [1.6, 0.95, 0],
        [0, 0, Math.PI / 2 - 0.1],
      ),
      buildDrum(
        [0.035, 0.035],
        1.4,
        5,
        "#5a3a22",
        [2.85, 1.1, 0],
        [Math.PI / 2, 0, 0],
      ),
      buildBlock([0.12, 0.2, 0.12], "#a8823a", [2.85, 1.0, 0.4]),
      buildBlock([0.12, 0.2, 0.12], "#a8823a", [2.85, 1.0, -0.4]),
    ],
  }),
  "weeping-willow": (): HistoryPropParts => ({
    body: [
      buildDrum([0.22, 0.32], 2.6, 6, "#5a4a38", [0, 1.3, 0]),
      buildLump(1.4, "#8fae5a", [0, 3.0, 0], [1.2, 0.8, 1.2]),
      ...[0, 1, 2, 3, 4, 5, 6, 7].map((strand): ModelPart => {
        const angle = (strand / 8) * Math.PI * 2;
        return buildSpike(
          0.38,
          2.4,
          4,
          strand % 2 === 0 ? "#9cb860" : "#86a552",
          [Math.cos(angle) * 1.35, 2.1, Math.sin(angle) * 1.35],
          [Math.PI, angle, 0],
        );
      }),
    ],
    motion: "sway",
  }),
  "oracle-bone-pit": (): HistoryPropParts => ({
    body: [
      {
        geometry: new TorusGeometry(0.9, 0.2, 4, 12),
        colour: "#8a6a44",
        rotation: [Math.PI / 2, 0, 0],
        scale: [1, 1, 0.6],
      },
      buildDrum([0.85, 0.85], 0.04, 10, "#3a2a1e", [0, 0.02, 0]),
      buildBlock([0.5, 0.06, 0.08], "#efe6d2", [0.2, 0.1, 0.2], [0, 0.6, 0.2]),
      buildBlock(
        [0.4, 0.06, 0.08],
        "#efe6d2",
        [-0.25, 0.08, -0.1],
        [0, -0.4, 0],
      ),
      buildBlock([1.4, 0.04, 1.0], "#b8a070", [1.8, 0.02, 0.3]),
      buildLump(0.35, "#d8c8a0", [1.6, 0.08, 0.3], [1.2, 0.2, 0.9], 0.05),
      buildBlock([0.04, 0.03, 0.4], "#3a2a1e", [1.6, 0.16, 0.3]),
      buildBlock([0.3, 0.03, 0.04], "#3a2a1e", [1.6, 0.16, 0.38]),
      buildBlock([0.5, 0.06, 0.18], "#efe6d2", [2.15, 0.07, 0.1], [0, 0.3, 0]),
    ],
  }),
  "shang-rammed-earth-wall": (): HistoryPropParts => ({
    body: [
      buildBlock([5, 1.6, 0.8], "#b89a6a", [0, 0.8, 0]),
      ...[0.4, 0.8, 1.2].map((y): ModelPart =>
        buildBlock([5.02, 0.05, 0.82], "#9f8258", [0, y, 0]),
      ),
      {
        geometry: buildGableRoof(1.1, 0.45, 5.2),
        colour: "#b89a5a",
        position: [0, 1.6, 0],
      },
    ],
  }),
} satisfies Record<string, () => HistoryPropParts>;
