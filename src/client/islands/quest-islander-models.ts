import { Color, type BufferGeometry } from "three";
import type {
  IslanderHat,
  IslanderHeld,
  IslanderLook,
} from "../../curriculum/island-quests.js";
import { buildModelGeometry, type ModelPart } from "../world-map-models.js";
import { ball, box, cone, cylinder, gem, ring } from "./quest-model-kit.js";

/**
 * An Islander (ADR 0058): a person a little taller than the Character,
 * built from the same rounded kit as the Island's friends, with a hat,
 * outfit and something in their hand for their job.
 */

const half = Math.PI / 2;

const darken = (colour: string, by = 0.7): string =>
  `#${new Color(colour).multiplyScalar(by).getHexString()}`;

const ink = "#1f2937";
const wood = "#8b5a2b";
const shoe = "#292524";

const headHeight = 1.42;
const headRadius = 0.24;

const hatBuilders: Record<IslanderHat, (colour: string) => ModelPart[]> = {
  none: () => [],
  "police-helmet": (colour) => [
    cylinder(0.2, 0.3, colour, { at: [0, headHeight + 0.24, 0] }, 0.26),
    ball(0.2, colour, { at: [0, headHeight + 0.38, 0], scale: [1, 0.7, 1] }),
    gem(0.06, "#e5e7eb", { at: [0, headHeight + 0.26, 0.24] }),
    ball(0.04, "#e5e7eb", { at: [0, headHeight + 0.52, 0] }),
  ],
  "fire-helmet": (colour) => [
    ball(0.27, colour, { at: [0, headHeight + 0.1, 0], scale: [1, 0.8, 1.05] }),
    cylinder(
      0.36,
      0.04,
      colour,
      { at: [0, headHeight + 0.04, -0.06] },
      0.38,
      16,
    ),
    box([0.14, 0.18, 0.04], "#f8fafc", { at: [0, headHeight + 0.18, 0.26] }),
  ],
  "chef-hat": (colour) => [
    cylinder(0.22, 0.25, colour, { at: [0, headHeight + 0.28, 0] }),
    ball(0.28, colour, { at: [0, headHeight + 0.48, 0], scale: [1, 0.7, 1] }),
  ],
  cap: (colour) => [
    ball(0.25, colour, { at: [0, headHeight + 0.1, 0], scale: [1, 0.6, 1] }),
    box([0.3, 0.03, 0.22], colour, { at: [0, headHeight + 0.08, 0.26] }),
  ],
  "captain-hat": (colour) => [
    cylinder(0.25, 0.12, colour, { at: [0, headHeight + 0.18, 0] }, 0.23),
    cylinder(0.3, 0.08, "#f8fafc", { at: [0, headHeight + 0.27, 0] }, 0.26),
    box([0.3, 0.03, 0.16], ink, { at: [0, headHeight + 0.12, 0.26] }),
    gem(0.05, "#facc15", { at: [0, headHeight + 0.2, 0.26] }),
  ],
  "hard-hat": (colour) => [
    ball(0.27, colour, { at: [0, headHeight + 0.1, 0], scale: [1, 0.75, 1] }),
    cylinder(0.33, 0.03, colour, { at: [0, headHeight + 0.06, 0] }, 0.33, 16),
  ],
  beanie: (colour) => [
    ball(0.26, colour, { at: [0, headHeight + 0.08, 0], scale: [1, 0.85, 1] }),
    cylinder(0.27, 0.08, darken(colour), { at: [0, headHeight + 0.04, 0] }),
  ],
  "sun-hat": (colour) => [
    cylinder(0.5, 0.03, colour, { at: [0, headHeight + 0.12, 0] }, 0.5, 18),
    ball(0.22, colour, { at: [0, headHeight + 0.16, 0], scale: [1, 0.8, 1] }),
    cylinder(0.225, 0.06, "#dc2626", { at: [0, headHeight + 0.16, 0] }),
  ],
  crown: (colour) => [
    cylinder(0.22, 0.14, colour, { at: [0, headHeight + 0.25, 0] }),
    ...Array.from({ length: 5 }, (_, point) => {
      const angle = (point / 5) * Math.PI * 2;
      return cone(
        0.05,
        0.12,
        colour,
        {
          at: [Math.cos(angle) * 0.2, headHeight + 0.38, Math.sin(angle) * 0.2],
        },
        5,
      );
    }),
  ],
  "wizard-hat": (colour) => [
    cylinder(0.4, 0.03, colour, { at: [0, headHeight + 0.15, 0] }, 0.4, 16),
    cone(0.24, 0.6, colour, {
      at: [0, headHeight + 0.45, 0],
      turn: [0.15, 0, 0],
    }),
    gem(0.05, "#facc15", { at: [0.1, headHeight + 0.35, 0.2] }),
  ],
  "top-hat": (colour) => [
    cylinder(0.36, 0.03, colour, { at: [0, headHeight + 0.15, 0] }, 0.36, 16),
    cylinder(0.2, 0.36, colour, { at: [0, headHeight + 0.34, 0] }, 0.2, 14),
    cylinder(0.205, 0.06, "#7f1d1d", { at: [0, headHeight + 0.2, 0] }),
  ],
  "bobble-hat": (colour) => [
    ball(0.26, colour, { at: [0, headHeight + 0.08, 0], scale: [1, 0.85, 1] }),
    ball(0.08, "#f8fafc", { at: [0, headHeight + 0.32, 0] }),
    cylinder(0.27, 0.08, "#f8fafc", { at: [0, headHeight + 0.04, 0] }),
  ],
  beret: (colour) => [
    ball(0.28, colour, {
      at: [0.04, headHeight + 0.15, 0],
      scale: [1, 0.35, 1],
    }),
  ],
  "explorer-hat": (colour) => [
    ball(0.25, colour, { at: [0, headHeight + 0.12, 0], scale: [1, 0.75, 1] }),
    cylinder(0.38, 0.03, colour, { at: [0, headHeight + 0.08, 0] }, 0.4, 16),
    cylinder(0.255, 0.05, darken(colour, 0.5), {
      at: [0, headHeight + 0.12, 0],
    }),
  ],
  headscarf: (colour) => [
    ball(0.27, colour, {
      at: [0, headHeight + 0.04, -0.02],
      scale: [1, 0.95, 1],
    }),
    cone(0.12, 0.25, colour, {
      at: [0, headHeight - 0.2, -0.22],
      turn: [0.4, 0, 0],
    }),
  ],
  "space-helmet": (colour) => [
    ball(0.36, "#bae6fd", { at: [0, headHeight, 0] }),
    ring(0.3, 0.05, colour, {
      at: [0, headHeight - 0.24, 0],
      turn: [half, 0, 0],
    }),
  ],
  "cowboy-hat": (colour) => [
    cylinder(0.46, 0.03, colour, { at: [0, headHeight + 0.14, 0] }, 0.46, 16),
    cylinder(0.2, 0.22, colour, { at: [0, headHeight + 0.25, 0] }, 0.23, 12),
  ],
  "nurse-cap": (colour) => [
    box([0.34, 0.12, 0.2], colour, { at: [0, headHeight + 0.22, 0.02] }),
    box([0.08, 0.02, 0.04], "#dc2626", { at: [0, headHeight + 0.24, 0.12] }),
    box([0.02, 0.08, 0.04], "#dc2626", { at: [0, headHeight + 0.24, 0.12] }),
  ],
  mortarboard: (colour) => [
    cylinder(0.24, 0.12, colour, { at: [0, headHeight + 0.2, 0] }),
    box([0.55, 0.04, 0.55], colour, {
      at: [0, headHeight + 0.28, 0],
      turn: [0, Math.PI / 4, 0],
    }),
    cylinder(0.015, 0.25, "#facc15", { at: [0.2, headHeight + 0.18, 0.1] }),
  ],
  "horned-helmet": (colour) => [
    ball(0.27, colour, { at: [0, headHeight + 0.08, 0], scale: [1, 0.8, 1] }),
    ...[-1, 1].map((side) =>
      cone(
        0.06,
        0.3,
        "#f5f5f4",
        {
          at: [side * 0.3, headHeight + 0.22, 0],
          turn: [0, 0, side * -0.9],
        },
        8,
      ),
    ),
  ],
  "flower-crown": (colour) =>
    Array.from({ length: 7 }, (_, flower) => {
      const angle = (flower / 7) * Math.PI * 2;
      return ball(0.06, flower % 2 === 0 ? colour : "#fde047", {
        at: [Math.cos(angle) * 0.24, headHeight + 0.14, Math.sin(angle) * 0.24],
      });
    }),
};

