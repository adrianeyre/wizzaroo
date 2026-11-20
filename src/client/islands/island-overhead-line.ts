import {
  BoxGeometry,
  CylinderGeometry,
  Euler,
  Quaternion,
  Vector3,
  type BufferGeometry,
} from "three";
import {
  buildModelGeometry,
  type ModelPart,
  type Triple,
} from "../world-map-models.js";
import { findIslandTrain, mapTrainScale } from "./island-train-design.js";
import { isInsideBore, listTunnelBores } from "./island-train-tunnels.js";
import type { TrainDetail } from "./trains/train-kit.js";
import {
  findRailHeading,
  findRailPoint,
  findRightOf,
  platformLength,
  railSampleSpacing,
  railTopLift,
  wrapDistance,
  type Railway,
} from "./island-railway.js";

export interface OverheadLineLook {
  contactHeight: number;
  scale: number;
  isMap: boolean;
}

const longestSpan = 12;
const shortestSpan = 3;
const spanStep = 0.25;
const mostWireDrift = 0.15;
const mastReach = 1.6;
const mastAboveWire = 0.95;
const catenaryRiseAtMast = 0.6;
const catenaryRiseMidSpan = 0.22;
const stagger = 0.1;
const tunnelClearance = 1.4;

const steel = "#8b9299";
const darkSteel = "#5f666d";
const wire = "#3f3a36";
const insulator = "#7a4a2c";
const concrete = "#a8a39a";

export interface TrackFrame {
  x: number;
  y: number;
  z: number;
  right: { x: number; z: number };
}

const findTrackFrame = (railway: Railway, distance: number): TrackFrame => {
  const point = findRailPoint(railway, distance);
  return {
    ...point,
    y: point.y + railTopLift,
    right: findRightOf(findRailHeading(railway, distance)),
  };
};

const across = (frame: TrackFrame, sideways: number, lift: number): Triple => [
  frame.x + frame.right.x * sideways,
  frame.y + lift,
  frame.z + frame.right.z * sideways,
];

const findChordDrift = (
  railway: Railway,
  from: number,
  span: number,
): number => {
  const start = findRailPoint(railway, from);
  const end = findRailPoint(railway, from + span);
  const chordX = end.x - start.x;
  const chordZ = end.z - start.z;
  const chordLength = Math.hypot(chordX, chordZ);
  return Math.max(
    ...[0.25, 0.5, 0.75].map((share) => {
      const point = findRailPoint(railway, from + span * share);
      return (
        Math.abs((point.x - start.x) * chordZ - (point.z - start.z) * chordX) /
        Math.max(0.0001, chordLength)
      );
    }),
  );
};

const listEvenMastDistances = (railway: Railway, scale: number): number[] => {
  const distances: number[] = [];
  let distance = 0;
  while (distance < railway.length - shortestSpan * scale) {
    distances.push(distance);
    let span = longestSpan * scale;
    while (
      span > shortestSpan * scale &&
      findChordDrift(railway, distance, span) > mostWireDrift * scale
    ) {
      span -= spanStep * scale;
    }
    distance += span;
  }
  return distances;
};

/**
 * Where the wire is held: masts along the line, and the two portals of
 * every tunnel, where the wire is fixed to the portal and runs on into
 * the dark without being drawn through the hill.
 */
export const listMastDistances = (railway: Railway, scale = 1): number[] => {
  const tunnelBores = listTunnelBores(railway);
  const portals = tunnelBores.flatMap(({ entry, exit }) => [
    entry.distance,
    exit.distance,
  ]);
  return [
    ...listEvenMastDistances(railway, scale).filter(
      (distance) =>
        !tunnelBores.some((bore) => isInsideBore(railway, bore, distance)) &&
        portals.every(
          (portal) =>
            Math.abs(
              wrapDistance(railway, distance - portal + railway.length / 2) -
                railway.length / 2,
            ) >
            shortestSpan * scale,
        ),
    ),
    ...portals,
  ].toSorted((first, second) => first - second);
};

export const isSpanInTunnel = (
  railway: Railway,
  from: number,
  to: number,
): boolean => {
  const middle = from + wrapDistance(railway, to - from) / 2;
  return listTunnelBores(railway).some((bore) =>
    isInsideBore(railway, bore, middle),
  );
};

const isNearTunnel = (railway: Railway, distance: number, scale: number) =>
  railway.tunnels.some(
    (tunnel) =>
      distance > tunnel.fromDistance - tunnelClearance * scale &&
      distance < tunnel.toDistance + tunnelClearance * scale,
  );

