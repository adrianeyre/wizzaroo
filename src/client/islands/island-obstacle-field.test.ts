import { describe, expect, it } from "vitest";
import { ObstacleField, type SolidSource } from "./island-obstacle-field.js";

const buildSources = (marks: string[]): SolidSource[] =>
  [
    { name: "near-cottage", x: 4, z: 4 },
    { name: "near-tree", x: -10, z: 20 },
    { name: "near-rock", x: 30, z: -5 },
    { name: "far-windmill", x: 400, z: 400 },
  ].map(({ name, x, z }) => ({
    name,
    centre: { x, z },
    reach: 2,
    mark: () => {
      marks.push(name);
    },
  }));

/** A clock that moves on `step` milliseconds each time it is read. */
const buildClock = (step: number) => {
  let time = 0;
  return () => {
    time += step;
    return time;
  };
};

describe("marking what is solid near the Character a little at a time", () => {
  it("marks no more than the time allows each go, counting what is marked of everything near", () => {
    const marks: string[] = [];
    const field = new ObstacleField(buildSources(marks));
    const spot = { x: 0, z: 0 };

    expect(field.prepareAroundWithin(spot, 5, buildClock(4))).toEqual({
      marked: 2,
      total: 3,
    });
    expect(field.prepareAroundWithin(spot, 5, buildClock(4))).toEqual({
      marked: 3,
      total: 3,
    });
    expect(marks.toSorted()).toEqual([
      "near-cottage",
      "near-rock",
      "near-tree",
    ]);
  });

  it("always marks at least one thing a go, so it gets there however slow the device", () => {
    const marks: string[] = [];
    const field = new ObstacleField(buildSources(marks));

    expect(
      field.prepareAroundWithin({ x: 0, z: 0 }, 1, buildClock(50)),
    ).toEqual({ marked: 1, total: 3 });
  });

  it("leaves nothing more to mark nearby once it has finished, and nothing far away marked", () => {
    const marks: string[] = [];
    const field = new ObstacleField(buildSources(marks));
    const spot = { x: 0, z: 0 };
    while (field.prepareAroundWithin(spot, 100, buildClock(1)).marked < 3) {
      // keep going
    }

    field.prepareAround(spot);

    expect(marks.toSorted()).toEqual([
      "near-cottage",
      "near-rock",
      "near-tree",
    ]);
  });
});
