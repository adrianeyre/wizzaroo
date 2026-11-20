import { Color, type BufferGeometry } from "three";
import type { FindLook, FindShape } from "../../curriculum/island-quests.js";
import { buildModelGeometry, type ModelPart } from "../world-map-models.js";
import {
  ball,
  box,
  cone,
  cylinder,
  gem,
  lump,
  ring,
  shift,
  stone,
} from "./quest-model-kit.js";

/**
 * A model for every shape of Find (ADR 0058), each about one unit
 * across, standing on the ground at the origin. The rucksack photographs
 * them, and the Island shows the ones still lying about.
 */

const half = Math.PI / 2;

const darken = (colour: string, by = 0.7): string =>
  `#${new Color(colour).multiplyScalar(by).getHexString()}`;

const lighten = (colour: string, by = 0.35): string =>
  `#${new Color(colour).lerp(new Color("#ffffff"), by).getHexString()}`;

const wood = "#8b5a2b";
const metal = "#9ca3af";
const ink = "#1f2937";
const glass = "#bae6fd";
const leafGreen = "#16a34a";

type FindBuilder = (colour: string, trim: string) => ModelPart[];

const findBuilders: Record<FindShape, FindBuilder> = {
  key: (colour, trim) => [
    ring(0.2, 0.06, colour, { at: [0, 0.75, 0] }),
    box([0.08, 0.55, 0.06], colour, { at: [0, 0.35, 0] }),
    box([0.18, 0.06, 0.06], colour, { at: [0.09, 0.12, 0] }),
    box([0.12, 0.06, 0.06], colour, { at: [0.06, 0.26, 0] }),
    ball(0.07, trim, { at: [0, 0.75, 0] }),
  ],
  coin: (colour, trim) => [
    cylinder(
      0.38,
      0.08,
      colour,
      { at: [0, 0.4, 0], turn: [half, 0, 0] },
      0.38,
      20,
    ),
    cylinder(
      0.26,
      0.1,
      trim,
      { at: [0, 0.4, 0], turn: [half, 0, 0] },
      0.26,
      16,
    ),
  ],
  gem: (colour, trim) => [
    gem(0.34, colour, { at: [0, 0.42, 0], scale: [1, 1.25, 1] }),
    ring(0.24, 0.04, trim, { at: [0, 0.46, 0], turn: [half, 0, 0] }),
  ],
  scroll: (colour, trim) => [
    cylinder(0.16, 0.7, colour, { at: [0, 0.2, 0], turn: [0, 0, half] }),
    cylinder(
      0.05,
      0.86,
      wood,
      { at: [0, 0.2, 0], turn: [0, 0, half] },
      0.05,
      8,
    ),
    ring(0.17, 0.03, trim, { at: [0, 0.2, 0], turn: [0, half, 0] }),
  ],
  map: (colour, trim) => [
    box([0.8, 0.03, 0.6], colour, { at: [0, 0.05, 0] }),
    cylinder(0.06, 0.62, darken(colour, 0.85), {
      at: [-0.4, 0.08, 0],
      turn: [half, 0, 0],
    }),
    box([0.04, 0.035, 0.3], trim, { at: [0.1, 0.07, 0.05], turn: [0, 0.6, 0] }),
    box([0.04, 0.035, 0.24], trim, {
      at: [0.1, 0.07, 0.05],
      turn: [0, -0.6, 0],
    }),
    ball(0.05, "#dc2626", { at: [-0.12, 0.08, -0.12] }),
  ],
  letter: (colour, trim) => [
    box([0.75, 0.5, 0.04], colour, { at: [0, 0.3, 0] }),
    box([0.53, 0.04, 0.045], darken(colour, 0.85), {
      at: [-0.18, 0.4, 0.002],
      turn: [0, 0, -0.6],
    }),
    box([0.53, 0.04, 0.045], darken(colour, 0.85), {
      at: [0.18, 0.4, 0.002],
      turn: [0, 0, 0.6],
    }),
    box([0.14, 0.16, 0.05], trim, { at: [0.25, 0.44, 0.01] }),
  ],
  book: (colour, trim) => [
    box([0.6, 0.18, 0.75], colour, { at: [0, 0.09, 0] }),
    box([0.56, 0.14, 0.7], "#fef9e7", { at: [0.03, 0.09, 0] }),
    box([0.08, 0.19, 0.76], darken(colour), { at: [-0.29, 0.09, 0] }),
    box([0.3, 0.02, 0.3], trim, { at: [0, 0.185, 0] }),
  ],
  bottle: (colour, trim) => [
    cylinder(0.22, 0.5, colour, { at: [0, 0.25, 0] }),
    cylinder(0.08, 0.25, colour, { at: [0, 0.6, 0] }, 0.2),
    cylinder(0.07, 0.1, trim, { at: [0, 0.76, 0] }),
    box([0.3, 0.2, 0.02], "#fef3c7", { at: [0, 0.27, 0.22] }),
  ],
  potion: (colour, trim) => [
    ball(0.3, colour, { at: [0, 0.3, 0] }),
    cylinder(0.08, 0.25, glass, { at: [0, 0.65, 0] }),
    cylinder(0.1, 0.08, trim, { at: [0, 0.8, 0] }),
    ball(0.08, lighten(colour, 0.6), { at: [0.1, 0.4, 0.2] }),
  ],
  jar: (colour, trim) => [
    cylinder(0.28, 0.55, colour, { at: [0, 0.28, 0] }, 0.28, 16),
    cylinder(0.3, 0.1, trim, { at: [0, 0.6, 0] }, 0.3, 16),
    box([0.34, 0.2, 0.02], "#fffbeb", { at: [0, 0.28, 0.28] }),
  ],
  lantern: (colour, trim) => [
    box([0.4, 0.06, 0.4], colour, { at: [0, 0.03, 0] }),
    box([0.3, 0.4, 0.3], trim, { at: [0, 0.26, 0] }),
    ...[-1, 1].flatMap((x) =>
      [-1, 1].map((z) =>
        box([0.04, 0.42, 0.04], colour, { at: [x * 0.16, 0.26, z * 0.16] }),
      ),
    ),
    cone(0.26, 0.18, colour, { at: [0, 0.55, 0] }, 4),
    ring(0.09, 0.025, colour, { at: [0, 0.7, 0] }),
  ],
  torch: (colour, trim) => [
    cylinder(0.1, 0.55, colour, { at: [0, 0.28, 0] }),
    cylinder(0.16, 0.18, colour, { at: [0, 0.62, 0] }, 0.1),
    cylinder(0.14, 0.02, trim, { at: [0, 0.72, 0] }),
    box([0.06, 0.1, 0.04], darken(colour), { at: [0, 0.35, 0.1] }),
  ],
  candle: (colour, trim) => [
    cylinder(0.28, 0.06, trim, { at: [0, 0.03, 0] }),
    cylinder(0.12, 0.5, colour, { at: [0, 0.31, 0] }),
    cylinder(0.01, 0.06, ink, { at: [0, 0.59, 0] }),
    cone(0.06, 0.16, "#fbbf24", { at: [0, 0.68, 0] }),
  ],
  rope: (colour, trim) => [
    ring(0.32, 0.07, colour, { at: [0, 0.07, 0], turn: [half, 0, 0] }),
    ring(0.24, 0.07, colour, { at: [0, 0.18, 0], turn: [half, 0, 0] }),
    ring(0.32, 0.07, darken(colour, 0.9), {
      at: [0, 0.29, 0],
      turn: [half, 0, 0],
    }),
    cylinder(0.06, 0.3, trim, { at: [0.4, 0.15, 0], turn: [0, 0, 0.4] }),
  ],
  shovel: (colour, trim) => [
    cylinder(0.04, 0.7, wood, { at: [0, 0.55, 0] }),
    box([0.24, 0.05, 0.05], trim, { at: [0, 0.92, 0] }),
    box([0.32, 0.38, 0.04], colour, { at: [0, 0.16, 0] }),
    cone(0.16, 0.12, colour, { at: [0, -0.02, 0], turn: [Math.PI, 0, 0] }, 4),
  ],
  bucket: (colour, trim) => [
    cylinder(0.32, 0.5, colour, { at: [0, 0.25, 0] }, 0.24, 16),
    cylinder(0.29, 0.02, trim, { at: [0, 0.47, 0] }, 0.29, 16),
    ring(0.3, 0.02, darken(colour), { at: [0, 0.5, 0] }, Math.PI),
  ],
  hammer: (colour, trim) => [
    cylinder(0.05, 0.75, wood, { at: [0, 0.38, 0] }),
    box([0.42, 0.16, 0.16], colour, { at: [0, 0.78, 0] }),
    box([0.06, 0.18, 0.18], trim, { at: [0.22, 0.78, 0] }),
  ],
  spanner: (colour, trim) => [
    box([0.1, 0.6, 0.05], colour, { at: [0, 0.4, 0] }),
    ring(0.12, 0.05, colour, { at: [0, 0.78, 0] }, Math.PI * 1.5),
    ring(0.1, 0.05, colour, { at: [0, 0.08, 0] }),
    box([0.11, 0.2, 0.06], trim, { at: [0, 0.4, 0] }),
  ],
  gear: (colour, trim) => [
    cylinder(
      0.3,
      0.12,
      colour,
      { at: [0, 0.4, 0], turn: [half, 0, 0] },
      0.3,
      16,
    ),
    ...Array.from({ length: 8 }, (_, tooth) => {
      const angle = (tooth / 8) * Math.PI * 2;
      return box([0.1, 0.12, 0.12], colour, {
        at: [Math.cos(angle) * 0.34, 0.4 + Math.sin(angle) * 0.34, 0],
        turn: [0, 0, angle],
      });
    }),
    cylinder(0.08, 0.16, trim, { at: [0, 0.4, 0], turn: [half, 0, 0] }),
  ],
  battery: (colour, trim) => [
    cylinder(0.18, 0.6, colour, { at: [0, 0.3, 0] }),
    cylinder(0.185, 0.2, trim, { at: [0, 0.5, 0] }),
    cylinder(0.07, 0.07, metal, { at: [0, 0.64, 0] }),
  ],
  magnet: (colour, trim) => [
    ring(0.24, 0.1, colour, { at: [0, 0.5, 0], turn: [0, 0, 0] }, Math.PI),
    box([0.2, 0.36, 0.2], colour, { at: [-0.24, 0.32, 0] }),
    box([0.2, 0.36, 0.2], colour, { at: [0.24, 0.32, 0] }),
    box([0.21, 0.14, 0.21], trim, { at: [-0.24, 0.1, 0] }),
    box([0.21, 0.14, 0.21], "#e5e7eb", { at: [0.24, 0.1, 0] }),
  ],
  magnifier: (colour, trim) => [
    ring(0.24, 0.05, colour, { at: [0, 0.6, 0] }),
    cylinder(
      0.22,
      0.02,
      glass,
      { at: [0, 0.6, 0], turn: [half, 0, 0] },
      0.22,
      16,
    ),
    cylinder(0.05, 0.4, trim, { at: [0, 0.18, 0] }),
  ],
  telescope: (colour, trim) => [
    cylinder(
      0.12,
      0.45,
      colour,
      { at: [-0.18, 0.2, 0], turn: [0, 0, half] },
      0.1,
    ),
    cylinder(
      0.09,
      0.4,
      colour,
      { at: [0.2, 0.2, 0], turn: [0, 0, half] },
      0.08,
    ),
    ring(0.125, 0.03, trim, { at: [0, 0.2, 0], turn: [0, half, 0] }),
    ring(0.13, 0.03, trim, { at: [-0.42, 0.2, 0], turn: [0, half, 0] }),
    cylinder(0.11, 0.02, glass, { at: [-0.44, 0.2, 0], turn: [0, 0, half] }),
  ],
  compass: (colour, trim) => [
    cylinder(0.36, 0.12, colour, { at: [0, 0.06, 0] }, 0.36, 20),
    cylinder(0.3, 0.02, "#f8fafc", { at: [0, 0.13, 0] }, 0.3, 20),
    cone(0.06, 0.3, "#dc2626", { at: [0, 0.15, -0.1], turn: [-half, 0, 0] }, 4),
    cone(0.06, 0.3, trim, { at: [0, 0.15, 0.1], turn: [half, 0, 0] }, 4),
  ],
  bell: (colour, trim) => [
    cylinder(0.12, 0.4, colour, { at: [0, 0.42, 0] }, 0.32, 16),
    ball(0.12, colour, { at: [0, 0.62, 0] }),
    ring(0.06, 0.025, trim, { at: [0, 0.76, 0] }),
    ball(0.07, trim, { at: [0, 0.18, 0] }),
  ],
  whistle: (colour, trim) => [
    cylinder(0.16, 0.24, colour, { at: [0, 0.18, 0], turn: [half, 0, 0] }),
    box([0.14, 0.12, 0.34], colour, { at: [0, 0.22, 0.24] }),
    box([0.1, 0.03, 0.06], ink, { at: [0, 0.29, 0.14] }),
    ring(0.08, 0.02, trim, { at: [0, 0.2, -0.16], turn: [0, half, 0] }),
  ],
  drum: (colour, trim) => [
    cylinder(0.34, 0.4, colour, { at: [0, 0.2, 0] }, 0.34, 16),
    cylinder(0.35, 0.03, "#f8fafc", { at: [0, 0.41, 0] }, 0.35, 16),
    ring(0.35, 0.025, trim, { at: [0, 0.03, 0], turn: [half, 0, 0] }),
    ring(0.35, 0.025, trim, { at: [0, 0.4, 0], turn: [half, 0, 0] }),
    cylinder(0.025, 0.5, wood, { at: [0.15, 0.6, 0], turn: [0, 0, 0.6] }),
  ],
  flute: (colour, trim) => [
    cylinder(0.05, 0.9, colour, { at: [0, 0.08, 0], turn: [0, 0, half] }),
    ...[-0.2, -0.05, 0.1, 0.25].map((x) =>
      cylinder(0.02, 0.02, ink, { at: [x, 0.13, 0] }),
    ),
    cylinder(0.055, 0.08, trim, { at: [-0.42, 0.08, 0], turn: [0, 0, half] }),
  ],
  feather: (colour, trim) => [
    ball(0.22, colour, { at: [0, 0.45, 0], scale: [0.6, 1.8, 0.12] }),
    cylinder(0.015, 0.85, trim, { at: [0, 0.42, 0.02] }),
  ],
  shell: (colour, trim) => [
    ball(0.34, colour, { at: [0, 0.16, 0], scale: [1, 0.5, 0.9] }),
    ...[-0.8, -0.4, 0, 0.4, 0.8].map((angle) =>
      ball(0.3, trim, {
        at: [Math.sin(angle) * 0.04, 0.17, Math.cos(angle) * 0.02],
        turn: [0, angle, 0],
        scale: [0.1, 0.52, 0.92],
      }),
    ),
    box([0.2, 0.12, 0.12], darken(colour), { at: [0, 0.06, -0.3] }),
  ],
  bone: (colour, trim) => [
    cylinder(0.08, 0.6, colour, { at: [0, 0.1, 0], turn: [0, 0, half] }),
    ...[-0.32, 0.32].flatMap((x) => [
      ball(0.1, colour, { at: [x, 0.1, 0.08] }),
      ball(0.1, trim, { at: [x, 0.1, -0.08] }),
    ]),
  ],
  egg: (colour, trim) => [
    ball(0.28, colour, { at: [0, 0.35, 0], scale: [1, 1.3, 1] }),
    ring(0.26, 0.03, trim, { at: [0, 0.38, 0], turn: [half, 0, 0] }),
  ],
  fish: (colour, trim) => [
    ball(0.25, colour, { at: [0, 0.25, 0], scale: [1.6, 0.9, 0.5] }),
    cone(0.18, 0.25, trim, { at: [-0.48, 0.25, 0], turn: [0, 0, half] }, 4),
    ball(0.04, ink, { at: [0.28, 0.3, 0.1] }),
    cone(0.08, 0.15, trim, { at: [0, 0.48, 0] }, 4),
  ],
  apple: (colour, trim) => [
    ball(0.3, colour, { at: [0, 0.3, 0], scale: [1, 0.92, 1] }),
    cylinder(0.025, 0.14, wood, { at: [0, 0.62, 0] }),
    ball(0.08, trim, { at: [0.08, 0.62, 0], scale: [1.4, 0.4, 0.8] }),
  ],
  carrot: (colour, trim) => [
    cone(0.16, 0.8, colour, { at: [0, 0.16, 0], turn: [0, 0, half] }),
    ...[-0.25, 0, 0.25].map((angle) =>
      cone(
        0.05,
        0.3,
        trim,
        {
          at: [-0.46, 0.2 + angle * 0.3, angle * 0.2],
          turn: [0, 0, half + angle],
        },
        5,
      ),
    ),
  ],
  cheese: (colour, trim) => [
    cylinder(0.4, 0.35, colour, { at: [0, 0.18, 0] }, 0.4, 3),
    ball(0.06, trim, { at: [0.12, 0.25, 0.14] }),
    ball(0.05, trim, { at: [-0.1, 0.12, 0.2] }),
  ],
  bread: (colour, trim) => [
    ball(0.3, colour, { at: [0, 0.2, 0], scale: [1.5, 0.75, 0.9] }),
    ...[-0.2, 0, 0.2].map((x) =>
      box([0.05, 0.03, 0.4], trim, { at: [x, 0.42, 0], turn: [0, 0.4, 0] }),
    ),
  ],
  cake: (colour, trim) => [
    cylinder(0.36, 0.32, colour, { at: [0, 0.16, 0] }, 0.36, 16),
    cylinder(0.37, 0.07, trim, { at: [0, 0.35, 0] }, 0.37, 16),
    ball(0.08, "#dc2626", { at: [0, 0.45, 0] }),
    cylinder(0.02, 0.16, "#f472b6", { at: [0.15, 0.46, 0.05] }),
  ],
  flower: (colour, trim) => [
    cylinder(0.025, 0.6, leafGreen, { at: [0, 0.3, 0] }),
    ball(0.09, leafGreen, { at: [0.1, 0.3, 0], scale: [1.4, 0.4, 0.8] }),
    ...Array.from({ length: 6 }, (_, petal) => {
      const angle = (petal / 6) * Math.PI * 2;
      return ball(
        0.1,
        colour,
        {
          at: [Math.cos(angle) * 0.13, 0.66, Math.sin(angle) * 0.13],
          scale: [1, 0.4, 1],
        },
        [6, 4],
      );
    }),
    ball(0.08, trim, { at: [0, 0.68, 0] }),
  ],
  "seed-bag": (colour, trim) => [
    box([0.5, 0.55, 0.3], colour, { at: [0, 0.28, 0] }),
    cone(0.26, 0.2, colour, { at: [0, 0.64, 0] }, 4),
    ring(0.12, 0.03, trim, { at: [0, 0.56, 0], turn: [half, 0, 0] }),
    box([0.3, 0.24, 0.02], trim, { at: [0, 0.3, 0.16] }),
  ],
  leaf: (colour, trim) => [
    ball(0.32, colour, { at: [0, 0.1, 0], scale: [0.6, 0.08, 1.2] }),
    box([0.03, 0.03, 0.8], trim, { at: [0, 0.13, 0] }),
  ],
  mushroom: (colour, trim) => [
    cylinder(0.12, 0.35, "#f5f5f4", { at: [0, 0.18, 0] }, 0.14),
    ball(0.32, colour, { at: [0, 0.38, 0], scale: [1, 0.6, 1] }),
    ...[
      [0.15, 0.55, 0.1],
      [-0.12, 0.52, 0.16],
      [0, 0.58, -0.15],
    ].map(([x, y, z]) => ball(0.05, trim, { at: [x, y, z] })),
  ],
  acorn: (colour, trim) => [
    ball(0.2, colour, { at: [0, 0.25, 0], scale: [1, 1.3, 1] }),
    ball(0.22, trim, { at: [0, 0.45, 0], scale: [1, 0.55, 1] }),
    cylinder(0.025, 0.12, trim, { at: [0, 0.6, 0] }),
  ],
  crystal: (colour, trim) => [
    cylinder(0.12, 0.6, colour, { at: [0, 0.3, 0] }, 0.12, 6),
    cone(0.12, 0.2, colour, { at: [0, 0.7, 0] }, 6),
    cylinder(
      0.08,
      0.35,
      lighten(colour),
      { at: [0.18, 0.18, 0.05], turn: [0, 0, -0.4] },
      0.08,
      6,
    ),
    cylinder(
      0.07,
      0.3,
      trim,
      { at: [-0.16, 0.16, -0.05], turn: [0, 0, 0.4] },
      0.07,
      6,
    ),
  ],
  ticket: (colour, trim) => [
    box([0.8, 0.4, 0.03], colour, { at: [0, 0.25, 0] }),
    box([0.04, 0.4, 0.035], trim, { at: [0.22, 0.25, 0] }),
    box([0.3, 0.06, 0.035], trim, { at: [-0.12, 0.32, 0] }),
    box([0.3, 0.06, 0.035], trim, { at: [-0.12, 0.18, 0] }),
  ],
  badge: (colour, trim) => [
    cylinder(
      0.3,
      0.06,
      trim,
      { at: [0, 0.35, 0], turn: [half, 0, 0] },
      0.3,
      20,
    ),
    cylinder(
      0.12,
      0.08,
      colour,
      { at: [0, 0.35, 0], turn: [half, 0, 0] },
      0.12,
      5,
    ),
    ...Array.from({ length: 5 }, (_, point) => {
      const angle = (point / 5) * Math.PI * 2 + half;
      return cone(
        0.07,
        0.16,
        colour,
        {
          at: [Math.cos(angle) * 0.15, 0.35 + Math.sin(angle) * 0.15, 0],
          turn: [0, 0, angle - half],
        },
        4,
      );
    }),
  ],
  crown: (colour, trim) => [
    cylinder(0.32, 0.22, colour, { at: [0, 0.11, 0] }, 0.3, 16),
    ...Array.from({ length: 5 }, (_, point) => {
      const angle = (point / 5) * Math.PI * 2;
      return cone(
        0.08,
        0.2,
        colour,
        {
          at: [Math.cos(angle) * 0.3, 0.32, Math.sin(angle) * 0.3],
        },
        6,
      );
    }),
    ...Array.from({ length: 5 }, (_, point) => {
      const angle = (point / 5) * Math.PI * 2 + 0.6;
      return gem(0.05, trim, {
        at: [Math.cos(angle) * 0.33, 0.12, Math.sin(angle) * 0.33],
      });
    }),
  ],
  mitten: (colour, trim) => [
    ball(0.25, colour, { at: [0, 0.42, 0], scale: [1, 1.3, 0.55] }),
    ball(0.1, colour, { at: [0.24, 0.42, 0], scale: [1, 1.6, 0.8] }),
    cylinder(0.24, 0.16, trim, { at: [0, 0.1, 0] }, 0.24, 12),
  ],
  scarf: (colour, trim) => [
    ring(0.26, 0.08, colour, { at: [0, 0.1, 0], turn: [half, 0, 0] }),
    box([0.16, 0.5, 0.05], colour, {
      at: [0.2, 0.05, 0.28],
      turn: [half, 0, 0.3],
    }),
    box([0.16, 0.08, 0.06], trim, {
      at: [0.28, 0.05, 0.5],
      turn: [half, 0, 0.3],
    }),
    ring(0.26, 0.03, trim, { at: [0, 0.18, 0], turn: [half, 0, 0] }),
  ],
  umbrella: (colour, trim) => [
    cone(0.42, 0.25, colour, { at: [0, 0.7, 0] }, 8),
    cylinder(0.025, 0.7, ink, { at: [0, 0.35, 0] }),
    ring(0.07, 0.025, trim, { at: [0.07, 0.02, 0] }, Math.PI),
  ],
  kite: (colour, trim) => [
    box([0.5, 0.5, 0.02], colour, {
      at: [0, 0.55, 0],
      turn: [0, 0, Math.PI / 4],
      scale: [1, 1.3, 1],
    }),
    box([0.02, 0.9, 0.03], wood, { at: [0, 0.55, 0.01] }),
    box([0.6, 0.02, 0.03], wood, { at: [0, 0.65, 0.01] }),
    ...[0, 1, 2].map((bow) =>
      box([0.1, 0.06, 0.03], trim, {
        at: [0.05 * bow, 0.02 - bow * 0.0, 0.02],
        turn: [0, 0, bow],
      }),
    ),
  ],
  ball: (colour, trim) => [
    ball(0.32, colour, { at: [0, 0.32, 0] }, [14, 10]),
    ring(0.322, 0.04, trim, { at: [0, 0.32, 0], turn: [half, 0, 0] }),
    ring(0.322, 0.04, trim, { at: [0, 0.32, 0] }),
  ],
  teddy: (colour, trim) => [
    ball(0.24, colour, { at: [0, 0.28, 0], scale: [1, 1.1, 0.9] }),
    ball(0.18, colour, { at: [0, 0.62, 0] }),
    ...[-1, 1].flatMap((side) => [
      ball(0.07, colour, { at: [side * 0.14, 0.77, 0] }),
      ball(0.08, colour, { at: [side * 0.22, 0.36, 0.05] }),
      ball(0.09, colour, { at: [side * 0.13, 0.08, 0.06] }),
      ball(0.025, ink, { at: [side * 0.06, 0.66, 0.16] }),
    ]),
    ball(0.07, lighten(colour), { at: [0, 0.58, 0.15] }),
    ring(0.12, 0.03, trim, { at: [0, 0.47, 0], turn: [half, 0, 0] }),
  ],
  "toy-boat": (colour, trim) => [
    box([0.7, 0.18, 0.3], colour, { at: [0, 0.09, 0] }),
    cone(0.15, 0.2, colour, { at: [0.42, 0.09, 0], turn: [0, 0, -half] }, 4),
    cylinder(0.02, 0.6, wood, { at: [0, 0.48, 0] }),
    cone(
      0.22,
      0.45,
      trim,
      { at: [0.1, 0.48, 0], turn: [0, 0, 0], scale: [0.6, 1, 0.08] },
      3,
    ),
  ],
  net: (colour, trim) => [
    cylinder(0.035, 0.7, wood, { at: [0, 0.35, 0] }),
    ring(0.24, 0.03, trim, { at: [0, 0.9, 0] }),
    cone(
      0.22,
      0.4,
      colour,
      { at: [0, 0.72, 0.06], turn: [Math.PI + 0.2, 0, 0] },
      10,
    ),
  ],
  "fishing-rod": (colour, trim) => [
    cylinder(0.02, 1, colour, { at: [0, 0.48, 0], turn: [0, 0, 0.35] }, 0.04),
    cylinder(0.08, 0.06, trim, { at: [0.08, 0.15, 0.06], turn: [half, 0, 0] }),
    cylinder(0.005, 0.5, "#e5e7eb", { at: [-0.18, 0.72, 0] }),
    ball(0.05, "#dc2626", { at: [-0.18, 0.46, 0] }),
  ],
  paintbrush: (colour, trim) => [
    cylinder(0.04, 0.6, colour, { at: [0, 0.3, 0] }),
    cylinder(0.05, 0.12, metal, { at: [0, 0.66, 0] }),
    cone(0.06, 0.2, trim, { at: [0, 0.82, 0] }, 8),
  ],
  pencil: (colour, trim) => [
    cylinder(
      0.06,
      0.7,
      colour,
      { at: [0, 0.06, 0], turn: [0, 0, half] },
      0.06,
      6,
    ),
    cone(
      0.06,
      0.16,
      "#f5d0a9",
      { at: [0.43, 0.06, 0], turn: [0, 0, -half] },
      6,
    ),
    cylinder(0.065, 0.08, trim, { at: [-0.38, 0.06, 0], turn: [0, 0, half] }),
  ],
  clock: (colour, trim) => [
    cylinder(
      0.34,
      0.12,
      colour,
      { at: [0, 0.4, 0], turn: [half, 0, 0] },
      0.34,
      20,
    ),
    cylinder(
      0.28,
      0.13,
      "#f8fafc",
      { at: [0, 0.4, 0.005], turn: [half, 0, 0] },
      0.28,
      20,
    ),
    box([0.03, 0.2, 0.02], ink, { at: [0, 0.48, 0.07] }),
    box([0.14, 0.03, 0.02], ink, { at: [0.06, 0.4, 0.07] }),
    ...[-1, 1].map((side) => ball(0.08, trim, { at: [side * 0.22, 0.74, 0] })),
    box([0.08, 0.1, 0.08], colour, { at: [0, 0.03, 0] }),
  ],
  hourglass: (colour, trim) => [
    cylinder(0.3, 0.06, trim, { at: [0, 0.03, 0] }),
    cylinder(0.3, 0.06, trim, { at: [0, 0.77, 0] }),
    cone(0.22, 0.33, glass, { at: [0, 0.57, 0], turn: [Math.PI, 0, 0] }),
    cone(0.22, 0.33, glass, { at: [0, 0.23, 0] }),
    cone(0.15, 0.15, colour, { at: [0, 0.14, 0] }),
    ...[-1, 1].map((side) =>
      cylinder(0.025, 0.74, trim, { at: [side * 0.25, 0.4, 0] }),
    ),
  ],
  medal: (colour, trim) => [
    box([0.12, 0.4, 0.02], trim, { at: [-0.06, 0.6, 0], turn: [0, 0, -0.25] }),
    box([0.12, 0.4, 0.02], trim, { at: [0.06, 0.6, 0], turn: [0, 0, 0.25] }),
    cylinder(
      0.22,
      0.06,
      colour,
      { at: [0, 0.25, 0], turn: [half, 0, 0] },
      0.22,
      20,
    ),
    cylinder(
      0.14,
      0.07,
      lighten(colour),
      { at: [0, 0.25, 0], turn: [half, 0, 0] },
      0.14,
      20,
    ),
  ],
  ring: (colour, trim) => [
    ring(0.24, 0.06, colour, { at: [0, 0.3, 0] }),
    gem(0.12, trim, { at: [0, 0.58, 0] }),
  ],
  mirror: (colour, trim) => [
    cylinder(
      0.26,
      0.05,
      colour,
      { at: [0, 0.55, 0], turn: [half, 0, 0] },
      0.26,
      20,
    ),
    cylinder(
      0.22,
      0.06,
      "#e0f2fe",
      { at: [0, 0.55, 0.002], turn: [half, 0, 0] },
      0.22,
      20,
    ),
    cylinder(0.05, 0.35, trim, { at: [0, 0.16, 0] }),
  ],
  pickaxe: (colour, trim) => [
    cylinder(0.04, 0.8, wood, { at: [0, 0.4, 0] }),
    cone(
      0.06,
      0.4,
      colour,
      { at: [0.2, 0.8, 0], turn: [0, 0, -half - 0.2] },
      6,
    ),
    cone(
      0.06,
      0.4,
      colour,
      { at: [-0.2, 0.8, 0], turn: [0, 0, half + 0.2] },
      6,
    ),
    box([0.1, 0.1, 0.1], trim, { at: [0, 0.82, 0] }),
  ],
  "watering-can": (colour, trim) => [
    cylinder(0.24, 0.42, colour, { at: [0, 0.21, 0] }, 0.26, 16),
    cylinder(0.04, 0.5, colour, { at: [0.36, 0.34, 0], turn: [0, 0, -0.9] }),
    cylinder(
      0.08,
      0.06,
      trim,
      { at: [0.55, 0.5, 0], turn: [0, 0, -0.9] },
      0.05,
    ),
    ring(0.16, 0.035, colour, { at: [-0.1, 0.48, 0] }, Math.PI),
  ],
  basket: (colour, trim) => [
    cylinder(0.36, 0.34, colour, { at: [0, 0.17, 0] }, 0.28, 12),
    ring(0.36, 0.035, darken(colour), { at: [0, 0.34, 0], turn: [half, 0, 0] }),
    ring(0.3, 0.035, trim, { at: [0, 0.34, 0] }, Math.PI),
    ball(0.1, "#dc2626", { at: [0.1, 0.36, 0.05] }),
  ],
  chip: (colour, trim) => [
    box([0.6, 0.08, 0.6], colour, { at: [0, 0.1, 0] }),
    box([0.3, 0.04, 0.3], ink, { at: [0, 0.16, 0] }),
    ...[-0.2, 0, 0.2].flatMap((offset) => [
      box([0.05, 0.03, 0.16], trim, { at: [offset, 0.04, 0.36] }),
      box([0.05, 0.03, 0.16], trim, { at: [offset, 0.04, -0.36] }),
      box([0.16, 0.03, 0.05], trim, { at: [0.36, 0.04, offset] }),
      box([0.16, 0.03, 0.05], trim, { at: [-0.36, 0.04, offset] }),
    ]),
  ],
  rocket: (colour, trim) => [
    cylinder(0.14, 0.5, colour, { at: [0, 0.4, 0] }),
    cone(0.14, 0.26, trim, { at: [0, 0.78, 0] }),
    ...[0, 1, 2].map((fin) => {
      const angle = (fin / 3) * Math.PI * 2;
      return box([0.04, 0.22, 0.18], trim, {
        at: [Math.cos(angle) * 0.15, 0.2, Math.sin(angle) * 0.15],
        turn: [0, -angle, 0],
      });
    }),
    cylinder(0.06, 0.02, glass, { at: [0, 0.5, 0.14], turn: [half, 0, 0] }),
    cone(0.1, 0.16, "#fb923c", { at: [0, 0.07, 0], turn: [Math.PI, 0, 0] }),
  ],
  fossil: (colour, trim) => [
    stone(0.38, colour, { at: [0, 0.2, 0], scale: [1, 0.55, 1] }),
    ...shift(
      Array.from({ length: 5 }, (_, coil) =>
        ring(0.05 + coil * 0.04, 0.025, trim, {
          at: [0, 0.38, 0],
          turn: [half, 0, 0],
        }),
      ),
      [0, 0, 0],
    ),
  ],
  snowflake: (colour, trim) => [
    ...[0, 1, 2].map((arm) =>
      box([0.8, 0.06, 0.04], colour, {
        at: [0, 0.45, 0],
        turn: [0, 0, (arm / 3) * Math.PI],
      }),
    ),
    ...Array.from({ length: 6 }, (_, arm) => {
      const angle = (arm / 6) * Math.PI * 2;
      return gem(0.06, trim, {
        at: [Math.cos(angle) * 0.4, 0.45 + Math.sin(angle) * 0.4, 0],
      });
    }),
    lump(0.08, trim, { at: [0, 0.45, 0] }),
  ],
};

/** The parts of a Find's model, standing on the ground at the origin. */
export const listFindParts = ({ shape, colour, trim }: FindLook): ModelPart[] =>
  findBuilders[shape](colour, trim);

/** A Find as one vertex-coloured mesh. */
export const buildFindGeometry = (look: FindLook): BufferGeometry =>
  buildModelGeometry(listFindParts(look));
