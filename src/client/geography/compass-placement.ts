import {
  compassDirections,
  compassLandmarks,
  type CompassDirection,
  type CompassLandmark,
  type CompassPointCount,
  type Distance,
} from "../../curriculum/geography.js";

export const cardinalDirections = [
  "north",
  "east",
  "south",
  "west",
] as const satisfies readonly CompassDirection[];

export const compassRadii = { near: 0.76, middle: 1.04, far: 1.3 } as const;

export interface CompassPlacement {
  landmark: CompassLandmark;
  direction: CompassDirection;
  radius: number;
  angle: number;
  isTarget: boolean;
}

export interface CompassRequest {
  target: CompassLandmark;
  direction: CompassDirection;
  points: CompassPointCount;
  distance?: Distance;
}

export const getCompassDirections = (
  points: CompassPointCount,
): readonly CompassDirection[] =>
  points === 8 ? compassDirections : cardinalDirections;

export const getDirectionAngle = (direction: CompassDirection): number =>
  (compassDirections.indexOf(direction) / compassDirections.length) *
  Math.PI *
  2;

const getTargetRadius = (distance: Distance | undefined): number =>
  distance === undefined ? compassRadii.middle : compassRadii[distance];

export const buildCompassPlacements = ({
  target,
  direction,
  points,
  distance,
}: CompassRequest): CompassPlacement[] => {
  const otherDirections = getCompassDirections(points).filter(
    (other) => other !== direction,
  );
  const otherLandmarks = compassLandmarks.filter(
    (landmark) => landmark !== target,
  );
  const firstLandmark =
    compassDirections.indexOf(direction) % otherLandmarks.length;
  const others = otherDirections.map(
    (otherDirection, index): CompassPlacement => ({
      landmark: otherLandmarks[(firstLandmark + index) % otherLandmarks.length],
      direction: otherDirection,
      radius: compassRadii.middle,
      angle: getDirectionAngle(otherDirection),
      isTarget: false,
    }),
  );
  return [
    {
      landmark: target,
      direction,
      radius: getTargetRadius(distance),
      angle: getDirectionAngle(direction),
      isTarget: true,
    },
    ...others,
  ];
};
