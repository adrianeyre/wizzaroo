import type {
  CutawayPart,
  EarthLayer,
  EarthquakePart,
  VolcanoPart,
} from "../../curriculum/geography.js";
import {
  earthLayers,
  earthquakeParts,
  volcanoParts,
} from "../../curriculum/geography.js";
import type { Triple } from "../world-map-models.js";
import type { ArrowAim } from "./answer-pointer.js";

export type CutawayModel = "volcano" | "earth" | "earthquake";

export const isVolcanoPart = (part: CutawayPart): part is VolcanoPart =>
  volcanoParts.some((candidate) => candidate === part);

export const isEarthLayer = (part: CutawayPart): part is EarthLayer =>
  earthLayers.some((candidate) => candidate === part);

export const isEarthquakePart = (part: CutawayPart): part is EarthquakePart =>
  earthquakeParts.some((candidate) => candidate === part);

export const findCutawayModel = (part: CutawayPart): CutawayModel => {
  if (isVolcanoPart(part)) {
    return "volcano";
  }
  return isEarthLayer(part) ? "earth" : "earthquake";
};

export const volcanoShape = {
  groundTop: -0.95,
  groundBottom: -1.5,
  groundRadius: 1.6,
  baseRadius: 1.45,
  rimRadius: 0.24,
  summit: 0.35,
  craterFloor: 0.22,
  craterRadius: 0.1,
} as const;

export const findSlopeRadius = (share: number): number =>
  volcanoShape.rimRadius +
  (volcanoShape.baseRadius - volcanoShape.rimRadius) * Math.pow(1 - share, 1.7);

export const findSlopeHeight = (share: number): number =>
  volcanoShape.groundTop +
  share * (volcanoShape.summit - volcanoShape.groundTop);

export const buildSlopeProfile = (samples: number): [number, number][] =>
  Array.from({ length: samples + 1 }, (_, index): [number, number] => {
    const share = index / samples;
    return [findSlopeRadius(share), findSlopeHeight(share)];
  });

export const magmaChamber = { x: 0, y: -1.2, width: 0.56, height: 0.2 };
export const sideVentStart: [number, number] = [0.03, -0.42];
export const sideVentShare = 0.66;
export const lavaFlowHeading: [number, number] = [-0.95, -0.31];

export const findSideVentEnd = (): [number, number] => [
  findSlopeRadius(sideVentShare) + 0.02,
  findSlopeHeight(sideVentShare),
];

export const findLavaFlowPoint = (share: number): Triple => {
  const radius = findSlopeRadius(share) + 0.012;
  const length = Math.hypot(...lavaFlowHeading);
  return [
    (lavaFlowHeading[0] / length) * radius,
    findSlopeHeight(share) + 0.01,
    (lavaFlowHeading[1] / length) * radius,
  ];
};

export const ashPuffs: { at: Triple; size: number }[] = [
  { at: [0, 0.62, -0.05], size: 0.16 },
  { at: [0.1, 0.82, -0.08], size: 0.2 },
  { at: [-0.12, 0.92, -0.04], size: 0.2 },
  { at: [0.2, 1.06, -0.1], size: 0.22 },
  { at: [-0.05, 1.16, -0.12], size: 0.25 },
  { at: [0.36, 1.2, -0.06], size: 0.2 },
  { at: [-0.3, 1.2, -0.1], size: 0.2 },
  { at: [0.14, 1.34, -0.14], size: 0.22 },
  { at: [-0.18, 1.38, -0.12], size: 0.18 },
];

const lavaFlowMiddle = findLavaFlowPoint(0.45);

export const volcanoArrows: Record<VolcanoPart, ArrowAim> = {
  crater: { tip: [0, 0.4, -0.06], direction: [0.35, 1, 0.55] },
  "main-vent": { tip: [-0.07, -0.45, 0.02], direction: [-1, 0.3, 0.5] },
  "side-vent": { tip: [0.3, -0.24, 0.02], direction: [0.7, 0.8, 0.6] },
  "magma-chamber": { tip: [-0.6, -1.18, 0.03], direction: [-1, 0.25, 0.6] },
  "lava-flow": {
    tip: lavaFlowMiddle,
    direction: [-0.75, 0.55, 0.45],
  },
  "ash-cloud": { tip: [0.52, 1.02, -0.05], direction: [1, 0.25, 0.4] },
};

