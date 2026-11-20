import type { HistoryChoiceProp } from "../curriculum/history-quests.js";
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
} from "three";
import {
  buildDoricColumn,
  buildFlame,
  buildGableRoof,
  buildTimberHouse,
  type HistoryPropMotion,
  type HistoryPropParts,
} from "./history-prop-parts.js";
import { ancientPropBuilders } from "./history-props-ancient.js";
import { modernPropBuilders } from "./history-props-modern.js";
import { buildModelGeometry, type ModelPart } from "./world-map-models.js";

export interface HistoryPropModel {
  body: BufferGeometry;
  glow: BufferGeometry | undefined;
  motion: HistoryPropMotion;
}

const corePropBuilders = {
  "timber-house": (): HistoryPropParts => ({
    body: buildTimberHouse("#efe3c4", "#4a3220", "#7a4a33"),
  }),
  "timber-house-dark": (): HistoryPropParts => ({
    body: buildTimberHouse("#d9c69a", "#3a2618", "#5c4636"),
  }),
  "burning-house": (): HistoryPropParts => ({
    body: buildTimberHouse("#a8957a", "#2b1d14", "#3b2c24"),
    glow: [
      buildFlame([-0.5, 2.7, 0.2], 1.4),
      buildFlame([0.3, 2.9, -0.1], 1.9, "#ff7a1a"),
      buildFlame([0.75, 2.5, 0.4], 1.1, "#ffd25a"),
      {
        geometry: new BoxGeometry(0.5, 0.45, 0.04),
        colour: "#ff9a2e",
        position: [-0.4, 0.75, 0.72],
      },
      {
        geometry: new BoxGeometry(0.5, 0.45, 0.04),
        colour: "#ffb84d",
        position: [0.45, 1.85, 0.9],
      },
    ],
    motion: "flicker",
  }),
  "church-spire": (): HistoryPropParts => ({
    body: [
      {
        geometry: new BoxGeometry(2.6, 2.4, 1.8),
        colour: "#b9b2a4",
        position: [0, 1.2, 0],
      },
      {
        geometry: buildGableRoof(1.9, 0.9, 2.7),
        colour: "#5d636e",
        position: [0, 2.4, 0],
      },
      {
        geometry: new BoxGeometry(1, 2.4, 1),
        colour: "#a9a294",
        position: [1.1, 3.2, 0],
      },
      {
        geometry: new ConeGeometry(0.72, 3.4, 4),
        colour: "#4f5560",
        position: [1.1, 6.1, 0],
        rotation: [0, Math.PI / 4, 0],
      },
    ],
  }),
  "rowing-boat": (): HistoryPropParts => ({
    body: [
      {
        geometry: new SphereGeometry(1, 12, 6, 0, Math.PI * 2, Math.PI / 2),
        colour: "#6e4426",
        scale: [1.2, 0.35, 0.45],
        rotation: [Math.PI, 0, 0],
        position: [0, 0.32, 0],
      },
      {
        geometry: new BoxGeometry(2.1, 0.06, 0.7),
        colour: "#b98a55",
        position: [0, 0.3, 0],
      },
      {
        geometry: new CylinderGeometry(0.03, 0.03, 1.6, 5),
        colour: "#4a3424",
        position: [0.1, 0.45, 0.45],
        rotation: [0.5, 0, Math.PI / 2],
      },
    ],
    motion: "bob",
  }),
  "doric-column": (): HistoryPropParts => ({
    body: buildDoricColumn(3.6, "#e8e1d0"),
  }),
  "museum-plinth": (): HistoryPropParts => ({
    body: [
      {
        geometry: new BoxGeometry(0.9, 1.1, 0.9),
        colour: "#f2efe8",
        position: [0, 0.55, 0],
      },
      {
        geometry: new SphereGeometry(0.3, 14, 10),
        colour: "#b5663b",
        position: [0, 1.38, 0],
        scale: [1, 1.2, 1],
      },
      {
        geometry: new CylinderGeometry(0.12, 0.2, 0.25, 14),
        colour: "#9a5330",
        position: [0, 1.78, 0],
      },
      {
        geometry: new TorusGeometry(0.2, 0.025, 6, 16),
        colour: "#2c2017",
        position: [0, 1.4, 0],
        rotation: [Math.PI / 2, 0, 0],
      },
    ],
  }),
  "glass-case": (): HistoryPropParts => ({
    body: [
      {
        geometry: new BoxGeometry(1.6, 0.9, 0.9),
        colour: "#5b3a24",
        position: [0, 0.45, 0],
      },
      {
        geometry: new BoxGeometry(1.5, 0.7, 0.8),
        colour: "#bfe3ec",
        position: [0, 1.25, 0],
      },
      {
        geometry: new BoxGeometry(0.5, 0.08, 0.3),
        colour: "#d9a93c",
        position: [-0.3, 0.95, 0],
      },
      {
        geometry: new IcosahedronGeometry(0.16, 0),
        colour: "#c9c2b6",
        position: [0.35, 1.05, 0],
      },
    ],
  }),
  "picture-frame": (): HistoryPropParts => ({
    body: [
      {
        geometry: new BoxGeometry(1.6, 1.2, 0.08),
        colour: "#b8862f",
        position: [0, 2.6, 0],
      },
      {
        geometry: new BoxGeometry(1.36, 0.96, 0.04),
        colour: "#5d7f8e",
        position: [0, 2.6, 0.04],
      },
      {
        geometry: new SphereGeometry(0.22, 10, 8),
        colour: "#e8c9a6",
        position: [0, 2.68, 0.08],
        scale: [1, 1.15, 0.3],
      },
      {
        geometry: new BoxGeometry(0.6, 0.36, 0.04),
        colour: "#3b2f5c",
        position: [0, 2.3, 0.08],
      },
    ],
  }),
  "rope-barrier": (): HistoryPropParts => ({
    body: [
      ...[-1, 1].map((x): ModelPart => ({
        geometry: new CylinderGeometry(0.06, 0.08, 0.9, 8),
        colour: "#c9a14a",
        position: [x, 0.45, 0],
      })),
      {
        geometry: new TorusGeometry(1, 0.035, 5, 16, Math.PI),
        colour: "#9e1c2a",
        position: [0, 0.86, 0],
        rotation: [0, 0, Math.PI],
        scale: [1, 0.25, 1],
      },
    ],
  }),
  pyramid: (): HistoryPropParts => ({
    body: [
      {
        geometry: new ConeGeometry(1, 1, 4, 1),
        colour: "#e2c48a",
        position: [0, 0.5, 0],
        rotation: [0, Math.PI / 4, 0],
        scale: [3.6, 3.4, 3.6],
      },
      {
        geometry: new ConeGeometry(1, 1, 4, 1),
        colour: "#f4ead2",
        position: [0, 3.1, 0],
        rotation: [0, Math.PI / 4, 0],
        scale: [0.5, 0.45, 0.5],
      },
    ],
  }),
  "palm-tree": (): HistoryPropParts => ({
    body: [
      ...[0, 1, 2, 3, 4].map((segment): ModelPart => ({
        geometry: new CylinderGeometry(0.12, 0.15, 0.55, 6),
        colour: segment % 2 === 0 ? "#8a6a43" : "#7a5c38",
        position: [segment * 0.06, 0.28 + segment * 0.52, 0],
        rotation: [0, 0, -0.05],
      })),
      ...[0, 1, 2, 3, 4, 5].map((leaf): ModelPart => ({
        geometry: new ConeGeometry(0.18, 1.6, 4),
        colour: leaf % 2 === 0 ? "#3f8f3a" : "#58a845",
        position: [
          0.3 + Math.cos((leaf / 6) * Math.PI * 2) * 0.55,
          2.75,
          Math.sin((leaf / 6) * Math.PI * 2) * 0.55,
        ],
        rotation: [
          Math.sin((leaf / 6) * Math.PI * 2) * 1.1,
          0,
          -Math.cos((leaf / 6) * Math.PI * 2) * 1.1,
        ],
        scale: [1, 1, 0.35],
      })),
    ],
    motion: "sway",
  }),
  obelisk: (): HistoryPropParts => ({
    body: [
      {
        geometry: new BoxGeometry(0.9, 0.3, 0.9),
        colour: "#c9a46a",
        position: [0, 0.15, 0],
      },
      {
        geometry: new CylinderGeometry(0.26, 0.38, 3.6, 4),
        colour: "#d8b57a",
        position: [0, 2.1, 0],
        rotation: [0, Math.PI / 4, 0],
      },
      {
        geometry: new ConeGeometry(0.26, 0.4, 4),
        colour: "#e9c55a",
        position: [0, 4.1, 0],
        rotation: [0, Math.PI / 4, 0],
      },
    ],
  }),
  "sand-dune": (): HistoryPropParts => ({
    body: [
      {
        geometry: new SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        colour: "#e5c48a",
        scale: [4, 0.9, 2.2],
        isSmooth: true,
      },
    ],
  }),
  sphinx: (): HistoryPropParts => ({
    body: [
      {
        geometry: new BoxGeometry(2.6, 0.5, 1.1),
        colour: "#d2b077",
        position: [0, 0.25, 0],
      },
      {
        geometry: new BoxGeometry(2.0, 0.6, 0.9),
        colour: "#dcbc84",
        position: [-0.2, 0.8, 0],
      },
      ...[-0.3, 0.3].map((z): ModelPart => ({
        geometry: new BoxGeometry(1.0, 0.25, 0.28),
        colour: "#d6b47c",
        position: [1.35, 0.4, z],
      })),
      {
        geometry: new BoxGeometry(0.62, 0.8, 0.7),
        colour: "#dcbc84",
        position: [0.85, 1.4, 0],
      },
      {
        geometry: new ConeGeometry(0.62, 0.9, 4),
        colour: "#3f5f8a",
        position: [0.75, 1.55, 0],
        rotation: [0, Math.PI / 4, 0],
        scale: [0.9, 1, 1.25],
      },
      {
        geometry: new BoxGeometry(0.42, 0.52, 0.5),
        colour: "#e4c690",
        position: [1.1, 1.42, 0],
      },
    ],
  }),
  "papyrus-reeds": (): HistoryPropParts => ({
    body: [-0.3, 0, 0.25, 0.45].map((x, index): ModelPart => ({
      geometry: new CylinderGeometry(0.03, 0.04, 1.4 + index * 0.2, 4),
      colour: "#6f9a3c",
      position: [x, 0.7 + index * 0.1, (index % 2) * 0.2 - 0.1],
      rotation: [0, 0, (x - 0.1) * 0.4],
    })),
    motion: "sway",
  }),
  "hanging-lamp": (): HistoryPropParts => ({
    body: [
      {
        geometry: new CylinderGeometry(0.015, 0.015, 1.4, 4),
        colour: "#2b2b2b",
        position: [0, 4.3, 0],
      },
      {
        geometry: new ConeGeometry(0.42, 0.3, 12, 1, true),
        colour: "#2f4f3f",
        position: [0, 3.55, 0],
      },
    ],
    glow: [
      {
        geometry: new SphereGeometry(0.14, 10, 8),
        colour: "#fff1c2",
        position: [0, 3.38, 0],
      },
    ],
  }),
  "museum-bench": (): HistoryPropParts => ({
    body: [
      {
        geometry: new BoxGeometry(2, 0.12, 0.6),
        colour: "#8b5a35",
        position: [0, 0.48, 0],
      },
      ...[-0.85, 0.85].map((x): ModelPart => ({
        geometry: new BoxGeometry(0.1, 0.45, 0.5),
        colour: "#2e2a26",
        position: [x, 0.22, 0],
      })),
    ],
  }),
  "wall-banner": (): HistoryPropParts => ({
    body: [
      {
        geometry: new CylinderGeometry(0.04, 0.04, 1.4, 6),
        colour: "#c9a14a",
        position: [0, 4.4, 0],
        rotation: [0, 0, Math.PI / 2],
      },
      {
        geometry: new PlaneGeometry(1.2, 2.4),
        colour: "#7b1e2b",
        position: [0, 3.2, 0.02],
      },
      {
        geometry: new PlaneGeometry(0.6, 0.6),
        colour: "#e7c766",
        position: [0, 3.4, 0.04],
        rotation: [0, 0, Math.PI / 4],
      },
    ],
    motion: "sway",
  }),
} satisfies Record<string, () => HistoryPropParts>;

