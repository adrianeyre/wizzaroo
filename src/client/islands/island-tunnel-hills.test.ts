import { describe, expect, it } from "vitest";
import { findExploreAdventure, exploreScale } from "./island-adventures.js";
import { isInNewLandRiver } from "../world-map-terrain.js";
import { findNewLands } from "./island-attraction-placing.js";
import { listPlacedAttractions } from "./island-attractions.js";
import {
  findRailwayLook,
  listTunnelMouthParts,
} from "./island-railway-design.js";
import {
  findRailHeading,
  findRailPoint,
  findRailway,
  findStationPlatformSpot,
  tunnelPortalSetback,
} from "./island-railway.js";
import { mapTrainScale } from "./island-train-design.js";
import { describeTunnelHills } from "./island-tunnel-hill-placing.js";
import { tunnelHillSites } from "./island-tunnel-hill-sites.js";
import {
  findHeightUnderTunnelHills,
  tunnelHillCrest,
  tunnelHillWetGround,
} from "./island-tunnel-hills.js";

const islandIds = [
  "meadow-isle",
  "frost-isle",
  "sunscorch-sands",
  "jungle-reach",
  "ember-isle",
  "starfall-isle",
];

const findBase = (islandId: string) => {
  const findBaseHeight = findHeightUnderTunnelHills(islandId);
  if (findBaseHeight === undefined) {
    throw new TypeError(`${islandId} has no ground under its tunnel hills`);
  }
  return ({ x, z }: { x: number; z: number }) =>
    findBaseHeight({ x: x / exploreScale, z: z / exploreScale }) * exploreScale;
};

const listPortals = (islandId: string) => {
  const railway = findRailway(islandId);
  return railway.tunnels.flatMap((tunnel) =>
    (
      [
        [tunnel.fromDistance - tunnelPortalSetback, -1],
        [tunnel.toDistance + tunnelPortalSetback, 1],
      ] as const
    ).map(([distance, facing]) => {
      const point = findRailPoint(railway, distance);
      const heading = findRailHeading(railway, distance);
      const inward = {
        x: -Math.sin(heading) * facing,
        z: -Math.cos(heading) * facing,
      };
      return { tunnel, distance, facing, point, inward };
    }),
  );
};

/** How high a portal's stonework reaches above its track, at `size`. */
const findPortalTop = (
  islandId: string,
  distance: number,
  facing: number,
  size: number,
): number => {
  const railway = findRailway(islandId);
  const parts = listTunnelMouthParts(
    railway,
    distance,
    facing,
    findRailwayLook(islandId),
    size,
  );
  const top = Math.max(
    ...parts.map(({ geometry }) => {
      geometry.computeBoundingBox();
      return geometry.boundingBox?.max.y ?? -Infinity;
    }),
  );
  return top - findRailPoint(railway, distance).y;
};

/** The highest ground over the tunnel from its portal to `reach` inside. */
const findHighestBehind = (
  islandId: string,
  portal: ReturnType<typeof listPortals>[number],
  reach: number,
): number => {
  const { findHeight } = findExploreAdventure(islandId);
  let highest = -Infinity;
  for (let along = 0; along <= reach; along += 0.5) {
    highest = Math.max(
      highest,
      findHeight({
        x: portal.point.x + portal.inward.x * along,
        z: portal.point.z + portal.inward.z * along,
      }) - portal.point.y,
    );
  }
  return highest;
};

describe("the hills over the tunnels", () => {
  it("rise higher than the World Map's portals", () => {
    const top = findPortalTop("meadow-isle", 0, 1, mapTrainScale);
    expect(tunnelHillCrest).toBeGreaterThan(top);
  });

  for (const islandId of islandIds) {
    describe(islandId, () => {
      const portals = listPortals(islandId);
      const findBaseHeight = findBase(islandId);
      const { findHeight } = findExploreAdventure(islandId);

      it("are written from the Railway as it is now", () => {
        expect(tunnelHillSites[islandId]).toEqual(
          describeTunnelHills(islandId),
        );
      });

      it("rise above every portal when exploring, just behind it", () => {
        for (const portal of portals) {
          const top = findPortalTop(
            islandId,
            portal.distance,
            portal.facing,
            1,
          );
          expect(
            findHighestBehind(islandId, portal, 6),
            `${portal.tunnel.id} at ${portal.distance.toFixed(0)}`,
          ).toBeGreaterThan(top);
        }
      });

      it("rise above every portal on the World Map", () => {
        for (const portal of portals) {
          const top = findPortalTop(
            islandId,
            portal.distance,
            portal.facing,
            mapTrainScale,
          );
          expect(
            findHighestBehind(islandId, portal, 15),
            `${portal.tunnel.id} at ${portal.distance.toFixed(0)}`,
          ).toBeGreaterThan(top);
        }
      });

      it("leave the ground in front of every portal as it was", () => {
        for (const portal of portals) {
          for (let along = -12; along <= -0.6; along += 0.6) {
            for (const across of [-1.7, 0, 1.7]) {
              const point = {
                x:
                  portal.point.x +
                  portal.inward.x * along +
                  portal.inward.z * across,
                z:
                  portal.point.z +
                  portal.inward.z * along -
                  portal.inward.x * across,
              };
              expect(findHeight(point)).toBeCloseTo(findBaseHeight(point), 6);
            }
          }
        }
      });

      it("leave the open track, its Stations and the Attractions as they were", () => {
        const railway = findRailway(islandId);
        const spots = [
          ...railway.points.filter(({ isInTunnel }) => !isInTunnel),
          ...railway.stations.map((station) =>
            findStationPlatformSpot(railway, station),
          ),
          ...listPlacedAttractions(islandId).map(({ centre }) => centre),
        ];
        for (const spot of spots) {
          expect(findHeight(spot)).toBeCloseTo(findBaseHeight(spot), 6);
        }
      });

      it("never raise the sea, rivers or pools", () => {
        const adventure = findExploreAdventure(islandId);
        for (const site of tunnelHillSites[islandId]) {
          for (const { x, z } of site.bore) {
            for (let dx = -30; dx <= 30; dx += 2.5) {
              for (let dz = -30; dz <= 30; dz += 2.5) {
                const point = { x: x + dx, z: z + dz };
                const base = findBaseHeight(point);
                if (
                  base < tunnelHillWetGround ||
                  adventure.findCourseKind(point) !== undefined ||
                  isInNewLandRiver(
                    { x: point.x / exploreScale, z: point.z / exploreScale },
                    findNewLands(islandId),
                  )
                ) {
                  expect(findHeight(point) - base).toBeLessThan(0.5);
                }
              }
            }
          }
        }
      });
    });
  }
});