const findMastSide = (railway: Railway, distance: number): number => {
  const station = railway.stations.find(
    (each) =>
      Math.abs(
        wrapDistance(railway, distance - each.distance + railway.length / 2) -
          railway.length / 2,
      ) <
      platformLength / 2 + 3,
  );
  return station === undefined ? 1 : -station.side;
};

const listMastParts = (
  frame: TrackFrame,
  side: number,
  wireAcross: number,
  { contactHeight, scale, isMap }: OverheadLineLook,
  isOnBridge: boolean,
): ModelPart[] => {
  const reach = side * mastReach * scale;
  const wireY = contactHeight * scale;
  const footLift = (isOnBridge ? -0.45 : -0.85) * scale;
  const topLift = wireY + mastAboveWire * scale;
  const mastHeight = topLift - footLift;
  const mastMiddle = across(frame, reach, footLift + mastHeight / 2);
  const facing = Math.atan2(frame.right.x, frame.right.z);
  const flange = (offset: number): ModelPart => {
    const turn = facing + Math.PI / 2;
    return {
      geometry: new BoxGeometry(0.16 * scale, mastHeight, 0.025 * scale),
      colour: steel,
      position: [
        mastMiddle[0] + Math.sin(turn) * offset * 0.07 * scale,
        mastMiddle[1],
        mastMiddle[2] + Math.cos(turn) * offset * 0.07 * scale,
      ],
      rotation: [0, facing, 0],
    };
  };
  const mast: ModelPart[] = isMap
    ? [
        {
          geometry: new BoxGeometry(0.16 * scale, mastHeight, 0.16 * scale),
          colour: steel,
          position: mastMiddle,
          rotation: [0, facing, 0],
        },
      ]
    : [
        ...[-1, 1].map(flange),
        {
          geometry: new BoxGeometry(0.02 * scale, mastHeight, 0.14 * scale),
          colour: darkSteel,
          position: mastMiddle,
          rotation: [0, facing, 0],
        },
        {
          geometry: new BoxGeometry(0.34 * scale, 0.22 * scale, 0.34 * scale),
          colour: concrete,
          position: across(frame, reach, footLift + 0.05 * scale),
          rotation: [0, facing, 0],
        },
      ];
  const bracketLift = wireY + 0.12 * scale;
  const stayLift = wireY + catenaryRiseAtMast * scale + 0.2 * scale;
  const overWire = wireAcross;
  const arms: ModelPart[] = [
    buildTube(
      across(frame, reach, bracketLift),
      across(frame, overWire - side * 0.15 * scale, bracketLift),
      0.045 * scale,
      darkSteel,
      4,
    ),
    buildTube(
      across(frame, reach, stayLift),
      across(frame, overWire, wireY + catenaryRiseAtMast * scale),
      0.04 * scale,
      darkSteel,
      4,
    ),
  ];
  if (isMap) {
    return [...mast, ...arms];
  }
  const insulatorAt = (lift: number): ModelPart => ({
    geometry: new CylinderGeometry(
      0.035 * scale,
      0.035 * scale,
      0.22 * scale,
      6,
      1,
      true,
    ),
    colour: insulator,
    position: across(frame, reach - side * 0.2 * scale, lift),
    rotation: [0, facing, Math.PI / 2],
  });
  return [
    ...mast,
    ...arms,
    insulatorAt(bracketLift),
    insulatorAt(stayLift - 0.02 * scale),
    buildTube(
      across(frame, overWire - side * 0.15 * scale, bracketLift),
      across(frame, overWire, wireY + 0.01 * scale),
      0.025 * scale,
      darkSteel,
      4,
    ),
    buildTube(
      across(frame, overWire, wireY + catenaryRiseAtMast * scale),
      across(frame, overWire - side * 0.15 * scale, bracketLift),
      0.02 * scale,
      darkSteel,
      4,
    ),
  ];
};

const upright = new Vector3(0, 1, 0);

const buildTube = (
  from: Triple,
  to: Triple,
  thickness: number,
  colour = wire,
  sides = 3,
): ModelPart => {
  const start = new Vector3(...from);
  const along = new Vector3(...to).sub(start);
  const turn = new Euler().setFromQuaternion(
    new Quaternion().setFromUnitVectors(upright, along.clone().normalize()),
  );
  const middle = start.addScaledVector(along, 0.5);
  return {
    geometry: new CylinderGeometry(
      thickness / 2,
      thickness / 2,
      Math.max(0.01, along.length()),
      sides,
      1,
      true,
    ),
    colour,
    position: [middle.x, middle.y, middle.z],
    rotation: [turn.x, turn.y, turn.z],
  };
};

