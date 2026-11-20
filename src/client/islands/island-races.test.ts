import { describe, expect, it } from "vitest";
import type { Race } from "./island-adventures.js";
import {
  advanceRace,
  describeRaceProgress,
  type RaceRun,
} from "./island-races.js";

const race: Race = {
  id: "test-run",
  name: "the Test Run",
  seconds: 30,
  rings: [
    { x: 0, z: 0 },
    { x: 10, z: 0 },
    { x: 20, z: 0 },
  ],
};

describe("Ring Races", () => {
  it("starts a race when the Child runs through its first ring, and not anywhere else", () => {
    expect(advanceRace(undefined, [race], { x: 5, z: 5 }, 0.1)).toStrictEqual({
      run: undefined,
      progress: undefined,
    });
    const { run, progress } = advanceRace(
      undefined,
      [race],
      { x: 0.5, z: 0 },
      0.1,
    );
    expect(run).toStrictEqual({ race, ringsPassed: 1, seconds: 0 });
    expect(progress).toMatchObject({
      kind: "running",
      ringsPassed: 1,
      ringCount: 3,
      secondsLeft: 30,
    });
  });

  it("counts each ring only when the Child reaches the next one in order", () => {
    const started: RaceRun = { race, ringsPassed: 1, seconds: 0 };
    expect(
      advanceRace(started, [race], { x: 20, z: 0 }, 1).run?.ringsPassed,
    ).toBe(1);
    expect(
      advanceRace(started, [race], { x: 10, z: 1 }, 1).run?.ringsPassed,
    ).toBe(2);
  });

  it("wins the race at the last ring, with the time it took", () => {
    const nearlyDone: RaceRun = { race, ringsPassed: 2, seconds: 21.6 };
    const { run, progress } = advanceRace(
      nearlyDone,
      [race],
      { x: 20, z: 0 },
      0.5,
    );
    expect(run).toBeUndefined();
    expect(progress).toStrictEqual({
      kind: "won",
      raceId: "test-run",
      name: "the Test Run",
      seconds: 22,
    });
    if (progress !== undefined) {
      expect(describeRaceProgress(progress)).toBe(
        "You finished the Test Run in 22 seconds!",
      );
    }
  });

  it("ends the race when the time runs out", () => {
    const slow: RaceRun = { race, ringsPassed: 2, seconds: 29.9 };
    const { run, progress } = advanceRace(slow, [race], { x: 15, z: 0 }, 0.5);
    expect(run).toBeUndefined();
    expect(progress?.kind).toBe("out-of-time");
  });
});
