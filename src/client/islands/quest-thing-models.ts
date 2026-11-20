import { Color, type BufferGeometry } from "three";
import type {
  QuestThing,
  QuestThingShape,
} from "../../curriculum/island-quests.js";
import { buildModelGeometry, type ModelPart } from "../world-map-models.js";
import {
  ball,
  box,
  cone,
  cylinder,
  gem,
  lump,
  ring,
  stone,
} from "./quest-model-kit.js";

/**
 * A model for every shape of Quest thing (ADR 0058), at the Island's
 * own size, in two looks: as the Child finds it, and once its Puzzle is
 * solved (the gate open, the lamp lit, the flowers in bloom).
 */

const half = Math.PI / 2;

const darken = (colour: string, by = 0.7): string =>
  `#${new Color(colour).multiplyScalar(by).getHexString()}`;

const wood = "#8b5a2b";
const stoneGrey = "#a8a29e";
const ink = "#1f2937";
const glow = "#fef08a";
const water = "#38bdf8";
const leafGreen = "#16a34a";
const soil = "#5b3a22";

type ThingBuilder = (
  colour: string,
  trim: string,
  isSolved: boolean,
) => ModelPart[];

const listFencePosts = (colour: string, span: number): ModelPart[] =>
  [-1, 1].flatMap((side) => [
    box([0.18, 1.5, 0.18], colour, { at: [side * span, 0.75, 0] }),
    ball(0.13, colour, { at: [side * span, 1.58, 0] }),
  ]);

