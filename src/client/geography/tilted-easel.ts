import {
  BoxGeometry,
  CylinderGeometry,
  SphereGeometry,
  type BufferGeometry,
} from "three";
import {
  buildModelGeometry,
  type ModelPart,
  type Triple,
} from "../world-map-models.js";
import { geographyPalette } from "./geography-kit.js";

const easelTilt = (50 * Math.PI) / 180;
export const easelTurn = easelTilt - Math.PI / 2;
export const easelCentre: Triple = [0, -0.12, 0.05];
export const easelFrameWidth = 0.09;

const floorY = -1.5;

export const findEaselPoint = (
  alongBoard: number,
  outOfBoard: number,
): Triple => [
  easelCentre[0],
  easelCentre[1] +
    alongBoard * Math.cos(easelTurn) -
    outOfBoard * Math.sin(easelTurn),
  easelCentre[2] +
    alongBoard * Math.sin(easelTurn) +
    outOfBoard * Math.cos(easelTurn),
];

const buildStrut = (
  x: number,
  from: Triple,
  to: Triple,
  radius: number,
): ModelPart => {
  const rise = to[1] - from[1];
  const reach = to[2] - from[2];
  return {
    geometry: new CylinderGeometry(radius, radius, Math.hypot(rise, reach), 8),
    colour: geographyPalette.woodDark,
    position: [x, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2],
    rotation: [Math.atan2(reach, rise), 0, 0],
  };
};

export const buildEaselFrameGeometry = (boardSize: number): BufferGeometry => {
  const outer = boardSize + easelFrameWidth * 2;
  const sideOffset = boardSize / 2 + easelFrameWidth / 2;
  return buildModelGeometry([
    {
      geometry: new BoxGeometry(outer, outer, 0.05),
      colour: geographyPalette.woodDark,
      position: [0, 0, -0.035],
    },
    ...[1, -1].flatMap((side) => [
      {
        geometry: new BoxGeometry(outer, easelFrameWidth, 0.07),
        colour: geographyPalette.wood,
        position: [0, side * sideOffset, 0.015] satisfies Triple,
      },
      {
        geometry: new BoxGeometry(easelFrameWidth, boardSize, 0.07),
        colour: geographyPalette.wood,
        position: [side * sideOffset, 0, 0.015] satisfies Triple,
      },
    ]),
    ...[-1, 1].map((side) => ({
      geometry: new SphereGeometry(0.035, 8, 6),
      colour: geographyPalette.brass,
      position: [
        side * (sideOffset - 0.01),
        sideOffset - 0.01,
        0.06,
      ] satisfies Triple,
    })),
  ]);
};

export const buildEaselStandGeometry = (boardSize: number): BufferGeometry => {
  const halfBoard = boardSize / 2 + easelFrameWidth;
  const bottomEdge = findEaselPoint(-halfBoard, -0.03);
  const backTop = findEaselPoint(halfBoard * 0.45, -0.07);
  const strutFoot: Triple = [0, floorY, backTop[2] - 0.85];
  return buildModelGeometry([
    ...[-1, 1].flatMap((side) => [
      {
        geometry: new BoxGeometry(0.22, bottomEdge[1] - floorY + 0.04, 0.24),
        colour: geographyPalette.woodDark,
        position: [
          side * (halfBoard - 0.3),
          (floorY + bottomEdge[1]) / 2,
          bottomEdge[2] - 0.02,
        ] satisfies Triple,
      },
      buildStrut(side * (halfBoard - 0.45), strutFoot, backTop, 0.045),
    ]),
    {
      geometry: new BoxGeometry(halfBoard * 2, 0.06, 0.12),
      colour: geographyPalette.wood,
      position: [0, bottomEdge[1] + 0.02, bottomEdge[2] + 0.06],
    },
    {
      geometry: new CylinderGeometry(0.03, 0.03, halfBoard * 1.1, 8),
      colour: geographyPalette.woodDark,
      position: [0, strutFoot[1] + 0.35, strutFoot[2] + 0.17],
      rotation: [0, 0, Math.PI / 2],
    },
  ]);
};
