import type { MapPoint, PlaceToKeepClear } from "../world-map-terrain.js";
import { addAttractionLanes } from "./island-attractions.js";
import {
  buildAdventureWorld,
  exploreScale,
  type AdventureBridge,
  type AdventureWorld,
  type IslandAdventure,
  type WalkLanes,
  type WalkSurface,
} from "./island-adventures.js";
import {
  findRailHeading,
  findRailPoint,
  findRightOf,
  findStationPlatformSpot,
  findRailway,
  hasRailway,
  platformHalfWidth,
  platformLength,
  railSampleSpacing,
  type Railway,
} from "./island-railway.js";

export const railWalkLift = 0.22;
const railWalkHalfWidth = 1.05;
const laneCellSize = 16;
const platformPieces = 3;
const stationBuildingReach = 6.5;
const railPlaceSpacing = 2;

interface LaneSegment {
  start: { x: number; y: number; z: number };
  end: { x: number; y: number; z: number };
  halfWidth: number;
  kind: WalkSurface["kind"];
  isOnGround: boolean;
}

const findCellKey = (column: number, row: number): string =>
  `${String(column)}:${String(row)}`;

export const buildWalkLanes = (
  segments: readonly LaneSegment[],
  findHeight: (point: MapPoint) => number,
): WalkLanes => {
  const cells = new Map<string, LaneSegment[]>();
  segments.forEach((segment) => {
    const reach = segment.halfWidth;
    const fromColumn = Math.floor(
      (Math.min(segment.start.x, segment.end.x) - reach) / laneCellSize,
    );
    const toColumn = Math.floor(
      (Math.max(segment.start.x, segment.end.x) + reach) / laneCellSize,
    );
    const fromRow = Math.floor(
      (Math.min(segment.start.z, segment.end.z) - reach) / laneCellSize,
    );
    const toRow = Math.floor(
      (Math.max(segment.start.z, segment.end.z) + reach) / laneCellSize,
    );
    for (let column = fromColumn; column <= toColumn; column++) {
      for (let row = fromRow; row <= toRow; row++) {
        const key = findCellKey(column, row);
        const list = cells.get(key) ?? [];
        list.push(segment);
        cells.set(key, list);
      }
    }
  });
  return {
    findDeck: (point) => {
      const nearby = cells.get(
        findCellKey(
          Math.floor(point.x / laneCellSize),
          Math.floor(point.z / laneCellSize),
        ),
      );
      if (nearby === undefined) {
        return undefined;
      }
      let found: WalkSurface | undefined;
      for (const { start, end, halfWidth, kind, isOnGround } of nearby) {
        const lengthX = end.x - start.x;
        const lengthZ = end.z - start.z;
        const lengthSquared = lengthX * lengthX + lengthZ * lengthZ;
        const along =
          lengthSquared === 0
            ? 0
            : Math.min(
                1,
                Math.max(
                  0,
                  ((point.x - start.x) * lengthX +
                    (point.z - start.z) * lengthZ) /
                    lengthSquared,
                ),
              );
        const across = Math.hypot(
          point.x - (start.x + along * lengthX),
          point.z - (start.z + along * lengthZ),
        );
        if (across > halfWidth) {
          continue;
        }
        const height = isOnGround
          ? findHeight(point)
          : start.y + (end.y - start.y) * along;
        if (found === undefined || height > found.height) {
          found = { height, kind };
        }
      }
      return found;
    },
  };
};

const listRailSegments = (railway: Railway): LaneSegment[] =>
  railway.points.flatMap((point, index) => {
    const next = railway.points[(index + 1) % railway.points.length];
    if (point.isInTunnel || next.isInTunnel) {
      return [];
    }
    return [
      {
        start: { x: point.x, y: point.y + railWalkLift, z: point.z },
        end: { x: next.x, y: next.y + railWalkLift, z: next.z },
        halfWidth: railWalkHalfWidth,
        kind: point.isOnBridge ? "bridge" : "trail",
        isOnGround: false,
      },
    ];
  });

export const buildStationPlatforms = (railway: Railway): AdventureBridge[] =>
  railway.stations.flatMap((station) =>
    Array.from({ length: platformPieces }, (_, piece) => {
      const pieceLength = platformLength / platformPieces;
      const startAlong = -platformLength / 2 + piece * pieceLength;
      const from = findStationPlatformSpot(railway, station, startAlong);
      const to = findStationPlatformSpot(
        railway,
        station,
        startAlong + pieceLength,
      );
      return {
        name: `${station.id}-platform-${String(piece + 1)}`,
        from: { x: from.x, z: from.z },
        to: { x: to.x, z: to.z },
        endHeight: from.y,
        middleHeight: from.y,
        halfWidth: platformHalfWidth,
        material: "stone",
        isDrawnByIsland: true,
      } satisfies AdventureBridge;
    }),
  );

export const findStationBuildingSpot = (
  railway: Railway,
  stationIndex: number,
): MapPoint & { heading: number } => {
  const station = railway.stations[stationIndex];
  const point = findRailPoint(railway, station.distance);
  const heading = findRailHeading(railway, station.distance);
  const right = findRightOf(heading);
  return {
    x: point.x + right.x * stationBuildingReach * station.side,
    z: point.z + right.z * stationBuildingReach * station.side,
    heading,
  };
};

const exploreWorlds = new Map<string, AdventureWorld>();

export const buildExploreWorld = (
  adventure: IslandAdventure,
): AdventureWorld => {
  const known = exploreWorlds.get(adventure.islandId);
  if (known?.adventure === adventure) {
    return known;
  }
  if (!hasRailway(adventure.islandId)) {
    const world = buildAdventureWorld(adventure, {
      lanes: addAttractionLanes(adventure, undefined),
    });
    exploreWorlds.set(adventure.islandId, world);
    return world;
  }
  const railway = findRailway(adventure.islandId);
  const world = buildAdventureWorld(adventure, {
    bridges: buildStationPlatforms(railway),
    lanes: addAttractionLanes(
      adventure,
      buildWalkLanes(listRailSegments(railway), adventure.findHeight),
    ),
  });
  exploreWorlds.set(adventure.islandId, world);
  return world;
};

const shrink = ({ x, z }: MapPoint): MapPoint => ({
  x: x / exploreScale,
  z: z / exploreScale,
});

const transportPlaces = new Map<string, PlaceToKeepClear[]>();

export const listTransportPlaces = (islandId: string): PlaceToKeepClear[] => {
  if (!hasRailway(islandId)) {
    return [];
  }
  const known = transportPlaces.get(islandId);
  if (known !== undefined) {
    return known;
  }
  const railway = findRailway(islandId);
  const railEvery = Math.round(
    (railPlaceSpacing * exploreScale) / railSampleSpacing,
  );
  const places = [
    ...railway.points
      .filter((point, index) => index % railEvery === 0 && !point.isInTunnel)
      .map(shrink),
    ...railway.stations.map((_, index) =>
      shrink(findStationBuildingSpot(railway, index)),
    ),
  ];
  transportPlaces.set(islandId, places);
  return places;
};
