import {
  CylinderGeometry,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
} from "three";
import { buildModelGeometry } from "../world-map-models.js";
import { pierHalfWidth, type IslandAdventure } from "./island-adventures.js";
import type { FlagHoist } from "./island-ship-design.js";

export const flagpoleHeight = 9;
const flagpoleBack = 3;
const flagpoleAside = pierHalfWidth + 2.2;
const plinthHeight = 0.6;
const plinthSink = 2;

export const islandFlagHoists: readonly FlagHoist[] = [
  { top: [0, flagpoleHeight - 0.25, 0], width: 3.6, height: 1.8 },
];

export interface FlagpolePlace {
  x: number;
  y: number;
  z: number;
  heading: number;
}

export const findIslandFlagpole = ({
  dock,
  findHeight,
}: IslandAdventure): FlagpolePlace => {
  const { from, to, berthSide } = dock;
  const length = Math.hypot(to.x - from.x, to.z - from.z);
  const seaward = { x: (to.x - from.x) / length, z: (to.z - from.z) / length };
  const aside = { x: seaward.z * berthSide, z: -seaward.x * berthSide };
  const spot = {
    x: from.x - seaward.x * flagpoleBack + aside.x * flagpoleAside,
    z: from.z - seaward.z * flagpoleBack + aside.z * flagpoleAside,
  };
  return {
    ...spot,
    y: Math.max(0, findHeight(spot)) + plinthHeight,
    heading: Math.atan2(-seaward.x, -seaward.z),
  };
};

export const buildIslandFlagpoleGeometry = (
  adventure: IslandAdventure,
): BufferGeometry => {
  const { x, y, z } = findIslandFlagpole(adventure);
  return buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.75, 0.9, plinthHeight + plinthSink, 8),
      colour: "#94a3b8",
      position: [0, (plinthHeight - plinthSink) / 2 - plinthHeight, 0],
    },
    {
      geometry: new CylinderGeometry(0.55, 0.65, 0.18, 8),
      colour: "#cbd5e1",
      position: [0, 0.09, 0],
    },
    {
      geometry: new TorusGeometry(0.62, 0.06, 6, 16),
      colour: "#facc15",
      position: [0, -0.05, 0],
      rotation: [Math.PI / 2, 0, 0],
    },
    {
      geometry: new CylinderGeometry(0.07, 0.11, flagpoleHeight, 10),
      colour: "#f8fafc",
      position: [0, flagpoleHeight / 2, 0],
    },
    {
      geometry: new SphereGeometry(0.18, 12, 8),
      colour: "#facc15",
      position: [0, flagpoleHeight + 0.12, 0],
    },
    {
      geometry: new CylinderGeometry(0.03, 0.03, 0.4, 5),
      colour: "#64748b",
      position: [0.12, 1.2, 0],
      rotation: [Math.PI / 2, 0, 0],
    },
  ]).translate(x, y, z);
};
