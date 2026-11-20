import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
} from "three";
import type { LandscapeFeature } from "../../curriculum/geography.js";
import {
  buildCottageGeometry,
  buildLighthouseGeometry,
  buildSailingBoatGeometry,
  type ModelPart,
  type Triple,
} from "../world-map-models.js";
import { fitModelHeight } from "./geography-kit.js";
import {
  buildBroadleafParts,
  buildPineParts,
  findScatter,
} from "./miniature-parts.js";

export const landRadius = 1.5;
export const waterLevel = 0.06;

export interface LandscapeModel {
  land: ModelPart[];
  water: ModelPart[];
  borrowed: BorrowedModel[];
}

export interface BorrowedModel {
  build: () => BufferGeometry;
  height: number;
  at: Triple;
  turn?: number;
}

const colours = {
  grass: "#6cc070",
  grassDark: "#4f9a4f",
  sand: "#ecd59a",
  rock: "#9a8f80",
  rockDark: "#6d655d",
  snow: "#ffffff",
  water: "#3a8fd8",
  brick: "#c96a4a",
  roof: "#5b6270",
  stone: "#d8d2c4",
  glass: "#8fc3e8",
  white: "#f4efe6",
} as const;

const part = (
  geometry: BufferGeometry,
  colour: string,
  position: Triple = [0, 0, 0],
  rotation: Triple = [0, 0, 0],
  scale: Triple | number = 1,
  roughen?: number,
): ModelPart => ({
  geometry,
  colour,
  position,
  rotation,
  scale,
  ...(roughen === undefined ? {} : { roughen, isSmooth: true }),
});

const block = (size: Triple, colour: string, at: Triple, turn = 0): ModelPart =>
  part(
    new BoxGeometry(...size),
    colour,
    [at[0], at[1] + size[1] / 2, at[2]],
    [0, turn, 0],
  );

const disc = (colour: string, radius = landRadius, height = 0.12): ModelPart =>
  part(new CylinderGeometry(radius, radius, height, 40), colour, [
    0,
    height / 2,
    0,
  ]);

const halfDisc = (colour: string, side: 1 | -1, height: number): ModelPart =>
  part(
    new CylinderGeometry(
      landRadius,
      landRadius,
      height,
      24,
      1,
      false,
      side === 1 ? 0 : Math.PI,
      Math.PI,
    ),
    colour,
    [0, height / 2, 0],
  );

const seaSurface = (radius = landRadius - 0.02): ModelPart =>
  part(new CylinderGeometry(radius, radius, 0.02, 40), colours.water, [
    0,
    waterLevel,
    0,
  ]);

const rock = (
  at: Triple,
  size: number,
  colour: string = colours.rock,
): ModelPart =>
  part(new IcosahedronGeometry(size, 1), colour, at, [0, 0, 0], 1, 0.35);

const scatterTrees = (
  count: number,
  salt: number,
  reach: number,
  isPine = false,
): ModelPart[] =>
  Array.from({ length: count }, (_, index) => {
    const angle = findScatter(index, salt) * Math.PI * 2;
    const distance = 0.25 + Math.sqrt(findScatter(index, salt + 1)) * reach;
    const at: Triple = [
      Math.cos(angle) * distance,
      0.12,
      Math.sin(angle) * distance,
    ];
    const height = 0.55 + findScatter(index, salt + 2) * 0.35;
    return isPine && index % 2 === 0
      ? buildPineParts(at, height)
      : buildBroadleafParts(at, height);
  }).flat();

const boat = (at: Triple, colour: string, turn = 0): ModelPart[] =>
  boatParts(at, colour, turn).map((boatPart) => ({
    ...boatPart,
    scale: 1.7,
    position: [
      at[0] + ((boatPart.position?.[0] ?? 0) - at[0]) * 1.7,
      at[1] + ((boatPart.position?.[1] ?? 0) - at[1]) * 1.7,
      at[2] + ((boatPart.position?.[2] ?? 0) - at[2]) * 1.7,
    ],
  }));

const boatParts = (at: Triple, colour: string, turn: number): ModelPart[] => [
  part(
    new BoxGeometry(0.3, 0.06, 0.12),
    colour,
    [at[0], at[1] + 0.03, at[2]],
    [0, turn, 0],
  ),
  part(
    new ConeGeometry(0.06, 0.12, 4),
    colour,
    [
      at[0] + Math.cos(turn) * 0.17,
      at[1] + 0.03,
      at[2] - Math.sin(turn) * 0.17,
    ],
    [0, turn, -Math.PI / 2],
  ),
  part(new CylinderGeometry(0.008, 0.008, 0.25, 4), "#5e4330", [
    at[0],
    at[1] + 0.18,
    at[2],
  ]),
];

