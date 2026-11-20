import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  LatheGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
} from "three";
import type { MusicModel } from "../curriculum/music-prompts.js";
import {
  buildModelGeometry,
  type ModelPart,
  type Triple,
} from "./world-map-models.js";

const modelPalette = {
  drumRed: "#d8433f",
  drumBlue: "#2f6fd6",
  skin: "#f4ead2",
  gold: "#e0a91f",
  brass: "#d6a23c",
  silver: "#c9d3dc",
  chrome: "#e8eef3",
  wood: "#a8652e",
  darkWood: "#6f3a17",
  lightWood: "#d8a86a",
  ebony: "#1d1b26",
  ivory: "#fbf7ee",
  felt: "#3d2b5a",
  grey: "#8f97a6",
  elephant: "#9aa3b2",
  bird: "#ffcf33",
  beak: "#ff8c2a",
  snake: "#4fb84a",
  snakeBelly: "#d7e86a",
  kangaroo: "#c47f45",
  hare: "#c9a27a",
  tortoiseShell: "#4c8a3a",
  tortoiseSkin: "#9fbf6a",
  bear: "#8a5a35",
  muzzle: "#d9b48a",
  sun: "#ffc93c",
  sunRay: "#ff9f1c",
  cloud: "#a6b2c4",
  rain: "#4aa3ff",
  stairs: "#7c5cff",
  arrow: "#ff6f61",
  path: "#3cc6a0",
  eye: "#14121f",
  pink: "#ff8fb1",
  red: "#e8394a",
  green: "#2bb673",
  purple: "#8b5cf6",
  orange: "#ff8a3d",
  yellow: "#ffd23f",
  teal: "#22b8cf",
} as const;

const cylinder = (top: number, bottom: number, height: number, segments = 10) =>
  new CylinderGeometry(top, bottom, height, segments);
const sphere = (radius: number, across = 10, down = 6) =>
  new SphereGeometry(radius, across, down);
const box = (width: number, height: number, depth: number) =>
  new BoxGeometry(width, height, depth);
const ring = (radius: number, tube: number, segments = 14, arc = Math.PI * 2) =>
  new TorusGeometry(radius, tube, 4, segments, arc);

const part = (
  geometry: BufferGeometry,
  colour: string,
  position: Triple = [0, 0, 0],
  rotation: Triple = [0, 0, 0],
  scale: Triple | number = 1,
): ModelPart => ({
  geometry,
  colour,
  position,
  rotation,
  scale,
  isSmooth: true,
});

const flat = (modelPart: ModelPart): ModelPart => ({
  ...modelPart,
  isSmooth: false,
});

const buildBellGeometry = (mouth: number, length: number, throat: number) =>
  new LatheGeometry(
    Array.from({ length: 7 }, (_, index) => {
      const along = index / 6;
      return new Vector2(
        throat + (mouth - throat) * along ** 3,
        along * length,
      );
    }),
    14,
  );

const buildDrumParts = (
  radius: number,
  height: number,
  shell: string,
): ModelPart[] => [
  part(cylinder(radius, radius, height, 18), shell),
  part(
    cylinder(radius * 1.01, radius * 1.01, height * 0.05, 18),
    modelPalette.skin,
    [0, height / 2, 0],
  ),
  part(
    ring(radius, radius * 0.06),
    modelPalette.gold,
    [0, height / 2, 0],
    [Math.PI / 2, 0, 0],
  ),
  part(
    ring(radius, radius * 0.06),
    modelPalette.gold,
    [0, -height / 2, 0],
    [Math.PI / 2, 0, 0],
  ),
  ...Array.from({ length: 6 }, (_, index) => {
    const angle = (index / 6) * Math.PI * 2;
    return flat(
      part(
        box(radius * 0.05, height * 0.9, radius * 0.05),
        modelPalette.ivory,
        [Math.cos(angle) * radius * 1.01, 0, Math.sin(angle) * radius * 1.01],
        [0, -angle, index % 2 === 0 ? 0.3 : -0.3],
      ),
    );
  }),
];

const buildStickParts = (height: number): ModelPart[] => [
  part(
    cylinder(0.035, 0.035, 1.1, 6),
    modelPalette.lightWood,
    [-0.25, height, 0.15],
    [0, 0, 1.1],
  ),
  part(
    cylinder(0.035, 0.035, 1.1, 6),
    modelPalette.lightWood,
    [0.25, height, 0.15],
    [0, 0, -1.1],
  ),
];

