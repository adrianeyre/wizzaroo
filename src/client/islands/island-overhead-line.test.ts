import { describe, expect, it } from "vitest";
import {
  buildOverheadLineGeometry,
  isSpanInTunnel,
  listMastDistances,
  listMastSpots,
  listOverheadLineGeometries,
} from "./island-overhead-line.js";
import { findRailPoint, findRailway, railTopLift } from "./island-railway.js";
import { trainDesigns } from "./island-train-design.js";

const islandIds = [
  "meadow-isle",
  "frost-isle",
  "sunscorch-sands",
  "jungle-reach",
  "ember-isle",
  "starfall-isle",
];

describe("the overhead line", () => {
  it("is hung only over the electric train's Railway", () => {
    const electrified = islandIds.filter(
      (islandId) =>
        listOverheadLineGeometries(findRailway(islandId), "explore").length > 0,
    );
    expect(electrified).toEqual(["frost-isle"]);
  });

  it("has masts all the way round outside the tunnels, closer together on the curves", () => {
    const railway = findRailway("frost-isle");
    const masts = listMastDistances(railway);
    const spans = masts
      .map((distance, index) => ({
        distance,
        length: (masts[index + 1] ?? railway.length + masts[0]) - distance,
      }))
      .filter(
        ({ distance, length }) =>
          !isSpanInTunnel(railway, distance, distance + length),
      )
      .map(({ length }) => length);
    expect(Math.max(...spans)).toBeLessThanOrEqual(12 + 3);
    expect(Math.min(...spans.slice(0, -1))).toBeGreaterThanOrEqual(3);
    expect(new Set(spans.map((span) => span.toFixed(2))).size).toBeGreaterThan(
      1,
    );
  });

  it("keeps the contact wire within reach of the raised pantograph", () => {
    const railway = findRailway("frost-isle");
    const top = trainDesigns.electric.pantograph?.top ?? 0;
    const geometry = buildOverheadLineGeometry(railway, {
      contactHeight: top,
      scale: 1,
      isMap: false,
    });
    const positions = geometry.getAttribute("position");
    const highestAboveRail = Math.max(
      ...railway.points.map((point) => point.y + railTopLift),
    );
    let highest = -Infinity;
    for (let index = 0; index < positions.count; index++) {
      highest = Math.max(highest, positions.getY(index));
    }
    expect(highest).toBeLessThan(highestAboveRail + top + 1.2);
    const start = findRailPoint(railway, 0);
    let lowestNearStart = Infinity;
    for (let index = 0; index < positions.count; index++) {
      const isOverTrack =
        Math.hypot(
          positions.getX(index) - start.x,
          positions.getZ(index) - start.z,
        ) < 0.2;
      if (isOverTrack) {
        lowestNearStart = Math.min(lowestNearStart, positions.getY(index));
      }
    }
    expect(lowestNearStart - (start.y + railTopLift)).toBeCloseTo(top, 1);
  });

  it("leaves the masts out of the tunnels and away from the platforms", () => {
    const railway = findRailway("frost-isle");
    const masts = listMastSpots(railway, {
      contactHeight: 2.5,
      scale: 1,
      isMap: false,
    });
    expect(masts.filter((mast) => mast.hasMast).length).toBeGreaterThan(20);
    for (const mast of masts) {
      const isInTunnel = railway.tunnels.some(
        (tunnel) =>
          mast.distance > tunnel.fromDistance &&
          mast.distance < tunnel.toDistance,
      );
      if (isInTunnel) {
        expect(mast.hasMast).toBe(false);
      }
      for (const station of railway.stations) {
        if (Math.abs(mast.distance - station.distance) < 10) {
          expect(mast.side).toBe(-station.side);
        }
      }
    }
  });

  it("holds the wire at each tunnel portal and draws none through the hill", () => {
    const railway = findRailway("frost-isle");
    const masts = listMastDistances(railway);
    for (const tunnel of railway.tunnels) {
      expect(
        masts.some(
          (distance) =>
            distance < tunnel.fromDistance &&
            distance > tunnel.fromDistance - 1,
        ),
      ).toBe(true);
      expect(
        masts.some(
          (distance) =>
            distance > tunnel.toDistance && distance < tunnel.toDistance + 1,
        ),
      ).toBe(true);
      const middle = (tunnel.fromDistance + tunnel.toDistance) / 2;
      expect(isSpanInTunnel(railway, middle - 1, middle + 1)).toBe(true);
    }
    const spansInTunnels = masts.filter((distance, index) =>
      isSpanInTunnel(railway, distance, masts[(index + 1) % masts.length]),
    );
    expect(spansInTunnels).toHaveLength(railway.tunnels.length);
  });
});