export const earthShape = {
  centre: [0, -0.12, 0] satisfies Triple,
  radii: { crust: 1.2, mantle: 1.1, "outer-core": 0.66, "inner-core": 0.36 },
} as const satisfies { centre: Triple; radii: Record<EarthLayer, number> };

export const findLayerInnerRadius = (layer: EarthLayer): number => {
  const index = earthLayers.indexOf(layer);
  const inner = earthLayers.at(index + 1);
  return inner === undefined ? 0 : earthShape.radii[inner];
};

export const wedgeAngles = [Math.PI / 4, (3 * Math.PI) / 4] as const;

export const findWedgeTurn = (angle: number): number => Math.PI + angle;

export const findLayerArrow = (layer: EarthLayer): ArrowAim => {
  const outer = earthShape.radii[layer];
  const middle = (outer + findLayerInnerRadius(layer)) / 2;
  const lift = layer === "crust" ? 0.75 : 0.45;
  const angle = wedgeAngles[0];
  const across = Math.cos(lift) * middle;
  return {
    tip: [
      -Math.cos(angle) * across,
      Math.sin(lift) * middle,
      Math.sin(angle) * across,
    ],
    direction: [0.55, 0.45, 1],
  };
};

export const quakeBlock = {
  left: -1.5,
  right: 1.5,
  top: -0.2,
  bottom: -1.45,
  front: 0.7,
  back: -0.9,
  faultTopX: 0.25,
  faultBottomX: -0.15,
  slip: 0.16,
  focusHeight: -1.05,
} as const;

export const findFaultX = (height: number): number =>
  quakeBlock.faultBottomX +
  ((height - quakeBlock.bottom) / (quakeBlock.top - quakeBlock.bottom)) *
    (quakeBlock.faultTopX - quakeBlock.faultBottomX);

export const findSlipOffset = (): [number, number] => {
  const alongX = quakeBlock.faultTopX - quakeBlock.faultBottomX;
  const alongY = quakeBlock.top - quakeBlock.bottom;
  const length = Math.hypot(alongX, alongY);
  return [
    (-alongX / length) * quakeBlock.slip,
    (-alongY / length) * quakeBlock.slip,
  ];
};

export const findFocus = (): Triple => [
  findFaultX(quakeBlock.focusHeight),
  quakeBlock.focusHeight,
  quakeBlock.front,
];

export const findEpicentre = (): Triple => [
  findFaultX(quakeBlock.focusHeight),
  quakeBlock.top + 0.006,
  quakeBlock.front - 0.1,
];

export const findQuakeArrows = (part: EarthquakePart): ArrowAim[] => {
  const [focusX, focusY, front] = findFocus();
  const [epicentreX, epicentreY, epicentreZ] = findEpicentre();
  const [, dropY] = findSlipOffset();
  switch (part) {
    case "epicentre":
      return [
        {
          tip: [epicentreX, epicentreY + 0.03, epicentreZ],
          direction: [0, 1, 0.35],
        },
      ];
    case "focus":
      return [
        {
          tip: [focusX - 0.1, focusY, front + 0.04],
          direction: [-1, 0.25, 0.6],
        },
      ];
    case "fault-line":
      return [
        {
          tip: [findFaultX(-0.62) + 0.04, -0.62, front + 0.03],
          direction: [1, 0.3, 0.6],
        },
      ];
    case "seismic-waves":
      return [
        {
          tip: [focusX + 0.5, focusY + 0.28, front + 0.03],
          direction: [1, 0.55, 0.6],
        },
      ];
    case "tectonic-plates":
      return [
        {
          tip: [-0.95, quakeBlock.top + 0.03, 0.1],
          direction: [0, 1, 0.35],
        },
        {
          tip: [0.95, quakeBlock.top + dropY + 0.03, 0.1],
          direction: [0, 1, 0.35],
        },
      ];
  }
};