const heldAt = [0.36, 0.72, 0.18] as const;

const heldBuilders: Record<IslanderHeld, () => ModelPart[]> = {
  none: () => [],
  staff: () => [
    cylinder(0.035, 1.5, wood, { at: [heldAt[0], 0.75, heldAt[2]] }),
    ball(0.07, "#facc15", { at: [heldAt[0], 1.52, heldAt[2]] }),
  ],
  book: () => [
    box([0.24, 0.3, 0.07], "#7c3aed", {
      at: [heldAt[0], heldAt[1], heldAt[2] + 0.05],
    }),
  ],
  spade: () => [
    cylinder(0.025, 1, wood, { at: [heldAt[0], 0.6, heldAt[2]] }),
    box([0.18, 0.24, 0.03], "#9ca3af", { at: [heldAt[0], 0.12, heldAt[2]] }),
  ],
  basket: () => [
    cylinder(
      0.14,
      0.14,
      "#c8a165",
      { at: [heldAt[0], heldAt[1] - 0.1, heldAt[2]] },
      0.1,
      10,
    ),
    ring(
      0.12,
      0.015,
      "#8a6a3a",
      { at: [heldAt[0], heldAt[1], heldAt[2]] },
      Math.PI,
    ),
  ],
  net: () => [
    cylinder(0.02, 1, wood, {
      at: [heldAt[0], 0.9, heldAt[2]],
      turn: [0.2, 0, 0],
    }),
    ring(0.14, 0.015, "#e5e7eb", { at: [heldAt[0], 1.45, heldAt[2] + 0.12] }),
  ],
  lantern: () => [
    box([0.14, 0.18, 0.14], "#fde68a", {
      at: [heldAt[0], heldAt[1] - 0.14, heldAt[2]],
    }),
    cone(0.1, 0.08, ink, { at: [heldAt[0], heldAt[1] - 0.01, heldAt[2]] }, 4),
  ],
  clipboard: () => [
    box([0.22, 0.3, 0.03], wood, {
      at: [heldAt[0], heldAt[1], heldAt[2] + 0.06],
    }),
    box([0.18, 0.24, 0.035], "#f8fafc", {
      at: [heldAt[0], heldAt[1] - 0.02, heldAt[2] + 0.06],
    }),
  ],
  spanner: () => [
    box([0.05, 0.3, 0.03], "#9ca3af", {
      at: [heldAt[0], heldAt[1] - 0.1, heldAt[2]],
    }),
  ],
  wand: () => [
    cylinder(0.015, 0.36, ink, {
      at: [heldAt[0], heldAt[1] + 0.1, heldAt[2] + 0.1],
      turn: [0.6, 0, 0],
    }),
    gem(0.04, "#facc15", {
      at: [heldAt[0], heldAt[1] + 0.25, heldAt[2] + 0.22],
    }),
  ],
  "fishing-rod": () => [
    cylinder(0.015, 1.4, wood, {
      at: [heldAt[0], 1.1, heldAt[2] + 0.3],
      turn: [0.6, 0, 0],
    }),
  ],
  paintbrush: () => [
    cylinder(0.02, 0.3, wood, { at: [heldAt[0], heldAt[1] + 0.05, heldAt[2]] }),
    cone(0.03, 0.08, "#ef4444", {
      at: [heldAt[0], heldAt[1] + 0.24, heldAt[2]],
    }),
  ],
  telescope: () => [
    cylinder(
      0.05,
      0.4,
      "#b8860b",
      { at: [heldAt[0], heldAt[1], heldAt[2] + 0.1], turn: [half, 0, 0] },
      0.04,
    ),
  ],
  hose: () => [
    cylinder(0.05, 0.4, "#b91c1c", {
      at: [heldAt[0], heldAt[1] - 0.05, heldAt[2] + 0.1],
      turn: [1.1, 0, 0],
    }),
    cylinder(0.04, 0.12, "#facc15", {
      at: [heldAt[0], heldAt[1] + 0.06, heldAt[2] + 0.28],
      turn: [1.1, 0, 0],
    }),
  ],
  stethoscope: () => [
    ring(0.12, 0.015, ink, { at: [0, 1.05, 0.16], turn: [0.3, 0, 0] }, Math.PI),
    cylinder(0.04, 0.02, "#9ca3af", {
      at: [0.05, 0.9, 0.24],
      turn: [half, 0, 0],
    }),
  ],
  whistle: () => [
    ball(0.05, "#cbd5e1", {
      at: [heldAt[0], heldAt[1], heldAt[2] + 0.05],
      scale: [1.4, 1, 1],
    }),
  ],
};

