import { describe, expect, it } from "vitest";
import { findIslandAdventure } from "./island-adventures.js";
import {
  findDistanceToNewLandRivers,
  findNewLandHeight,
  findTerrainHeight,
  listNewLandPeaks,
  meadowNewLands,
  type MapPoint,
  type NewLands,
} from "../world-map-terrain.js";
import { emberIsle } from "./ember-isle.js";
import { frostIsle } from "./frost-isle.js";
import { jungleReach } from "./jungle-reach.js";
import { starfallIsle } from "./starfall-isle.js";
import { sunscorchSands } from "./sunscorch-sands.js";

const everyIsland: [string, (point: MapPoint) => number, NewLands][] = [
  ["meadow-isle", findTerrainHeight, meadowNewLands],
  ["frost-isle", frostIsle.findHeight, frostIsle.newLands],
  ["sunscorch-sands", sunscorchSands.findHeight, sunscorchSands.newLands],
  ["jungle-reach", jungleReach.findHeight, jungleReach.newLands],
  ["ember-isle", emberIsle.findHeight, emberIsle.newLands],
  ["starfall-isle", starfallIsle.findHeight, starfallIsle.newLands],
];

const sampleSpacing = 0.5;

const listSamples = (): MapPoint[] =>
  Array.from({ length: 361 }, (_, column) =>
    Array.from({ length: 121 }, (_, row) => ({
      x: -90 + column * sampleSpacing,
      z: -30 + row * sampleSpacing,
    })),
  ).flat();

const findPathHeight = (
  findHeight: (point: MapPoint) => number,
  from: MapPoint,
  to: MapPoint,
): number =>
  Math.min(
    ...Array.from({ length: 101 }, (_, step) =>
      findHeight({
        x: from.x + ((to.x - from.x) * step) / 100,
        z: from.z + ((to.z - from.z) * step) / 100,
      }),
    ),
  );

describe.each(everyIsland)(
  "the new lands of %s",
  (_islandId, findHeight, newLands) => {
    it("give the Island at least three times the land it had", () => {
      const samples = listSamples();
      const land = samples.filter((point) => findHeight(point) > 0).length;
      const oldLand = samples.filter(
        (point) =>
          findHeight(point) > 0 && findNewLandHeight(point, newLands) <= 0,
      ).length;
      expect(land).toBeGreaterThanOrEqual(3 * oldLand);
    });

    it("join the old coast on both sides, so a Child can walk onto them", () => {
      newLands.blobs
        .filter(({ radiusX }) => radiusX < 10)
        .forEach(({ centre }) => {
          const side = Math.sign(centre.x);
          expect(
            findPathHeight(
              findHeight,
              { x: side * 18, z: centre.z },
              { x: side * 40, z: centre.z },
            ),
          ).toBeGreaterThan(0);
        });
    });

    it("hold a lake to swim in and a mountain peak on each new land", () => {
      expect(newLands.lakes).toHaveLength(2);
      newLands.lakes.forEach(({ centre }) => {
        expect(findHeight(centre)).toBeLessThan(-0.6);
      });
      const peaks = listNewLandPeaks(newLands);
      expect(peaks).toHaveLength(2);
      peaks.forEach((peak) => {
        expect(findHeight(peak)).toBeGreaterThan(5);
      });
    });

    it("carry a river from each mountain down to the sea or a lake, its water always running downhill", () => {
      expect(newLands.rivers).toHaveLength(2);
      newLands.rivers.forEach((course) => {
        const heights = course.slice(1).flatMap((end, index) =>
          Array.from({ length: 8 }, (_, step) =>
            findHeight({
              x: course[index].x + ((end.x - course[index].x) * step) / 8,
              z: course[index].z + ((end.z - course[index].z) * step) / 8,
            }),
          ),
        );
        heights.slice(1).forEach((height, index) => {
          expect(height).toBeLessThanOrEqual(heights[index] + 0.02);
        });
        expect(heights[0]).toBeGreaterThan(1);
        expect(findHeight(course[course.length - 1])).toBeLessThan(0);
        expect(Math.sign(course[0].x)).toBe(
          Math.sign(course[course.length - 1].x),
        );
      });
      expect(
        new Set(newLands.rivers.map((course) => Math.sign(course[0].x))).size,
      ).toBe(2);
    });

    it("cut each river into the land it runs through", () => {
      newLands.rivers.forEach((course) => {
        [1 / 4, 1 / 2].forEach((share) => {
          const point = course[Math.floor(course.length * share)];
          expect(findHeight(point)).toBeLessThan(
            findNewLandHeight(point, newLands) - 0.4,
          );
          expect(findDistanceToNewLandRivers(point, newLands)).toBe(0);
        });
      });
    });

    it("leave sea all round the Island's edge", () => {
      [-114, 114].forEach((x) => {
        expect(findHeight({ x, z: 0 })).toBeLessThan(0);
      });
      [-27, 27].forEach((z) => {
        [-92, -52, 52, 92].forEach((x) => {
          expect(findHeight({ x, z })).toBeLessThan(0);
        });
      });
    });
  },
);

describe.each(everyIsland.filter(([islandId]) => islandId !== "meadow-isle"))(
  "walking into the new rivers of %s",
  (islandId, _findHeight, newLands) => {
    it("is wading into water, as in the Island's other rivers", () => {
      const adventure = findIslandAdventure(islandId);
      newLands.rivers.forEach((course) => {
        expect(
          adventure.findCourseKind(course[Math.floor(course.length / 2)]),
        ).toBe("river");
      });
    });
  },
);
