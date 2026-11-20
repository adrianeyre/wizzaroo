import { describe, expect, it } from "vitest";
import {
  compassDirections,
  compassLandmarks,
} from "../../curriculum/geography.js";
import {
  buildCompassPlacements,
  cardinalDirections,
  compassRadii,
  getDirectionAngle,
} from "./compass-placement.js";

const everyRequest = compassLandmarks.flatMap((target) =>
  compassDirections.map((direction) => ({ target, direction })),
);

describe("buildCompassPlacements", () => {
  it.each(everyRequest)(
    "puts one landmark in each of the eight directions with $target to the $direction",
    ({ target, direction }) => {
      const placements = buildCompassPlacements({
        target,
        direction,
        points: 8,
      });

      expect(placements.map((placement) => placement.direction).sort()).toEqual(
        [...compassDirections].sort(),
      );
      expect(
        new Set(placements.map((placement) => placement.landmark)).size,
      ).toBe(8);
      expect(placements.filter((placement) => placement.isTarget)).toEqual([
        expect.objectContaining({ landmark: target, direction }),
      ]);
    },
  );

  it.each(cardinalDirections)(
    "uses only the four cardinal directions on a four-point compass with the target to the %s",
    (direction) => {
      const placements = buildCompassPlacements({
        target: "cave",
        direction,
        points: 4,
      });

      expect(placements.map((placement) => placement.direction).sort()).toEqual(
        [...cardinalDirections].sort(),
      );
      expect(
        new Set(placements.map((placement) => placement.landmark)).size,
      ).toBe(4);
    },
  );

  it("puts a near target close to the explorer and a far one at the edge, with the rest between", () => {
    const near = buildCompassPlacements({
      target: "volcano",
      direction: "south-west",
      points: 8,
      distance: "near",
    });
    const far = buildCompassPlacements({
      target: "volcano",
      direction: "south-west",
      points: 8,
      distance: "far",
    });

    expect(near[0].radius).toBe(compassRadii.near);
    expect(far[0].radius).toBe(compassRadii.far);
    expect(
      near.slice(1).every(({ radius }) => radius === compassRadii.middle),
    ).toBe(true);
  });

  it("turns clockwise from north, with east a quarter turn round", () => {
    expect(getDirectionAngle("north")).toBe(0);
    expect(getDirectionAngle("east")).toBeCloseTo(Math.PI / 2);
    expect(getDirectionAngle("south-west")).toBeCloseTo((Math.PI * 5) / 4);
  });
});
