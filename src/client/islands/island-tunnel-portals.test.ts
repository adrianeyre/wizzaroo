import { describe, expect, it } from "vitest";
import {
  Box3,
  BoxGeometry,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  Vector3,
} from "three";
import { findExploreAdventure } from "./island-adventures.js";
import {
  buildTunnelMoundGeometry,
  findRailwayLook,
  listTunnelMouthParts,
} from "./island-railway-design.js";
import {
  findRailHeading,
  findRailPoint,
  findRailway,
  railTopLift,
  tunnelPortalSetback,
} from "./island-railway.js";
import {
  findIslandTrain,
  listTrainVehicles,
  mapTrainScale,
} from "./island-train-design.js";

const islandIds = [
  "meadow-isle",
  "frost-isle",
  "sunscorch-sands",
  "jungle-reach",
  "ember-isle",
  "starfall-isle",
];

const clearance = 0.3;

const measureTrain = (islandId: string, detail: "explore" | "map") => {
  const box = new Box3();
  for (const { model } of listTrainVehicles(findIslandTrain(islandId))) {
    const geometry = model.build(detail);
    geometry.computeBoundingBox();
    if (geometry.boundingBox !== null) {
      box.union(geometry.boundingBox);
    }
    geometry.dispose();
  }
  return { width: box.max.x - box.min.x, top: box.max.y };
};

describe("the tunnel portals", () => {
  for (const islandId of islandIds) {
    const railway = findRailway(islandId);
    for (const [detail, size] of [
      ["explore", 1],
      ["map", mapTrainScale],
    ] as const) {
      it(`are bigger than ${islandId}'s Train on the ${detail === "map" ? "World Map" : "Island"}`, () => {
        const train = measureTrain(islandId, detail);
        for (const tunnel of railway.tunnels) {
          const distance = tunnel.fromDistance - tunnelPortalSetback;
          const parts = listTunnelMouthParts(
            railway,
            distance,
            -1,
            findRailwayLook(islandId),
            size,
          );
          const opening = parts.find(({ colour }) => colour === "#0b0b0f");
          const geometry = opening?.geometry;
          if (!(geometry instanceof BoxGeometry)) {
            throw new TypeError("The portal has no dark opening");
          }
          geometry.computeBoundingBox();
          const deck = findRailPoint(railway, distance).y;
          const openingTop = (geometry.boundingBox?.max.y ?? 0) - deck;
          expect(geometry.parameters.width).toBeGreaterThan(
            (train.width + clearance * 2) * size,
          );
          expect(openingTop).toBeGreaterThan(
            railTopLift + (train.top + clearance) * size,
          );
        }
      });
    }
  }
});

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
      return {
        name: `${tunnel.id} at ${distance.toFixed(0)}`,
        distance,
        facing,
        point,
        inward: {
          x: -Math.sin(heading) * facing,
          z: -Math.cos(heading) * facing,
        },
      };
    }),
  );
};

/** How far the portal's stonework reaches behind its face, and to either side, at size 1. */
const stoneBack = 0.45;
const stoneHalfWidth = 2.9;

describe("the land over the tunnel portals", () => {
  for (const islandId of islandIds) {
    const railway = findRailway(islandId);
    const { findHeight } = findExploreAdventure(islandId);
    for (const [view, size] of [
      ["on the Island", 1],
      ["on the World Map", mapTrainScale],
    ] as const) {
      it(`meets the top of every one of ${islandId}'s portals, with no gap, ${view}`, () => {
        for (const portal of listPortals(islandId)) {
          const stone = listTunnelMouthParts(
            railway,
            portal.distance,
            portal.facing,
            findRailwayLook(islandId),
            size,
          );
          const stoneTop = Math.max(
            ...stone.map(({ geometry }) => {
              geometry.computeBoundingBox();
              return geometry.boundingBox?.max.y ?? -Infinity;
            }),
          );
          const mound = new Mesh(
            buildTunnelMoundGeometry(
              railway,
              portal.distance,
              portal.facing,
              size,
            ),
            new MeshBasicMaterial({ side: DoubleSide }),
          );
          const raycaster = new Raycaster();
          const halfWidth = stoneHalfWidth * size;
          for (let across = -halfWidth; across <= halfWidth; across += 0.25) {
            const x =
              portal.point.x +
              portal.inward.x * (stoneBack * size + 0.05) +
              portal.inward.z * across;
            const z =
              portal.point.z +
              portal.inward.z * (stoneBack * size + 0.05) -
              portal.inward.x * across;
            raycaster.set(new Vector3(x, 1000, z), new Vector3(0, -1, 0));
            const moundTop = raycaster.intersectObject(mound).at(0)?.point.y;
            const land = Math.max(findHeight({ x, z }), moundTop ?? -Infinity);
            expect(
              land,
              `${portal.name}, ${across.toFixed(2)} across`,
            ).toBeGreaterThanOrEqual(stoneTop);
          }
        }
      });
    }

    it(`keeps the land behind the face of ${islandId}'s portals`, () => {
      for (const portal of listPortals(islandId)) {
        const positions = buildTunnelMoundGeometry(
          railway,
          portal.distance,
          portal.facing,
        ).getAttribute("position");
        for (let index = 0; index < positions.count; index++) {
          const inward =
            (positions.getX(index) - portal.point.x) * portal.inward.x +
            (positions.getZ(index) - portal.point.z) * portal.inward.z;
          expect(inward, portal.name).toBeGreaterThan(-1e-3);
        }
      }
    });
  }
});
