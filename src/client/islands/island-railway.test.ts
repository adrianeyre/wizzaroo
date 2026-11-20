import { describe, expect, it } from "vitest";
import { worldMap } from "../../curriculum/world-map.js";
import {
  exploreScale,
  findExploreAdventure,
  findWalkSurface,
  regionBlockRadius,
} from "./island-adventures.js";
import {
  findRailPoint,
  findRailway,
  findStationPlatformSpot,
  railBridgeStyles,
  railSampleSpacing,
} from "./island-railway.js";
import {
  buildTimetable,
  findLegSeconds,
  findLegTravel,
  findSecondsUntilTrainAt,
  findTimetableStart,
  findTrainPosition,
  stationWaitSeconds,
  trainTopSpeed,
} from "./island-train-timetable.js";
import { findIslandTrain, trainDesigns } from "./island-train-design.js";
import { buildExploreWorld } from "./island-transport.js";
import { listIslandWonders, wonderFootprints } from "./island-wonders.js";

const islandIds = [
  "meadow-isle",
  "frost-isle",
  "sunscorch-sands",
  "jungle-reach",
  "ember-isle",
  "starfall-isle",
];

describe.each(islandIds)("the railway on %s", (islandId) => {
  const railway = findRailway(islandId);
  const adventure = findExploreAdventure(islandId);

  it("is a closed loop with no gaps", () => {
    const count = railway.points.length;
    railway.points.forEach((point, index) => {
      const next = railway.points[(index + 1) % count];
      expect(Math.hypot(next.x - point.x, next.z - point.z)).toBeLessThan(
        railSampleSpacing * 1.6,
      );
    });
    expect(railway.length).toBeGreaterThan(1500);
  });

  it("runs round the main land and both new lands", () => {
    const xs = railway.points.map(({ x }) => x / exploreScale);
    expect(Math.min(...xs)).toBeLessThan(-55);
    expect(Math.max(...xs)).toBeGreaterThan(55);
    expect(
      railway.points.some(({ x }) => Math.abs(x) < 10 * exploreScale),
    ).toBe(true);
  });

  it("crosses the sea and the rivers on bridges of several styles", () => {
    expect(railway.bridges.length).toBeGreaterThanOrEqual(4);
    expect(railway.bridges.some(({ isOverSea }) => isOverSea)).toBe(true);
    expect(
      new Set(railway.bridges.map(({ style }) => style)).size,
    ).toBeGreaterThanOrEqual(4);
    railway.points
      .filter(({ ground }) => ground < 0)
      .forEach((point) => {
        expect(point.isOnBridge || point.isInTunnel).toBe(true);
      });
  });

  it("stays above the ground except in its tunnels", () => {
    railway.points
      .filter(({ isInTunnel }) => !isInTunnel)
      .forEach((point) => {
        expect(point.y).toBeGreaterThanOrEqual(
          Math.max(0.6, point.ground) - 0.01,
        );
      });
  });

  it("is gentle almost everywhere", () => {
    const count = railway.points.length;
    const steep = railway.points.filter((point, index) => {
      const next = railway.points[(index + 1) % count];
      return Math.abs(next.y - point.y) / railSampleSpacing > 0.2;
    });
    expect(steep.length / count).toBeLessThan(0.04);
  });

  it("keeps clear of every Region and Wonder", () => {
    const regions = worldMap.regions.filter(
      (region) => region.islandId === islandId,
    );
    railway.points.forEach((point) => {
      regions.forEach(({ mapPosition }) => {
        expect(
          Math.hypot(
            point.x - mapPosition.x * exploreScale,
            point.z - mapPosition.z * exploreScale,
          ),
        ).toBeGreaterThan(regionBlockRadius);
      });
      listIslandWonders(islandId).forEach(({ kind, position }) => {
        expect(
          Math.hypot(
            point.x - position.x * exploreScale,
            point.z - position.z * exploreScale,
          ),
        ).toBeGreaterThan(wonderFootprints[kind] * exploreScale);
      });
    });
  });

  it("has five Stations on level, dry ground with a platform to stand on", () => {
    const world = buildExploreWorld(adventure);
    expect(railway.stations).toHaveLength(5);
    railway.stations.forEach((station) => {
      const track =
        railway.points[Math.round(station.distance / railSampleSpacing)];
      expect(track.isOnBridge || track.isInTunnel).toBe(false);
      expect(station.height - Math.max(0, track.ground)).toBeLessThan(0.8);
      const platform = findStationPlatformSpot(railway, station);
      const surface = findWalkSurface(world, platform, Infinity);
      expect(surface.kind).toBe("bridge");
      expect(surface.height).toBeCloseTo(platform.y, 1);
    });
  });

  it("lets the Character walk along the track", () => {
    const world = buildExploreWorld(adventure);
    const onLand = railway.points.find(
      (point) => !point.isOnBridge && !point.isInTunnel && point.ground > 2,
    );
    expect(onLand).toBeDefined();
    if (onLand !== undefined) {
      const surface = findWalkSurface(world, onLand, Infinity);
      expect(["trail", "bridge"]).toContain(surface.kind);
      expect(surface.height).toBeGreaterThan(onLand.y);
    }
  });
});

