import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  SphereGeometry,
  TorusGeometry,
} from "three";
import {
  buildFlame,
  buildGableRoof,
  type HistoryPropParts,
} from "./history-prop-parts.js";
import type { ModelPart, Triple } from "./world-map-models.js";

const noTurn: Triple = [0, 0, 0];
const flatOnFront: Triple = [Math.PI / 2, 0, 0];
const lyingAlongX: Triple = [0, 0, Math.PI / 2];

const buildBlock = (
  size: Triple,
  colour: string,
  position: Triple,
  rotation: Triple = noTurn,
): ModelPart => ({
  geometry: new BoxGeometry(...size),
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
  rotation: Triple = noTurn,
): ModelPart => ({
  geometry: new CylinderGeometry(radii[0], radii[1], height, segments),
  colour,
  position,
  rotation,
});

const buildDisc = (
  radius: number,
  thickness: number,
  segments: number,
  colour: string,
  position: Triple,
  rotation: Triple = flatOnFront,
): ModelPart =>
  buildDrum([radius, radius], thickness, segments, colour, position, rotation);

const buildCone = (
  radius: number,
  height: number,
  segments: number,
  colour: string,
  position: Triple,
  rotation: Triple = noTurn,
): ModelPart => ({
  geometry: new ConeGeometry(radius, height, segments),
  colour,
  position,
  rotation,
});

const buildBall = (
  radius: number,
  colour: string,
  position: Triple,
  scale: Triple = [1, 1, 1],
): ModelPart => ({
  geometry: new SphereGeometry(radius, 8, 6),
  colour,
  position,
  scale,
});

const buildPebble = (
  radius: number,
  colour: string,
  position: Triple,
  scale: Triple = [1, 1, 1],
  detail = 0,
): ModelPart => ({
  geometry: new IcosahedronGeometry(radius, detail),
  colour,
  position,
  scale,
});

const buildDome = (
  radius: number,
  segments: number,
  rings: number,
  colour: string,
  position: Triple,
  scale: Triple = [1, 1, 1],
): ModelPart => ({
  geometry: new SphereGeometry(
    radius,
    segments,
    rings,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  ),
  colour,
  position,
  scale,
});

const buildArchTop = (
  radius: number,
  depth: number,
  colour: string,
  position: Triple,
): ModelPart => ({
  geometry: new CylinderGeometry(
    radius,
    radius,
    depth,
    8,
    1,
    false,
    Math.PI / 2,
    Math.PI,
  ),
  colour,
  position,
  rotation: flatOnFront,
});

const buildWheel = (
  radius: number,
  width: number,
  segments: number,
  colour: string,
  position: Triple,
): ModelPart =>
  buildDisc(radius, width, segments, colour, position, flatOnFront);

const buildHorse = (coat: string, mane: string, at: Triple): ModelPart[] => {
  const [x, y, z] = at;
  return [
    buildBlock([1.2, 0.5, 0.42], coat, [x, y + 1, z]),
    ...[-0.45, 0.45].flatMap((legX) =>
      [-0.14, 0.14].map((legZ): ModelPart =>
        buildBlock([0.14, 0.8, 0.14], coat, [x + legX, y + 0.4, z + legZ]),
      ),
    ),
    buildBlock([0.28, 0.6, 0.26], coat, [x + 0.62, y + 1.35, z], [0, 0, -0.6]),
    buildBlock([0.5, 0.24, 0.22], coat, [x + 0.9, y + 1.58, z], [0, 0, -0.6]),
    buildBlock([0.1, 0.55, 0.3], mane, [x + 0.55, y + 1.42, z], [0, 0, -0.6]),
    buildBlock([0.1, 0.6, 0.12], mane, [x - 0.66, y + 0.9, z], [0, 0, 0.35]),
  ];
};

const terraceHouseCentres = [-2.2, 0, 2.2];
const terraceDoorColours = ["#2f4f7a", "#7a1f2a", "#2f5a3a"];

const buildTerraceWindows = (colour: string): ModelPart[] =>
  terraceHouseCentres.flatMap((centre): ModelPart[] => [
    buildBlock([0.5, 0.75, 0.06], colour, [centre - 0.5, 2.75, 1.02]),
    buildBlock([0.5, 0.75, 0.06], colour, [centre + 0.5, 2.75, 1.02]),
    buildBlock([0.7, 0.8, 0.06], colour, [centre - 0.45, 1.3, 1.02]),
  ]);

const buildTerraceRow = (brick: string, roof: string): ModelPart[] => [
  buildBlock([6.6, 3.6, 2], brick, [0, 1.8, 0]),
  {
    geometry: buildGableRoof(2.2, 1.1, 6.8),
    colour: roof,
    position: [0, 3.6, 0],
  },
  ...[-1.1, 1.1].flatMap((x): ModelPart[] => [
    buildBlock([0.45, 1, 0.7], brick, [x, 4.6, 0]),
    buildDrum([0.07, 0.09], 0.32, 6, "#b86a3e", [x - 0.12, 5.26, 0]),
    buildDrum([0.07, 0.09], 0.32, 6, "#b86a3e", [x + 0.12, 5.26, 0]),
  ]),
  ...terraceHouseCentres.flatMap((centre, index): ModelPart[] => [
    buildBlock([0.55, 1.4, 0.06], terraceDoorColours[index] ?? "#2f4f7a", [
      centre + 0.5,
      0.82,
      1.02,
    ]),
    buildBlock([0.75, 0.12, 0.3], "#e8e2d4", [centre + 0.5, 0.06, 1.12]),
    buildBlock([0.6, 0.08, 0.12], "#e8e2d4", [centre - 0.5, 2.34, 1.06]),
    buildBlock([0.6, 0.08, 0.12], "#e8e2d4", [centre + 0.5, 2.34, 1.06]),
    buildBlock([0.8, 0.08, 0.12], "#e8e2d4", [centre - 0.45, 0.86, 1.06]),
  ]),
];

const buildArchedWindow = (
  frame: string,
  pane: string,
  bars: string,
): HistoryPropParts => ({
  body: [
    buildBlock([1.9, 3.7, 0.1], frame, [0, 3.6, 0]),
    buildArchTop(0.95, 0.1, frame, [0, 5.45, 0]),
    buildBlock([2.1, 0.14, 0.3], frame, [0, 1.75, 0.1]),
    ...[-0.27, 0.27].map((x): ModelPart =>
      buildBlock([0.05, 3.4, 0.05], bars, [x, 3.6, 0.1]),
    ),
    ...[2.5, 3.3, 4.1, 4.9].map((y): ModelPart =>
      buildBlock([1.6, 0.05, 0.05], bars, [0, y, 0.1]),
    ),
  ],
  glow: [
    buildBlock([1.6, 3.4, 0.04], pane, [0, 3.6, 0.06]),
    buildArchTop(0.8, 0.04, pane, [0, 5.3, 0.06]),
  ],
});

const buildBarrel = (at: Triple): ModelPart[] => [
  buildDrum([0.3, 0.3], 0.7, 8, "#7a5232", [at[0], at[1] + 0.35, at[2]]),
  buildDrum([0.315, 0.315], 0.06, 8, "#3a2e26", [at[0], at[1] + 0.2, at[2]]),
  buildDrum([0.315, 0.315], 0.06, 8, "#3a2e26", [at[0], at[1] + 0.52, at[2]]),
];

const getScaleTriple = (scale: ModelPart["scale"]): Triple => {
  if (scale === undefined) {
    return [1, 1, 1];
  }
  return typeof scale === "number" ? [scale, scale, scale] : scale;
};

const buildPitchedParts = (
  parts: ModelPart[],
  pitch: number,
  drop: number,
): ModelPart[] =>
  parts.map((part) => {
    const geometry = part.geometry;
    const [x, y, z] = part.position ?? noTurn;
    const [turnX, turnY, turnZ] = part.rotation ?? noTurn;
    geometry.scale(...getScaleTriple(part.scale));
    geometry.rotateZ(turnZ);
    geometry.rotateY(turnY);
    geometry.rotateX(turnX);
    geometry.translate(x, y, z);
    geometry.rotateX(pitch);
    geometry.translate(0, drop, 0);
    return { geometry, colour: part.colour };
  });

const chalkLines: Triple[] = [
  [-0.3, 2.05, 0.8],
  [0.15, 1.85, 0.9],
  [-0.25, 1.65, 0.6],
  [0.3, 1.45, 0.5],
];

const grassBlades: Triple[] = [
  [-0.2, 0, -0.3],
  [0, 0.1, 0.2],
  [0.15, -0.1, -0.1],
  [-0.1, 0.15, 0.35],
  [0.25, 0.05, 0.25],
  [0.05, -0.15, -0.35],
];

const spitfireGreen = "#5f6b3e";

const buildSpitfireParts = (): ModelPart[] => [
  buildDrum([0.3, 0.12], 3.8, 8, spitfireGreen, [0, 0.95, -0.1], flatOnFront),
  buildCone(0.3, 0.7, 8, spitfireGreen, [0, 0.95, 2.15], flatOnFront),
  buildCone(0.12, 0.25, 8, "#2a2a2a", [0, 0.95, 2.58], flatOnFront),
  ...[0, 1, 2].map((blade): ModelPart => {
    const angle = (blade * Math.PI * 2) / 3;
    return buildBlock(
      [0.12, 0.8, 0.03],
      "#2a2a2a",
      [-Math.sin(angle) * 0.4, 0.95 + Math.cos(angle) * 0.4, 2.52],
      [0, 0, angle],
    );
  }),
  {
    geometry: new CylinderGeometry(1, 1, 0.07, 12),
    colour: spitfireGreen,
    position: [0, 0.72, 0.45],
    scale: [2.7, 1, 0.62],
  },
  ...[-1.3, 1.3].map((x): ModelPart =>
    buildBlock([0.7, 0.075, 0.45], "#7a6244", [x, 0.72, 0.4], [0, x * 0.2, 0]),
  ),
  ...[-1.85, 1.85].flatMap((x): ModelPart[] => [
    buildDrum([0.3, 0.3], 0.08, 8, "#2b3f7a", [x, 0.73, 0.45]),
    buildDrum([0.15, 0.15], 0.09, 8, "#b8262e", [x, 0.73, 0.45]),
  ]),
  {
    geometry: new CylinderGeometry(1, 1, 0.05, 10),
    colour: spitfireGreen,
    position: [0, 1.0, -1.85],
    scale: [0.95, 1, 0.32],
  },
  buildBlock([0.05, 0.65, 0.5], spitfireGreen, [0, 1.3, -1.92]),
  ...["#b8262e", "#f2efe6", "#2b3f7a"].map((colour, index): ModelPart =>
    buildBlock([0.06, 0.45, 0.09], colour, [0, 1.28, -1.7 - index * 0.09]),
  ),
  buildDome(0.22, 8, 4, "#a8c4cf", [0, 1.18, 0.25], [0.9, 1, 2.2]),
  ...[-0.24, 0.24].flatMap((x): ModelPart[] => [
    buildDrum([0.17, 0.17], 0.03, 6, "#2b3f7a", [x, 0.95, -0.9], lyingAlongX),
    buildDrum([0.08, 0.08], 0.04, 6, "#b8262e", [x, 0.95, -0.9], lyingAlongX),
  ]),
  ...[-0.55, 0.55].flatMap((x): ModelPart[] => [
    buildBlock([0.05, 0.55, 0.05], "#4a4e44", [x, 0.45, 0.8], [0, 0, x * 0.3]),
    buildDrum(
      [0.22, 0.22],
      0.1,
      8,
      "#22221f",
      [x * 1.13, 0.22, 0.8],
      lyingAlongX,
    ),
  ]),
  buildBlock([0.04, 0.3, 0.04], "#4a4e44", [0, 0.72, -1.75]),
  buildBlock([0.05, 0.12, 0.12], "#22221f", [0, 0.6, -1.75]),
];

export const modernPropBuilders = {
  "attic-roof-beams": (): HistoryPropParts => ({
    body: [
      buildBlock([14.4, 0.45, 0.45], "#6b4528", [-6, 4.75, 0], [0, 0, 0.559]),
      buildBlock([14.4, 0.45, 0.45], "#6b4528", [6, 4.75, 0], [0, 0, -0.559]),
      buildBlock([9.8, 0.35, 0.35], "#7a5232", [0, 5.5, 0]),
      buildBlock([0.3, 3, 0.3], "#7a5232", [0, 7, 0]),
    ],
  }),
  "attic-round-window": (): HistoryPropParts => ({
    body: [
      {
        geometry: new TorusGeometry(1, 0.14, 4, 14),
        colour: "#6b4a2e",
        position: [0, 4.6, 0],
      },
      buildBlock([2.1, 0.1, 0.08], "#6b4a2e", [0, 4.6, 0.06]),
      buildBlock([0.1, 2.1, 0.08], "#6b4a2e", [0, 4.6, 0.06]),
      buildBlock([1.6, 0.12, 0.3], "#7a5232", [0, 3.5, 0.12]),
    ],
    glow: [buildDisc(0.95, 0.04, 12, "#ffe0a0", [0, 4.6, 0])],
  }),
  "rocking-horse": (): HistoryPropParts => ({
    body: [
      ...[-0.25, 0.25].map((z): ModelPart => ({
        geometry: new TorusGeometry(1.8, 0.07, 4, 8, 1),
        colour: "#b8322e",
        position: [0, 1.87, z],
        rotation: [0, 0, -Math.PI / 2 - 0.5],
      })),
      buildBlock([1.5, 0.06, 0.6], "#b8322e", [0, 0.12, 0]),
      buildBlock([1.0, 0.4, 0.36], "#f2ebe0", [0, 1.0, 0]),
      ...[-0.38, 0.38].flatMap((x) =>
        [-0.13, 0.13].map((z): ModelPart =>
          buildBlock(
            [0.12, 0.8, 0.12],
            "#f2ebe0",
            [x * 1.2, 0.5, z],
            [0, 0, x > 0 ? 0.3 : -0.3],
          ),
        ),
      ),
      buildBlock([0.26, 0.55, 0.28], "#f2ebe0", [0.5, 1.35, 0], [0, 0, -0.5]),
      buildBlock([0.5, 0.24, 0.24], "#f2ebe0", [0.74, 1.6, 0], [0, 0, -0.45]),
      buildBlock([0.08, 0.5, 0.3], "#5a3a22", [0.4, 1.42, 0], [0, 0, -0.5]),
      buildBlock([0.4, 0.08, 0.4], "#3f63a8", [-0.05, 1.22, 0]),
      buildBlock([0.2, 0.12, 0.38], "#5a6470", [-0.3, 1.05, 0]),
      buildCone(0.09, 0.55, 4, "#5a3a22", [-0.66, 0.9, 0], [0, 0, 2.4]),
    ],
  }),
  "attic-toy-chest": (): HistoryPropParts => ({
    body: [
      buildBlock([1.4, 0.8, 0.8], "#a8432f", [0, 0.4, 0]),
      ...[-0.55, 0.55].map((x): ModelPart =>
        buildBlock([0.1, 0.82, 0.82], "#d9a93c", [x, 0.4, 0]),
      ),
      buildBlock([1.42, 0.82, 0.08], "#b9503a", [0, 1.2, -0.46], [-0.25, 0, 0]),
      buildBall(0.22, "#f2c84a", [0.32, 0.86, 0.05]),
      buildDrum([0.2, 0.2], 0.25, 8, "#3f63a8", [-0.3, 0.9, 0.05]),
      buildDrum([0.205, 0.205], 0.03, 8, "#f4efe2", [-0.3, 1.03, 0.05]),
    ],
  }),
  "wooden-toy-blocks": (): HistoryPropParts => ({
    body: [
      buildBlock([0.4, 0.4, 0.4], "#d9443a", [0, 0.2, 0]),
      buildBlock([0.4, 0.4, 0.4], "#3f7fc8", [0.44, 0.2, 0.05], [0, 0.3, 0]),
      buildBlock([0.4, 0.4, 0.4], "#5f9a4a", [-0.46, 0.2, 0.1]),
      buildBlock([0.4, 0.4, 0.4], "#f2b53a", [0.2, 0.6, 0.02], [0, 0.2, 0]),
      buildBlock([0.4, 0.4, 0.4], "#e8783a", [-0.1, 0.2, 0.48], [0, 0.6, 0]),
      buildBlock([0.4, 0.4, 0.4], "#8a5ab8", [0.22, 1.0, 0.02], [0, 0.5, 0]),
    ],
  }),
  "teddy-bear": (): HistoryPropParts => ({
    body: [
      buildPebble(0.42, "#b9824a", [0, 0.45, 0], [1, 1.15, 0.9], 1),
      buildPebble(0.28, "#e2b98a", [0, 0.42, 0.2], [1, 1.1, 0.6], 1),
      buildPebble(0.3, "#b9824a", [0, 1.08, 0], [1, 1, 1], 1),
      buildPebble(0.12, "#e2b98a", [0, 1.02, 0.26]),
      buildBlock([0.08, 0.06, 0.05], "#2a1e18", [0, 1.06, 0.37]),
      ...[-0.1, 0.1].map((x): ModelPart =>
        buildBlock([0.05, 0.05, 0.04], "#2a1e18", [x, 1.16, 0.27]),
      ),
      ...[-0.22, 0.22].flatMap((x): ModelPart[] => [
        buildPebble(0.1, "#a87240", [x, 1.32, 0]),
        buildPebble(0.14, "#b9824a", [x * 1.8, 0.55, 0.1], [1, 1.8, 1]),
        buildPebble(0.16, "#b9824a", [x, 0.15, 0.3], [1, 1, 1.8]),
      ]),
      buildCone(
        0.1,
        0.22,
        4,
        "#c8342c",
        [-0.1, 0.78, 0.3],
        [0, 0, Math.PI / 2],
      ),
      buildCone(
        0.1,
        0.22,
        4,
        "#c8342c",
        [0.1, 0.78, 0.3],
        [0, 0, -Math.PI / 2],
      ),
    ],
  }),
  "spinning-top": (): HistoryPropParts => ({
    body: [
      buildCone(0.35, 0.4, 8, "#c8342c", [0, 0.2, 0], [Math.PI, 0, 0]),
      buildDrum([0.36, 0.36], 0.08, 8, "#f2c84a", [0, 0.44, 0]),
      buildCone(0.35, 0.25, 8, "#3f63a8", [0, 0.6, 0]),
      buildDrum([0.04, 0.04], 0.35, 5, "#6b4528", [0, 0.82, 0]),
    ],
  }),
  "dolls-house": (): HistoryPropParts => ({
    body: [
      buildBlock([2.0, 0.15, 1.0], "#5a3a22", [0, 0.075, 0]),
      buildBlock([1.8, 1.6, 0.9], "#efe2c8", [0, 0.95, 0]),
      {
        geometry: buildGableRoof(1.0, 0.7, 1.9),
        colour: "#a8432f",
        position: [0, 1.75, 0],
      },
      ...[-0.55, 0.55].map((x): ModelPart =>
        buildBlock([0.2, 0.5, 0.2], "#a8432f", [x, 2.3, 0]),
      ),
      ...[-0.55, 0, 0.55].map((x): ModelPart =>
        buildBlock([0.3, 0.36, 0.04], "#5b7fa8", [x, 1.35, 0.46]),
      ),
      ...[-0.55, 0.55].map((x): ModelPart =>
        buildBlock([0.3, 0.36, 0.04], "#5b7fa8", [x, 0.65, 0.46]),
      ),
      buildBlock([0.3, 0.55, 0.04], "#2f5a3a", [0, 0.45, 0.46]),
    ],
  }),
  "cast-iron-range": (): HistoryPropParts => ({
    body: [
      buildBlock([3.2, 4.2, 0.7], "#a0644c", [0, 2.1, -0.2]),
      buildBlock([2.8, 1.9, 0.1], "#2a1e18", [0, 0.95, 0.16]),
      buildBlock([2.5, 1.2, 0.6], "#26262a", [0, 0.6, 0.3]),
      ...[-0.85, 0.85].flatMap((x): ModelPart[] => [
        buildBlock([0.7, 0.6, 0.05], "#3a3a40", [x, 0.6, 0.62]),
        buildBlock([0.1, 0.1, 0.06], "#d9a93c", [x + 0.22, 0.65, 0.66]),
      ]),
      ...[0.48, 0.65, 0.82].map((y): ModelPart =>
        buildBlock([0.72, 0.05, 0.05], "#1a1a1e", [0, y, 0.64]),
      ),
      buildBlock([2.6, 0.08, 0.66], "#8a8a90", [0, 1.24, 0.3]),
      buildDrum([0.2, 0.25], 0.3, 8, "#b0663a", [0.6, 1.43, 0.3]),
      buildCone(0.06, 0.3, 5, "#b0663a", [0.85, 1.5, 0.3], [0, 0, -1]),
      buildBlock([3.4, 0.12, 0.45], "#6b4528", [0, 2.2, 0.32]),
      buildBlock([0.4, 0.45, 0.2], "#3a2a1e", [0, 2.48, 0.3]),
      ...[-1.1, 1.1].map((x): ModelPart =>
        buildDrum([0.05, 0.08], 0.4, 6, "#d9a93c", [x, 2.46, 0.3]),
      ),
    ],
    glow: [
      buildBlock([0.66, 0.42, 0.04], "#ff8a2e", [0, 0.65, 0.61]),
      buildFlame([-0.15, 0.45, 0.6], 0.32),
      buildFlame([0.15, 0.45, 0.6], 0.4, "#ffd25a"),
    ],
    motion: "flicker",
  }),
  "welsh-dresser": (): HistoryPropParts => ({
    body: [
      buildBlock([2.2, 0.95, 0.6], "#7a4e2c", [0, 0.475, 0]),
      ...[-0.7, 0, 0.7].map((x): ModelPart =>
        buildBlock([0.62, 0.2, 0.04], "#96643a", [x, 0.78, 0.31]),
      ),
      buildBlock([2.3, 0.06, 0.66], "#8a5a34", [0, 0.98, 0]),
      buildBlock([2.1, 1.9, 0.08], "#6b4226", [0, 2.0, -0.24]),
      ...[-1.05, 1.05].map((x): ModelPart =>
        buildBlock([0.08, 1.9, 0.36], "#7a4e2c", [x, 2.0, -0.08]),
      ),
      ...[1.55, 2.2].map((y): ModelPart =>
        buildBlock([2.1, 0.05, 0.34], "#8a5a34", [0, y, -0.08]),
      ),
      buildBlock([2.3, 0.14, 0.44], "#7a4e2c", [0, 2.98, -0.08]),
      ...[1.75, 2.4].flatMap((y) =>
        [-0.7, -0.25, 0.2, 0.65].map((x, index): ModelPart =>
          buildDisc(
            0.17,
            0.03,
            8,
            index % 2 === 0 ? "#e4ecf6" : "#5b7fb8",
            [x + 0.02, y, -0.14],
            [Math.PI / 2 - 0.15, 0, 0],
          ),
        ),
      ),
      buildDrum([0.11, 0.14], 0.3, 8, "#e8e2d4", [-0.6, 1.16, 0.05]),
      buildDrum([0.11, 0.14], 0.24, 8, "#5b7fb8", [0.55, 1.13, 0.05]),
    ],
  }),
  "clothes-mangle": (): HistoryPropParts => ({
    body: [
      ...[-0.5, 0.5].flatMap((x): ModelPart[] => [
        buildBlock([0.08, 1.4, 0.5], "#2c3a34", [x, 0.7, 0]),
        buildBlock([0.12, 0.08, 0.9], "#2c3a34", [x, 0.04, 0]),
      ]),
      buildDrum([0.12, 0.12], 1.0, 8, "#d9c29a", [0, 1.0, 0], lyingAlongX),
      buildDrum([0.12, 0.12], 1.0, 8, "#d9c29a", [0, 1.26, 0], lyingAlongX),
      buildBlock([1.1, 0.1, 0.3], "#2c3a34", [0, 1.45, 0]),
      {
        geometry: new TorusGeometry(0.42, 0.04, 4, 12),
        colour: "#2c3a34",
        position: [0.62, 1.1, 0],
        rotation: [0, Math.PI / 2, 0],
      },
      buildBlock([0.04, 0.84, 0.06], "#2c3a34", [0.62, 1.1, 0]),
      buildBlock([0.04, 0.06, 0.84], "#2c3a34", [0.62, 1.1, 0]),
      buildBlock([0.06, 0.06, 0.3], "#8a5a34", [0.66, 1.45, 0.15]),
      buildBlock([1.0, 0.05, 0.42], "#b5926a", [0, 0.82, 0.35]),
    ],
  }),
  "tin-bath-washboard": (): HistoryPropParts => ({
    body: [
      {
        geometry: new CylinderGeometry(0.5, 0.42, 0.42, 10),
        colour: "#a9b0b4",
        position: [0, 0.21, 0],
        scale: [1.6, 1, 1],
      },
      {
        geometry: new CylinderGeometry(0.46, 0.46, 0.02, 10),
        colour: "#7f878c",
        position: [0, 0.42, 0],
        scale: [1.6, 1, 1],
      },
      ...[-0.82, 0.82].map((x): ModelPart => ({
        geometry: new TorusGeometry(0.1, 0.025, 4, 6),
        colour: "#8a9196",
        position: [x, 0.34, 0],
        rotation: [0, Math.PI / 2, 0],
      })),
      buildBlock([0.5, 0.9, 0.06], "#9a6a40", [1.3, 0.44, 0.1], [0, 0, 0.2]),
      buildBlock([0.4, 0.5, 0.08], "#c4cacc", [1.33, 0.5, 0.1], [0, 0, 0.2]),
    ],
  }),
  "larder-cupboard": (): HistoryPropParts => ({
    body: [
      buildBlock([1.3, 2.4, 0.6], "#6f8a5a", [0, 1.2, 0]),
      ...[-0.31, 0.31].flatMap((x): ModelPart[] => [
        buildBlock([0.58, 1.3, 0.04], "#7f9a68", [x, 0.75, 0.31]),
        buildBlock([0.48, 0.5, 0.04], "#a4aaa2", [x, 1.85, 0.31]),
      ]),
      buildBlock([1.45, 0.12, 0.7], "#5f7a4a", [0, 2.46, 0]),
      ...["#c8342c", "#e3b84c", "#f2efe6"].map((colour, index): ModelPart =>
        buildDrum([0.12, 0.12], 0.3, 6, colour, [
          -0.38 + index * 0.38,
          2.67,
          0,
        ]),
      ),
    ],
  }),
  "checked-curtain-window": (): HistoryPropParts => ({
    body: [
      buildBlock([1.8, 2.2, 0.12], "#efe8d8", [0, 3.2, 0]),
      buildBlock([0.06, 2.1, 0.05], "#efe8d8", [0, 3.2, 0.1]),
      buildBlock([1.7, 0.06, 0.05], "#efe8d8", [0, 3.2, 0.1]),
      buildBlock([2.4, 0.08, 0.3], "#d8cfbc", [0, 2.06, 0.15]),
      buildBlock([3.0, 0.06, 0.06], "#6b4528", [0, 4.4, 0.18]),
      ...[-1.05, 1.05].flatMap((x): ModelPart[] => [
        buildBlock([0.55, 2.3, 0.06], "#c23a3a", [x, 3.25, 0.16]),
        buildBlock([0.08, 2.3, 0.03], "#f6efe4", [x, 3.25, 0.2]),
        ...[2.6, 3.25, 3.9].map((y): ModelPart =>
          buildBlock([0.57, 0.08, 0.03], "#f6efe4", [x, y, 0.2]),
        ),
      ]),
      buildDrum([0.14, 0.1], 0.22, 6, "#b55f31", [0.4, 2.21, 0.15]),
      buildPebble(0.16, "#d9443a", [0.4, 2.42, 0.15]),
    ],
    glow: [
      ...[-0.4, 0.4].flatMap((x) =>
        [2.7, 3.7].map((y): ModelPart =>
          buildBlock([0.75, 0.95, 0.04], "#fff3cc", [x, y, 0.07]),
        ),
      ),
    ],
  }),
  "scrubbed-kitchen-table": (): HistoryPropParts => ({
    body: [
      buildBlock([2.0, 0.1, 1.0], "#d8c3a0", [0, 0.85, 0]),
      ...[-0.9, 0.9].flatMap((x) =>
        [-0.4, 0.4].map((z): ModelPart =>
          buildBlock([0.1, 0.8, 0.1], "#a8885e", [x, 0.4, z]),
        ),
      ),
      buildDrum([0.12, 0.15], 0.35, 8, "#5b7fb8", [0.5, 1.07, 0]),
      buildDrum([0.25, 0.15], 0.15, 8, "#efe2c8", [-0.4, 0.97, 0.1]),
      buildPebble(0.18, "#b9824a", [0, 1.0, -0.2], [1.4, 0.8, 1]),
    ],
  }),
  "victorian-double-desk": (): HistoryPropParts => ({
    body: [
      ...[-0.76, 0.76].map((x): ModelPart =>
        buildBlock([0.06, 0.95, 1.0], "#2b2f2c", [x, 0.475, 0.1]),
      ),
      buildBlock([1.6, 0.06, 0.5], "#8a5a34", [0, 0.92, -0.15], [0.18, 0, 0]),
      buildBlock([1.6, 0.45, 0.04], "#7a4e2c", [0, 0.68, -0.4]),
      buildBlock([1.5, 0.04, 0.4], "#7a4e2c", [0, 0.65, -0.15]),
      buildBlock([1.6, 0.06, 0.3], "#8a5a34", [0, 0.48, 0.55]),
      buildBlock([1.6, 0.25, 0.04], "#7a4e2c", [0, 0.75, 0.72]),
      ...[-0.4, 0.4].flatMap((x): ModelPart[] => [
        buildBlock(
          [0.36, 0.02, 0.26],
          "#b58a5a",
          [x, 0.96, -0.12],
          [0.18, 0, 0],
        ),
        buildBlock(
          [0.3, 0.025, 0.2],
          "#3a4048",
          [x, 0.97, -0.12],
          [0.18, 0, 0],
        ),
      ]),
      buildDrum([0.04, 0.04], 0.05, 6, "#f2efe6", [0, 0.98, -0.33]),
    ],
  }),
  "blackboard-easel": (): HistoryPropParts => ({
    body: [
      ...[-0.65, 0.65].map((x): ModelPart =>
        buildBlock([0.07, 2.6, 0.07], "#8a5a34", [x, 1.3, 0], [-0.12, 0, 0]),
      ),
      buildBlock([0.07, 2.6, 0.07], "#8a5a34", [0, 1.25, -0.45], [0.35, 0, 0]),
      buildBlock([1.7, 1.2, 0.04], "#8a5a34", [0, 1.75, 0.03], [-0.12, 0, 0]),
      buildBlock([1.6, 1.1, 0.05], "#24302a", [0, 1.75, 0.06], [-0.12, 0, 0]),
      buildBlock([1.6, 0.06, 0.14], "#8a5a34", [0, 1.18, 0.15], [-0.12, 0, 0]),
      ...chalkLines.map(([x, y, length]): ModelPart =>
        buildBlock(
          [length, 0.05, 0.02],
          "#f2efe6",
          [x, y, 0.1 - (y - 1.75) * 0.12],
          [-0.12, 0, 0],
        ),
      ),
    ],
  }),
  "classroom-globe": (): HistoryPropParts => ({
    body: [
      buildDrum([0.3, 0.35], 0.08, 8, "#6b4528", [0, 0.04, 0]),
      buildDrum([0.04, 0.04], 1.0, 5, "#6b4528", [0, 0.55, 0]),
      {
        geometry: new SphereGeometry(0.45, 10, 8),
        colour: "#3f7fc0",
        position: [0, 1.5, 0],
      },
      buildPebble(0.2, "#5f9a4a", [0.2, 1.62, 0.32], [1, 1, 0.5]),
      buildPebble(0.18, "#e08a8a", [-0.25, 1.4, 0.33], [1, 1.2, 0.5]),
      buildPebble(0.16, "#5f9a4a", [0.12, 1.28, 0.38], [1, 1, 0.5]),
      {
        geometry: new TorusGeometry(0.52, 0.025, 4, 12, Math.PI),
        colour: "#d9a93c",
        position: [0, 1.5, 0],
        rotation: [0, 0, -Math.PI / 2 + 0.4],
      },
    ],
  }),
  "teacher-high-desk": (): HistoryPropParts => ({
    body: [
      buildBlock([2.6, 0.25, 1.6], "#7a5634", [0, 0.125, 0]),
      ...[-0.6, 0.6].flatMap((x) =>
        [-0.3, 0.3].map((z): ModelPart =>
          buildBlock([0.08, 1.25, 0.08], "#5a3a22", [x, 0.875, z]),
        ),
      ),
      buildBlock([1.4, 0.08, 0.75], "#8a5a34", [0, 1.55, 0], [-0.15, 0, 0]),
      buildBlock([1.4, 0.7, 0.04], "#7a4e2c", [0, 1.15, 0.36]),
      buildCone(0.12, 0.2, 8, "#d9a93c", [0.45, 1.72, 0]),
      buildDrum([0.025, 0.025], 0.15, 5, "#3a2a1e", [0.45, 1.88, 0]),
      ...["#7b1e2b", "#2f4f7a", "#2f5a3a"].map((colour, index): ModelPart =>
        buildBlock(
          [0.4, 0.08, 0.3],
          colour,
          [-0.4, 1.63 + index * 0.08, 0],
          [-0.15, index * 0.2, 0],
        ),
      ),
      buildDrum([0.22, 0.22], 0.06, 8, "#6b4528", [0, 1.2, -0.75]),
      ...[-0.15, 0.15].map((x): ModelPart =>
        buildBlock([0.05, 0.95, 0.05], "#5a3a22", [x, 0.7, -0.75]),
      ),
    ],
  }),
  "school-wall-clock": (): HistoryPropParts => ({
    body: [
      buildBlock([0.9, 1.6, 0.18], "#6b4226", [0, 3.6, 0]),
      buildDisc(0.55, 0.16, 12, "#6b4226", [0, 4.6, 0.02]),
      buildDisc(0.46, 0.04, 12, "#f6f1e4", [0, 4.6, 0.11]),
      buildBlock(
        [0.05, 0.25, 0.02],
        "#1e1e22",
        [0.05, 4.7, 0.14],
        [0, 0, -0.5],
      ),
      buildBlock(
        [0.04, 0.38, 0.02],
        "#1e1e22",
        [-0.08, 4.72, 0.15],
        [0, 0, 0.45],
      ),
      buildBlock([0.5, 0.9, 0.02], "#3a2a1e", [0, 3.5, 0.1]),
      buildBlock([0.03, 0.6, 0.02], "#d9a93c", [0, 3.6, 0.12]),
      buildDisc(0.1, 0.03, 8, "#d9a93c", [0, 3.28, 0.12]),
    ],
  }),
  "tall-school-window": (): HistoryPropParts =>
    buildArchedWindow("#e8e0cc", "#f4f6e8", "#e8e0cc"),
  "tortoise-school-stove": (): HistoryPropParts => ({
    body: [
      buildDrum([0.35, 0.45], 0.9, 8, "#26262a", [0, 0.7, 0]),
      ...[0, 1, 2].map((leg): ModelPart => {
        const angle = (leg * Math.PI * 2) / 3;
        return buildBlock([0.08, 0.3, 0.08], "#26262a", [
          Math.sin(angle) * 0.35,
          0.15,
          Math.cos(angle) * 0.35,
        ]);
      }),
      buildDrum([0.4, 0.35], 0.12, 8, "#3a3a40", [0, 1.21, 0]),
      buildDrum([0.08, 0.08], 4.0, 6, "#2a2a2e", [0, 3.25, 0]),
    ],
    glow: [buildBlock([0.3, 0.22, 0.04], "#ff8a2e", [0, 0.62, 0.41])],
    motion: "flicker",
  }),
  "victorian-pier": (): HistoryPropParts => ({
    body: [
      ...[0, 1, 2, 3, 4, 5, 6, 7, 8].flatMap((post) =>
        [-0.6, 0.6].map((z): ModelPart =>
          buildBlock([0.14, 1.4, 0.14], "#4a3a2e", [0.6 + post * 1.25, 0.7, z]),
        ),
      ),
      buildBlock([11.2, 0.16, 1.5], "#b8935e", [5.6, 1.45, 0]),
      ...[-0.72, 0.72].flatMap((z): ModelPart[] => [
        buildBlock([9.0, 0.06, 0.06], "#f4efe2", [4.5, 1.85, z]),
        buildBlock([9.0, 0.06, 0.06], "#f4efe2", [4.5, 1.65, z]),
      ]),
      buildBlock([2.4, 1.3, 2.0], "#f3ead8", [10, 2.18, 0]),
      buildBlock([2.42, 0.3, 2.02], "#4a8fb8", [10, 2.3, 0]),
      buildDome(1.0, 8, 4, "#4aa0a8", [10, 2.83, 0], [1.1, 0.9, 1.0]),
      buildCone(0.12, 0.5, 6, "#e3b84c", [10, 3.95, 0]),
      buildBlock([0.4, 0.25, 0.02], "#d9443a", [10.2, 4.1, 0]),
    ],
  }),
  "beach-hut-pair": (): HistoryPropParts => ({
    body: [
      ...[
        { x: -0.75, stripe: "#d9443a" },
        { x: 0.75, stripe: "#3f7fc8" },
      ].flatMap(({ x, stripe }): ModelPart[] => [
        buildBlock([1.2, 0.15, 1.2], "#8a6a48", [x, 0.075, 0]),
        buildBlock([1.1, 1.3, 1.1], "#f6f3ea", [x, 0.8, 0]),
        ...[-0.36, 0, 0.36].map((offset): ModelPart =>
          buildBlock([0.18, 1.3, 0.03], stripe, [x + offset, 0.8, 0.56]),
        ),
        {
          geometry: buildGableRoof(1.3, 0.6, 1.3),
          colour: stripe,
          position: [x, 1.45, 0],
          rotation: [0, Math.PI / 2, 0],
        },
      ]),
    ],
  }),
  "striped-deckchair": (): HistoryPropParts => ({
    body: [
      ...["#e0453a", "#f4efe2", "#3a7fc8"].map((colour, index): ModelPart =>
        buildBlock(
          [0.2, 0.04, 1.06],
          colour,
          [-0.2 + index * 0.2, 0.65, 0],
          [0.72, 0, 0],
        ),
      ),
      ...[-0.32, 0.32].flatMap((x): ModelPart[] => [
        buildBlock([0.05, 0.05, 1.25], "#b8935e", [x, 0.65, 0], [0.72, 0, 0]),
        buildBlock([0.05, 0.5, 0.05], "#b8935e", [x, 0.25, 0.35]),
        buildBlock(
          [0.05, 0.9, 0.05],
          "#b8935e",
          [x, 0.45, -0.25],
          [-0.35, 0, 0],
        ),
      ]),
    ],
  }),
  "bathing-machine": (): HistoryPropParts => ({
    body: [
      ...[-0.55, 0.55].flatMap((x) =>
        [-0.62, 0.62].map((z): ModelPart =>
          buildWheel(0.32, 0.08, 8, "#5a3a22", [x, 0.32, z]),
        ),
      ),
      buildBlock([1.4, 0.1, 1.1], "#5a3a22", [0, 0.58, 0]),
      buildBlock([1.5, 1.5, 1.1], "#f4efe2", [0, 1.38, 0]),
      ...[-0.5, 0, 0.5].map((x): ModelPart =>
        buildBlock([0.22, 1.5, 0.03], "#2f7fa8", [x, 1.38, 0.56]),
      ),
      buildBlock([0.45, 0.9, 0.04], "#6b4528", [0, 1.1, 0.58]),
      {
        geometry: buildGableRoof(1.2, 0.5, 1.6),
        colour: "#2f7fa8",
        position: [0, 2.13, 0],
      },
      buildBlock([0.6, 0.1, 0.3], "#8a6a48", [0, 0.4, 0.75]),
    ],
  }),
  "punch-and-judy-booth": (): HistoryPropParts => ({
    body: [
      buildBlock([1.3, 2.6, 0.8], "#f4efe2", [0, 1.3, 0]),
      ...[-0.44, 0, 0.44].map((x): ModelPart =>
        buildBlock([0.2, 1.8, 0.03], "#d9443a", [x, 0.9, 0.41]),
      ),
      buildBlock([1.05, 0.7, 0.02], "#e3b84c", [0, 2.15, 0.41]),
      buildBlock([0.95, 0.6, 0.03], "#2a1f2e", [0, 2.15, 0.42]),
      buildBlock([1.1, 0.08, 0.2], "#d9443a", [0, 1.85, 0.45]),
      {
        geometry: new ConeGeometry(0.85, 0.55, 4),
        colour: "#d9443a",
        position: [0, 2.87, 0],
        rotation: [0, Math.PI / 4, 0],
        scale: [1, 1, 0.65],
      },
      buildPebble(0.12, "#f0c09a", [-0.18, 2.06, 0.46]),
      buildCone(0.08, 0.22, 5, "#d9443a", [-0.2, 2.25, 0.46], [0, 0, 0.4]),
      buildPebble(0.11, "#f0c09a", [0.2, 2.04, 0.46]),
      buildBlock([0.24, 0.08, 0.06], "#f4efe2", [0.2, 2.16, 0.46]),
    ],
  }),
  "seaside-bunting": (): HistoryPropParts => ({
    body: [
      ...[-3, 3].map((x): ModelPart =>
        buildDrum([0.04, 0.04], 2.7, 5, "#f4efe2", [x, 1.35, 0]),
      ),
      buildBlock([3.02, 0.02, 0.02], "#f4efe2", [-1.5, 2.46, 0], [0, 0, -0.06]),
      buildBlock([3.02, 0.02, 0.02], "#f4efe2", [1.5, 2.46, 0], [0, 0, 0.06]),
      ...[-2.6, -1.95, -1.3, -0.65, 0, 0.65, 1.3, 1.95, 2.6].map(
        (x, index): ModelPart => ({
          geometry: new ConeGeometry(0.16, 0.32, 3),
          colour:
            ["#d9443a", "#f2c84a", "#3f7fc8", "#f4efe2", "#5f9a4a"][
              index % 5
            ] ?? "#d9443a",
          position: [x, 2.2 + Math.abs(x) * 0.06, 0],
          rotation: [0, 0, Math.PI],
          scale: [1, 1, 0.3],
        }),
      ),
    ],
    motion: "sway",
  }),
  "flying-seagull": (): HistoryPropParts => ({
    body: [
      buildPebble(0.18, "#f6f5f0", [0, 0, 0], [1.8, 0.8, 0.8]),
      buildPebble(0.1, "#f6f5f0", [0.32, 0.08, 0]),
      buildCone(
        0.03,
        0.12,
        4,
        "#f2b53a",
        [0.45, 0.07, 0],
        [0, 0, -Math.PI / 2],
      ),
      ...[-1, 1].flatMap((side): ModelPart[] => [
        buildBlock(
          [0.3, 0.03, 0.6],
          "#c9ced6",
          [0, 0.12, side * 0.32],
          [side * 0.45, 0, 0],
        ),
        buildBlock(
          [0.24, 0.03, 0.3],
          "#3a3a40",
          [0, 0.3, side * 0.72],
          [side * -0.3, 0, 0],
        ),
      ]),
    ],
    motion: "bob",
  }),
  "country-lane": (): HistoryPropParts => ({
    body: [
      buildBlock([30, 0.03, 2.4], "#c7a77a", [0, 0.015, 0]),
      buildBlock([30, 0.035, 0.18], "#a88a60", [0, 0.02, -0.45]),
      buildBlock([30, 0.035, 0.18], "#a88a60", [0, 0.02, 0.45]),
    ],
  }),
  "hawthorn-hedge": (): HistoryPropParts => ({
    body: [-1.8, -0.6, 0.6, 1.8].map((x, index): ModelPart => ({
      geometry: new SphereGeometry(0.7, 7, 5),
      colour: index % 2 === 0 ? "#4f7f34" : "#5a8a3a",
      position: [x, 0.55, 0],
      scale: [1, 0.85, 0.8],
    })),
  }),
  "english-oak-tree": (): HistoryPropParts => ({
    body: [
      buildDrum([0.22, 0.32], 2.0, 7, "#5a4030", [0, 1.0, 0]),
      ...[
        { at: [0, 2.8, 0], radius: 1.4, colour: "#4d7a2e" },
        { at: [-0.9, 2.4, 0.2], radius: 1.0, colour: "#5d8c36" },
        { at: [0.9, 2.5, -0.1], radius: 1.1, colour: "#457030" },
        { at: [0.2, 3.5, 0.1], radius: 1.0, colour: "#6a9a3e" },
      ].map(({ at, radius, colour }): ModelPart => ({
        geometry: new SphereGeometry(radius, 7, 5),
        colour,
        position: [at[0] ?? 0, at[1] ?? 0, at[2] ?? 0],
      })),
    ],
    motion: "sway",
  }),
  "horse-and-cart": (): HistoryPropParts => ({
    body: [
      ...buildHorse("#7a4a2a", "#2a1e18", [1.7, 0, 0]),
      buildBlock([1.8, 0.12, 1.1], "#8a5a35", [-0.3, 0.75, 0]),
      ...[-0.55, 0.55].map((z): ModelPart =>
        buildBlock([1.8, 0.3, 0.06], "#7a4e2c", [-0.3, 0.95, z]),
      ),
      {
        geometry: new BoxGeometry(1.7, 0.6, 1.0, 2, 2, 2),
        colour: "#e0c060",
        position: [-0.3, 1.15, 0],
        roughen: 0.12,
      },
      ...[-0.6, 0.6].map((z): ModelPart =>
        buildWheel(0.45, 0.08, 10, "#5a3a22", [-0.3, 0.45, z]),
      ),
      ...[-0.3, 0.3].map((z): ModelPart =>
        buildBlock([1.6, 0.06, 0.06], "#5a3a22", [1.0, 0.9, z]),
      ),
    ],
  }),
  "steam-train": (): HistoryPropParts => ({
    body: [
      buildBlock([3.2, 0.15, 1.0], "#26262a", [0.1, 0.6, 0]),
      buildDrum([0.45, 0.45], 2.0, 10, "#2f6b3a", [0.45, 1.15, 0], lyingAlongX),
      buildDrum(
        [0.47, 0.47],
        0.45,
        10,
        "#26262a",
        [1.55, 1.15, 0],
        lyingAlongX,
      ),
      buildDrum([0.47, 0.47], 0.08, 10, "#d9a93c", [0.3, 1.15, 0], lyingAlongX),
      buildDrum([0.15, 0.12], 0.5, 8, "#26262a", [1.6, 1.8, 0]),
      buildBall(0.18, "#d9a93c", [0.5, 1.6, 0]),
      buildBlock([0.9, 1.1, 1.05], "#2f6b3a", [-0.95, 1.25, 0]),
      buildBlock([1.1, 0.08, 1.2], "#26262a", [-0.95, 1.85, 0]),
      buildBlock([0.5, 0.35, 1.07], "#2a3440", [-0.95, 1.45, 0]),
      buildBlock([0.08, 0.3, 1.0], "#b8262e", [1.75, 0.55, 0]),
      ...[-0.6, 0.15, 0.9].flatMap((x) =>
        [-0.5, 0.5].map((z): ModelPart =>
          buildWheel(0.3, 0.08, 8, "#b8262e", [x, 0.3, z]),
        ),
      ),
      buildBlock([1.4, 0.9, 1.0], "#2f6b3a", [-2.3, 0.95, 0]),
      buildBlock([1.3, 0.12, 0.9], "#1a1a1e", [-2.3, 1.44, 0]),
      ...[-2.75, -1.85].flatMap((x) =>
        [-0.5, 0.5].map((z): ModelPart =>
          buildWheel(0.24, 0.08, 6, "#26262a", [x, 0.26, z]),
        ),
      ),
      ...[-4.7, -7.9].flatMap((x): ModelPart[] => [
        buildBlock([3.0, 1.2, 1.0], "#7a2430", [x, 1.25, 0]),
        buildBlock([2.9, 0.35, 1.02], "#efe2c8", [x, 1.45, 0]),
        buildBlock([3.1, 0.12, 1.1], "#4a4e54", [x, 1.91, 0]),
        ...[x - 1.0, x + 1.0].flatMap((wheelX) =>
          [-0.5, 0.5].map((z): ModelPart =>
            buildWheel(0.24, 0.08, 6, "#26262a", [wheelX, 0.4, z]),
          ),
        ),
      ]),
      buildPebble(0.3, "#f4f4f2", [1.7, 2.35, 0]),
      buildPebble(0.42, "#e8e8e6", [1.2, 2.8, 0.05]),
      buildPebble(0.55, "#dcdcda", [0.4, 3.2, 0]),
    ],
  }),
  "stone-viaduct": (): HistoryPropParts => ({
    body: [
      ...[-8, -4, 0, 4, 8].map((x): ModelPart =>
        buildBlock([0.9, 3.0, 1.4], "#b59a7a", [x, 1.5, 0]),
      ),
      buildBlock([16.4, 0.4, 1.5], "#a88d6e", [0, 3.0, 0]),
      buildBlock([16.4, 0.7, 1.2], "#b59a7a", [0, 2.45, 0]),
      ...[-0.7, 0.7].map((z): ModelPart =>
        buildBlock([16.4, 0.3, 0.12], "#9a8064", [0, 3.35, z]),
      ),
      ...[-6, -2, 2, 6].map((x): ModelPart => ({
        geometry: new TorusGeometry(1.55, 0.22, 4, 8, Math.PI),
        colour: "#a88d6e",
        position: [x, 1.3, 0],
        scale: [1, 1, 3.5],
      })),
    ],
  }),
  "vintage-motor-car": (): HistoryPropParts => ({
    body: [
      buildBlock([2.4, 0.12, 1.0], "#1e1e22", [0, 0.55, 0]),
      buildBlock([1.4, 0.5, 1.0], "#a8322c", [-0.3, 0.85, 0]),
      buildBlock([0.8, 0.4, 0.7], "#a8322c", [0.85, 0.8, 0]),
      buildBlock([0.06, 0.5, 0.6], "#d9a93c", [1.27, 0.82, 0]),
      buildBlock([1.2, 0.06, 1.05], "#1e1e22", [-0.3, 1.75, 0]),
      ...[-0.85, 0.25].flatMap((x) =>
        [-0.48, 0.48].map((z): ModelPart =>
          buildBlock([0.05, 0.65, 0.05], "#1e1e22", [x, 1.42, z]),
        ),
      ),
      buildBlock([0.04, 0.5, 0.9], "#cfe3ec", [0.28, 1.3, 0]),
      buildBlock([0.15, 0.5, 0.9], "#3a2a1e", [-0.7, 1.25, 0]),
      ...[-0.8, 0.8].flatMap((x) =>
        [-0.52, 0.52].map((z): ModelPart =>
          buildWheel(0.33, 0.12, 10, "#1e1e22", [x, 0.33, z]),
        ),
      ),
      ...[-0.3, 0.3].map((z): ModelPart =>
        buildDrum(
          [0.08, 0.08],
          0.12,
          6,
          "#d9a93c",
          [1.25, 1.05, z],
          lyingAlongX,
        ),
      ),
    ],
  }),
  "telegraph-pole": (): HistoryPropParts => ({
    body: [
      buildDrum([0.08, 0.11], 4.6, 6, "#5a4636", [0, 2.3, 0]),
      ...[4.3, 4.0].flatMap((y): ModelPart[] => [
        buildBlock([1.1, 0.08, 0.1], "#5a4636", [0, y, 0]),
        buildBlock([0.06, 0.1, 0.06], "#f4f4f2", [-0.45, y + 0.09, 0]),
        buildBlock([0.06, 0.1, 0.06], "#f4f4f2", [0.45, y + 0.09, 0]),
      ]),
      buildBlock([6.0, 0.015, 0.015], "#2a2a2e", [3, 4.38, 0]),
      buildBlock([6.0, 0.015, 0.015], "#2a2a2e", [3, 4.08, 0]),
    ],
  }),
  "wooden-signpost": (): HistoryPropParts => ({
    body: [
      buildBlock([0.12, 2.2, 0.12], "#efe8d8", [0, 1.1, 0]),
      buildBall(0.1, "#c8342c", [0, 2.25, 0]),
      ...[
        { y: 1.95, x: 0.42, turn: 0 },
        { y: 1.72, x: -0.4, turn: 0.4 },
        { y: 1.5, x: 0.36, turn: -0.5 },
      ].flatMap(({ y, x, turn }): ModelPart[] => [
        buildBlock([0.9, 0.16, 0.04], "#f4efe2", [x, y, 0], [0, turn, 0]),
        buildBlock([0.5, 0.04, 0.05], "#2a2a2e", [x, y, 0], [0, turn, 0]),
      ]),
    ],
  }),
  "lamplit-terrace": (): HistoryPropParts => ({
    body: buildTerraceRow("#7a4436", "#33374a"),
    glow: buildTerraceWindows("#ffcf7a"),
    motion: "flicker",
  }),
  "victorian-brick-terrace": (): HistoryPropParts => ({
    body: [
      ...buildTerraceRow("#a3523c", "#4a4f5c"),
      ...buildTerraceWindows("#3b4a5e"),
    ],
  }),
  "victorian-gas-lamp": (): HistoryPropParts => ({
    body: [
      buildBlock([0.36, 0.3, 0.36], "#24352c", [0, 0.15, 0]),
      buildDrum([0.06, 0.1], 3.0, 8, "#24352c", [0, 1.8, 0]),
      buildBlock([0.6, 0.05, 0.05], "#24352c", [0, 2.95, 0]),
      buildCone(
        0.22,
        0.2,
        4,
        "#24352c",
        [0, 3.22, 0],
        [Math.PI, Math.PI / 4, 0],
      ),
      buildCone(0.3, 0.3, 4, "#24352c", [0, 3.92, 0], [0, Math.PI / 4, 0]),
      buildBall(0.06, "#24352c", [0, 4.1, 0]),
    ],
    glow: [
      buildDrum(
        [0.2, 0.14],
        0.45,
        4,
        "#ffd98a",
        [0, 3.55, 0],
        [0, Math.PI / 4, 0],
      ),
    ],
    motion: "flicker",
  }),
  "lamplighter-ladder": (): HistoryPropParts => ({
    body: [
      ...[-0.2, 0.2].map((x): ModelPart =>
        buildBlock(
          [0.06, 2.8, 0.06],
          "#8a6a48",
          [x, 1.36, -0.35],
          [-0.25, 0, 0],
        ),
      ),
      ...[0.35, 0.75, 1.15, 1.55, 1.95, 2.35].map((along): ModelPart =>
        buildBlock(
          [0.4, 0.04, 0.04],
          "#8a6a48",
          [0, along * 0.969, -along * 0.247],
          [-0.25, 0, 0],
        ),
      ),
      buildDrum(
        [0.02, 0.02],
        2.8,
        4,
        "#5a4030",
        [0.55, 1.38, -0.2],
        [-0.15, 0, 0],
      ),
      buildBlock([0.04, 0.16, 0.04], "#d9a93c", [0.55, 2.75, -0.41]),
    ],
  }),
  "pillar-box": (): HistoryPropParts => ({
    body: [
      buildBlock([0.6, 0.12, 0.6], "#2a2a2e", [0, 0.06, 0]),
      buildDrum([0.27, 0.27], 1.1, 10, "#c8241f", [0, 0.67, 0]),
      buildDrum([0.3, 0.3], 0.06, 10, "#c8241f", [0, 1.22, 0]),
      buildDome(0.29, 10, 3, "#c8241f", [0, 1.24, 0], [1, 0.6, 1]),
      buildBlock([0.22, 0.04, 0.04], "#1a1a1e", [0, 1.05, 0.27]),
      buildBlock([0.2, 0.14, 0.03], "#f2efe6", [0, 0.8, 0.27]),
    ],
  }),
  "longstone-lighthouse": (): HistoryPropParts => ({
    body: [
      ...[0, 1, 2, 3].map((band): ModelPart => {
        const bottom = band * 1.4;
        return buildDrum(
          [1 - (0.3 * (bottom + 1.4)) / 5.6, 1 - (0.3 * bottom) / 5.6],
          1.4,
          10,
          band % 2 === 0 ? "#c8322c" : "#f2ece0",
          [0, bottom + 0.7, 0],
        );
      }),
      buildBlock([0.4, 0.7, 0.06], "#2a2a30", [0, 0.4, 0.98]),
      buildBlock([0.2, 0.3, 0.06], "#2a2a30", [0, 2.8, 0.88]),
      buildDrum([0.95, 0.95], 0.12, 10, "#2a2a30", [0, 5.66, 0]),
      {
        geometry: new CylinderGeometry(0.9, 0.9, 0.3, 10, 1, true),
        colour: "#2a2a30",
        position: [0, 5.87, 0],
      },
      buildCone(0.72, 0.6, 10, "#8a2420", [0, 6.8, 0]),
      buildBlock([0.12, 0.25, 0.12], "#2a2a30", [0, 7.2, 0]),
    ],
    glow: [
      buildDrum([0.55, 0.55], 0.8, 8, "#ffe9a0", [0, 6.1, 0]),
      {
        geometry: new CylinderGeometry(1.1, 0.2, 7, 6, 1, true),
        colour: "#fff2b8",
        position: [-4.0, 6.3, 0],
        rotation: [0, 0, -Math.PI / 2 - 0.05],
      },
    ],
    motion: "flicker",
  }),
  "sea-rock-islet": (): HistoryPropParts => ({
    body: [
      {
        geometry: new IcosahedronGeometry(1, 1),
        colour: "#4a4642",
        position: [0, 0.2, 0],
        scale: [1.6, 0.7, 1.2],
        roughen: 0.25,
      },
      buildPebble(0.7, "#56514a", [1.2, 0.15, 0.4], [1, 0.9, 1]),
      buildPebble(0.5, "#5e5850", [-1.1, 0.1, 0.5]),
      buildPebble(0.4, "#3d5a3a", [0.4, 0.05, 0.9], [1.4, 0.4, 1]),
    ],
  }),
  "grace-darling-coble": (): HistoryPropParts => ({
    body: [
      {
        geometry: new SphereGeometry(
          1,
          10,
          4,
          0,
          Math.PI * 2,
          Math.PI / 2,
          Math.PI / 2,
        ),
        colour: "#efe8dc",
        position: [0, 0.35, 0],
        scale: [1.3, 0.4, 0.5],
      },
      {
        geometry: new CylinderGeometry(1, 1, 0.06, 10, 1, true),
        colour: "#2f6b4a",
        position: [0, 0.36, 0],
        scale: [1.32, 1, 0.52],
      },
      buildBlock([0.08, 0.5, 0.08], "#2f6b4a", [1.25, 0.45, 0], [0, 0, -0.4]),
      ...[-0.4, 0.4].map((x): ModelPart =>
        buildBlock([0.1, 0.05, 0.95], "#8a6a48", [x, 0.33, 0]),
      ),
      ...[-1, 1].map((side): ModelPart =>
        buildBlock(
          [2.2, 0.04, 0.06],
          "#b98a55",
          [0.1, 0.42, side * 0.75],
          [0, side * 0.6, side * 0.12],
        ),
      ),
      buildCone(0.18, 0.55, 6, "#3a3a4e", [-0.4, 0.62, 0]),
      buildPebble(0.1, "#f0c09a", [-0.4, 0.96, 0]),
      buildCone(0.18, 0.55, 6, "#7a2a3a", [0.4, 0.62, 0]),
      buildPebble(0.1, "#f0c09a", [0.4, 0.96, 0]),
    ],
    motion: "bob",
  }),
  "wrecked-paddle-steamer": (): HistoryPropParts => ({
    body: [
      buildBlock([2.4, 0.9, 1.1], "#3a2e28", [1.2, 0.55, 0], [0, 0, 0.15]),
      buildBlock([2.42, 0.12, 1.12], "#f2ece0", [1.2, 1.0, 0], [0, 0, 0.15]),
      buildCone(
        0.62,
        0.9,
        4,
        "#3a2e28",
        [2.75, 0.9, 0],
        [Math.PI / 4, 0, -Math.PI / 2 + 0.15],
      ),
      buildBlock([1.8, 0.8, 1.1], "#3a2e28", [-1.4, 0.3, 0], [0.12, 0, -0.1]),
      buildBlock(
        [1.82, 0.12, 1.12],
        "#f2ece0",
        [-1.4, 0.68, 0],
        [0.12, 0, -0.1],
      ),
      buildDrum([0.18, 0.2], 1.2, 8, "#26262a", [0.4, 1.6, 0], [0, 0, 0.3]),
      buildBlock([0.08, 1.6, 0.08], "#5a4030", [1.6, 1.9, 0], [0, 0, 0.4]),
      buildBlock([0.08, 1.0, 0.08], "#5a4030", [-1.4, 1.2, 0], [0, 0, -0.5]),
      {
        geometry: new CylinderGeometry(
          0.6,
          0.6,
          0.15,
          8,
          1,
          false,
          Math.PI / 2,
          Math.PI,
        ),
        colour: "#6b4a3a",
        position: [0.1, 0.85, 0.6],
        rotation: flatOnFront,
      },
    ],
  }),
  "storm-wave-crest": (): HistoryPropParts => ({
    body: [
      buildPebble(0.6, "#4f7f88", [0, 0.05, 0], [2.6, 0.45, 0.9]),
      buildPebble(0.5, "#e4eef0", [0.2, 0.25, -0.05], [2.0, 0.3, 0.6]),
      buildPebble(0.25, "#f4f8f8", [-0.9, 0.3, 0.1]),
    ],
    motion: "bob",
  }),
  "iron-hospital-bed": (): HistoryPropParts => ({
    body: [
      ...[-0.42, 0.42].flatMap((x): ModelPart[] => [
        buildBlock([0.06, 1.2, 0.06], "#2f3a36", [x, 0.6, -1.0]),
        buildBlock([0.06, 0.85, 0.06], "#2f3a36", [x, 0.425, 1.0]),
        buildBlock([0.04, 0.06, 2.0], "#2f3a36", [x, 0.48, 0]),
      ]),
      buildBlock([0.9, 0.05, 0.05], "#2f3a36", [0, 1.18, -1.0]),
      buildBlock([0.9, 0.05, 0.05], "#2f3a36", [0, 0.8, -1.0]),
      ...[-0.2, 0, 0.2].map((x): ModelPart =>
        buildBlock([0.03, 0.38, 0.03], "#2f3a36", [x, 0.99, -1.0]),
      ),
      buildBlock([0.9, 0.05, 0.05], "#2f3a36", [0, 0.83, 1.0]),
      buildBlock([0.84, 0.18, 1.95], "#e8e2d4", [0, 0.62, 0]),
      buildBlock([0.88, 0.06, 1.4], "#f7f5ef", [0, 0.73, 0.25]),
      buildBlock([0.9, 0.07, 0.6], "#a8443a", [0, 0.75, 0.65]),
      buildBlock([0.6, 0.14, 0.36], "#fbfaf6", [0, 0.78, -0.75]),
    ],
  }),
  "ward-turkish-lamp": (): HistoryPropParts => ({
    body: [
      buildDrum([0.25, 0.28], 0.05, 8, "#5a3a22", [0, 0.03, 0]),
      buildDrum([0.05, 0.05], 0.7, 5, "#5a3a22", [0, 0.38, 0]),
      buildDrum([0.4, 0.4], 0.05, 8, "#6b4528", [0, 0.75, 0]),
      buildDrum([0.12, 0.14], 0.06, 8, "#c9a14a", [0, 0.81, 0]),
      buildDrum([0.135, 0.135], 0.02, 8, "#c9a14a", [0, 0.97, 0]),
      buildDrum([0.135, 0.135], 0.02, 8, "#c9a14a", [0, 1.13, 0]),
      buildDrum([0.14, 0.12], 0.06, 8, "#c9a14a", [0, 1.29, 0]),
      {
        geometry: new TorusGeometry(0.08, 0.015, 4, 8),
        colour: "#c9a14a",
        position: [0, 1.39, 0],
      },
      buildBlock([0.3, 0.05, 0.22], "#7b1e2b", [-0.22, 0.8, 0.1], [0, 0.4, 0]),
    ],
    glow: [buildDrum([0.13, 0.13], 0.42, 8, "#ffe2a0", [0, 1.05, 0])],
    motion: "flicker",
  }),
  "arched-ward-window": (): HistoryPropParts =>
    buildArchedWindow("#cbbfa8", "#c8d8ff", "#8f8472"),
  "ward-medicine-cabinet": (): HistoryPropParts => ({
    body: [
      buildBlock([1.4, 0.9, 0.5], "#6b4a2e", [0, 0.45, 0]),
      buildBlock([1.3, 1.3, 0.35], "#6b4a2e", [0, 1.6, -0.07]),
      ...[-0.31, 0.31].map((x): ModelPart =>
        buildBlock([0.55, 1.1, 0.02], "#c9dde0", [x, 1.6, 0.115]),
      ),
      buildBlock([1.45, 0.12, 0.45], "#5a3a22", [0, 2.31, -0.07]),
      ...["#5a3a1e", "#2f5fa8", "#3f7f4a", "#7a2a4a", "#d9e8e4"].map(
        (colour, index): ModelPart =>
          buildDrum([0.06, 0.07], 0.24, 6, colour, [
            -0.5 + index * 0.25,
            1.02,
            0.12,
          ]),
      ),
      buildDrum([0.14, 0.1], 0.14, 8, "#d8d0c0", [0.5, 0.97, -0.05]),
    ],
  }),
  "jug-and-basin-stand": (): HistoryPropParts => ({
    body: [
      buildBlock([0.9, 0.06, 0.5], "#6b4528", [0, 0.82, 0]),
      ...[-0.4, 0.4].flatMap((x) =>
        [-0.2, 0.2].map((z): ModelPart =>
          buildBlock([0.05, 0.8, 0.05], "#5a3a22", [x, 0.4, z]),
        ),
      ),
      buildBlock([0.85, 0.04, 0.45], "#6b4528", [0, 0.25, 0]),
      buildDrum([0.28, 0.16], 0.14, 10, "#f2efe6", [0, 0.92, 0]),
      buildDrum([0.12, 0.16], 0.4, 8, "#f2efe6", [0, 1.12, 0]),
      {
        geometry: new TorusGeometry(0.1, 0.02, 4, 6),
        colour: "#f2efe6",
        position: [0.17, 1.15, 0],
      },
      buildBlock([0.06, 0.4, 0.3], "#f7f5ef", [0.47, 0.65, 0]),
      buildDrum([0.1, 0.13], 0.3, 8, "#5b7fb8", [-0.2, 0.42, 0]),
    ],
  }),
  "ward-ceiling-arch": (): HistoryPropParts => ({
    body: [
      ...[-10.5, 10.5].flatMap((x): ModelPart[] => [
        buildBlock([0.8, 4.2, 0.8], "#cdbfa5", [x, 2.1, 0]),
        buildBlock([1.1, 0.3, 1.1], "#bfb197", [x, 4.35, 0]),
      ]),
      {
        geometry: new TorusGeometry(10.5, 0.5, 4, 12, Math.PI),
        colour: "#cdbfa5",
        position: [0, 4.4, 0],
        scale: [1, 0.45, 1],
      },
    ],
  }),
  "castle-curtain-wall": (): HistoryPropParts => ({
    body: [
      buildBlock([10, 3.4, 1.0], "#b9ab90", [0, 1.7, 0]),
      buildBlock([10.2, 0.5, 1.3], "#a39578", [0, 0.25, 0]),
      ...[0, 1, 2, 3, 4, 5, 6, 7].map((merlon): ModelPart =>
        buildBlock([0.6, 0.55, 0.35], "#b9ab90", [
          -4.5 + merlon * 1.15,
          3.67,
          0.32,
        ]),
      ),
      ...[-3, 0, 3].map((x): ModelPart =>
        buildBlock([0.12, 0.6, 0.04], "#3a342c", [x, 1.8, 0.51]),
      ),
      buildDrum([1.0, 1.1], 4.4, 10, "#c4b598", [5, 2.2, 0]),
      buildDrum([1.15, 1.15], 0.4, 10, "#b9ab90", [5, 4.6, 0]),
    ],
  }),
  "castle-keep": (): HistoryPropParts => ({
    body: [
      buildBlock([3.6, 7, 3.6], "#c4b598", [0, 3.5, 0]),
      ...[-1.7, 1.7].flatMap((x) =>
        [-1.7, 1.7].map((z): ModelPart =>
          buildBlock([0.9, 7.8, 0.9], "#cfc1a4", [x, 3.9, z]),
        ),
      ),
      buildBlock([3.7, 0.2, 3.7], "#a99c80", [0, 4.5, 0]),
      ...[-0.6, 0.6].map((offset): ModelPart =>
        buildBlock([0.5, 0.5, 0.3], "#c4b598", [offset, 7.25, 1.65]),
      ),
      ...[-0.6, 0.6].map((offset): ModelPart =>
        buildBlock([0.3, 0.5, 0.5], "#c4b598", [1.65, 7.25, offset]),
      ),
      ...[-0.6, 0.6].map((x): ModelPart =>
        buildBlock([0.22, 0.6, 0.06], "#3a342c", [x, 5.4, 1.81]),
      ),
      buildBlock([0.22, 0.6, 0.06], "#3a342c", [0, 3.2, 1.81]),
      buildBlock([0.9, 1.3, 0.06], "#5a3a22", [0, 1.6, 1.81]),
      buildBlock([1.2, 0.9, 1.2], "#b0a286", [0, 0.45, 2.3]),
    ],
  }),
  "castle-gatehouse": (): HistoryPropParts => ({
    body: [
      ...[-1.7, 1.7].flatMap((x): ModelPart[] => [
        buildDrum([1.1, 1.2], 5, 10, "#c4b598", [x, 2.5, 0]),
        buildDrum([1.25, 1.25], 0.4, 10, "#b9ab90", [x, 5.2, 0]),
      ]),
      buildBlock([2.4, 4.2, 2.0], "#bcae92", [0, 2.1, 0]),
      buildBlock([1.4, 2.2, 0.06], "#2a2420", [0, 1.1, 1.01]),
      buildArchTop(0.7, 0.06, "#2a2420", [0, 2.2, 1.01]),
      ...[-0.45, -0.15, 0.15, 0.45].map((x): ModelPart =>
        buildBlock([0.06, 1.4, 0.05], "#3a3632", [x, 2.1, 1.06]),
      ),
      ...[1.7, 2.3].map((y): ModelPart =>
        buildBlock([1.2, 0.06, 0.05], "#3a3632", [0, y, 1.06]),
      ),
      ...[-0.8, 0, 0.8].map((x): ModelPart =>
        buildBlock([0.45, 0.5, 0.3], "#bcae92", [x, 4.45, 0.85]),
      ),
    ],
  }),
  "castle-banner-pole": (): HistoryPropParts => ({
    body: [
      buildDrum([0.05, 0.06], 3.4, 5, "#5a4030", [0, 1.7, 0]),
      buildCone(0.08, 0.2, 4, "#e3b84c", [0, 3.5, 0]),
      buildBlock([0.9, 1.2, 0.03], "#b8262e", [0.48, 2.75, 0]),
      buildBlock(
        [0.35, 0.35, 0.035],
        "#e3b84c",
        [0.48, 2.8, 0.01],
        [0, 0, Math.PI / 4],
      ),
    ],
    motion: "sway",
  }),
  "courtyard-well": (): HistoryPropParts => ({
    body: [
      buildDrum([0.7, 0.75], 0.8, 10, "#a99c84", [0, 0.4, 0]),
      buildDrum([0.78, 0.78], 0.1, 10, "#988b72", [0, 0.85, 0]),
      ...[-0.65, 0.65].map((x): ModelPart =>
        buildBlock([0.12, 1.4, 0.12], "#6b4528", [x, 1.3, 0]),
      ),
      buildDrum([0.06, 0.06], 1.4, 6, "#7a5232", [0, 1.85, 0], lyingAlongX),
      {
        geometry: buildGableRoof(1.0, 0.5, 1.7),
        colour: "#7a4a33",
        position: [0, 2.0, 0],
      },
      buildBlock([0.02, 0.5, 0.02], "#c9a87a", [0, 1.55, 0]),
      buildDrum([0.14, 0.11], 0.2, 6, "#7a5232", [0, 1.22, 0]),
      buildBlock([0.06, 0.3, 0.06], "#6b4528", [0.75, 1.75, 0.1]),
    ],
  }),
  "hay-cart": (): HistoryPropParts => ({
    body: [
      buildBlock([2.0, 0.12, 1.2], "#8a5a35", [0, 0.8, 0]),
      ...[-0.6, 0.6].map((z): ModelPart =>
        buildBlock([2.0, 0.3, 0.06], "#7a4e2c", [0, 0.95, z]),
      ),
      ...[-0.68, 0.68].map((z): ModelPart =>
        buildWheel(0.55, 0.1, 10, "#5a3a22", [0, 0.55, z]),
      ),
      ...[-0.35, 0.35].map((z): ModelPart =>
        buildBlock([1.6, 0.07, 0.07], "#6b4528", [1.7, 0.55, z], [0, 0, 0.3]),
      ),
      {
        geometry: new BoxGeometry(1.9, 0.7, 1.15, 2, 2, 2),
        colour: "#e0c060",
        position: [0, 1.3, 0],
        roughen: 0.12,
      },
      buildPebble(0.6, "#e8cc6c", [0, 1.65, 0], [1.4, 0.5, 0.9], 1),
    ],
  }),
  "lunar-module-eagle": (): HistoryPropParts => ({
    body: [
      {
        geometry: new CylinderGeometry(1.05, 1.05, 0.9, 8),
        colour: "#d4a332",
        position: [0, 1.25, 0],
        rotation: [0, Math.PI / 8, 0],
        roughen: 0.06,
      },
      buildBlock([0.9, 0.5, 0.05], "#2a2a2e", [0, 1.25, 1.0]),
      buildCone(0.35, 0.35, 8, "#3a3a3e", [0, 0.7, 0], [Math.PI, 0, 0]),
      ...[0, 1, 2, 3].flatMap((leg): ModelPart[] => {
        const angle = Math.PI / 4 + (leg * Math.PI) / 2;
        return [
          buildDrum(
            [0.04, 0.04],
            1.17,
            5,
            "#b8b8b0",
            [Math.cos(angle) * 1.3, 0.55, Math.sin(angle) * 1.3],
            [0, -angle, 0.54],
          ),
          buildDrum([0.22, 0.22], 0.06, 8, "#c9c9c2", [
            Math.cos(angle) * 1.6,
            0.03,
            Math.sin(angle) * 1.6,
          ]),
        ];
      }),
      buildBlock([1.3, 0.9, 1.1], "#bfc2c4", [0, 2.15, 0]),
      buildBlock([0.9, 0.6, 0.3], "#a8abae", [0, 2.2, 0.62], [0.3, 0, 0]),
      ...[-0.22, 0.22].map((x): ModelPart =>
        buildBlock([0.2, 0.18, 0.03], "#1c1e24", [x, 2.32, 0.78], [0.3, 0, 0]),
      ),
      buildBlock([0.06, 0.6, 0.7], "#2a2a2e", [0.66, 2.15, 0]),
      buildDrum([0.25, 0.25], 0.2, 8, "#a8abae", [0, 2.7, 0]),
      buildBlock([0.04, 0.5, 0.04], "#c9c9c2", [0.5, 2.85, -0.3]),
      buildCone(
        0.25,
        0.12,
        8,
        "#e8e8e2",
        [0.5, 3.15, -0.3],
        [Math.PI + 0.4, 0, 0],
      ),
      ...[-0.75, 0.75].map((x): ModelPart =>
        buildBlock([0.16, 0.16, 0.16], "#8a8d90", [x, 2.4, 0.4]),
      ),
      buildBlock(
        [0.25, 1.0, 0.04],
        "#b8b8b0",
        [0.92, 0.6, 0.92],
        [0, -Math.PI / 4, 0],
      ),
    ],
  }),
  "apollo-flag": (): HistoryPropParts => ({
    body: [
      buildDrum([0.025, 0.025], 2.2, 5, "#d8d8d8", [0, 1.1, 0]),
      buildDrum([0.02, 0.02], 1.0, 5, "#d8d8d8", [0.5, 2.15, 0], lyingAlongX),
      buildBlock([1.0, 0.62, 0.02], "#f4f4f2", [0.5, 1.83, 0]),
      ...[0, 1, 2, 3].map((stripe): ModelPart =>
        buildBlock([1.0, 0.07, 0.025], "#c4282e", [
          0.5,
          2.1 - stripe * 0.16,
          0,
        ]),
      ),
      buildBlock([0.42, 0.34, 0.03], "#2a3f8a", [0.21, 1.97, 0]),
    ],
  }),
  "moon-boulder": (): HistoryPropParts => ({
    body: [
      {
        geometry: new IcosahedronGeometry(0.5, 1),
        colour: "#9e9a92",
        position: [0, 0.2, 0],
        scale: [1.2, 0.7, 1],
        roughen: 0.3,
      },
      buildPebble(0.3, "#8e8a84", [0.6, 0.08, 0.3]),
      buildPebble(0.22, "#a8a49c", [-0.5, 0.05, 0.4]),
    ],
  }),
  "moon-crater-rim": (): HistoryPropParts => ({
    body: [
      {
        geometry: new TorusGeometry(1.4, 0.28, 4, 12),
        colour: "#b8b4ac",
        position: [0, 0.05, 0],
        rotation: [Math.PI / 2, 0, 0],
        scale: [1, 1, 0.45],
      },
      buildDrum([1.3, 1.3], 0.02, 12, "#85827c", [0, 0.02, 0]),
    ],
  }),
  "lunar-experiment-package": (): HistoryPropParts => ({
    body: [
      buildBlock([0.4, 0.35, 0.4], "#d4a332", [0, 0.18, 0]),
      ...[-1, 1].map((side): ModelPart =>
        buildBlock(
          [0.7, 0.03, 0.45],
          "#2a3a6a",
          [side * 0.58, 0.38, 0],
          [0, 0, side * 0.12],
        ),
      ),
      buildDrum([0.015, 0.015], 0.6, 4, "#d8d8d8", [0.1, 0.65, -0.1]),
      buildBlock([0.5, 0.05, 0.4], "#8a8f96", [0.2, 0.3, 0.9], [-0.35, 0, 0]),
      buildBlock([0.05, 0.25, 0.05], "#8a8f96", [0.2, 0.12, 0.8]),
    ],
  }),
  "astronaut-footprint-trail": (): HistoryPropParts => ({
    body: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((step): ModelPart =>
      buildBlock([0.14, 0.02, 0.28], "#6e6b66", [
        step % 2 === 0 ? -0.12 : 0.12,
        0.01,
        -2 + step * 0.45,
      ]),
    ),
  }),
  "wright-flyer-1903": (): HistoryPropParts => ({
    body: [
      buildBlock([6.4, 0.05, 1.0], "#efe6cf", [0, 1.65, 0]),
      buildBlock([6.4, 0.05, 1.0], "#efe6cf", [0, 0.85, 0]),
      ...[-3, -1.5, 1.5, 3].flatMap((x) =>
        [-0.4, 0.4].map((z): ModelPart =>
          buildBlock([0.04, 0.8, 0.04], "#8a6a43", [x, 1.25, z]),
        ),
      ),
      buildBlock([1.8, 0.03, 0.45], "#efe6cf", [0, 1.15, 2.3]),
      buildBlock([1.8, 0.03, 0.45], "#efe6cf", [0, 1.45, 2.3]),
      ...[-0.5, 0.5].flatMap((x): ModelPart[] => [
        buildBlock([0.04, 0.04, 1.6], "#8a6a43", [x, 1.0, 1.5]),
        buildBlock([0.04, 0.04, 1.4], "#8a6a43", [x, 1.25, -1.5]),
        buildBlock([0.06, 0.08, 3.6], "#8a6a43", [x, 0.1, 0.2]),
      ]),
      ...[-0.3, 0.3].map((x): ModelPart =>
        buildBlock([0.04, 0.95, 0.45], "#efe6cf", [x, 1.25, -2.1]),
      ),
      ...[-1, 1].map((x): ModelPart =>
        buildBlock(
          [0.08, 1.0, 0.04],
          "#8a6a43",
          [x, 1.25, -0.65],
          [0, 0, x * 0.3],
        ),
      ),
      buildBlock([0.4, 0.3, 0.4], "#4a4a4e", [0.3, 1.0, 0]),
    ],
  }),
  "flyer-launch-rail": (): HistoryPropParts => ({
    body: [
      buildBlock([0.12, 0.1, 6.0], "#7a5a3a", [0, 0.05, 0]),
      ...[-2.4, -0.8, 0.8, 2.4].map((z): ModelPart =>
        buildBlock([0.3, 0.04, 0.12], "#6b4a2e", [0, 0.02, z]),
      ),
    ],
  }),
  "wright-camp-shed": (): HistoryPropParts => ({
    body: [
      buildBlock([3.0, 1.8, 2.2], "#b89a72", [0, 0.9, 0]),
      ...[0.5, 1.0, 1.5].map((y): ModelPart =>
        buildBlock([3.02, 0.04, 2.22], "#9a7e5a", [0, y, 0]),
      ),
      buildBlock([1.6, 1.5, 0.04], "#8a6e4e", [-0.4, 0.75, 1.12]),
      buildBlock([0.4, 0.35, 0.04], "#3a3440", [1.0, 1.2, 1.12]),
      {
        geometry: buildGableRoof(2.4, 0.9, 3.2),
        colour: "#6e5a46",
        position: [0, 1.8, 0],
      },
    ],
  }),
  "dune-grass-tuft": (): HistoryPropParts => ({
    body: grassBlades.map(([x, z, lean]): ModelPart =>
      buildCone(0.04, 0.7, 3, "#9aa858", [x, 0.33, z], [0, 0, lean]),
    ),
    motion: "sway",
  }),
  "undercroft-vault-arch": (): HistoryPropParts => ({
    body: [
      ...[-2.6, 2.6].flatMap((x): ModelPart[] => [
        buildBlock([0.9, 0.2, 0.9], "#7a6e5e", [x, 0.1, 0]),
        buildBlock([0.7, 2.8, 0.7], "#8a7e6c", [x, 1.6, 0]),
        buildBlock([0.9, 0.2, 0.9], "#7a6e5e", [x, 3.0, 0]),
      ]),
      {
        geometry: new TorusGeometry(2.6, 0.3, 4, 8, Math.PI),
        colour: "#9a8d78",
        position: [0, 3.0, 0],
        scale: [1, 0.8, 1.6],
      },
    ],
  }),
  "gunpowder-barrel-stack": (): HistoryPropParts => ({
    body: [
      ...buildBarrel([-0.65, 0, 0]),
      ...buildBarrel([0, 0, 0]),
      ...buildBarrel([0.65, 0, 0]),
      ...buildBarrel([-0.33, 0.72, 0]),
      ...buildBarrel([0.33, 0.72, 0]),
    ],
  }),
  "firewood-faggot-pile": (): HistoryPropParts => ({
    body: [
      ...[
        { y: 0.1, xs: [-0.3, -0.1, 0.1, 0.3] },
        { y: 0.27, xs: [-0.2, 0, 0.2] },
        { y: 0.44, xs: [-0.1, 0.1] },
      ].flatMap(({ y, xs }) =>
        xs.map((z, index): ModelPart =>
          buildDrum(
            [0.1, 0.1],
            1.4,
            5,
            index % 2 === 0 ? "#6b4a2e" : "#8a6a48",
            [0, y, z],
            [0, 0.1 * index, Math.PI / 2],
          ),
        ),
      ),
      ...[-0.25, 0.05, 0.3].map((z): ModelPart =>
        buildBlock(
          [1.6, 0.03, 0.03],
          "#a88a60",
          [0.1, 0.56, z],
          [0, 0.3, 0.05],
        ),
      ),
    ],
  }),
  "cellar-lantern": (): HistoryPropParts => ({
    body: [
      buildDrum([0.16, 0.18], 0.06, 6, "#2a2622", [0, 0.03, 0]),
      ...[0, 1, 2].map((post): ModelPart => {
        const angle = (post * Math.PI * 2) / 3;
        return buildBlock([0.03, 0.4, 0.03], "#2a2622", [
          Math.sin(angle) * 0.15,
          0.25,
          Math.cos(angle) * 0.15,
        ]);
      }),
      buildCone(0.2, 0.2, 6, "#2a2622", [0, 0.55, 0]),
      {
        geometry: new TorusGeometry(0.07, 0.015, 4, 6),
        colour: "#2a2622",
        position: [0, 0.72, 0],
      },
    ],
    glow: [buildDrum([0.13, 0.13], 0.38, 6, "#ffc860", [0, 0.25, 0])],
    motion: "flicker",
  }),
  "cellar-candle-cluster": (): HistoryPropParts => ({
    body: [
      buildBlock([0.8, 0.4, 0.4], "#7a6e5e", [0, 0.2, 0]),
      ...[
        { x: -0.2, height: 0.3 },
        { x: 0, height: 0.42 },
        { x: 0.2, height: 0.24 },
      ].map(({ x, height }): ModelPart =>
        buildDrum([0.05, 0.05], height, 6, "#efe6cf", [x, 0.4 + height / 2, 0]),
      ),
    ],
    glow: [
      buildFlame([-0.2, 0.7, 0], 0.14, "#ffd060"),
      buildFlame([0, 0.82, 0], 0.14, "#ffd060"),
      buildFlame([0.2, 0.64, 0], 0.14, "#ffd060"),
    ],
    motion: "flicker",
  }),
  "undercroft-round-pillar": (): HistoryPropParts => ({
    body: [
      buildBlock([1.4, 0.3, 1.4], "#7a6e5e", [0, 0.15, 0]),
      buildDrum([0.55, 0.6], 5, 8, "#8f8270", [0, 2.8, 0]),
      buildBlock([1.4, 0.3, 1.4], "#7a6e5e", [0, 5.45, 0]),
    ],
  }),
  "victorian-shop-row": (): HistoryPropParts => ({
    body: [
      buildBlock([4.8, 4.0, 2.0], "#9a5a44", [0, 2.0, 0]),
      buildBlock([4.9, 0.25, 2.1], "#7a4436", [0, 4.1, 0]),
      buildBlock([0.5, 0.9, 0.6], "#9a5a44", [1, 4.6, 0]),
      ...[
        { x: -1.2, sign: "#1f4a3a", stripe: "#c8342c" },
        { x: 1.2, sign: "#6a1f2a", stripe: "#2f6b4a" },
      ].flatMap(({ x, sign, stripe }): ModelPart[] => [
        buildBlock([2.2, 0.35, 0.06], sign, [x, 2.3, 1.03]),
        buildBlock([1.4, 0.08, 0.02], "#e3c25a", [x, 2.3, 1.07]),
        buildBlock([1.3, 1.2, 0.04], "#9ab8c8", [x - 0.35, 1.2, 1.02]),
        buildBlock([0.5, 1.5, 0.05], "#2a2420", [x + 0.75, 0.75, 1.02]),
        buildBlock([2.2, 0.04, 0.8], "#f4efe2", [x, 2.0, 1.4], [0.35, 0, 0]),
        ...[-0.75, 0, 0.75].map((offset): ModelPart =>
          buildBlock(
            [0.3, 0.045, 0.8],
            stripe,
            [x + offset, 2.01, 1.4],
            [0.35, 0, 0],
          ),
        ),
        ...[-0.5, 0.5].map((offset): ModelPart =>
          buildBlock([0.5, 0.7, 0.04], "#3b4a5e", [x + offset, 3.2, 1.02]),
        ),
      ]),
    ],
  }),
  "cotton-mill-chimney": (): HistoryPropParts => ({
    body: [
      buildBlock([5, 3.4, 2.4], "#a35a42", [1.8, 1.7, 0]),
      ...[1.1, 2.4].flatMap((y) =>
        [0, 1, 2, 3, 4].map((column): ModelPart =>
          buildBlock([0.4, 0.6, 0.04], "#3a4658", [
            -0.2 + column * 1.0,
            y,
            1.21,
          ]),
        ),
      ),
      {
        geometry: buildGableRoof(2.4, 0.8, 5.1),
        colour: "#4a4f5c",
        position: [1.8, 3.4, 0],
      },
      buildBlock([1.8, 0.8, 1.8], "#8f4a36", [-1.5, 0.4, 0]),
      buildDrum([0.45, 0.8], 10, 8, "#8f4a36", [-1.5, 5.4, 0]),
      buildDrum([0.6, 0.6], 0.35, 8, "#3a2a24", [-1.5, 10.4, 0]),
    ],
  }),
  "chimney-smoke-plume": (): HistoryPropParts => ({
    body: [
      buildPebble(0.35, "#d6d2cc", [0, 0.3, 0]),
      buildPebble(0.5, "#cfcbc5", [0.35, 0.9, 0]),
      buildPebble(0.65, "#c4c0ba", [0.9, 1.6, 0]),
      buildPebble(0.8, "#b8b4ae", [1.6, 2.3, 0]),
    ],
    motion: "sway",
  }),
  "horse-drawn-omnibus": (): HistoryPropParts => ({
    body: [
      buildBlock([2.6, 1.1, 1.2], "#2f6b4a", [0, 1.2, 0]),
      buildBlock([2.62, 0.4, 1.22], "#efe2c8", [0, 1.4, 0]),
      ...[-0.8, -0.2, 0.4].map((x): ModelPart =>
        buildBlock([0.45, 0.28, 1.24], "#2a3440", [x, 1.42, 0]),
      ),
      buildBlock([2.6, 0.3, 1.24], "#e8c14a", [0, 1.92, 0]),
      buildBlock([2.4, 0.3, 0.4], "#6b4528", [0, 2.22, 0]),
      ...[-1.2, 1.2].map((x): ModelPart =>
        buildBlock([0.05, 0.4, 1.2], "#2a2a2e", [x, 2.27, 0]),
      ),
      buildBlock([0.5, 0.06, 1.0], "#2a2a2e", [-1.5, 1.4, 0], [0, 0, -0.9]),
      ...[-0.6, 0.6].flatMap((z): ModelPart[] => [
        buildWheel(0.55, 0.08, 10, "#6b2a22", [-0.8, 0.55, z]),
        buildWheel(0.35, 0.08, 10, "#6b2a22", [0.9, 0.35, z]),
      ]),
      buildBlock([1.4, 0.06, 0.06], "#5a3a22", [1.8, 0.85, 0]),
      ...buildHorse("#5a3a28", "#1e1612", [2.6, 0, -0.32]),
      ...buildHorse("#8a5a38", "#2a1e18", [2.6, 0, 0.32]),
    ],
  }),
  "parked-spitfire": (): HistoryPropParts => ({
    body: buildPitchedParts(buildSpitfireParts(), -0.2, -0.16),
  }),
  "nissen-hangar": (): HistoryPropParts => ({
    body: [
      {
        geometry: new CylinderGeometry(
          2.4,
          2.4,
          7,
          10,
          1,
          false,
          Math.PI / 2,
          Math.PI,
        ),
        colour: "#6b7458",
        rotation: flatOnFront,
      },
      ...[-2, 0, 2].map((z): ModelPart => ({
        geometry: new CylinderGeometry(
          2.45,
          2.45,
          0.12,
          10,
          1,
          true,
          Math.PI / 2,
          Math.PI,
        ),
        colour: "#5a6248",
        position: [0, 0, z],
        rotation: flatOnFront,
      })),
      buildBlock([2.6, 2.2, 0.06], "#3a3e34", [0, 1.1, 3.52]),
    ],
  }),
  "airfield-windsock": (): HistoryPropParts => ({
    body: [
      buildDrum([0.05, 0.05], 3.2, 5, "#f2efe6", [0, 1.6, 0]),
      ...[
        { x: 0.3, radii: [0.23, 0.28] as const, colour: "#e8642c" },
        { x: 0.8, radii: [0.18, 0.23] as const, colour: "#f2efe6" },
        { x: 1.3, radii: [0.13, 0.18] as const, colour: "#e8642c" },
      ].map(({ x, radii, colour }): ModelPart =>
        buildDrum(
          [radii[0], radii[1]],
          0.5,
          8,
          colour,
          [x, 3.1 - 0.2 * x, 0],
          [0, 0, -Math.PI / 2 - 0.2],
        ),
      ),
    ],
    motion: "sway",
  }),
  "raf-control-tower": (): HistoryPropParts => ({
    body: [
      buildBlock([3.2, 1.6, 2.4], "#e4e0d4", [0, 0.8, 0]),
      buildBlock([3.2, 1.4, 2.0], "#e4e0d4", [0, 2.35, -0.2]),
      buildBlock([3.4, 0.1, 2.6], "#cfcabc", [0, 1.65, 0]),
      buildBlock([3.4, 0.35, 0.05], "#3a3e34", [0, 1.88, 1.28]),
      ...[-1, 0, 1].map((x): ModelPart =>
        buildBlock([0.6, 0.6, 0.04], "#2a3440", [x, 0.9, 1.21]),
      ),
      buildBlock([2.8, 0.7, 0.04], "#2a3440", [0, 2.4, 0.81]),
      buildBlock([3.4, 0.12, 2.2], "#cfcabc", [0, 3.11, -0.2]),
      buildBlock([3.4, 0.3, 0.05], "#3a3e34", [0, 3.32, 0.88]),
      buildDrum([0.04, 0.04], 1.8, 5, "#3a3e34", [1.2, 4.0, -0.4]),
      buildBlock([0.6, 1.0, 0.04], "#5a4a3a", [1.25, 0.5, 1.21]),
    ],
  }),
  "sandbag-emplacement": (): HistoryPropParts => ({
    body: [0, 1, 2].flatMap((row) =>
      [0, 1, 2, 3, 4, 5].map((bag): ModelPart => {
        const angle = -2.0 + (bag + (row % 2) * 0.5) * 0.75;
        return {
          geometry: new BoxGeometry(0.6, 0.25, 0.35),
          colour: (bag + row) % 2 === 0 ? "#b9a57a" : "#a8946a",
          position: [
            Math.sin(angle) * 1.4,
            0.125 + row * 0.25,
            -Math.cos(angle) * 1.4,
          ],
          rotation: [0, -angle, 0],
          roughen: 0.08,
        };
      }),
    ),
  }),
  "raf-fuel-bowser": (): HistoryPropParts => ({
    body: [
      buildBlock([3.4, 0.2, 1.1], "#26262a", [0, 0.55, 0]),
      buildBlock([1.0, 1.0, 1.1], "#5d6b4a", [1.2, 1.15, 0]),
      buildBlock([0.04, 0.4, 0.9], "#2a3440", [1.71, 1.35, 0]),
      buildBlock([0.6, 0.6, 1.0], "#5d6b4a", [1.95, 0.95, 0]),
      {
        geometry: new CylinderGeometry(0.6, 0.6, 2.2, 10),
        colour: "#6a7656",
        position: [-0.55, 1.25, 0],
        rotation: lyingAlongX,
        scale: [1, 1, 0.9],
      },
      buildDrum([0.25, 0.25], 0.3, 8, "#3a3e34", [-1.75, 1.0, 0], lyingAlongX),
      ...[1.6, -1.0].flatMap((x) =>
        [-0.55, 0.55].map((z): ModelPart =>
          buildWheel(0.32, 0.18, 8, "#1e1e22", [x, 0.32, z]),
        ),
      ),
    ],
  }),
  "st-pauls-cathedral": (): HistoryPropParts => ({
    body: [
      buildBlock([7, 2.6, 2.4], "#cfc6b0", [0, 1.3, 0]),
      buildBlock([2.6, 2.4, 4.2], "#c6bda6", [0, 1.2, 0]),
      ...[-2.4, -1.2, 1.2, 2.4].map((x): ModelPart =>
        buildBlock([0.4, 0.9, 0.04], "#3a3c48", [x, 1.4, 1.21]),
      ),
      buildDrum([1.7, 1.7], 1.0, 12, "#ddd5c0", [0, 3.1, 0]),
      buildDrum([1.4, 1.4], 0.7, 12, "#cfc6b0", [0, 3.95, 0]),
      buildDome(1.4, 12, 5, "#7d8796", [0, 4.3, 0]),
      buildDrum([0.25, 0.3], 0.7, 8, "#cfc6b0", [0, 6.05, 0]),
      buildCone(0.3, 0.4, 8, "#7d8796", [0, 6.6, 0]),
      buildPebble(0.12, "#e3b84c", [0, 6.88, 0]),
      buildBlock([0.04, 0.3, 0.04], "#e3b84c", [0, 7.12, 0]),
      buildBlock([0.18, 0.04, 0.04], "#e3b84c", [0, 7.16, 0]),
      ...[-0.9, 0.9].flatMap((z): ModelPart[] => [
        buildBlock([0.9, 2.0, 0.9], "#d6cdb8", [-3.2, 3.6, z]),
        buildCone(0.55, 1.1, 8, "#7d8796", [-3.2, 5.15, z]),
      ]),
    ],
  }),
  "wartime-searchlight": (): HistoryPropParts => ({
    body: [
      buildBlock([0.9, 0.4, 0.9], "#3d4438", [0, 0.2, 0]),
      ...[-0.4, 0.4].map((z): ModelPart =>
        buildBlock([0.08, 0.6, 0.08], "#3d4438", [0, 0.7, z]),
      ),
      buildDrum([0.38, 0.38], 0.6, 8, "#4a5242", [0, 1.0, 0], [0, 0, -0.35]),
    ],
    glow: [
      buildDrum(
        [0.33, 0.33],
        0.04,
        8,
        "#e8f0ff",
        [0.11, 1.29, 0],
        [0, 0, -0.35],
      ),
      {
        geometry: new CylinderGeometry(1.4, 0.3, 26, 8, 1, true),
        colour: "#8ea3c8",
        position: [4.55, 13.5, 0],
        rotation: [0, 0, -0.35],
      },
    ],
  }),
  "barrage-balloon": (): HistoryPropParts => ({
    body: [
      buildBlock([0.02, 7, 0.02], "#9aa0a8", [0, 3.5, 0]),
      buildBall(1, "#c4cad2", [0, 7.6, 0], [1.6, 0.75, 0.75]),
      buildBlock([0.5, 0.6, 0.04], "#b0b6be", [-1.35, 8.05, 0]),
      ...[-1, 1].map((side): ModelPart =>
        buildBlock(
          [0.5, 0.04, 0.6],
          "#b0b6be",
          [-1.35, 7.4, side * 0.4],
          [side * 0.5, 0, 0],
        ),
      ),
    ],
    motion: "bob",
  }),
  "anderson-shelter": (): HistoryPropParts => ({
    body: [
      {
        geometry: new SphereGeometry(1.3, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2),
        colour: "#5c4630",
        scale: [1.25, 0.45, 1.3],
        roughen: 0.1,
      },
      {
        geometry: new CylinderGeometry(
          0.95,
          0.95,
          2.0,
          8,
          1,
          false,
          Math.PI / 2,
          Math.PI,
        ),
        colour: "#6f7a68",
        rotation: flatOnFront,
      },
      ...[-0.6, 0, 0.6].map((z): ModelPart => ({
        geometry: new CylinderGeometry(
          1.0,
          1.0,
          0.08,
          8,
          1,
          true,
          Math.PI / 2,
          Math.PI,
        ),
        colour: "#5e6858",
        position: [0, 0, z],
        rotation: flatOnFront,
      })),
      buildBlock([0.5, 0.6, 0.04], "#2a2620", [0, 0.32, 1.02]),
      buildBlock([1.0, 0.5, 0.25], "#6b5236", [0, 0.25, 1.45]),
      buildPebble(0.18, "#6f9a4a", [0.9, 0.5, 0.5]),
      buildPebble(0.15, "#e8a83a", [-0.95, 0.45, 0.3], [1.6, 1, 1]),
    ],
  }),
  "dig-for-victory-patch": (): HistoryPropParts => ({
    body: [
      buildBlock([3.2, 0.12, 2.0], "#5a3e2a", [0, 0.06, 0]),
      ...[-0.6, 0, 0.6].map((z): ModelPart =>
        buildBlock([3.0, 0.1, 0.25], "#6b4a32", [0, 0.14, z]),
      ),
      ...[-0.6, 0].flatMap((z) =>
        [-1.1, -0.4, 0.3, 1.0].map((x): ModelPart =>
          buildPebble(0.2, x < 0 ? "#6f9a4a" : "#5f8a3e", [x, 0.3, z]),
        ),
      ),
      ...[-1.2, -0.6, 0, 0.6, 1.2].map((x): ModelPart =>
        buildCone(0.07, 0.3, 4, "#7fb04a", [x, 0.32, 0.6]),
      ),
      ...[0, 1, 2].map((pole): ModelPart => {
        const angle = (pole * Math.PI * 2) / 3;
        return buildDrum(
          [0.02, 0.02],
          1.4,
          4,
          "#8a6a48",
          [1.9 + Math.sin(angle) * 0.2, 0.68, Math.cos(angle) * 0.2],
          [Math.cos(angle) * 0.25, 0, -Math.sin(angle) * 0.25],
        );
      }),
    ],
  }),
  "back-garden-fence": (): HistoryPropParts => ({
    body: [
      ...[-4, -2, 0, 2, 4].map((x): ModelPart =>
        buildBlock([0.1, 1.1, 0.1], "#5a4430", [x, 0.55, 0]),
      ),
      ...[-3, -1, 1, 3].map((x): ModelPart =>
        buildBlock([1.9, 0.9, 0.03], "#6b5236", [x, 0.55, 0.02]),
      ),
      buildBlock([8, 0.08, 0.05], "#5a4430", [0, 1.02, 0.05]),
    ],
  }),
} satisfies Record<string, () => HistoryPropParts>;