const buildViolinFamilyParts = (
  body: string,
  length: number,
  hasEndpin: boolean,
): ModelPart[] => [
  part(sphere(0.42, 12, 8), body, [0, -0.32, 0], [0, 0, 0], [1, 1.05, 0.32]),
  part(sphere(0.34, 12, 8), body, [0, 0.26, 0], [0, 0, 0], [1, 1.05, 0.32]),
  part(sphere(0.22, 10, 6), body, [0, -0.02, 0], [0, 0, 0], [1, 1.2, 0.3]),
  flat(part(box(0.1, 0.95, 0.05), modelPalette.ebony, [0, 0.55, 0.12])),
  flat(part(box(0.09, 0.5, 0.08), body, [0, 0.95 * length, 0])),
  part(ring(0.06, 0.025, 10), body, [0, 1.25 * length, 0], [0, Math.PI / 2, 0]),
  flat(part(box(0.22, 0.08, 0.03), modelPalette.lightWood, [0, -0.12, 0.15])),
  ...[-0.05, -0.017, 0.017, 0.05].map((across) =>
    flat(
      part(box(0.008, 1.3, 0.008), modelPalette.silver, [across, 0.25, 0.17]),
    ),
  ),
  flat(part(box(0.16, 0.22, 0.04), modelPalette.ebony, [0, -0.55, 0.12])),
  ...(hasEndpin
    ? [part(cylinder(0.02, 0.01, 0.35, 6), modelPalette.silver, [0, -0.9, 0])]
    : []),
];

const buildWoodwindParts = (
  bodyColour: string,
  keyColour: string,
  length: number,
  bellMouth: number,
): ModelPart[] => [
  part(cylinder(0.07, 0.08, length, 10), bodyColour),
  part(
    buildBellGeometry(bellMouth, 0.3, 0.08),
    bodyColour,
    [0, -length / 2 - 0.28, 0],
    [Math.PI, 0, 0],
  ),
  part(cylinder(0.04, 0.065, 0.22, 8), modelPalette.ebony, [
    0,
    length / 2 + 0.1,
    0,
  ]),
  ...Array.from({ length: 5 }, (_, index) =>
    part(
      ring(0.08, 0.015, 10),
      keyColour,
      [0, length / 2 - 0.2 - index * 0.22, 0],
      [Math.PI / 2, 0, 0],
    ),
  ),
  ...Array.from({ length: 6 }, (_, index) =>
    part(sphere(0.03, 6, 4), keyColour, [
      0,
      length / 2 - 0.3 - index * 0.18,
      0.075,
    ]),
  ),
];

const fluteTilt = Math.PI / 2.6;

const buildStairsParts = (isRising: boolean): ModelPart[] => [
  ...Array.from({ length: 4 }, (_, index) => {
    const height = 0.3 + index * 0.3;
    const x = (isRising ? index : 3 - index) * 0.42 - 0.63;
    return flat(
      part(box(0.4, height, 0.7), modelPalette.stairs, [
        x,
        -0.6 + height / 2,
        0,
      ]),
    );
  }),
  part(
    cylinder(0.05, 0.05, 1.3, 8),
    modelPalette.arrow,
    [0, 0.55, 0.3],
    [0, 0, isRising ? -0.9 : 0.9],
  ),
  part(
    new ConeGeometry(0.16, 0.32, 10),
    modelPalette.arrow,
    [isRising ? 0.62 : -0.62, 0.98, 0.3],
    [0, 0, isRising ? -0.9 : 0.9],
  ),
];