const listHairParts = ({ hair, hairStyle }: IslanderLook): ModelPart[] => {
  switch (hairStyle) {
    case "bald":
      return [];
    case "short":
      return [
        ball(0.25, hair, {
          at: [0, headHeight + 0.06, -0.07],
          scale: [1, 0.85, 1],
        }),
      ];
    case "long":
      return [
        ball(0.255, hair, { at: [0, headHeight + 0.05, -0.08] }),
        box([0.44, 0.45, 0.16], hair, { at: [0, headHeight - 0.18, -0.12] }),
      ];
    case "bun":
      return [
        ball(0.25, hair, {
          at: [0, headHeight + 0.06, -0.07],
          scale: [1, 0.85, 1],
        }),
        ball(0.11, hair, { at: [0, headHeight + 0.12, -0.26] }),
      ];
    case "curly":
      return Array.from({ length: 9 }, (_, curl) => {
        const angle = (curl / 9) * Math.PI * 2;
        return ball(0.1, hair, {
          at: [
            Math.cos(angle) * 0.2,
            headHeight + 0.12 + Math.sin(angle * 2) * 0.03,
            Math.sin(angle) * 0.2 - 0.03,
          ],
        });
      });
    case "ponytail":
      return [
        ball(0.25, hair, {
          at: [0, headHeight + 0.06, -0.07],
          scale: [1, 0.85, 1],
        }),
        cone(
          0.08,
          0.4,
          hair,
          { at: [0, headHeight - 0.12, -0.3], turn: [Math.PI - 0.3, 0, 0] },
          8,
        ),
      ];
  }
};

