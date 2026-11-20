import type { HistoryScene } from "../curriculum/history-quests.js";
import type { HistoryPropKind } from "./history-props.js";
import { ancientSceneLooks } from "./history-scenes-ancient.js";
import { modernSceneLooks } from "./history-scenes-modern.js";

export type GroundPattern =
  | "earth"
  | "grass"
  | "sand"
  | "planks"
  | "flagstones"
  | "cobbles"
  | "moon"
  | "snow";

export type HistoryParticles =
  "none" | "embers" | "dust" | "snow" | "stars" | "fireflies" | "sand" | "rain";

export interface HistoryPropPlacement {
  kind: HistoryPropKind;
  x: number;
  z: number;
  scale?: number;
  turn?: number;
  lift?: number;
}

export interface HistorySceneLook {
  sky: {
    top: string;
    bottom: string;
    glow: string;
    glowX: number;
    glowY: number;
    glowSize: number;
  };
  backdropDistance: number;
  ground: { near: string; far: string; pattern: GroundPattern };
  water: { colour: string; nearZ: number; farZ: number } | undefined;
  light: {
    sun: string;
    sunIntensity: number;
    skyLight: string;
    groundLight: string;
    ambientIntensity: number;
  };
  warmLight:
    | { colour: string; intensity: number; x: number; y: number; z: number }
    | undefined;
  fog: { near: number; far: number };
  particles: HistoryParticles;
  props: HistoryPropPlacement[];
}

export const historyGroundHeight = -2.6;

const coreSceneLooks: Record<
  Extract<HistoryScene, "burning-london" | "museum-hall" | "egypt-desert">,
  HistorySceneLook
> = {
  "burning-london": {
    sky: {
      top: "#24122e",
      bottom: "#ff7a3a",
      glow: "#ffb347",
      glowX: 0.56,
      glowY: 0.34,
      glowSize: 0.5,
    },
    backdropDistance: 20,
    ground: { near: "#5a4a3e", far: "#3a2c26", pattern: "cobbles" },
    water: { colour: "#2c3550", nearZ: -11.5, farZ: -16 },
    light: {
      sun: "#ffb070",
      sunIntensity: 1.6,
      skyLight: "#ff9a5a",
      groundLight: "#2a1a20",
      ambientIntensity: 0.9,
    },
    warmLight: { colour: "#ff8a3a", intensity: 40, x: 1, y: 0, z: -5 },
    fog: { near: 9, far: 32 },
    particles: "embers",
    props: [
      { kind: "burning-house", x: -6.2, z: -7, turn: 0.25 },
      { kind: "timber-house", x: -3.4, z: -8.6, turn: 0.1 },
      { kind: "burning-house", x: 4.8, z: -6.6, turn: -0.3 },
      { kind: "timber-house-dark", x: 7.6, z: -8.2, turn: -0.2 },
      { kind: "timber-house-dark", x: -9.4, z: -9.6, turn: 0.4 },
      { kind: "church-spire", x: 1.2, z: -18.5, scale: 1.3, turn: 0.3 },
      { kind: "burning-house", x: 10.6, z: -10.5, scale: 0.9, turn: -0.5 },
      { kind: "rowing-boat", x: -2.5, z: -13.2, turn: 0.2 },
      { kind: "rowing-boat", x: 5.5, z: -14.4, turn: -0.4, scale: 0.9 },
    ],
  },
  "museum-hall": {
    sky: {
      top: "#3b2f2a",
      bottom: "#8a6f58",
      glow: "#ffe2b0",
      glowX: 0.5,
      glowY: 0.78,
      glowSize: 0.35,
    },
    backdropDistance: 10.5,
    ground: { near: "#d8cfc0", far: "#a89c88", pattern: "flagstones" },
    water: undefined,
    light: {
      sun: "#fff1d6",
      sunIntensity: 1.8,
      skyLight: "#fff4e0",
      groundLight: "#6b5a48",
      ambientIntensity: 1,
    },
    warmLight: { colour: "#ffd9a0", intensity: 18, x: 0, y: 2, z: -5 },
    fog: { near: 10, far: 28 },
    particles: "dust",
    props: [
      { kind: "doric-column", x: -8.4, z: -8 },
      { kind: "doric-column", x: -3.2, z: -9.6 },
      { kind: "doric-column", x: 3.2, z: -9.6 },
      { kind: "doric-column", x: 8.4, z: -8 },
      { kind: "museum-plinth", x: -5.4, z: -6.2 },
      { kind: "glass-case", x: 0, z: -7.2 },
      { kind: "museum-plinth", x: 5.6, z: -6.4, turn: 0.4 },
      { kind: "rope-barrier", x: -5.4, z: -5.1 },
      { kind: "rope-barrier", x: 5.6, z: -5.3 },
      { kind: "picture-frame", x: -0.1, z: -10.2, scale: 1.2 },
      { kind: "wall-banner", x: -6, z: -10.2 },
      { kind: "wall-banner", x: 6, z: -10.2 },
      { kind: "hanging-lamp", x: -3.6, z: -6.5 },
      { kind: "hanging-lamp", x: 3.6, z: -6.5 },
      { kind: "museum-bench", x: 0, z: -4.6 },
    ],
  },
  "egypt-desert": {
    sky: {
      top: "#3d8fd6",
      bottom: "#f6d8a2",
      glow: "#fff3c4",
      glowX: 0.8,
      glowY: 0.84,
      glowSize: 0.16,
    },
    backdropDistance: 20,
    ground: { near: "#e8c993", far: "#d9b47a", pattern: "sand" },
    water: undefined,
    light: {
      sun: "#fff0d0",
      sunIntensity: 2.6,
      skyLight: "#bfe3ff",
      groundLight: "#c9a26a",
      ambientIntensity: 1,
    },
    warmLight: undefined,
    fog: { near: 14, far: 44 },
    particles: "sand",
    props: [
      { kind: "pyramid", x: -6.5, z: -15, scale: 1.4 },
      { kind: "pyramid", x: 1, z: -19, scale: 2 },
      { kind: "pyramid", x: 7.5, z: -16, scale: 1.1 },
      { kind: "sphinx", x: 5, z: -8.5, turn: -0.5, scale: 1.3 },
      { kind: "palm-tree", x: -9, z: -7 },
      { kind: "palm-tree", x: -7.4, z: -9.2, scale: 0.85 },
      { kind: "palm-tree", x: 9.8, z: -9.4 },
      { kind: "obelisk", x: -3.2, z: -8.4 },
      { kind: "sand-dune", x: -11, z: -12 },
      { kind: "sand-dune", x: 11.5, z: -13, scale: 1.2 },
      { kind: "papyrus-reeds", x: 2.4, z: -10.5 },
      { kind: "papyrus-reeds", x: 3.1, z: -10.9, scale: 0.8 },
    ],
  },
};

export const historySceneLooks: Record<HistoryScene, HistorySceneLook> = {
  ...coreSceneLooks,
  ...modernSceneLooks,
  ...ancientSceneLooks,
};