export const historyPropSets = {
  core: Object.keys(corePropBuilders),
  modern: Object.keys(modernPropBuilders),
  ancient: Object.keys(ancientPropBuilders),
};

const historyPropBuilders = {
  ...corePropBuilders,
  ...modernPropBuilders,
  ...ancientPropBuilders,
};

export type HistoryPropKind = keyof typeof historyPropBuilders;

export const historyPropKinds = Object.keys(historyPropBuilders).filter(
  (kind): kind is HistoryPropKind => kind in historyPropBuilders,
);

export const buildHistoryPropModel = (
  kind: HistoryPropKind,
): HistoryPropModel => {
  const { body, glow, motion = "still" } = historyPropBuilders[kind]();
  return {
    body: buildModelGeometry(body),
    glow: glow === undefined ? undefined : buildModelGeometry(glow),
    motion,
  };
};

const timeRing: ModelPart = {
  geometry: new TorusGeometry(0.78, 0.035, 4, 18),
  colour: "#f5c84c",
  position: [0, -0.78, 0],
  rotation: [Math.PI / 2, 0, 0],
};

const historyChoicePropBuilders: Record<HistoryChoiceProp, () => ModelPart[]> =
  {
    basket: () => [
      {
        geometry: new CylinderGeometry(0.62, 0.46, 0.7, 14, 3, true),
        colour: "#b98545",
        position: [0, -0.3, 0],
        roughen: 0.04,
      },
      {
        geometry: new CylinderGeometry(0.46, 0.46, 0.04, 14),
        colour: "#8a5f2e",
        position: [0, -0.64, 0],
      },
      {
        geometry: new TorusGeometry(0.62, 0.05, 4, 18),
        colour: "#8a5f2e",
        position: [0, 0.05, 0],
        rotation: [Math.PI / 2, 0, 0],
      },
      {
        geometry: new TorusGeometry(0.5, 0.04, 4, 18, Math.PI),
        colour: "#8a5f2e",
        position: [0, 0.05, 0],
      },
    ],
    "wooden-crate": () => [
      {
        geometry: new BoxGeometry(1.05, 0.9, 0.8),
        colour: "#b07d48",
        position: [0, -0.25, 0],
      },
      ...[-0.42, 0.42].map((x): ModelPart => ({
        geometry: new BoxGeometry(0.12, 0.94, 0.84),
        colour: "#7a5230",
        position: [x, -0.25, 0],
      })),
      {
        geometry: new BoxGeometry(1.1, 0.12, 0.06),
        colour: "#7a5230",
        position: [0, -0.25, 0.42],
        rotation: [0, 0, 0.62],
      },
    ],
    book: () => [
      {
        geometry: new BoxGeometry(1.2, 0.22, 0.9),
        colour: "#7b1e2b",
        position: [0, -0.4, 0],
        rotation: [0.5, 0, 0],
      },
      {
        geometry: new BoxGeometry(1.1, 0.16, 0.82),
        colour: "#f4ead2",
        position: [0, -0.33, 0.02],
        rotation: [0.5, 0, 0],
      },
      {
        geometry: new BoxGeometry(0.06, 0.24, 0.92),
        colour: "#d9a93c",
        position: [0, -0.32, 0],
        rotation: [0.5, 0, 0],
      },
    ],
    "treasure-chest": () => [
      {
        geometry: new BoxGeometry(1.1, 0.62, 0.72),
        colour: "#8b5a2b",
        position: [0, -0.4, 0],
      },
      {
        geometry: new CylinderGeometry(
          0.36,
          0.36,
          1.1,
          12,
          1,
          false,
          0,
          Math.PI,
        ),
        colour: "#9c6532",
        position: [0, -0.09, 0],
        rotation: [0, 0, Math.PI / 2],
      },
      ...[-0.38, 0.38].map((x): ModelPart => ({
        geometry: new BoxGeometry(0.1, 1.02, 0.76),
        colour: "#d9a93c",
        position: [x, -0.24, 0],
      })),
      {
        geometry: new BoxGeometry(0.18, 0.22, 0.06),
        colour: "#f5c84c",
        position: [0, -0.2, 0.38],
      },
    ],
    "stone-tablet": () => [
      {
        geometry: new BoxGeometry(0.95, 1.2, 0.2),
        colour: "#a7a196",
        position: [0, -0.1, 0],
        roughen: 0.05,
      },
      {
        geometry: new CylinderGeometry(
          0.475,
          0.475,
          0.2,
          14,
          1,
          false,
          0,
          Math.PI,
        ),
        colour: "#a7a196",
        position: [0, 0.5, 0],
        rotation: [Math.PI / 2, Math.PI / 2, 0],
      },
      ...[0.2, 0, -0.2, -0.4].map((y): ModelPart => ({
        geometry: new BoxGeometry(0.6, 0.05, 0.04),
        colour: "#6f6a62",
        position: [0, y, 0.11],
      })),
    ],
    lantern: () => [
      {
        geometry: new CylinderGeometry(0.42, 0.48, 0.1, 6),
        colour: "#2f2a26",
        position: [0, -0.62, 0],
      },
      {
        geometry: new CylinderGeometry(0.36, 0.36, 0.8, 6),
        colour: "#ffd277",
        position: [0, -0.18, 0],
      },
      {
        geometry: new ConeGeometry(0.48, 0.36, 6),
        colour: "#2f2a26",
        position: [0, 0.4, 0],
      },
      {
        geometry: new TorusGeometry(0.14, 0.03, 4, 12),
        colour: "#2f2a26",
        position: [0, 0.66, 0],
      },
    ],
    scroll: () => [
      {
        geometry: new BoxGeometry(1.0, 1.0, 0.03),
        colour: "#f1e2bb",
        position: [0, -0.15, 0],
      },
      ...[0.38, -0.68].map((y): ModelPart => ({
        geometry: new CylinderGeometry(0.09, 0.09, 1.16, 10),
        colour: "#e3cc95",
        position: [0, y, 0.02],
        rotation: [0, 0, Math.PI / 2],
      })),
      ...[-0.64, 0.64].map((x): ModelPart => ({
        geometry: new SphereGeometry(0.1, 8, 6),
        colour: "#7b1e2b",
        position: [x, 0.38, 0.02],
      })),
    ],
    shield: () => [
      {
        geometry: new CylinderGeometry(0.66, 0.66, 0.1, 14),
        colour: "#9e2a2b",
        position: [0, -0.1, 0],
        rotation: [Math.PI / 2, 0, 0],
      },
      {
        geometry: new TorusGeometry(0.66, 0.06, 4, 18),
        colour: "#d9a93c",
        position: [0, -0.1, 0],
      },
      {
        geometry: new SphereGeometry(
          0.16,
          12,
          7,
          0,
          Math.PI * 2,
          0,
          Math.PI / 2,
        ),
        colour: "#e3b84c",
        position: [0, -0.1, 0.05],
        rotation: [Math.PI / 2, 0, 0],
      },
    ],
    "gold-coin": () => [
      {
        geometry: new CylinderGeometry(0.62, 0.62, 0.12, 14),
        colour: "#e9b730",
        position: [0, -0.05, 0],
        rotation: [Math.PI / 2, 0, 0],
      },
      {
        geometry: new TorusGeometry(0.52, 0.035, 4, 18),
        colour: "#ffd966",
        position: [0, -0.05, 0.07],
      },
      {
        geometry: new CylinderGeometry(0.2, 0.2, 0.04, 6),
        colour: "#c9921f",
        position: [0, -0.05, 0.08],
        rotation: [Math.PI / 2, 0, 0],
      },
    ],
    "clay-pot": () => [
      {
        geometry: new SphereGeometry(0.5, 12, 7),
        colour: "#c06a3a",
        position: [0, -0.32, 0],
        scale: [1, 1.05, 1],
      },
      {
        geometry: new CylinderGeometry(0.22, 0.3, 0.36, 14),
        colour: "#b55f31",
        position: [0, 0.3, 0],
      },
      {
        geometry: new TorusGeometry(0.24, 0.05, 4, 16),
        colour: "#9a4c27",
        position: [0, 0.48, 0],
        rotation: [Math.PI / 2, 0, 0],
      },
      {
        geometry: new TorusGeometry(0.51, 0.03, 4, 18),
        colour: "#2c2017",
        position: [0, -0.25, 0],
        rotation: [Math.PI / 2, 0, 0],
      },
    ],
    torch: () => [
      {
        geometry: new CylinderGeometry(0.08, 0.06, 1.1, 8),
        colour: "#6b4426",
        position: [0, -0.3, 0],
      },
      {
        geometry: new CylinderGeometry(0.16, 0.12, 0.2, 8),
        colour: "#3b2a1e",
        position: [0, 0.3, 0],
      },
      {
        geometry: new ConeGeometry(0.2, 0.5, 8),
        colour: "#ff9a2e",
        position: [0, 0.62, 0],
      },
      {
        geometry: new ConeGeometry(0.11, 0.32, 8),
        colour: "#ffe08a",
        position: [0, 0.58, 0.03],
      },
    ],
    "dig-mound": () => [
      {
        geometry: new SphereGeometry(
          0.72,
          12,
          7,
          0,
          Math.PI * 2,
          0,
          Math.PI / 2,
        ),
        colour: "#8a6040",
        position: [0, -0.7, 0],
        scale: [1, 0.75, 0.8],
        roughen: 0.12,
        isSmooth: true,
      },
      {
        geometry: new BoxGeometry(0.08, 0.7, 0.04),
        colour: "#6b4426",
        position: [0.36, -0.14, 0.1],
        rotation: [0, 0, -0.4],
      },
      {
        geometry: new BoxGeometry(0.26, 0.3, 0.03),
        colour: "#9aa3ab",
        position: [0.2, -0.5, 0.12],
        rotation: [0, 0, -0.4],
      },
      {
        geometry: new IcosahedronGeometry(0.12, 0),
        colour: "#e9b730",
        position: [-0.22, -0.3, 0.3],
      },
    ],
  };

export const buildHistoryChoiceModel = (
  prop: HistoryChoiceProp,
): BufferGeometry =>
  buildModelGeometry([...historyChoicePropBuilders[prop](), timeRing]);