const listOutfitParts = ({
  outfit,
  top,
  legs,
  skin,
}: IslanderLook): ModelPart[] => {
  const isLong = outfit === "dress" || outfit === "robe";
  const body: ModelPart[] = [
    cylinder(0.22, 0.6, top, { at: [0, 0.95, 0] }, 0.25, 12),
    ball(0.22, top, { at: [0, 1.22, 0], scale: [1.05, 0.5, 0.9] }),
    ...[-1, 1].flatMap((side) => [
      cylinder(
        0.07,
        0.5,
        top,
        { at: [side * 0.3, 0.98, 0.02], turn: [0, 0, side * 0.15] },
        0.065,
        8,
      ),
      ball(0.07, skin, { at: [side * 0.34, 0.7, 0.04] }),
    ]),
  ];
  const lower: ModelPart[] = isLong
    ? [
        cylinder(0.25, 0.65, legs, { at: [0, 0.38, 0] }, 0.36, 14),
        ...[-1, 1].map((side) =>
          box([0.12, 0.06, 0.2], shoe, { at: [side * 0.1, 0.03, 0.04] }),
        ),
      ]
    : [
        ...[-1, 1].flatMap((side) => [
          cylinder(0.085, 0.62, legs, { at: [side * 0.1, 0.35, 0] }, 0.08, 8),
          box([0.13, 0.08, 0.22], shoe, { at: [side * 0.1, 0.04, 0.04] }),
        ]),
      ];
  const extras: ModelPart[] = (() => {
    switch (outfit) {
      case "apron":
        return [box([0.34, 0.6, 0.03], "#f8fafc", { at: [0, 0.75, 0.24] })];
      case "overalls":
        return [
          box([0.3, 0.26, 0.03], legs, { at: [0, 1.02, 0.235] }),
          ...[-1, 1].map((side) =>
            box([0.05, 0.3, 0.03], legs, { at: [side * 0.12, 1.18, 0.21] }),
          ),
        ];
      case "coat":
        return [
          cylinder(0.26, 0.3, darken(top, 0.9), { at: [0, 0.58, 0] }, 0.3, 12),
          box([0.03, 0.8, 0.03], darken(top, 0.6), { at: [0, 0.8, 0.255] }),
        ];
      case "uniform":
        return [
          box([0.42, 0.06, 0.48], ink, {
            at: [0, 0.68, 0],
            scale: [1, 1, 0.55],
          }),
          gem(0.04, "#facc15", { at: [-0.1, 1.08, 0.24] }),
          box([0.06, 0.06, 0.03], "#facc15", { at: [0, 0.9, 0.25] }),
        ];
      case "robe":
        return [
          cone(0.18, 0.3, darken(top), {
            at: [0, 1.22, -0.18],
            turn: [-0.5, 0, 0],
          }),
        ];
      case "spacesuit":
        return [
          box([0.3, 0.3, 0.12], "#e5e7eb", { at: [0, 1.0, -0.26] }),
          box([0.12, 0.08, 0.03], "#2563eb", { at: [0.08, 1.05, 0.24] }),
        ];
      case "dress":
      case "tunic":
        return [
          cylinder(0.255, 0.05, darken(top), { at: [0, 0.68, 0] }, 0.26, 12),
        ];
    }
  })();
  return [...lower, ...body, ...extras];
};