const modelBuilders: Record<MusicModel, () => ModelPart[]> = {
  "big-drum": () => [
    ...buildDrumParts(0.85, 0.9, modelPalette.drumRed),
    ...buildStickParts(0.75),
  ],
  "little-drum": () => [...buildDrumParts(0.85, 0.75, modelPalette.drumBlue)],
  triangle: () => [
    part(
      cylinder(0.035, 0.035, 1.5, 6),
      modelPalette.silver,
      [-0.37, -0.1, 0],
      [0, 0, -0.52],
    ),
    part(
      cylinder(0.035, 0.035, 1.5, 6),
      modelPalette.silver,
      [0.37, -0.1, 0],
      [0, 0, 0.52],
    ),
    part(
      cylinder(0.035, 0.035, 1.3, 6),
      modelPalette.silver,
      [0.05, -0.73, 0],
      [0, 0, Math.PI / 2],
    ),
    part(ring(0.12, 0.015, 10), modelPalette.red, [0, 0.72, 0]),
    part(
      cylinder(0.02, 0.02, 1.1, 6),
      modelPalette.chrome,
      [0.55, -0.2, 0.2],
      [0, 0, 0.7],
    ),
  ],
  maracas: () =>
    [-1, 1].flatMap((side) => [
      part(
        sphere(0.36, 12, 8),
        side === -1 ? modelPalette.red : modelPalette.yellow,
        [side * 0.35, 0.35, 0],
        [0, 0, side * 0.35],
        [1, 1.15, 1],
      ),
      part(
        ring(0.33, 0.04, 14),
        side === -1 ? modelPalette.yellow : modelPalette.green,
        [side * 0.35, 0.35, 0],
        [Math.PI / 2, side * 0.35, 0],
      ),
      part(
        cylinder(0.06, 0.08, 0.8, 8),
        modelPalette.lightWood,
        [side * 0.18, -0.35, 0],
        [0, 0, side * 0.35],
      ),
    ]),
  tambourine: () => [
    part(
      new CylinderGeometry(0.8, 0.8, 0.24, 20, 1, true),
      modelPalette.wood,
      [0, 0, 0],
      [Math.PI / 2.6, 0, 0],
    ),
    part(
      cylinder(0.79, 0.79, 0.02, 20),
      modelPalette.skin,
      [0, 0.05, 0.1],
      [Math.PI / 2.6, 0, 0],
    ),
    ...Array.from({ length: 5 }, (_, index) => {
      const angle = (index / 5) * Math.PI * 2 + 0.3;
      return part(
        cylinder(0.12, 0.12, 0.05, 10),
        modelPalette.chrome,
        [
          Math.cos(angle) * 0.82,
          Math.sin(angle) * 0.82 * 0.45,
          Math.sin(angle) * 0.3,
        ],
        [Math.PI / 2.6, 0, 0],
      );
    }),
  ],
  woodblock: () => [
    flat(part(box(1.4, 0.55, 0.6), modelPalette.darkWood, [0, -0.1, 0])),
    flat(part(box(1.1, 0.08, 0.62), modelPalette.ebony, [0, 0.02, 0])),
    part(
      cylinder(0.03, 0.03, 1.1, 6),
      modelPalette.lightWood,
      [0.3, 0.55, 0.1],
      [0, 0, 1],
    ),
    part(sphere(0.12, 8, 6), modelPalette.lightWood, [-0.15, 0.25, 0.1]),
  ],
  cymbal: () => [
    part(
      new ConeGeometry(0.95, 0.18, 20, 1, true),
      modelPalette.gold,
      [0, 0.55, 0],
    ),
    part(cylinder(0.12, 0.12, 0.08, 12), modelPalette.gold, [0, 0.66, 0]),
    part(cylinder(0.025, 0.025, 1.4, 6), modelPalette.silver, [0, -0.15, 0]),
    ...[0, 2.1, 4.2].map((angle) =>
      part(
        cylinder(0.02, 0.02, 0.6, 6),
        modelPalette.silver,
        [Math.cos(angle) * 0.2, -0.75, Math.sin(angle) * 0.2],
        [Math.sin(angle) * 0.5, 0, -Math.cos(angle) * 0.5],
      ),
    ),
  ],
  timpani: () => [
    part(
      new SphereGeometry(0.85, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
      "#c8743a",
      [0, 0.2, 0],
    ),
    part(cylinder(0.87, 0.87, 0.04, 18), modelPalette.skin, [0, 0.21, 0]),
    part(
      ring(0.87, 0.05, 18),
      modelPalette.chrome,
      [0, 0.21, 0],
      [Math.PI / 2, 0, 0],
    ),
    ...[0, 2.1, 4.2].map((angle) =>
      part(cylinder(0.03, 0.03, 0.8, 6), modelPalette.chrome, [
        Math.cos(angle) * 0.6,
        -0.55,
        Math.sin(angle) * 0.6,
      ]),
    ),
  ],
  xylophone: () => {
    const colours = [
      modelPalette.red,
      modelPalette.orange,
      modelPalette.yellow,
      modelPalette.green,
      modelPalette.teal,
      modelPalette.drumBlue,
      modelPalette.purple,
    ];
    return [
      flat(
        part(
          box(1.8, 0.08, 0.08),
          modelPalette.darkWood,
          [0, -0.15, 0.35],
          [0, 0.18, 0],
        ),
      ),
      flat(
        part(
          box(1.8, 0.08, 0.08),
          modelPalette.darkWood,
          [0, -0.15, -0.35],
          [0, -0.18, 0],
        ),
      ),
      ...colours.map((colour, index) =>
        flat(
          part(box(0.2, 0.08, 1.1 - index * 0.08), colour, [
            -0.75 + index * 0.25,
            -0.05,
            0,
          ]),
        ),
      ),
      part(
        cylinder(0.025, 0.025, 0.9, 6),
        modelPalette.lightWood,
        [0.2, 0.35, 0.2],
        [0.4, 0, 1.2],
      ),
      part(sphere(0.08, 6, 4), modelPalette.red, [-0.2, 0.18, 0.05]),
    ];
  },
  piano: () => [
    flat(part(box(1.7, 1.15, 0.55), modelPalette.ebony, [0, 0.12, -0.15])),
    flat(part(box(1.7, 0.1, 0.5), modelPalette.ebony, [0, -0.18, 0.3])),
    flat(part(box(1.56, 0.06, 0.32), modelPalette.ivory, [0, -0.1, 0.36])),
    ...[0, 1, 3, 4, 5, 7, 8, 10, 11, 12].map((whiteIndex) =>
      flat(
        part(box(0.06, 0.06, 0.18), modelPalette.ebony, [
          -0.78 + (whiteIndex + 1) * 0.104,
          -0.05,
          0.3,
        ]),
      ),
    ),
    flat(part(box(0.1, 0.65, 0.1), modelPalette.ebony, [-0.75, -0.6, 0.35])),
    flat(part(box(0.1, 0.65, 0.1), modelPalette.ebony, [0.75, -0.6, 0.35])),
    flat(
      part(
        box(0.5, 0.3, 0.03),
        modelPalette.ivory,
        [0, 0.35, 0.14],
        [-0.2, 0, 0],
      ),
    ),
  ],
  violin: () => buildViolinFamilyParts(modelPalette.wood, 1, false),
  cello: () => [...buildViolinFamilyParts("#9a4a1f", 1, true)],
  "double-bass": () => [
    ...buildViolinFamilyParts("#6f3516", 1.15, true),
    part(
      sphere(0.3, 10, 6),
      "#6f3516",
      [0, 0.12, 0],
      [0, 0, 0],
      [1.2, 0.8, 0.3],
    ),
  ],
  harp: () => [
    part(cylinder(0.07, 0.09, 1.8, 10), modelPalette.gold, [-0.55, 0, 0]),
    part(
      ring(0.55, 0.07, 14, Math.PI * 0.9),
      modelPalette.gold,
      [0, 0.82, 0],
      [0, 0, 0.15],
    ),
    flat(
      part(
        box(0.18, 1.85, 0.2),
        modelPalette.wood,
        [0.25, -0.05, 0],
        [0, 0, -0.42],
      ),
    ),
    ...Array.from({ length: 6 }, (_, index) => {
      const x = -0.42 + index * 0.13;
      const top = 0.95 - Math.abs(index - 2) * 0.03;
      const bottom = -0.85 + index * 0.33;
      return flat(
        part(box(0.01, top - bottom, 0.01), modelPalette.ivory, [
          x,
          (top + bottom) / 2,
          0,
        ]),
      );
    }),
    flat(part(box(0.7, 0.12, 0.4), modelPalette.gold, [-0.25, -0.92, 0])),
  ],
  guitar: () => [
    part(
      sphere(0.48, 12, 8),
      modelPalette.lightWood,
      [0, -0.38, 0],
      [0, 0, 0],
      [1, 1, 0.28],
    ),
    part(
      sphere(0.38, 12, 8),
      modelPalette.lightWood,
      [0, 0.12, 0],
      [0, 0, 0],
      [1, 1, 0.28],
    ),
    part(
      cylinder(0.14, 0.14, 0.02, 12),
      modelPalette.ebony,
      [0, -0.12, 0.13],
      [Math.PI / 2, 0, 0],
    ),
    flat(part(box(0.13, 0.95, 0.06), modelPalette.darkWood, [0, 0.8, 0.02])),
    flat(
      part(box(0.2, 0.25, 0.06), modelPalette.ebony, [0, 1.35, 0], [0.2, 0, 0]),
    ),
    flat(part(box(0.25, 0.06, 0.04), modelPalette.darkWood, [0, -0.55, 0.14])),
    ...[-0.04, -0.014, 0.014, 0.04].map((across) =>
      flat(
        part(box(0.006, 1.8, 0.006), modelPalette.silver, [across, 0.35, 0.12]),
      ),
    ),
  ],
  flute: () => [
    part(
      cylinder(0.06, 0.06, 2, 10),
      modelPalette.chrome,
      [0, 0, 0],
      [0, 0, fluteTilt],
    ),
    flat(
      part(
        box(0.12, 0.05, 0.1),
        modelPalette.silver,
        [0.64 * Math.sin(fluteTilt) * -1, 0.64 * Math.cos(fluteTilt), 0.06],
        [0, 0, fluteTilt],
      ),
    ),
    ...Array.from({ length: 6 }, (_, index) => {
      const along = -0.4 + index * 0.2;
      return part(
        cylinder(0.05, 0.05, 0.04, 8),
        modelPalette.silver,
        [-along * Math.sin(fluteTilt), along * Math.cos(fluteTilt), 0.06],
        [Math.PI / 2, 0, 0],
      );
    }),
  ],
  recorder: () => [
    part(cylinder(0.08, 0.1, 1.5, 12), "#f1d8a8", [0, -0.05, 0], [0, 0, 0.35]),
    part(
      buildBellGeometry(0.16, 0.25, 0.1),
      "#f1d8a8",
      [0.27, -0.85, 0],
      [Math.PI, 0, 0.35],
    ),
    part(
      cylinder(0.06, 0.09, 0.3, 10),
      "#c79a5e",
      [-0.28, 0.8, 0],
      [0, 0, 0.35],
    ),
    ...Array.from({ length: 6 }, (_, index) =>
      part(sphere(0.03, 6, 4), modelPalette.ebony, [
        -0.17 + index * 0.08,
        0.45 - index * 0.22,
        0.08,
      ]),
    ),
  ],
  clarinet: () =>
    buildWoodwindParts(modelPalette.ebony, modelPalette.silver, 1.5, 0.2),
  oboe: () => [
    ...buildWoodwindParts("#3b2418", modelPalette.silver, 1.4, 0.13),
    part(cylinder(0.015, 0.03, 0.2, 6), "#d8b46a", [0, 0.98, 0]),
  ],
  trumpet: () => [
    part(
      cylinder(0.05, 0.05, 1.3, 8),
      modelPalette.brass,
      [0, 0.1, 0],
      [0, 0, Math.PI / 2],
    ),
    part(
      buildBellGeometry(0.32, 0.55, 0.05),
      modelPalette.brass,
      [0.62, 0.1, 0],
      [0, 0, -Math.PI / 2],
    ),
    part(
      ring(0.2, 0.045, 14, Math.PI),
      modelPalette.brass,
      [-0.65, -0.1, 0],
      [0, 0, Math.PI / 2],
    ),
    part(
      cylinder(0.05, 0.05, 1.1, 8),
      modelPalette.brass,
      [-0.1, -0.3, 0],
      [0, 0, Math.PI / 2],
    ),
    ...[-0.25, -0.08, 0.09].map((x) =>
      part(cylinder(0.07, 0.07, 0.45, 10), modelPalette.brass, [x, -0.05, 0]),
    ),
    ...[-0.25, -0.08, 0.09].map((x) =>
      part(cylinder(0.08, 0.08, 0.06, 10), modelPalette.ivory, [x, 0.22, 0]),
    ),
    part(
      cylinder(0.03, 0.06, 0.18, 8),
      modelPalette.silver,
      [-0.72, 0.1, 0],
      [0, 0, Math.PI / 2],
    ),
  ],
  "french-horn": () => [
    part(ring(0.5, 0.06, 24), modelPalette.brass, [0, 0, 0]),
    part(ring(0.34, 0.05, 20), modelPalette.brass, [0, 0, 0.04]),
    part(
      buildBellGeometry(0.42, 0.6, 0.06),
      modelPalette.brass,
      [0.55, -0.3, 0],
      [0, 0, -2.3],
    ),
    ...[-0.1, 0.06, 0.22].map((x) =>
      part(
        cylinder(0.06, 0.06, 0.3, 10),
        modelPalette.brass,
        [x, 0.5, 0.1],
        [Math.PI / 2, 0, 0],
      ),
    ),
    part(
      cylinder(0.03, 0.05, 0.2, 8),
      modelPalette.silver,
      [-0.55, 0.3, 0],
      [0, 0, 0.6],
    ),
  ],
  trombone: () => [
    part(
      cylinder(0.035, 0.035, 1.7, 8),
      modelPalette.brass,
      [0, 0.08, 0],
      [0, 0, Math.PI / 2],
    ),
    part(
      cylinder(0.035, 0.035, 1.7, 8),
      modelPalette.brass,
      [0, -0.08, 0],
      [0, 0, Math.PI / 2],
    ),
    part(
      ring(0.08, 0.035, 10, Math.PI),
      modelPalette.brass,
      [-0.85, 0, 0],
      [0, 0, Math.PI / 2],
    ),
    part(
      cylinder(0.04, 0.04, 0.9, 8),
      modelPalette.brass,
      [0.4, 0.3, 0],
      [0, 0, Math.PI / 2],
    ),
    part(
      ring(0.11, 0.04, 10, Math.PI),
      modelPalette.brass,
      [0.85, 0.19, 0],
      [0, 0, -Math.PI / 2],
    ),
    part(
      buildBellGeometry(0.34, 0.6, 0.05),
      modelPalette.brass,
      [-0.05, 0.3, 0],
      [0, 0, Math.PI / 2],
    ),
  ],
  tuba: () => [
    part(cylinder(0.32, 0.28, 1.1, 14), modelPalette.brass, [0, -0.25, 0]),
    part(
      buildBellGeometry(0.62, 0.65, 0.3),
      modelPalette.brass,
      [0.05, 0.3, 0],
    ),
    part(
      ring(0.33, 0.08, 18),
      modelPalette.brass,
      [0, -0.55, 0.05],
      [Math.PI / 2, 0, 0],
    ),
    ...[-0.12, 0.05, 0.22].map((x) =>
      part(cylinder(0.06, 0.06, 0.4, 10), modelPalette.brass, [
        x - 0.05,
        -0.05,
        0.36,
      ]),
    ),
    part(
      cylinder(0.04, 0.06, 0.3, 8),
      modelPalette.silver,
      [-0.45, 0.1, 0.2],
      [0, 0, 0.9],
    ),
  ],
  metronome: () => [
    flat(
      part(
        new ConeGeometry(0.75, 1.7, 4, 1),
        modelPalette.darkWood,
        [0, -0.12, 0],
        [0, Math.PI / 4, 0],
        [1, 1, 0.65],
      ),
    ),
    flat(
      part(
        box(0.32, 1.2, 0.04),
        modelPalette.ivory,
        [0, -0.05, 0.3],
        [0.2, 0, 0],
      ),
    ),
    part(
      cylinder(0.025, 0.025, 1.5, 6),
      modelPalette.chrome,
      [0.12, 0.15, 0.36],
      [0.2, 0, -0.25],
    ),
    flat(
      part(
        box(0.18, 0.14, 0.1),
        modelPalette.gold,
        [0.2, 0.55, 0.42],
        [0.2, 0, -0.25],
      ),
    ),
    flat(part(box(1.1, 0.12, 0.8), modelPalette.darkWood, [0, -0.98, 0])),
  ],
  elephant: () => [
    part(
      sphere(0.6),
      modelPalette.elephant,
      [-0.15, -0.05, 0],
      [0, 0, 0],
      [1.15, 0.85, 0.85],
    ),
    part(sphere(0.38), modelPalette.elephant, [0.6, 0.25, 0]),
    ...[-1, 1].map((side) =>
      part(
        sphere(0.3, 10, 6),
        "#b7bfcc",
        [0.5, 0.3, side * 0.32],
        [0, side * 0.5, 0],
        [0.4, 1, 0.9],
      ),
    ),
    part(
      cylinder(0.12, 0.09, 0.45, 8),
      modelPalette.elephant,
      [0.92, 0, 0],
      [0, 0, 0.3],
    ),
    part(
      cylinder(0.09, 0.07, 0.35, 8),
      modelPalette.elephant,
      [0.98, -0.35, 0],
      [0, 0, -0.2],
    ),
    ...[-1, 1].map((side) =>
      part(
        new ConeGeometry(0.04, 0.25, 6),
        modelPalette.ivory,
        [0.85, 0.05, side * 0.12],
        [0, 0, -2.2],
      ),
    ),
    ...[
      [-0.5, -0.25],
      [-0.5, 0.25],
      [0.2, -0.25],
      [0.2, 0.25],
    ].map(([x, z]) =>
      part(cylinder(0.14, 0.15, 0.55, 8), modelPalette.elephant, [x, -0.6, z]),
    ),
    ...[-1, 1].map((side) =>
      part(sphere(0.045, 6, 4), modelPalette.eye, [0.82, 0.38, side * 0.22]),
    ),
  ],
  bird: () => [
    part(
      sphere(0.5),
      modelPalette.bird,
      [0, -0.1, 0],
      [0, 0, 0],
      [1.1, 0.9, 0.9],
    ),
    part(sphere(0.32), modelPalette.bird, [0.42, 0.38, 0]),
    part(
      new ConeGeometry(0.1, 0.3, 8),
      modelPalette.beak,
      [0.8, 0.36, 0],
      [0, 0, -Math.PI / 2],
    ),
    ...[-1, 1].map((side) =>
      part(
        sphere(0.3, 10, 6),
        "#ffb000",
        [-0.05, 0, side * 0.42],
        [side * 0.4, 0, -0.3],
        [1.1, 0.5, 0.25],
      ),
    ),
    part(
      new ConeGeometry(0.2, 0.45, 8),
      "#ffb000",
      [-0.62, 0.05, 0],
      [0, 0, 1.2],
    ),
    ...[-1, 1].map((side) =>
      part(sphere(0.06, 6, 4), modelPalette.eye, [0.6, 0.48, side * 0.2]),
    ),
    ...[-1, 1].map((side) =>
      part(cylinder(0.025, 0.025, 0.3, 6), modelPalette.beak, [
        0.05,
        -0.62,
        side * 0.15,
      ]),
    ),
  ],
  snake: () => [
    part(
      ring(0.5, 0.15, 18),
      modelPalette.snake,
      [0, -0.62, 0],
      [Math.PI / 2, 0, 0],
    ),
    part(
      ring(0.36, 0.14, 16),
      modelPalette.snake,
      [0, -0.38, 0],
      [Math.PI / 2, 0, 0],
    ),
    part(
      cylinder(0.13, 0.15, 0.7, 10),
      modelPalette.snake,
      [0.25, 0.05, 0],
      [0, 0, -0.35],
    ),
    part(
      sphere(0.22),
      modelPalette.snake,
      [0.38, 0.45, 0],
      [0, 0, 0],
      [1.3, 0.9, 1],
    ),
    part(
      sphere(0.12, 8, 6),
      modelPalette.snakeBelly,
      [0.5, 0.38, 0],
      [0, 0, 0],
      [1.3, 0.6, 1],
    ),
    ...[-1, 1].map((side) =>
      part(sphere(0.05, 6, 4), modelPalette.eye, [0.5, 0.55, side * 0.12]),
    ),
    flat(part(box(0.2, 0.02, 0.04), modelPalette.red, [0.72, 0.4, 0])),
  ],
  kangaroo: () => [
    part(
      sphere(0.48),
      modelPalette.kangaroo,
      [0, -0.15, 0],
      [0, 0, -0.3],
      [0.85, 1.15, 0.8],
    ),
    part(
      sphere(0.28, 10, 8),
      "#e3b585",
      [0.18, -0.2, 0],
      [0, 0, -0.3],
      [0.6, 0.9, 0.7],
    ),
    part(
      sphere(0.25),
      modelPalette.kangaroo,
      [0.32, 0.55, 0],
      [0, 0, 0],
      [1.2, 0.9, 0.85],
    ),
    ...[-1, 1].map((side) =>
      part(
        new ConeGeometry(0.08, 0.32, 8),
        modelPalette.kangaroo,
        [0.22, 0.82, side * 0.1],
        [side * 0.2, 0, 0.2],
      ),
    ),
    part(
      new ConeGeometry(0.13, 1.1, 8),
      modelPalette.kangaroo,
      [-0.55, -0.6, 0],
      [0, 0, 1.2],
    ),
    ...[-1, 1].map((side) =>
      flat(
        part(box(0.5, 0.1, 0.16), modelPalette.kangaroo, [
          0.1,
          -0.88,
          side * 0.18,
        ]),
      ),
    ),
    ...[-1, 1].map((side) =>
      part(sphere(0.045, 6, 4), modelPalette.eye, [0.5, 0.62, side * 0.1]),
    ),
  ],
  hare: () => [
    part(
      sphere(0.5),
      modelPalette.hare,
      [-0.1, -0.3, 0],
      [0, 0, 0],
      [1.2, 0.85, 0.8],
    ),
    part(sphere(0.3), modelPalette.hare, [0.45, 0.1, 0]),
    ...[-1, 1].map((side) =>
      part(
        sphere(0.12, 8, 6),
        modelPalette.hare,
        [0.35, 0.65, side * 0.1],
        [side * 0.15, 0, -0.2],
        [0.8, 3.3, 0.5],
      ),
    ),
    part(sphere(0.14, 8, 6), modelPalette.ivory, [-0.68, -0.15, 0]),
    ...[-1, 1].map((side) =>
      flat(
        part(box(0.45, 0.1, 0.14), modelPalette.hare, [
          -0.05,
          -0.78,
          side * 0.22,
        ]),
      ),
    ),
    ...[-1, 1].map((side) =>
      part(sphere(0.045, 6, 4), modelPalette.eye, [0.65, 0.18, side * 0.12]),
    ),
    part(sphere(0.04, 6, 4), modelPalette.pink, [0.74, 0.08, 0]),
  ],
  tortoise: () => [
    part(
      new SphereGeometry(0.75, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2),
      modelPalette.tortoiseShell,
      [0, -0.35, 0],
      [0, 0, 0],
      [1, 0.8, 0.9],
    ),
    part(
      ring(0.73, 0.06, 18),
      "#3a6c2c",
      [0, -0.35, 0],
      [Math.PI / 2, 0, 0],
      [1, 0.9, 1],
    ),
    part(sphere(0.22), modelPalette.tortoiseSkin, [0.82, -0.2, 0]),
    ...[
      [-0.45, -0.4],
      [-0.45, 0.4],
      [0.4, -0.4],
      [0.4, 0.4],
    ].map(([x, z]) =>
      part(cylinder(0.12, 0.12, 0.3, 8), modelPalette.tortoiseSkin, [
        x,
        -0.55,
        z,
      ]),
    ),
    ...[-1, 1].map((side) =>
      part(sphere(0.04, 6, 4), modelPalette.eye, [0.98, -0.12, side * 0.1]),
    ),
  ],
  bear: () => [
    part(
      sphere(0.55),
      modelPalette.bear,
      [0, -0.35, 0],
      [0, 0, 0],
      [1, 1, 0.85],
    ),
    part(sphere(0.4), modelPalette.bear, [0, 0.42, 0.05]),
    ...[-1, 1].map((side) =>
      part(sphere(0.13, 8, 6), modelPalette.bear, [side * 0.3, 0.75, 0]),
    ),
    part(
      sphere(0.17, 10, 6),
      modelPalette.muzzle,
      [0, 0.32, 0.36],
      [0, 0, 0],
      [1.1, 0.8, 0.8],
    ),
    part(sphere(0.06, 6, 4), modelPalette.eye, [0, 0.38, 0.5]),
    ...[-1, 1].map((side) =>
      part(sphere(0.05, 6, 4), modelPalette.eye, [side * 0.15, 0.53, 0.36]),
    ),
    ...[-1, 1].map((side) =>
      part(
        sphere(0.2, 8, 6),
        modelPalette.bear,
        [side * 0.35, -0.85, 0.2],
        [0, 0, 0],
        [1, 0.7, 1.2],
      ),
    ),
    ...[-1, 1].map((side) =>
      part(
        sphere(0.17, 8, 6),
        modelPalette.bear,
        [side * 0.52, -0.2, 0.15],
        [0, 0, 0],
        [0.8, 1.3, 0.8],
      ),
    ),
  ],
  sun: () => [
    part(sphere(0.55, 16, 10), modelPalette.sun),
    ...Array.from({ length: 10 }, (_, index) => {
      const angle = (index / 10) * Math.PI * 2;
      return part(
        new ConeGeometry(0.12, 0.38, 8),
        modelPalette.sunRay,
        [Math.cos(angle) * 0.78, Math.sin(angle) * 0.78, 0],
        [0, 0, angle - Math.PI / 2],
      );
    }),
    ...[-1, 1].map((side) =>
      part(sphere(0.06, 6, 4), modelPalette.eye, [side * 0.18, 0.12, 0.5]),
    ),
    part(
      ring(0.18, 0.035, 10, Math.PI),
      modelPalette.eye,
      [0, -0.08, 0.5],
      [0, 0, Math.PI],
    ),
  ],
  "rain-cloud": () => [
    ...[
      [-0.45, 0.2, 0.32],
      [0, 0.38, 0.42],
      [0.45, 0.22, 0.33],
      [-0.2, 0.05, 0.35],
      [0.25, 0.05, 0.35],
    ].map(([x, y, radius]) =>
      part(sphere(radius, 12, 8), modelPalette.cloud, [x, y, 0]),
    ),
    ...[
      [-0.4, -0.45],
      [0, -0.6],
      [0.4, -0.45],
      [-0.2, -0.85],
      [0.2, -0.82],
    ].map(([x, y]) =>
      part(
        sphere(0.08, 6, 4),
        modelPalette.rain,
        [x, y, 0.1],
        [0, 0, 0],
        [0.8, 1.4, 0.8],
      ),
    ),
  ],
  "stairs-up": () => buildStairsParts(true),
  "stairs-down": () => buildStairsParts(false),
  "flat-path": () => [
    flat(part(box(1.8, 0.3, 0.7), modelPalette.path, [0, -0.45, 0])),
    part(
      cylinder(0.05, 0.05, 1.2, 8),
      modelPalette.arrow,
      [-0.1, 0.15, 0.3],
      [0, 0, Math.PI / 2],
    ),
    part(
      new ConeGeometry(0.16, 0.32, 10),
      modelPalette.arrow,
      [0.62, 0.15, 0.3],
      [0, 0, -Math.PI / 2],
    ),
  ],
};

const modelSizes: Partial<Record<MusicModel, number>> = {
  "little-drum": 0.62,
  violin: 0.8,
  "double-bass": 1.08,
};

const normaliseGeometry = (
  geometry: BufferGeometry,
  size: number,
): BufferGeometry => {
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  if (bounds === null) {
    return geometry;
  }
  const centre = bounds.getCenter(new Vector3());
  const extent = bounds.getSize(new Vector3());
  const largest = Math.max(extent.x, extent.y, extent.z);
  geometry.translate(-centre.x, -centre.y, -centre.z);
  geometry.scale(
    (2 * size) / largest,
    (2 * size) / largest,
    (2 * size) / largest,
  );
  geometry.computeBoundingSphere();
  return geometry;
};

export const buildMusicModelGeometry = (model: MusicModel): BufferGeometry =>
  normaliseGeometry(
    buildModelGeometry(modelBuilders[model]()),
    modelSizes[model] ?? 1,
  );