const thingBuilders: Record<QuestThingShape, ThingBuilder> = {
  gate: (colour, trim, isSolved) => {
    const leaf = (side: number): ModelPart[] => {
      const swing = isSolved ? side * 1.3 : 0;
      const hingeX = side * 0.85;
      const middleX = hingeX - side * Math.cos(swing) * 0.4;
      const middleZ = Math.sin(Math.abs(swing)) * 0.4;
      return [
        ...[0.35, 0.95].map((height) =>
          box([0.8, 0.1, 0.08], colour, {
            at: [middleX, height, middleZ],
            turn: [0, swing, 0],
          }),
        ),
        ...[-0.3, 0, 0.3].map((along) =>
          box([0.07, 1.1, 0.07], colour, {
            at: [
              middleX + Math.cos(swing) * along,
              0.65,
              middleZ - Math.sin(swing) * along,
            ],
          }),
        ),
      ];
    };
    return [
      ...listFencePosts(darken(colour), 0.95),
      ...leaf(-1),
      ...leaf(1),
      box([2.1, 0.12, 0.12], trim, { at: [0, 1.7, 0] }),
      ...(isSolved
        ? []
        : [box([0.16, 0.2, 0.1], trim, { at: [0, 0.65, 0.06] })]),
    ];
  },
  door: (colour, trim, isSolved) => [
    box([1.9, 1.6, 1.5], colour, { at: [0, 0.8, 0] }),
    cone(1.45, 0.8, trim, { at: [0, 2, 0], turn: [0, Math.PI / 4, 0] }, 4),
    box([0.75, 1.15, 0.06], isSolved ? ink : darken(colour, 0.6), {
      at: [0, 0.6, 0.76],
    }),
    ...(isSolved
      ? [box([0.06, 1.15, 0.7], darken(colour, 0.6), { at: [0.4, 0.6, 1.1] })]
      : [ball(0.06, "#facc15", { at: [0.25, 0.6, 0.8] })]),
    box([0.45, 0.4, 0.05], "#bae6fd", { at: [-0.62, 1.05, 0.76] }),
  ],
  chest: (colour, trim, isSolved) => [
    box([1.1, 0.55, 0.7], colour, { at: [0, 0.28, 0] }),
    box([1.14, 0.08, 0.74], trim, { at: [0, 0.12, 0] }),
    isSolved
      ? box([1.1, 0.3, 0.12], colour, {
          at: [0, 0.75, -0.38],
          turn: [-0.4, 0, 0],
        })
      : box([1.1, 0.3, 0.7], colour, { at: [0, 0.7, 0] }),
    ...(isSolved
      ? [
          gem(0.14, "#facc15", { at: [-0.2, 0.62, 0] }),
          ball(0.12, glow, { at: [0.2, 0.6, 0.05] }),
        ]
      : [box([0.16, 0.2, 0.06], trim, { at: [0, 0.55, 0.37] })]),
    ...[-0.45, 0.45].map((x) =>
      box([0.08, 0.86, 0.74], trim, { at: [x, 0.43, 0] }),
    ),
  ],
  well: (colour, trim, isSolved) => [
    cylinder(0.7, 0.8, colour, { at: [0, 0.4, 0] }, 0.75, 14),
    cylinder(
      0.55,
      0.05,
      isSolved ? water : "#0f172a",
      { at: [0, 0.72, 0] },
      0.55,
      14,
    ),
    ...[-1, 1].map((side) =>
      box([0.1, 1.3, 0.1], trim, { at: [side * 0.65, 1.3, 0] }),
    ),
    cone(1.1, 0.5, darken(trim), { at: [0, 2.15, 0] }, 4),
    cylinder(0.07, 1.3, wood, { at: [0, 1.5, 0], turn: [0, 0, half] }),
    cylinder(0.18, 0.28, "#94a3b8", { at: [0, isSolved ? 1.2 : 0.9, 0] }, 0.14),
  ],
  boulder: (colour, trim, isSolved) => [
    stone(0.85, colour, {
      at: isSolved ? [1.6, 0.6, 0.4] : [0, 0.75, 0],
      scale: [1.1, 0.9, 1],
    }),
    ...(isSolved
      ? [
          box([0.9, 0.06, 1.2], soil, { at: [0, 0.03, 0] }),
          ball(0.2, trim, { at: [0, 0.2, 0] }),
        ]
      : [lump(0.25, trim, { at: [0.5, 1.4, 0.2] })]),
  ],
  statue: (colour, trim, isSolved) => [
    box([1, 0.5, 1], darken(colour, 0.85), { at: [0, 0.25, 0] }),
    cylinder(0.32, 0.9, colour, { at: [0, 0.95, 0] }, 0.38, 10),
    ball(0.26, colour, { at: [0, 1.6, 0] }),
    box([0.16, 0.6, 0.16], colour, {
      at: [0.36, 1.25, 0],
      turn: [0, 0, isSolved ? -2.3 : -0.3],
    }),
    box([0.16, 0.5, 0.16], colour, { at: [-0.34, 1.0, 0], turn: [0, 0, 0.2] }),
    ...[-1, 1].map((side) =>
      ball(0.05, isSolved ? trim : darken(colour), {
        at: [side * 0.1, 1.66, 0.22],
      }),
    ),
    ...(isSolved ? [ball(0.14, trim, { at: [0.75, 1.75, 0] })] : []),
  ],
  machine: (colour, trim, isSolved) => [
    box([1.4, 0.9, 1], colour, { at: [0, 0.45, 0] }),
    cylinder(0.45, 0.25, darken(colour, 0.9), { at: [0, 1.05, 0] }, 0.5, 16),
    cylinder(0.45, 0.25, trim, { at: [0, 1.3, 0] }, 0.45, 16),
    box([0.1, 0.5, 0.1], wood, {
      at: [0.35, 1.65, 0],
      turn: [0, 0, isSolved ? 0.5 : 0],
    }),
    ...[-0.4, 0, 0.4].map((x) =>
      ball(0.08, isSolved ? "#22c55e" : "#7f1d1d", { at: [x, 0.65, 0.51] }),
    ),
    ...(isSolved ? [cone(0.3, 0.3, "#f5f5f4", { at: [-0.9, 0.15, 0.3] })] : []),
  ],
  safe: (colour, trim, isSolved) => [
    box([1, 1.1, 0.9], colour, { at: [0, 0.55, 0] }),
    isSolved
      ? box([0.8, 0.9, 0.08], darken(colour), {
          at: [0.85, 0.55, 0.75],
          turn: [0, -1.3, 0],
        })
      : box([0.8, 0.9, 0.08], darken(colour, 0.85), { at: [0, 0.55, 0.46] }),
    ...(isSolved
      ? [
          box([0.7, 0.8, 0.05], ink, { at: [0, 0.55, 0.43] }),
          gem(0.15, trim, { at: [0, 0.55, 0.2] }),
        ]
      : [
          cylinder(
            0.16,
            0.06,
            trim,
            { at: [0.1, 0.6, 0.52], turn: [half, 0, 0] },
            0.16,
            16,
          ),
          box([0.06, 0.25, 0.06], trim, { at: [-0.25, 0.6, 0.52] }),
        ]),
  ],
  campfire: (colour, trim, isSolved) => [
    ...Array.from({ length: 8 }, (_, stoneIndex) => {
      const angle = (stoneIndex / 8) * Math.PI * 2;
      return stone(0.18, stoneGrey, {
        at: [Math.cos(angle) * 0.6, 0.12, Math.sin(angle) * 0.6],
      });
    }),
    ...[0, 1, 2].map((log) =>
      cylinder(0.08, 0.9, colour, {
        at: [0, 0.15, 0],
        turn: [half, (log / 3) * Math.PI, 0.25],
      }),
    ),
    ...(isSolved
      ? [
          cone(0.3, 0.7, trim, { at: [0, 0.6, 0] }, 7),
          cone(0.18, 0.5, glow, { at: [0, 0.55, 0.05] }, 6),
        ]
      : [ball(0.15, "#57534e", { at: [0, 0.2, 0], scale: [1.5, 0.5, 1.5] })]),
  ],
  "garden-bed": (colour, trim, isSolved) => [
    box([1.6, 0.3, 1], colour, { at: [0, 0.15, 0] }),
    box([1.45, 0.06, 0.85], soil, { at: [0, 0.31, 0] }),
    ...[-0.5, 0, 0.5].flatMap((x) =>
      [-0.2, 0.2].flatMap((z) =>
        isSolved
          ? [
              cylinder(0.03, 0.5, leafGreen, { at: [x, 0.58, z] }),
              ball(0.13, trim, { at: [x, 0.85, z], scale: [1, 0.7, 1] }),
            ]
          : [
              cylinder(0.02, 0.18, "#a3a35a", {
                at: [x, 0.42, z],
                turn: [0.6, 0, 0.3],
              }),
            ],
      ),
    ),
  ],
  "broken-bridge": (colour, trim, isSolved) => [
    ...[-1, 1].flatMap((side) => [
      box([0.2, 1.1, 0.2], darken(colour), { at: [side * 1.2, 0.55, 0.6] }),
      box([0.2, 1.1, 0.2], darken(colour), { at: [side * 1.2, 0.55, -0.6] }),
      box([0.8, 0.1, 1.2], colour, { at: [side * 0.95, 0.35, 0] }),
    ]),
    ...(isSolved
      ? [box([1.2, 0.12, 1.1], trim, { at: [0, 0.37, 0] })]
      : [
          box([0.5, 0.08, 0.3], colour, {
            at: [0.2, 0.05, 0.3],
            turn: [0.2, 0.5, 0.1],
          }),
        ]),
    ...[-1, 1].map((side) =>
      cylinder(0.03, 2.6, "#c8a165", {
        at: [0, 1.05, side * 0.6],
        turn: [0, 0, half],
      }),
    ),
  ],
  "lamp-post": (colour, trim, isSolved) => [
    cylinder(0.25, 0.25, colour, { at: [0, 0.12, 0] }, 0.3, 10),
    cylinder(0.07, 2.4, colour, { at: [0, 1.4, 0] }, 0.09, 8),
    box([0.6, 0.06, 0.06], colour, { at: [0.25, 2.55, 0] }),
    ...(isSolved
      ? [
          box([0.3, 0.38, 0.3], trim, { at: [0.5, 2.3, 0] }),
          cone(0.24, 0.16, colour, { at: [0.5, 2.55, 0] }, 4),
          ball(0.22, glow, { at: [0.5, 2.3, 0] }),
        ]
      : [ring(0.08, 0.02, colour, { at: [0.5, 2.45, 0] })]),
  ],
  beacon: (colour, trim, isSolved) => [
    cylinder(0.45, 1.6, colour, { at: [0, 0.8, 0] }, 0.6, 12),
    cylinder(0.47, 0.25, "#f8fafc", { at: [0, 0.6, 0] }, 0.5, 12),
    cylinder(0.47, 0.25, "#f8fafc", { at: [0, 1.25, 0] }, 0.48, 12),
    cylinder(
      0.32,
      0.5,
      isSolved ? glow : "#334155",
      { at: [0, 1.85, 0] },
      0.32,
      10,
    ),
    cone(0.42, 0.35, colour, { at: [0, 2.28, 0] }, 12),
    ...(isSolved
      ? [cone(0.5, 2.2, trim, { at: [1.3, 1.85, 0], turn: [0, 0, half] }, 8)]
      : []),
  ],
  cart: (colour, trim, isSolved) => [
    box([1.4, 0.45, 0.9], colour, { at: [0, 0.7, 0] }),
    ...[-0.5, 0.5].flatMap((x) =>
      [-0.5, 0.5].map((z) =>
        cylinder(
          0.3,
          0.08,
          wood,
          { at: [x, 0.3, z], turn: [half, 0, 0] },
          0.3,
          12,
        ),
      ),
    ),
    cylinder(0.04, 1.2, wood, { at: [1.2, 0.55, 0], turn: [0, 0, half] }),
    ...[-0.45, 0, 0.45].map((x, index) =>
      cylinder(
        0.14,
        0.24,
        isSolved ? trim : ["#ef4444", "#facc15", "#3b82f6"][index],
        { at: [x, 1.05, 0] },
      ),
    ),
  ],
  boat: (colour, trim, isSolved) => [
    box([1.8, 0.4, 0.8], colour, { at: [0, 0.25, 0] }),
    cone(0.4, 0.6, colour, { at: [1.15, 0.25, 0], turn: [0, 0, -half] }, 4),
    box([1.6, 0.06, 0.7], darken(colour, 0.8), { at: [0, 0.42, 0] }),
    box([0.15, 0.08, 0.7], trim, { at: [-0.2, 0.5, 0] }),
    ...[-1, 1].map((side) =>
      cylinder(0.03, 1, wood, {
        at: [-0.2, 0.55, side * 0.6],
        turn: [half - 0.4, 0, 0],
      }),
    ),
    ...(isSolved
      ? [
          box([0.16, 0.6, 0.16], wood, { at: [1.6, 0.3, 0] }),
          cylinder(0.03, 0.6, "#c8a165", {
            at: [1.35, 0.45, 0],
            turn: [0, 0, half],
          }),
        ]
      : []),
  ],
  pedestal: (colour, trim, isSolved) => [
    box([1, 0.25, 1], darken(colour, 0.85), { at: [0, 0.12, 0] }),
    cylinder(0.32, 1, colour, { at: [0, 0.75, 0] }, 0.38, 10),
    box([0.85, 0.2, 0.85], colour, { at: [0, 1.35, 0] }),
    ...(isSolved
      ? [
          gem(0.25, trim, { at: [0, 1.75, 0] }),
          ring(0.4, 0.04, glow, { at: [0, 1.75, 0], turn: [half, 0, 0] }),
        ]
      : [
          cylinder(
            0.2,
            0.04,
            darken(colour, 0.6),
            { at: [0, 1.46, 0] },
            0.2,
            10,
          ),
        ]),
  ],
  cage: (colour, trim, isSolved) => [
    box([1.4, 0.15, 1.4], colour, { at: [0, 0.07, 0] }),
    box([1.4, 0.12, 1.4], colour, { at: [0, 1.25, 0] }),
    ...Array.from({ length: 12 }, (_, bar) => {
      const side = Math.floor(bar / 3);
      const along = ((bar % 3) - 1) * 0.45;
      const [x, z] = [
        [along, 0.68],
        [0.68, along],
        [along, -0.68],
        [-0.68, along],
      ][side];
      return isSolved && side === 0
        ? box([0.05, 1.1, 0.05], trim, {
            at: [x + 0.4, 0.66, z + 0.35],
            turn: [0, 0.8, 0],
          })
        : box([0.05, 1.1, 0.05], trim, { at: [x, 0.66, z] });
    }),
    ball(0.25, "#d97706", {
      at: isSolved ? [0.3, 0.3, 1.2] : [0, 0.4, 0],
      scale: [1.2, 1, 1],
    }),
    ball(0.14, "#d97706", {
      at: isSolved ? [0.45, 0.55, 1.4] : [0.15, 0.62, 0.1],
    }),
  ],
  fountain: (colour, trim, isSolved) => [
    cylinder(1, 0.45, colour, { at: [0, 0.22, 0] }, 1.05, 16),
    cylinder(
      0.9,
      0.05,
      isSolved ? water : "#78716c",
      { at: [0, 0.42, 0] },
      0.9,
      16,
    ),
    cylinder(0.15, 1, colour, { at: [0, 0.9, 0] }, 0.2, 10),
    cylinder(0.45, 0.15, trim, { at: [0, 1.4, 0] }, 0.3, 12),
    ...(isSolved
      ? [
          cone(0.2, 0.6, water, { at: [0, 1.75, 0] }, 8),
          ...[0, 1, 2, 3].map((jet) =>
            ball(0.08, water, {
              at: [
                Math.cos(jet * half) * 0.5,
                1.15,
                Math.sin(jet * half) * 0.5,
              ],
            }),
          ),
        ]
      : []),
  ],
  mailbox: (colour, trim, isSolved) => [
    cylinder(0.32, 1.2, colour, { at: [0, 0.6, 0] }, 0.34, 14),
    ball(0.32, colour, { at: [0, 1.2, 0], scale: [1, 0.5, 1] }),
    box([0.4, 0.06, 0.05], ink, { at: [0, 1.0, 0.32] }),
    box([0.3, 0.2, 0.04], "#f8fafc", { at: [0, 0.75, 0.33] }),
    isSolved
      ? box([0.36, 0.4, 0.04], colour, {
          at: [0.28, 0.35, 0.4],
          turn: [0, -1.1, 0],
        })
      : box([0.36, 0.4, 0.04], darken(colour, 0.85), { at: [0, 0.35, 0.33] }),
    box([0.7, 0.12, 0.7], trim, { at: [0, 0.06, 0] }),
  ],
  "clock-tower": (colour, trim, isSolved) => [
    box([1, 2.6, 1], colour, { at: [0, 1.3, 0] }),
    cone(0.85, 0.9, trim, { at: [0, 3.05, 0] }, 4),
    cylinder(
      0.38,
      0.06,
      "#f8fafc",
      { at: [0, 2.1, 0.51], turn: [half, 0, 0] },
      0.38,
      20,
    ),
    box([0.04, 0.26, 0.03], ink, { at: [0, 2.2, 0.56] }),
    box([0.04, 0.2, 0.03], ink, {
      at: isSolved ? [0, 2.0, 0.56] : [0.08, 2.08, 0.56],
      turn: [0, 0, isSolved ? 0 : 1.2],
    }),
    box([0.45, 0.8, 0.05], darken(colour, 0.6), { at: [0, 0.4, 0.51] }),
  ],
  oven: (colour, trim, isSolved) => [
    box([1.3, 1, 0.9], colour, { at: [0, 0.5, 0] }),
    cylinder(
      0.6,
      0.5,
      colour,
      { at: [0, 1.1, 0], turn: [half, 0, 0] },
      0.6,
      12,
    ),
    cylinder(0.12, 0.9, darken(colour, 0.6), { at: [0.35, 1.7, -0.2] }),
    box([0.7, 0.5, 0.05], isSolved ? "#f97316" : "#111827", {
      at: [0, 0.6, 0.46],
    }),
    box([0.75, 0.06, 0.08], trim, { at: [0, 0.9, 0.47] }),
    ...(isSolved
      ? [ball(0.18, "#e2e8f0", { at: [0.35, 2.3, -0.2], scale: [1.5, 1, 1.5] })]
      : []),
  ],
  beehive: (colour, trim, isSolved) => [
    box([0.4, 0.5, 0.4], wood, { at: [0, 0.25, 0] }),
    ...[0, 1, 2, 3].map((layer) =>
      cylinder(
        0.45 - layer * 0.07,
        0.3,
        colour,
        { at: [0, 0.65 + layer * 0.27, 0] },
        0.5 - layer * 0.07,
        14,
      ),
    ),
    box([0.18, 0.1, 0.05], trim, { at: [0, 0.6, 0.5] }),
    ...(isSolved
      ? [box([0.6, 0.06, 0.6], "#f59e0b", { at: [0.8, 0.03, 0] })]
      : []),
    ...[0, 1, 2].map((bee) =>
      ball(0.06, "#facc15", {
        at: [
          Math.cos(bee * 2.1) * 0.7,
          1.1 + bee * 0.2,
          Math.sin(bee * 2.1) * 0.7,
        ],
      }),
    ),
  ],
  snowman: (colour, trim, isSolved) => [
    ball(0.55, colour, { at: [0, 0.5, 0] }),
    ball(0.4, colour, { at: [0, 1.2, 0] }),
    ball(0.28, colour, { at: [0, 1.75, 0] }),
    cone(0.05, 0.3, "#f97316", { at: [0, 1.75, 0.38], turn: [half, 0, 0] }, 6),
    ...[-1, 1].map((side) => ball(0.04, ink, { at: [side * 0.1, 1.85, 0.25] })),
    ...(isSolved
      ? [
          ring(0.3, 0.07, trim, { at: [0, 1.5, 0], turn: [half, 0, 0] }),
          cylinder(0.22, 0.32, ink, { at: [0, 2.12, 0] }),
          cylinder(0.32, 0.04, ink, { at: [0, 1.97, 0] }),
        ]
      : []),
  ],
  "ice-block": (colour, trim, isSolved) =>
    isSolved
      ? [
          box([1.4, 0.06, 1.4], water, { at: [0, 0.03, 0] }),
          gem(0.2, trim, { at: [0, 0.3, 0] }),
        ]
      : [
          box([1.3, 1.3, 1.3], colour, { at: [0, 0.65, 0] }),
          box([0.2, 1.31, 0.2], "#f0f9ff", { at: [0.4, 0.65, 0.4] }),
          gem(0.2, trim, { at: [0, 0.65, 0] }),
        ],
  robot: (colour, trim, isSolved) => [
    box([0.8, 0.9, 0.55], colour, { at: [0, 0.95, 0] }),
    box([0.55, 0.45, 0.45], colour, { at: [0, 1.65, 0] }),
    ...[-1, 1].flatMap((side) => [
      box([0.2, 0.5, 0.2], darken(colour), { at: [side * 0.22, 0.25, 0] }),
      box([0.16, 0.6, 0.16], darken(colour), {
        at: [side * 0.5, isSolved ? 1.3 : 0.85, 0],
        turn: [0, 0, isSolved ? side * 2.6 : side * 0.1],
      }),
      ball(0.07, isSolved ? trim : ink, { at: [side * 0.13, 1.7, 0.23] }),
    ]),
    cylinder(0.02, 0.3, ink, { at: [0, 2.0, 0] }),
    ball(0.06, isSolved ? trim : "#475569", { at: [0, 2.17, 0] }),
    box([0.35, 0.25, 0.05], isSolved ? trim : "#334155", {
      at: [0, 1.0, 0.28],
    }),
  ],
  totem: (colour, trim, isSolved) => [
    ...[0, 1, 2].map((layer) =>
      cylinder(
        0.38,
        0.75,
        layer === 1 ? darken(colour, 0.85) : colour,
        { at: [0, 0.38 + layer * 0.75, 0] },
        0.4,
        10,
      ),
    ),
    ...[0, 1, 2].flatMap((layer) =>
      [-1, 1].map((side) =>
        ball(0.08, isSolved ? trim : ink, {
          at: [side * 0.14, 0.5 + layer * 0.75, 0.36],
        }),
      ),
    ),
    ...[-1, 1].map((side) =>
      box([0.6, 0.12, 0.25], trim, {
        at: [side * 0.6, 1.95, 0],
        turn: [0, 0, side * (isSolved ? -0.5 : 0.3)],
      }),
    ),
    cone(0.3, 0.35, trim, { at: [0, 2.45, 0] }, 6),
  ],
};

/** The parts of a Quest thing, as found or once its Puzzle is solved. */
export const listThingParts = (
  { shape, colour, trim }: Pick<QuestThing, "shape" | "colour" | "trim">,
  isSolved: boolean,
): ModelPart[] => thingBuilders[shape](colour, trim, isSolved);

export const buildThingGeometry = (
  thing: Pick<QuestThing, "shape" | "colour" | "trim">,
  isSolved: boolean,
): BufferGeometry => buildModelGeometry(listThingParts(thing, isSolved));

/** How far round a thing reaches, to keep the Character from walking through it. */
export const thingBlockRadius = 0.85;
