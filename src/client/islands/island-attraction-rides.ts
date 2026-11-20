import type { MapPoint } from "../world-map-terrain.js";
import type { PlayRide } from "./attractions/attraction-kit.js";
import { toIslandPoint, type PlacedRide } from "./island-attractions.js";

/** A go on something that is happening now. */
export interface PlayRideRun {
  placed: PlacedRide;
  startedAt: number;
}

export interface PlaySpot {
  x: number;
  y: number;
  z: number;
  heading: number;
}

/** How much further than its reach the Character must go to ride again. */
const rearmMargin = 0.6;

export const findRideKey = ({ attraction, ride }: PlacedRide): string =>
  `${attraction.id}:${ride.id}`;

const findDistanceToStart = (
  { attraction, ride }: PlacedRide,
  point: MapPoint,
): number => {
  const start = toIslandPoint(attraction, ride.start);
  return Math.hypot(point.x - start.x, point.z - start.z);
};

/**
 * Finds the ride the Character has just walked onto, if any. A ride
 * isn't started again until the Character has walked away from it, so
 * stepping off one doesn't start it again.
 */
export const findRideToStart = (
  rides: readonly PlacedRide[],
  point: MapPoint,
  spentKeys: ReadonlySet<string>,
): PlacedRide | undefined =>
  rides.find(
    (placed) =>
      !spentKeys.has(findRideKey(placed)) &&
      findDistanceToStart(placed, point) <= placed.ride.reach,
  );

/** Forgets the rides the Character has walked far enough away from. */
export const listStillSpentKeys = (
  rides: readonly PlacedRide[],
  point: MapPoint,
  spentKeys: ReadonlySet<string>,
): Set<string> =>
  new Set(
    rides
      .filter(
        (placed) =>
          spentKeys.has(findRideKey(placed)) &&
          findDistanceToStart(placed, point) <= placed.ride.reach + rearmMargin,
      )
      .map(findRideKey),
  );

export const findRideProgress = (
  run: PlayRideRun,
  clockSeconds: number,
): number =>
  Math.min(
    1,
    Math.max(0, (clockSeconds - run.startedAt) / run.placed.ride.seconds),
  );

/** Where the Character is on its ride, on the Island. */
export const findPlaySpot = (
  { placed }: PlayRideRun,
  progress: number,
  clockSeconds: number,
): PlaySpot => {
  const { attraction, ride } = placed;
  const local = ride.follow(progress, clockSeconds);
  const point = toIslandPoint(attraction, local);
  return {
    x: point.x,
    y: attraction.ground + local.y,
    z: point.z,
    heading: attraction.turn + local.heading,
  };
};

/** Where the Character steps off, on the Island. */
export const findPlayFinish = ({ placed }: PlayRideRun): MapPoint =>
  toIslandPoint(placed.attraction, placed.ride.finish);

export const describePlayRide = (ride: PlayRide): string =>
  `Wheee! A go on ${ride.name}!`;
