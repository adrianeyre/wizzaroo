import type { MapPoint } from "../world-map-terrain.js";
import type { Race } from "./island-adventures.js";

export const ringReach = 1.8;

export interface RaceRun {
  race: Race;
  ringsPassed: number;
  seconds: number;
}

export type RaceProgress =
  | {
      kind: "running";
      raceId: string;
      name: string;
      ringsPassed: number;
      ringCount: number;
      secondsLeft: number;
    }
  | { kind: "won"; raceId: string; name: string; seconds: number }
  | { kind: "out-of-time"; raceId: string; name: string };

const isWithinRingReach = (ring: MapPoint, point: MapPoint): boolean =>
  Math.hypot(ring.x - point.x, ring.z - point.z) <= ringReach;

const describeRun = ({
  race,
  ringsPassed,
  seconds,
}: RaceRun): RaceProgress => ({
  kind: "running",
  raceId: race.id,
  name: race.name,
  ringsPassed,
  ringCount: race.rings.length,
  secondsLeft: Math.max(0, Math.ceil(race.seconds - seconds)),
});

export const advanceRace = (
  run: RaceRun | undefined,
  races: readonly Race[],
  point: MapPoint,
  deltaSeconds: number,
): { run: RaceRun | undefined; progress: RaceProgress | undefined } => {
  if (run === undefined) {
    const started = races.find(({ rings }) =>
      isWithinRingReach(rings[0], point),
    );
    if (started === undefined) {
      return { run: undefined, progress: undefined };
    }
    const firstRun = { race: started, ringsPassed: 1, seconds: 0 };
    return { run: firstRun, progress: describeRun(firstRun) };
  }
  const { race } = run;
  const seconds = run.seconds + deltaSeconds;
  if (seconds > race.seconds) {
    return {
      run: undefined,
      progress: { kind: "out-of-time", raceId: race.id, name: race.name },
    };
  }
  const isNextRingReached = isWithinRingReach(
    race.rings[run.ringsPassed],
    point,
  );
  const ringsPassed = run.ringsPassed + (isNextRingReached ? 1 : 0);
  if (ringsPassed === race.rings.length) {
    return {
      run: undefined,
      progress: {
        kind: "won",
        raceId: race.id,
        name: race.name,
        seconds: Math.round(seconds),
      },
    };
  }
  const nextRun = { race, ringsPassed, seconds };
  return { run: nextRun, progress: describeRun(nextRun) };
};

export const describeRaceProgress = (progress: RaceProgress): string => {
  if (progress.kind === "won") {
    return `You finished ${progress.name} in ${String(progress.seconds)} seconds!`;
  }
  if (progress.kind === "out-of-time") {
    return `Out of time on ${progress.name}! Run back to its first ring to try again.`;
  }
  return `${progress.name}: ring ${String(progress.ringsPassed)} of ${String(progress.ringCount)}, ${String(progress.secondsLeft)} seconds left`;
};

export const findRingTurn = (race: Race, ringIndex: number): number => {
  const next = race.rings[Math.min(ringIndex + 1, race.rings.length - 1)];
  const previous = race.rings[Math.max(ringIndex - 1, 0)];
  return Math.atan2(next.x - previous.x, next.z - previous.z);
};
