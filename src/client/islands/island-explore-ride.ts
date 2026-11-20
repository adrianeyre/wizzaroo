import type { MapPoint } from "../world-map-terrain.js";
import {
  findVehicleDesign,
  type VehicleDesign,
} from "../vehicles/vehicle-designs.js";
import {
  findStepOutSpot,
  placeVehicleNear,
  stepVehicle,
  type DrivenVehicle,
} from "../vehicles/vehicle-driving.js";
import type { AdventureWorld } from "./island-adventures.js";
import type { Ride, TrainReport, VehicleChoice } from "./island-explore-hud.js";
import { findStationPlatformSpot, type Railway } from "./island-railway.js";
import type { TrainClock } from "./island-railway-models.js";
import { findTrainCarSpots } from "./island-railway-models.js";
import {
  findFirstCarriageIndex,
  findIslandTrain,
} from "./island-train-design.js";
import {
  findSecondsUntilTrainAt,
  findTrainPosition,
  type Timetable,
} from "./island-train-timetable.js";
import type { Obstacles } from "./island-obstacles.js";
import type { Blocker } from "./island-walker.js";

export const stationReach = 16;
export const vehicleReach = 3.4;

export type RideState =
  { kind: "walking" } | { kind: "train" } | { kind: "vehicle" };

export interface RiderSpot {
  x: number;
  y: number;
  z: number;
  heading: number;
  isHidden: boolean;
}

export const findNearStationIndex = (
  railway: Railway,
  point: MapPoint,
): number | undefined => {
  const found = railway.stations
    .map((station, index) => {
      const spot = findStationPlatformSpot(railway, station);
      return {
        index,
        distance: Math.hypot(spot.x - point.x, spot.z - point.z),
      };
    })
    .filter(({ distance }) => distance <= stationReach)
    .toSorted((first, second) => first.distance - second.distance)
    .at(0);
  return found?.index;
};

export const findTrainReport = (
  railway: Railway,
  timetable: Timetable,
  clock: TrainClock,
  ride: RideState,
  walker: MapPoint,
): TrainReport => {
  const position = findTrainPosition(railway, timetable, clock.seconds);
  const waitingAt =
    position.kind === "waiting" ? position.stationIndex : undefined;
  if (ride.kind === "train") {
    return {
      kind: "riding",
      waitingAtStationIndex: waitingAt,
      nextStationIndex:
        position.kind === "travelling" ? position.nextStationIndex : undefined,
    };
  }
  const nearStationIndex = findNearStationIndex(railway, walker);
  if (nearStationIndex === undefined) {
    return { kind: "away" };
  }
  return {
    kind: "at-station",
    stationIndex: nearStationIndex,
    isTrainWaiting: waitingAt === nearStationIndex,
    secondsUntilTrain:
      Math.ceil(
        findSecondsUntilTrainAt(
          railway,
          timetable,
          clock.seconds,
          nearStationIndex,
        ) / 5,
      ) * 5,
  };
};

export const describeTrainReportKey = (report: TrainReport): string =>
  JSON.stringify(report);

export const findTrainRiderSpot = (
  railway: Railway,
  timetable: Timetable,
  clock: TrainClock,
): RiderSpot => {
  const design = findIslandTrain(railway.islandId);
  const position = findTrainPosition(railway, timetable, clock.seconds);
  const spot = findTrainCarSpots(railway, design, position.distance)[
    findFirstCarriageIndex(design)
  ];
  return { ...spot, isHidden: true };
};

export const findTrainStepOffSpot = (
  railway: Railway,
  timetable: Timetable,
  clock: TrainClock,
  walker: MapPoint,
): MapPoint => {
  const position = findTrainPosition(railway, timetable, clock.seconds);
  const stationIndex =
    position.kind === "waiting"
      ? position.stationIndex
      : (findNearStationIndex(railway, walker) ?? 0);
  return findStationPlatformSpot(railway, railway.stations[stationIndex]);
};

export const isTrainWaitingNear = (
  railway: Railway,
  timetable: Timetable,
  clock: TrainClock,
  walker: MapPoint,
): boolean => {
  const position = findTrainPosition(railway, timetable, clock.seconds);
  return (
    position.kind === "waiting" &&
    findNearStationIndex(railway, walker) === position.stationIndex
  );
};

export const findChosenDesign = (
  choice: VehicleChoice | undefined,
): VehicleDesign | undefined =>
  choice === undefined ? undefined : findVehicleDesign(choice.look.model);

export const placeChosenVehicle = (
  world: AdventureWorld,
  walker: MapPoint & { heading: number },
  design: VehicleDesign,
  blockers: readonly Blocker[],
  obstacles?: Obstacles,
): DrivenVehicle =>
  placeVehicleNear(world, walker, design, blockers, obstacles);

export const findVehicleRiderSpot = (
  vehicle: DrivenVehicle,
  design: VehicleDesign,
): RiderSpot => {
  const [across, lift, along] = design.rider.position;
  return {
    x:
      vehicle.x +
      Math.sin(vehicle.heading) * along +
      Math.cos(vehicle.heading) * across,
    y: vehicle.y + lift,
    z:
      vehicle.z +
      Math.cos(vehicle.heading) * along -
      Math.sin(vehicle.heading) * across,
    heading: vehicle.heading,
    isHidden: design.rider.pose === "hidden",
  };
};

export const isNearVehicle = (
  vehicle: DrivenVehicle | undefined,
  design: VehicleDesign | undefined,
  walker: MapPoint,
): boolean =>
  vehicle !== undefined &&
  design !== undefined &&
  Math.hypot(vehicle.x - walker.x, vehicle.z - walker.z) <=
    vehicleReach + design.length / 2;

export { findStepOutSpot, stepVehicle };

export const isRideWanted = (ride: Ride | undefined, kind: Ride): boolean =>
  ride === kind;