describe("the bridges across every Island", () => {
  it("use every style somewhere", () => {
    const styles = new Set(
      islandIds.flatMap((islandId) =>
        findRailway(islandId).bridges.map(({ style }) => style),
      ),
    );
    expect([...styles].toSorted()).toEqual([...railBridgeStyles].toSorted());
  });
});

describe("the trains", () => {
  it("are a different style on every Island, and Meadow Isle's is a steam train", () => {
    const styles = islandIds.map((islandId) => findIslandTrain(islandId).style);
    expect(new Set(styles).size).toBe(islandIds.length);
    expect(findIslandTrain("meadow-isle").style).toBe("steam");
    expect(Object.keys(trainDesigns)).toHaveLength(6);
  });
});

describe("the timetable", () => {
  const railway = findRailway("meadow-isle");
  const timetable = buildTimetable(railway);

  it("speeds up, runs and slows down to stop exactly at the next Station", () => {
    const length = 400;
    const seconds = findLegSeconds(length);
    expect(findLegTravel(length, 0)).toEqual({ travelled: 0, speed: 0 });
    expect(findLegTravel(length, seconds / 2).speed).toBeCloseTo(trainTopSpeed);
    expect(findLegTravel(length, seconds).travelled).toBeCloseTo(length);
    expect(findLegTravel(length, seconds).speed).toBeCloseTo(0);
  });

  it("waits at each Station in turn", () => {
    let seconds = 0;
    railway.stations.forEach((station, index) => {
      const position = findTrainPosition(railway, timetable, seconds + 1);
      expect(position).toMatchObject({ kind: "waiting", stationIndex: index });
      const at = findRailPoint(railway, position.distance);
      const stationPoint = findRailPoint(railway, station.distance);
      expect(
        Math.hypot(at.x - stationPoint.x, at.z - stationPoint.z),
      ).toBeLessThan(0.01);
      seconds += stationWaitSeconds + timetable.legs[index].seconds;
    });
    expect(seconds).toBeCloseTo(timetable.loopSeconds);
  });

  it("goes round the loop in a few minutes", () => {
    expect(timetable.loopSeconds).toBeGreaterThan(120);
    expect(timetable.loopSeconds).toBeLessThan(360);
  });

  it("says how long until the train reaches a Station", () => {
    const wait = findSecondsUntilTrainAt(railway, timetable, 3, 2);
    expect(findTrainPosition(railway, timetable, 3 + wait + 1)).toMatchObject({
      kind: "waiting",
      stationIndex: 2,
    });
    expect(findSecondsUntilTrainAt(railway, timetable, 3, 0)).toBe(0);
  });

  it("starts the train coming in to the Station nearest the Character", () => {
    const station = railway.stations[3];
    const near = findRailPoint(railway, station.distance);
    const start = findTimetableStart(railway, timetable, near);
    const wait = findSecondsUntilTrainAt(railway, timetable, start, 3);
    expect(wait).toBeGreaterThan(10);
    expect(wait).toBeLessThan(40);
  });
});