const listSpanParts = (
  from: { frame: TrackFrame; wireAcross: number },
  to: { frame: TrackFrame; wireAcross: number },
  { contactHeight, scale, isMap }: OverheadLineLook,
): ModelPart[] => {
  const wireY = contactHeight * scale;
  const contactFrom = across(from.frame, from.wireAcross, wireY);
  const contactTo = across(to.frame, to.wireAcross, wireY);
  const thickness = (isMap ? 0.05 : 0.022) * scale;
  const contact = buildTube(contactFrom, contactTo, thickness);
  const catenaryAt = (share: number): Triple => {
    const sag =
      catenaryRiseMidSpan +
      (catenaryRiseAtMast - catenaryRiseMidSpan) * (2 * share - 1) ** 2;
    return [
      contactFrom[0] + (contactTo[0] - contactFrom[0]) * share,
      contactFrom[1] + (contactTo[1] - contactFrom[1]) * share + sag * scale,
      contactFrom[2] + (contactTo[2] - contactFrom[2]) * share,
    ];
  };
  const contactAt = (share: number): Triple => [
    contactFrom[0] + (contactTo[0] - contactFrom[0]) * share,
    contactFrom[1] + (contactTo[1] - contactFrom[1]) * share,
    contactFrom[2] + (contactTo[2] - contactFrom[2]) * share,
  ];
  const pieces = isMap ? 2 : 4;
  const catenary = Array.from({ length: pieces }, (_, piece) =>
    buildTube(
      catenaryAt(piece / pieces),
      catenaryAt((piece + 1) / pieces),
      thickness,
    ),
  );
  if (isMap) {
    return [contact, ...catenary];
  }
  const droppers = [0.25, 0.5, 0.75].map((share) =>
    buildTube(contactAt(share), catenaryAt(share), 0.012 * scale),
  );
  return [contact, ...catenary, ...droppers];
};

export interface MastSpot {
  distance: number;
  frame: TrackFrame;
  wireAcross: number;
  hasMast: boolean;
  isOnBridge: boolean;
  side: number;
}

export const listMastSpots = (
  railway: Railway,
  look: OverheadLineLook,
): MastSpot[] =>
  listMastDistances(railway, look.isMap ? look.scale : 1).map(
    (distance, index) => ({
      distance,
      frame: findTrackFrame(railway, distance),
      wireAcross: (index % 2 === 0 ? stagger : -stagger) * look.scale,
      hasMast: !isNearTunnel(railway, distance, look.scale),
      isOnBridge:
        railway.points[
          Math.round(wrapDistance(railway, distance) / railSampleSpacing) %
            railway.points.length
        ].isOnBridge,
      side: findMastSide(railway, distance),
    }),
  );

/**
 * The overhead line that powers an electric train: steel masts beside
 * the track with cantilevers holding a contact wire at the height of the
 * pantograph's head, zig-zagging a little from mast to mast, and a
 * sagging catenary wire above it, hung on droppers. Spans shorten on
 * curves so the wire stays over the pantograph; the line runs on
 * through tunnels, where no masts are needed.
 */
export const buildOverheadLineGeometry = (
  railway: Railway,
  look: OverheadLineLook,
): BufferGeometry => {
  const masts = listMastSpots(railway, look);
  const parts: ModelPart[] = masts.flatMap((mast, index) => {
    const next = masts[(index + 1) % masts.length];
    return [
      ...(mast.hasMast
        ? listMastParts(
            mast.frame,
            mast.side,
            mast.wireAcross,
            look,
            mast.isOnBridge,
          )
        : []),
      ...(isSpanInTunnel(railway, mast.distance, next.distance)
        ? []
        : listSpanParts(mast, next, look)),
    ];
  });
  return buildModelGeometry(parts);
};

export const listOverheadLineGeometries = (
  railway: Railway,
  detail: TrainDetail,
): BufferGeometry[] => {
  const { pantograph } = findIslandTrain(railway.islandId);
  if (pantograph === undefined) {
    return [];
  }
  const isMap = detail === "map";
  return [
    buildOverheadLineGeometry(railway, {
      contactHeight: pantograph.top,
      scale: isMap ? mapTrainScale : 1,
      isMap,
    }),
  ];
};