/** The parts of an Islander, standing on the ground at the origin and facing +z. */
export const listIslanderParts = (look: IslanderLook): ModelPart[] => [
  ...listOutfitParts(look),
  cylinder(0.08, 0.12, look.skin, { at: [0, 1.22, 0] }),
  ball(headRadius, look.skin, { at: [0, headHeight, 0] }),
  ...[-1, 1].flatMap((side) => [
    ball(0.035, ink, {
      at: [side * 0.085, headHeight + 0.04, headRadius - 0.03],
    }),
    ball(0.05, look.skin, { at: [side * headRadius, headHeight, 0] }),
  ]),
  box([0.1, 0.025, 0.02], "#9f1239", {
    at: [0, headHeight - 0.09, headRadius - 0.02],
  }),
  ...(look.hasBeard
    ? [
        ball(0.17, look.hair, {
          at: [0, headHeight - 0.13, 0.1],
          scale: [1, 0.8, 0.7],
        }),
      ]
    : []),
  ...listHairParts(look),
  ...hatBuilders[look.hat](look.hatColour),
  ...heldBuilders[look.held](),
];

export const buildIslanderGeometry = (look: IslanderLook): BufferGeometry =>
  buildModelGeometry(listIslanderParts(look));

/** How tall an Islander stands, for the name and speech marker above them. */
export const islanderHeight = 1.9;

export const islanderBlockRadius = 0.4;
