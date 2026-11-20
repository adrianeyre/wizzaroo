import type { MapPoint } from "../world-map-terrain.js";
import {
  findRailPoint,
  wrapDistance,
  type Railway,
  type Station,
} from "./island-railway.js";

export const trainTopSpeed = 16;
export const trainAcceleration = 2.4;
export const stationWaitSeconds = 14;
const arrivingSoonSeconds = 25;

export interface TrainLeg {
  fromStationIndex: number;
  toStationIndex: number;
  length: number;
  seconds: number;
}

export interface Timetable {
  legs: TrainLeg[];
  loopSeconds: number;
}

export type TrainPosition =
  | {
      kind: "waiting";
      distance: number;
      stationIndex: number;
      secondsUntilDeparture: number;
    }
  | {
      kind: "travelling";
      distance: number;
      speed: number;
      nextStationIndex: number;
      secondsUntilArrival: number;
    };

const findLegLength = (railway: Railway, from: Station, to: Station): number =>
  wrapDistance(railway, to.distance - from.distance) || railway.length;

export const findLegSeconds = (length: number): number => {
  const speedingUp = trainTopSpeed / trainAcceleration;
  const speedingUpLength = (trainTopSpeed * speedingUp) / 2;
  if (length < speedingUpLength * 2) {
    return 2 * Math.sqrt(length / trainAcceleration);
  }
  return speedingUp * 2 + (length - speedingUpLength * 2) / trainTopSpeed;
};

export const findLegTravel = (
  length: number,
  seconds: number,
): { travelled: number; speed: number } => {
  const total = findLegSeconds(length);
  const clamped = Math.min(total, Math.max(0, seconds));
  const peakSpeed = Math.min(
    trainTopSpeed,
    Math.sqrt(length * trainAcceleration),
  );
  const speedingUp = peakSpeed / trainAcceleration;
  const speedingUpLength = (peakSpeed * speedingUp) / 2;
  if (clamped <= speedingUp) {
    return {
      travelled: (trainAcceleration * clamped * clamped) / 2,
      speed: trainAcceleration * clamped,
    };
  }
  const slowingFrom = total - speedingUp;
  if (clamped <= slowingFrom) {
    return {
      travelled: speedingUpLength + (clamped - speedingUp) * peakSpeed,
      speed: peakSpeed,
    };
  }
  const left = total - clamped;
  return {
    travelled: length - (trainAcceleration * left * left) / 2,
    speed: trainAcceleration * left,
  };
};

export const buildTimetable = (railway: Railway): Timetable => {
  const { stations } = railway;
  const legs = stations.map((station, index): TrainLeg => {
    const toStationIndex = (index + 1) % stations.length;
    const length = findLegLength(railway, station, stations[toStationIndex]);
    return {
      fromStationIndex: index,
      toStationIndex,
      length,
      seconds: findLegSeconds(length),
    };
  });
  return {
    legs,
    loopSeconds: legs.reduce(
      (total, leg) => total + stationWaitSeconds + leg.seconds,
      0,
    ),
  };
};

export const findTrainPosition = (
  railway: Railway,
  timetable: Timetable,
  seconds: number,
): TrainPosition => {
  let left =
    ((seconds % timetable.loopSeconds) + timetable.loopSeconds) %
    timetable.loopSeconds;
  for (const leg of timetable.legs) {
    const from = railway.stations[leg.fromStationIndex];
    if (left < stationWaitSeconds) {
      return {
        kind: "waiting",
        distance: from.distance,
        stationIndex: leg.fromStationIndex,
        secondsUntilDeparture: stationWaitSeconds - left,
      };
    }
    left -= stationWaitSeconds;
    if (left < leg.seconds) {
      const { travelled, speed } = findLegTravel(leg.length, left);
      return {
        kind: "travelling",
        distance: wrapDistance(railway, from.distance + travelled),
        speed,
        nextStationIndex: leg.toStationIndex,
        secondsUntilArrival: leg.seconds - left,
      };
    }
    left -= leg.seconds;
  }
  return {
    kind: "waiting",
    distance: railway.stations[0].distance,
    stationIndex: 0,
    secondsUntilDeparture: stationWaitSeconds,
  };
};

export const findSecondsUntilTrainAt = (
  railway: Railway,
  timetable: Timetable,
  seconds: number,
  stationIndex: number,
): number => {
  const position = findTrainPosition(railway, timetable, seconds);
  if (position.kind === "waiting" && position.stationIndex === stationIndex) {
    return 0;
  }
  const arrivals = timetable.legs.reduce<{ at: number; when: number[] }>(
    (found, leg) => {
      const arriving = found.at + stationWaitSeconds + leg.seconds;
      return {
        at: arriving,
        when:
          leg.toStationIndex === stationIndex
            ? [...found.when, arriving]
            : found.when,
      };
    },
    { at: 0, when: [] },
  ).when;
  const now =
    ((seconds % timetable.loopSeconds) + timetable.loopSeconds) %
    timetable.loopSeconds;
  const next = [
    ...arrivals,
    ...arrivals.map((at) => at + timetable.loopSeconds),
  ].find((at) => at > now);
  return next === undefined ? 0 : next - now;
};

export const findNearestStationIndex = (
  railway: Railway,
  point: MapPoint,
): number =>
  railway.stations.reduce((best, station, index) => {
    const here = findRailPoint(railway, station.distance);
    const bestPoint = findRailPoint(railway, railway.stations[best].distance);
    return Math.hypot(here.x - point.x, here.z - point.z) <
      Math.hypot(bestPoint.x - point.x, bestPoint.z - point.z)
      ? index
      : best;
  }, 0);

export const findTimetableStart = (
  railway: Railway,
  timetable: Timetable,
  start: MapPoint,
): number => {
  const stationIndex = findNearestStationIndex(railway, start);
  const arrival = findSecondsUntilTrainAt(railway, timetable, 0, stationIndex);
  return arrival - arrivingSoonSeconds;
};
