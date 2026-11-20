import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  type BufferGeometry,
} from "three";
import {
  buildModelGeometry,
  type ModelPart,
  type Triple,
} from "../world-map-models.js";
import type { IslandAdventure } from "./island-adventures.js";

export const mapHarbourScale = 3.2;

const grow = 1.5;

const pierHalfWidth = 1.1 * mapHarbourScale;
const explorePierHalfWidth = 1.3;
const deckLift = 1.4;
const deckThickness = 0.5;
const pileSpacing = 4.5;

export const buildMapHarbourGeometry = (
  adventure: IslandAdventure,
): BufferGeometry => {
  const { from, to, berthSide } = adventure.dock;
  const length = Math.hypot(to.x - from.x, to.z - from.z);
  const seaward = { x: (to.x - from.x) / length, z: (to.z - from.z) / length };
  const aside = { x: seaward.z, z: -seaward.x };
  const turn = Math.atan2(seaward.x, seaward.z);
  const reach = length + 3 * mapHarbourScale;
  const shift = berthSide * (pierHalfWidth - explorePierHalfWidth);
  const placeAt = (along: number, across: number, lift: number): Triple => [
    from.x + seaward.x * along + aside.x * (across + shift),
    deckLift + lift,
    from.z + seaward.z * along + aside.z * (across + shift),
  ];
  const land = Math.max(0, adventure.findHeight(from));
  const deck: ModelPart = {
    geometry: new BoxGeometry(pierHalfWidth * 2, deckThickness, reach),
    colour: "#a77b4f",
    position: placeAt(reach / 2 - 1.5, 0, -deckThickness / 2),
    rotation: [0, turn, 0],
  };
  const edges = [-1, 1].map((side): ModelPart => ({
    geometry: new BoxGeometry(0.35, 0.5, reach),
    colour: "#f8fafc",
    position: placeAt(reach / 2 - 1.5, side * (pierHalfWidth - 0.2), 0.2),
    rotation: [0, turn, 0],
  }));
  const piles = Array.from(
    { length: Math.floor(reach / pileSpacing) + 1 },
    (_, pile) =>
      [-1, 1].map((side): ModelPart => ({
        geometry: new CylinderGeometry(0.4, 0.45, deckLift + 6, 7),
        colour: "#5b3a22",
        position: placeAt(
          pile * pileSpacing,
          side * (pierHalfWidth - 0.3),
          -(deckLift + 6) / 2,
        ),
      })),
  ).flat();
  const beacon: ModelPart[] = [
    {
      geometry: new CylinderGeometry(1.1 * grow, 1.4 * grow, 8 * grow, 10),
      colour: "#dc2626",
      position: placeAt(reach - 2, 0, 4 * grow),
    },
    {
      geometry: new CylinderGeometry(1.15 * grow, 1.15 * grow, 1.8 * grow, 10),
      colour: "#f8fafc",
      position: placeAt(reach - 2, 0, 4.6 * grow),
    },
    {
      geometry: new ConeGeometry(1.7 * grow, 2.2 * grow, 10),
      colour: "#facc15",
      position: placeAt(reach - 2, 0, 9.1 * grow),
    },
  ];
  const hutAlong = -2.5 * mapHarbourScale;
  const hutSide = 0;
  const hutLift = land - deckLift;
  const hut: ModelPart[] = [
    {
      geometry: new BoxGeometry(8 * grow, 5.6 * grow, 6.4 * grow),
      colour: "#f5e6c8",
      position: placeAt(hutAlong, hutSide, hutLift + 2.8 * grow),
      rotation: [0, turn, 0],
    },
    {
      geometry: new ConeGeometry(6.2 * grow, 3.6 * grow, 4),
      colour: "#1d4ed8",
      position: placeAt(hutAlong, hutSide, hutLift + 7.4 * grow),
      rotation: [0, turn + Math.PI / 4, 0],
    },
  ];
  const quay: ModelPart = {
    geometry: new BoxGeometry(pierHalfWidth * 2 + 10 * grow, 1.2, 12 * grow),
    colour: "#d6d3d1",
    position: placeAt(hutAlong + 1.5, hutSide, hutLift - 0.3),
    rotation: [0, turn, 0],
  };
  const craneSide = berthSide * (pierHalfWidth - 0.6);
  const crane: ModelPart[] = [
    {
      geometry: new BoxGeometry(0.9 * grow, 14 * grow, 0.9 * grow),
      colour: "#f59e0b",
      position: placeAt(length * 0.6, craneSide, 7 * grow),
    },
    {
      geometry: new BoxGeometry(0.8 * grow, 0.8 * grow, 11 * grow),
      colour: "#f59e0b",
      position: placeAt(
        length * 0.6,
        craneSide + berthSide * 4 * grow,
        13.6 * grow,
      ),
      rotation: [0, turn + Math.PI / 2, 0],
    },
  ];
  return buildModelGeometry([
    quay,
    deck,
    ...edges,
    ...piles,
    ...beacon,
    ...hut,
    ...crane,
  ]);
};