const cliffBlock = (
  centreX: number,
  width: number,
  height: number,
  depth: number,
  centreZ = 0,
): ModelPart[] => [
  part(new BoxGeometry(width, height, depth), colours.rock, [
    centreX,
    height / 2,
    centreZ,
  ]),
  part(new BoxGeometry(width * 1.02, 0.06, depth * 1.02), colours.grass, [
    centreX,
    height + 0.02,
    centreZ,
  ]),
];

const buildingWithRoof = (
  size: Triple,
  wall: string,
  roof: string,
  at: Triple,
  turn = 0,
): ModelPart[] => [
  block(size, wall, at, turn),
  part(
    new ConeGeometry(Math.hypot(size[0], size[2]) * 0.55, size[1] * 0.6, 4),
    roof,
    [at[0], at[1] + size[1] + size[1] * 0.3, at[2]],
    [0, Math.PI / 4 + turn, 0],
    [1, 1, size[2] / size[0]],
  ),
];

const chimney = (at: Triple, height: number): ModelPart[] => [
  part(new CylinderGeometry(0.05, 0.065, height, 10), colours.brick, [
    at[0],
    at[1] + height / 2,
    at[2],
  ]),
  ...[0, 1, 2].map((puff) =>
    part(new SphereGeometry(0.06 + puff * 0.025, 10, 8), "#c9ced6", [
      at[0] + puff * 0.06,
      at[1] + height + 0.08 + puff * 0.1,
      at[2],
    ]),
  ),
];

const coastalBase = (): ModelPart[] => [halfDisc(colours.sand, -1, 0.08)];

const headlandParts = (): ModelPart[] => [
  ...cliffBlock(-0.35, 1.5, 0.65, 0.7),
  part(
    new CylinderGeometry(0.35, 0.35, 0.65, 16, 3),
    colours.rock,
    [0.4, 0.325, 0],
    [0, 0, 0],
    1,
    0.1,
  ),
  part(
    new CylinderGeometry(0.36, 0.36, 0.06, 16),
    colours.grass,
    [0.4, 0.68, 0],
  ),
];

