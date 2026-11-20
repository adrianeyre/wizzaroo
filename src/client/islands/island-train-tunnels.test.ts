import { Matrix4, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import {
  findChimneyDistance,
  listTrainVehicleSpans,
} from "./island-railway-models.js";
import { findRailPoint, findRailway, wrapDistance } from "./island-railway.js";
import { findIslandTrain } from "./island-train-design.js";
import {
  buildPortalPlanes,
  findTrainInTunnels,
  listTunnelBores,
  placePortalPlanes,
} from "./island-train-tunnels.js";

const islandIds = [
  "meadow-isle",
  "frost-isle",
  "sunscorch-sands",
  "jungle-reach",
  "ember-isle",
  "starfall-isle",
];

describe("the trains in the tunnels", () => {
  it("finds both portals of every tunnel, facing out of it", () => {
    for (const islandId of islandIds) {
      const railway = findRailway(islandId);
      const bores = listTunnelBores(railway);
      expect(bores).toHaveLength(railway.tunnels.length);
      for (const bore of bores) {
        expect(bore.length).toBeGreaterThan(14);
        const inside = findRailPoint(
          railway,
          bore.entry.distance + bore.length / 2,
        );
        for (const portal of [bore.entry, bore.exit]) {
          const towardInside = new Vector3(
            inside.x - portal.point.x,
            0,
            inside.z - portal.point.z,
          );
          expect(portal.outward.dot(towardInside)).toBeLessThan(0);
        }
      }
    }
  });

  it.each(islandIds)(
    "hides %s's vehicles while they are wholly inside a tunnel, and cuts off the ones going in or coming out",
    (islandId) => {
      const railway = findRailway(islandId);
      const design = findIslandTrain(islandId);
      const [bore] = listTunnelBores(railway);
      const spansAt = (front: number) =>
        listTrainVehicleSpans(design, wrapDistance(railway, front));

      const before = findTrainInTunnels(
        railway,
        spansAt(bore.entry.distance - 1),
      );
      expect(before.bore).toBeUndefined();
      expect(before.hiddenVehicles.every((hidden) => !hidden)).toBe(true);

      const goingIn = findTrainInTunnels(
        railway,
        spansAt(bore.entry.distance + design.locomotive.length + 2),
      );
      expect(goingIn.bore).toBe(bore);
      expect(goingIn.hiddenVehicles[0]).toBe(true);
      expect(goingIn.hiddenVehicles.at(-1)).toBe(false);

      const deep = findTrainInTunnels(
        railway,
        spansAt(bore.exit.distance - 0.5),
      );
      const trainLength = spansAt(0)[0].front - (spansAt(0).at(-1)?.back ?? 0);
      if (bore.length > trainLength + 1) {
        expect(deep.hiddenVehicles.every((hidden) => hidden)).toBe(true);
      }

      const comingOut = findTrainInTunnels(
        railway,
        spansAt(bore.exit.distance + 2),
      );
      expect(comingOut.bore).toBe(bore);
      expect(comingOut.hiddenVehicles[0]).toBe(false);
    },
  );

  it("keeps the steam engine from puffing while its chimney is in a tunnel", () => {
    const railway = findRailway("meadow-isle");
    const design = findIslandTrain("meadow-isle");
    const [bore] = listTunnelBores(railway);
    const inTunnelAt = (front: number) =>
      findTrainInTunnels(
        railway,
        listTrainVehicleSpans(design, front),
        findChimneyDistance(design, front),
      ).isChimneyInside;
    expect(inTunnelAt(bore.entry.distance - 1)).toBe(false);
    expect(inTunnelAt(bore.entry.distance + 4)).toBe(true);
    expect(inTunnelAt(bore.exit.distance + 5)).toBe(false);
  });

  it("clips only what is inside the tunnel, between its portals", () => {
    const railway = findRailway("frost-isle");
    const [bore] = listTunnelBores(railway);
    const planes = buildPortalPlanes();
    const isClipped = (distance: number) => {
      const point = findRailPoint(railway, distance);
      const spot = new Vector3(point.x, point.y + 1, point.z);
      return planes.every((plane) => plane.distanceToPoint(spot) < 0);
    };
    placePortalPlanes(planes, undefined, new Matrix4());
    expect(isClipped(bore.entry.distance + 3)).toBe(false);
    placePortalPlanes(planes, bore, new Matrix4());
    expect(isClipped(bore.entry.distance + 3)).toBe(true);
    expect(isClipped(bore.exit.distance - 3)).toBe(true);
    expect(isClipped(bore.entry.distance - 3)).toBe(false);
    expect(isClipped(bore.exit.distance + 3)).toBe(false);
  });
});
