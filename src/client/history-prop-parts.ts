import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  type BufferGeometry,
} from "three";
import type { ModelPart, Triple } from "./world-map-models.js";

export type HistoryPropMotion = "still" | "bob" | "sway" | "flicker";

export interface HistoryPropParts {
  body: ModelPart[];
  glow?: ModelPart[];
  motion?: HistoryPropMotion;
}

export const buildGableRoof = (
  width: number,
  rise: number,
  length: number,
): BufferGeometry => {
  const roof = new CylinderGeometry(1, 1, length, 3, 1);
  roof.rotateZ(Math.PI / 2);
  roof.rotateX(Math.PI / 6);
  roof.scale(1, rise / 1.5, width / Math.sqrt(3));
  roof.translate(0, rise / 3, 0);
  return roof;
};

export const buildFlame = (
  at: Triple,
  height: number,
  colour = "#ffb02e",
): ModelPart => ({
  geometry: new ConeGeometry(height * 0.32, height, 6),
  colour,
  position: [at[0], at[1] + height / 2, at[2]],
});

export const buildTimberHouse = (
  plaster: string,
  timber: string,
  roof: string,
): ModelPart[] => [
  {
    geometry: new BoxGeometry(1.6, 1.3, 1.4),
    colour: plaster,
    position: [0, 0.65, 0],
  },
  {
    geometry: new BoxGeometry(1.8, 1.1, 1.6),
    colour: plaster,
    position: [0, 1.85, 0.08],
  },
  ...[-0.62, 0, 0.62].map((x): ModelPart => ({
    geometry: new BoxGeometry(0.1, 2.4, 0.06),
    colour: timber,
    position: [x, 1.2, 0.86],
  })),
  {
    geometry: new BoxGeometry(1.86, 0.1, 0.08),
    colour: timber,
    position: [0, 1.32, 0.9],
  },
  {
    geometry: new BoxGeometry(1.86, 0.1, 0.08),
    colour: timber,
    position: [0, 2.36, 0.9],
  },
  {
    geometry: buildGableRoof(1.9, 1.1, 1.8),
    colour: roof,
    position: [0, 2.4, 0.08],
    rotation: [0, Math.PI / 2, 0],
  },
  {
    geometry: new BoxGeometry(0.3, 0.7, 0.3),
    colour: "#6b5a4c",
    position: [0.5, 3.1, -0.2],
  },
];

export const buildDoricColumn = (
  height: number,
  stone: string,
): ModelPart[] => [
  {
    geometry: new BoxGeometry(0.9, 0.2, 0.9),
    colour: stone,
    position: [0, 0.1, 0],
  },
  {
    geometry: new CylinderGeometry(0.3, 0.36, height, 12),
    colour: stone,
    position: [0, 0.2 + height / 2, 0],
  },
  {
    geometry: new CylinderGeometry(0.42, 0.3, 0.18, 12),
    colour: stone,
    position: [0, 0.29 + height, 0],
  },
  {
    geometry: new BoxGeometry(0.95, 0.16, 0.95),
    colour: stone,
    position: [0, 0.46 + height, 0],
  },
];