export const landscapeModels: Record<LandscapeFeature, () => LandscapeModel> = {
  beach: () => ({
    land: [
      halfDisc(colours.grass, -1, 0.2),
      part(
        new BoxGeometry(1.5, 0.12, 2.6),
        colours.sand,
        [0.25, 0.06, 0],
        [0, 0, -0.08],
      ),
      part(
        new CylinderGeometry(0.01, 0.01, 0.4, 4),
        "#ffffff",
        [0.1, 0.32, 0.4],
      ),
      part(new ConeGeometry(0.22, 0.1, 8), "#ff6f61", [0.1, 0.52, 0.4]),
      block([0.24, 0.02, 0.12], "#3a86ff", [0.25, 0.12, 0.55]),
      rock([0.45, 0.12, -0.5], 0.08),
    ],
    water: [
      part(new BoxGeometry(1.0, 0.02, 2.6), colours.water, [
        1.05,
        waterLevel,
        0,
      ]),
    ],
    borrowed: [],
  }),
  cliff: () => ({
    land: [
      ...cliffBlock(-0.4, 1.4, 1.3, 2.4),
      ...buildBroadleafParts([-0.7, 1.33, -0.5], 0.5),
      ...buildPineParts([-0.5, 1.33, 0.6], 0.45),
    ],
    water: [
      part(new BoxGeometry(1.4, 0.02, 2.6), colours.water, [
        0.65,
        waterLevel,
        0,
      ]),
    ],
    borrowed: [],
  }),
  forest: () => ({
    land: [disc(colours.grassDark), ...scatterTrees(11, 7, 1.0, true)],
    water: [],
    borrowed: [],
  }),
  hill: () => ({
    land: [
      disc(colours.grass),
      part(
        new SphereGeometry(1.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        colours.grass,
        [0, 0.1, 0],
        [0, 0, 0],
        [1, 0.55, 1],
      ),
      ...[-0.3, 0.2, 0.45].map((x, index) =>
        part(new SphereGeometry(0.06, 8, 6), "#ffffff", [
          x,
          0.55 - Math.abs(x) * 0.3,
          0.55 + index * 0.08,
        ]),
      ),
    ],
    water: [],
    borrowed: [],
  }),
  mountain: () => ({
    land: [
      disc(colours.grassDark),
      part(
        new ConeGeometry(1.2, 2.1, 9, 4),
        colours.rock,
        [0, 1.15, 0],
        [0, 0, 0],
        1,
        0.18,
      ),
      part(
        new ConeGeometry(0.48, 0.75, 9, 2),
        colours.snow,
        [0, 1.85, 0],
        [0, 0, 0],
        1,
        0.15,
      ),
      ...buildPineParts([1.0, 0.12, 0.6], 0.4),
      ...buildPineParts([-1.05, 0.12, 0.55], 0.45),
    ],
    water: [],
    borrowed: [],
  }),
  river: () => ({
    land: [
      disc(colours.grass),
      ...scatterTrees(4, 11, 0.9).filter((_, index) => index % 3 !== 1),
    ],
    water: [-1.2, -0.6, 0, 0.6, 1.2].map((x, index) =>
      part(
        new BoxGeometry(0.75, 0.02, 0.32),
        colours.water,
        [x, 0.13, Math.sin(index * 1.4) * 0.3],
        [0, Math.cos(index * 1.4) * 0.5, 0],
      ),
    ),
    borrowed: [],
  }),
  sea: () => ({
    land: [
      part(
        new CylinderGeometry(landRadius - 0.04, landRadius - 0.04, 0.06, 40),
        "#1d5fa8",
        [0, 0.03, 0],
      ),
    ],
    water: [seaSurface()],
    borrowed: [
      {
        build: buildSailingBoatGeometry,
        height: 0.9,
        at: [0.2, waterLevel, 0.2],
        turn: 0.6,
      },
    ],
  }),
  valley: () => ({
    land: [
      disc(colours.grass),
      part(
        new BoxGeometry(1.0, 0.9, 2.8, 2, 3, 2),
        colours.grassDark,
        [-1.0, 0.45, 0],
        [0, 0, 0.35],
        1,
        0.12,
      ),
      part(
        new BoxGeometry(1.0, 0.9, 2.8, 2, 3, 2),
        colours.grassDark,
        [1.0, 0.45, 0],
        [0, 0, -0.35],
        1,
        0.12,
      ),
      ...buildBroadleafParts([0.35, 0.12, 0.6], 0.5),
    ],
    water: [
      part(new BoxGeometry(0.22, 0.02, 2.8), colours.water, [0, 0.13, 0]),
    ],
    borrowed: [],
  }),
  lake: () => ({
    land: [
      disc(colours.grass),
      ...[0.5, 1.9, 3.2, 4.4, 5.6].flatMap((angle, index) =>
        index % 2 === 0
          ? buildBroadleafParts(
              [Math.cos(angle) * 1.15, 0.12, Math.sin(angle) * 1.15],
              0.5,
            )
          : buildPineParts(
              [Math.cos(angle) * 1.15, 0.12, Math.sin(angle) * 1.15],
              0.45,
            ),
      ),
    ],
    water: [
      part(
        new CylinderGeometry(0.85, 0.85, 0.02, 32),
        colours.water,
        [0, 0.13, 0],
      ),
    ],
    borrowed: [],
  }),
  island: () => ({
    land: [
      part(
        new CylinderGeometry(landRadius - 0.04, landRadius - 0.04, 0.06, 40),
        "#1d5fa8",
        [0, 0.03, 0],
      ),
      part(
        new SphereGeometry(0.6, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        colours.sand,
        [0, 0, 0],
        [0, 0, 0],
        [1, 0.35, 1],
      ),
      part(
        new SphereGeometry(0.42, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        colours.grass,
        [0, 0.06, 0],
        [0, 0, 0],
        [1, 0.4, 1],
      ),
      part(
        new CylinderGeometry(0.03, 0.045, 0.6, 6),
        "#8a5a3b",
        [0.05, 0.45, 0],
        [0, 0, 0.15],
      ),
      ...[0, 1, 2, 3, 4].map((leaf) =>
        part(
          new ConeGeometry(0.06, 0.4, 4),
          "#3f8f3f",
          [
            0.1 + Math.cos(leaf * 1.25) * 0.15,
            0.75,
            Math.sin(leaf * 1.25) * 0.15,
          ],
          [Math.sin(leaf * 1.25) * 1.2, 0, -Math.cos(leaf * 1.25) * 1.2],
        ),
      ),
    ],
    water: [seaSurface()],
    borrowed: [],
  }),
  waterfall: () => ({
    land: [
      disc(colours.grass),
      part(
        new BoxGeometry(2.6, 1.2, 1.1, 4, 3, 2),
        colours.rock,
        [0, 0.6, -0.65],
        [0, 0, 0],
        1,
        0.1,
      ),
      block([2.62, 0.06, 1.12], colours.grass, [0, 1.2, -0.65]),
      ...buildPineParts([-0.9, 1.2, -0.7], 0.45),
      ...buildPineParts([0.85, 1.2, -0.8], 0.4),
    ],
    water: [
      part(new BoxGeometry(0.45, 0.02, 0.6), colours.water, [0, 1.24, -0.6]),
      part(new BoxGeometry(0.42, 1.15, 0.05), "#bfe6ff", [0, 0.68, -0.08]),
      part(
        new CylinderGeometry(0.6, 0.6, 0.02, 24),
        colours.water,
        [0, 0.13, 0.35],
      ),
    ],
    borrowed: [],
  }),
  house: () => ({
    land: [
      disc(colours.grass),
      block([0.6, 0.02, 0.2], "#cdbb94", [0.1, 0.12, 0.85]),
    ],
    water: [],
    borrowed: [
      { build: buildCottageGeometry, height: 1.3, at: [0, 0.12, 0], turn: 0.4 },
    ],
  }),
  farm: () => ({
    land: [
      disc(colours.grass),
      ...[0, 1, 2, 3].map((patch) =>
        block(
          [0.6, 0.02, 0.6],
          ["#d9c65a", "#9cc95a", "#b9d36b", "#c9a64a"][patch],
          [
            -0.55 + (patch % 2) * 0.65,
            0.12,
            0.35 + Math.floor(patch / 2) * 0.6,
          ],
        ),
      ),
      ...buildingWithRoof(
        [0.7, 0.55, 0.5],
        "#b33a2e",
        "#5b3a2e",
        [0.45, 0.12, -0.5],
      ),
      part(
        new CylinderGeometry(0.15, 0.15, 0.9, 16),
        "#cfd4da",
        [-0.1, 0.57, -0.6],
      ),
      part(
        new SphereGeometry(0.15, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        "#9aa1ab",
        [-0.1, 1.02, -0.6],
      ),
      block([0.18, 0.1, 0.08], "#ffffff", [0.6, 0.18, 0.2]),
      block([0.18, 0.1, 0.08], "#3b3f46", [0.8, 0.18, 0.5]),
    ],
    water: [],
    borrowed: [],
  }),
  factory: () => ({
    land: [
      disc("#9a9a92"),
      block([1.3, 0.55, 0.8], "#a3abb6", [-0.1, 0.12, 0]),
      ...[0, 1, 2].map((tooth) =>
        part(
          new BoxGeometry(0.42, 0.2, 0.8),
          "#7d8794",
          [-0.55 + tooth * 0.43, 0.77, 0],
          [0, 0, 0.5],
        ),
      ),
      ...chimney([0.75, 0.12, -0.25], 1.3),
      ...chimney([0.95, 0.12, 0.2], 1.0),
      block([0.3, 0.22, 0.02], "#3b3f46", [-0.3, 0.12, 0.41]),
    ],
    water: [],
    borrowed: [],
  }),
  office: () => ({
    land: [
      disc("#b8bcc2"),
      ...Array.from({ length: 8 }, (_, floor) =>
        block([0.8, 0.22, 0.8], floor % 2 === 0 ? colours.glass : "#dfe6ee", [
          0,
          0.12 + floor * 0.22,
          0,
        ]),
      ),
      block([0.86, 0.06, 0.86], "#5b6270", [0, 1.88, 0]),
      ...buildBroadleafParts([0.85, 0.12, 0.7], 0.4),
    ],
    water: [],
    borrowed: [],
  }),
  shop: () => ({
    land: [
      disc("#cdbf9c"),
      block([1.3, 0.75, 0.7], "#f3d27a", [0, 0.12, -0.2]),
      block([1.0, 0.4, 0.02], colours.glass, [0, 0.14, 0.16]),
      ...Array.from({ length: 6 }, (_, stripe) =>
        part(
          new BoxGeometry(0.22, 0.03, 0.4),
          stripe % 2 === 0 ? "#e2483d" : "#ffffff",
          [-0.55 + stripe * 0.22, 0.62, 0.32],
          [0.45, 0, 0],
        ),
      ),
      block([0.9, 0.16, 0.04], "#3b3f46", [0, 0.72, 0.16]),
      ...[-0.4, 0.4].map((x) =>
        block([0.2, 0.18, 0.15], "#9a6a3d", [x, 0.12, 0.6]),
      ),
    ],
    water: [],
    borrowed: [],
  }),
  school: () => ({
    land: [
      disc(colours.grass),
      block([1.6, 0.5, 0.55], colours.brick, [0, 0.12, -0.5]),
      block([1.62, 0.06, 0.57], colours.roof, [0, 0.62, -0.5]),
      block([0.35, 0.95, 0.35], colours.brick, [0, 0.12, -0.5]),
      part(
        new CylinderGeometry(0.12, 0.12, 0.03, 20),
        "#ffffff",
        [0, 0.88, -0.31],
        [Math.PI / 2, 0, 0],
      ),
      part(
        new ConeGeometry(0.26, 0.28, 4),
        colours.roof,
        [0, 1.21, -0.5],
        [0, Math.PI / 4, 0],
      ),
      block([1.4, 0.02, 0.7], "#9aa1ab", [0, 0.12, 0.4]),
      ...[0, 1, 2].map((square) =>
        block([0.12, 0.022, 0.12], "#ffd23f", [
          -0.4 + square * 0.14,
          0.13,
          0.4,
        ]),
      ),
      ...[-0.7, 0.7].map((x) =>
        part(new CylinderGeometry(0.02, 0.02, 0.4, 6), "#e2483d", [
          x,
          0.32,
          0.6,
        ]),
      ),
      block([1.42, 0.02, 0.02], "#e2483d", [0, 0.5, 0.6]),
    ],
    water: [],
    borrowed: [],
  }),
  church: () => ({
    land: [
      disc(colours.grass),
      ...buildingWithRoof(
        [0.6, 0.55, 1.1],
        colours.stone,
        colours.roof,
        [0, 0.12, 0.15],
      ),
      block([0.4, 1.05, 0.4], "#cfc8b8", [0, 0.12, -0.6]),
      part(
        new ConeGeometry(0.3, 0.85, 4),
        colours.roof,
        [0, 1.6, -0.6],
        [0, Math.PI / 4, 0],
      ),
      block([0.03, 0.22, 0.03], "#d6a548", [0, 2.02, -0.6]),
      block([0.14, 0.03, 0.03], "#d6a548", [0, 2.14, -0.6]),
      ...[-0.7, 0.75].map((x) => rock([x, 0.18, 0.7], 0.06, "#b9b4aa")),
    ],
    water: [],
    borrowed: [],
  }),
  port: () => ({
    land: [
      part(
        new CylinderGeometry(landRadius - 0.04, landRadius - 0.04, 0.06, 40),
        "#1d5fa8",
        [0, 0.03, 0],
      ),
      block([3.0, 0.2, 0.7], "#9aa1ab", [0, 0, -1.0]),
      block([1.9, 0.22, 0.5], "#2f3640", [0.1, waterLevel, -0.2]),
      ...Array.from({ length: 8 }, (_, box) =>
        block(
          [0.4, 0.14, 0.18],
          ["#e2483d", "#3a86ff", "#ffb703", "#2a9d8f"][box % 4],
          [
            -0.55 + (box % 4) * 0.42,
            waterLevel + 0.22 + Math.floor(box / 4) * 0.14,
            -0.2,
          ],
        ),
      ),
      block([0.3, 0.4, 0.45], "#ffffff", [0.95, waterLevel + 0.22, -0.2]),
      ...[-0.6, 0.6].flatMap((x) => [
        block([0.08, 1.4, 0.08], "#f2b705", [x, 0.2, -1.1]),
        block([0.08, 0.08, 1.2], "#f2b705", [x, 1.55, -0.6]),
      ]),
    ],
    water: [seaSurface()],
    borrowed: [],
  }),
  harbour: () => ({
    land: [
      halfDisc(colours.grass, -1, 0.22),
      part(
        new CylinderGeometry(landRadius - 0.04, landRadius - 0.04, 0.06, 40),
        "#1d5fa8",
        [0, 0.03, 0],
      ),
      part(
        new TorusGeometry(0.95, 0.1, 6, 28, Math.PI * 0.85),
        colours.stone,
        [0, 0.14, 0],
        [Math.PI / 2, 0, 0.1],
      ),
      ...buildingWithRoof(
        [0.3, 0.3, 0.3],
        "#f4efe6",
        "#3a86ff",
        [-0.5, 0.22, -0.95],
      ),
      ...buildingWithRoof(
        [0.3, 0.32, 0.3],
        "#ffd8a8",
        "#e2483d",
        [0.1, 0.22, -1.05],
      ),
      ...boat([0.1, waterLevel, 0.1], "#e2483d", 0.3),
      ...boat([-0.35, waterLevel, 0.35], "#3a86ff", -0.4),
      ...boat([0.45, waterLevel, 0.4], "#ffb703", 1.2),
    ],
    water: [seaSurface()],
    borrowed: [],
  }),
  lighthouse: () => ({
    land: [
      part(
        new CylinderGeometry(landRadius - 0.04, landRadius - 0.04, 0.06, 40),
        "#1d5fa8",
        [0, 0.03, 0],
      ),
      rock([0.2, 0.1, 0.1], 0.6),
      rock([-0.5, 0.05, 0.4], 0.3),
    ],
    water: [seaSurface()],
    borrowed: [
      { build: buildLighthouseGeometry, height: 2.0, at: [0, 0.2, 0] },
    ],
  }),
  headland: () => ({
    land: [...coastalBase(), ...headlandParts()],
    water: [seaSurface()],
    borrowed: [],
  }),
  bay: () => ({
    land: [
      ...cliffBlock(-0.9, 0.5, 0.6, 2.6),
      ...cliffBlock(0.9, 0.5, 0.6, 2.6),
      part(
        new CylinderGeometry(
          0.75,
          0.75,
          0.1,
          24,
          1,
          false,
          Math.PI / 2,
          Math.PI,
        ),
        colours.sand,
        [0, 0.05, -0.55],
      ),
      ...cliffBlock(0, 1.3, 0.5, 0.5, -1.0),
    ],
    water: [seaSurface()],
    borrowed: [],
  }),
  "sea-cave": () => ({
    land: [
      ...coastalBase(),
      ...cliffBlock(-0.2, 2.2, 1.0, 1.0, -0.3),
      part(
        new SphereGeometry(0.28, 16, 10),
        "#1b1b22",
        [0.2, 0.2, 0.2],
        [0, 0, 0],
        [1, 1.2, 0.5],
      ),
    ],
    water: [seaSurface()],
    borrowed: [],
  }),
  "sea-arch": () => ({
    land: [
      ...coastalBase(),
      ...cliffBlock(-0.55, 1.3, 0.8, 0.8),
      block([0.35, 0.8, 0.6], colours.rock, [0.95, 0, 0]),
      block([0.75, 0.25, 0.6], colours.rock, [0.65, 0.58, 0]),
      block([0.77, 0.06, 0.62], colours.grass, [0.65, 0.83, 0]),
    ],
    water: [seaSurface()],
    borrowed: [],
  }),
  "sea-stack": () => ({
    land: [
      ...coastalBase(),
      ...cliffBlock(-0.6, 1.2, 0.85, 1.0),
      part(
        new CylinderGeometry(0.18, 0.26, 0.95, 10, 3),
        colours.rock,
        [0.75, 0.47, 0.1],
        [0, 0, 0],
        1,
        0.12,
      ),
      part(
        new CylinderGeometry(0.18, 0.18, 0.05, 10),
        colours.grass,
        [0.75, 0.97, 0.1],
      ),
    ],
    water: [seaSurface()],
    borrowed: [],
  }),
  "sea-stump": () => ({
    land: [
      ...coastalBase(),
      ...cliffBlock(-0.6, 1.2, 0.85, 1.0),
      part(
        new CylinderGeometry(0.2, 0.28, 0.2, 10, 2),
        colours.rockDark,
        [0.75, 0.1, 0.1],
        [0, 0, 0],
        1,
        0.15,
      ),
    ],
    water: [seaSurface()],
    borrowed: [],
  }),
};

export const buildBorrowedGeometry = ({
  build,
  height,
  at,
  turn = 0,
}: BorrowedModel): BufferGeometry => {
  const geometry = fitModelHeight(build(), height);
  geometry.rotateY(turn);
  geometry.translate(...at);
  return geometry;
};
