import { islands } from "../../curriculum/islands.js";
import {
  exploreScale,
  findExploreAdventure,
  listHoverPadPlaces,
  type IslandAdventure,
} from "./island-adventures.js";
import { findNewLands, isOnAirfield } from "./island-attraction-placing.js";
import {
  findAttractionReach,
  listPlacedAttractions,
} from "./island-attractions.js";
import {
  findRailHeading,
  findRailPoint,
  findRailway,
  findStationPlatformSpot,
  hasRailway,
  railSampleSpacing,
  tunnelPortalSetback,
  wrapDistance,
  type Railway,
  type RailTunnel,
} from "./island-railway.js";
import type { TunnelHillSite } from "./island-tunnel-hill-sites.js";
import {
  findHeightUnderTunnelHills,
  tunnelHillReach,
  tunnelHillTrackGap,
  tunnelHillWetGround,
} from "./island-tunnel-hills.js";
import { jungleReach } from "./jungle-reach.js";
import type { IslandLandform } from "./island-landform.js";
import { starfallIsle } from "./starfall-isle.js";
import { sunscorchSands } from "./sunscorch-sands.js";
import { emberIsle } from "./ember-isle.js";
import { frostIsle } from "./frost-isle.js";
import { listIslandWonders, wonderFootprints } from "./island-wonders.js";
import { findStationBuildingSpot } from "./island-transport.js";
import { isInNewLandRiver, type MapPoint } from "../world-map-terrain.js";

const landforms = new Map<string, IslandLandform>([
  ["frost-isle", frostIsle],
  ["sunscorch-sands", sunscorchSands],
  ["jungle-reach", jungleReach],
  ["ember-isle", emberIsle],
  ["starfall-isle", starfallIsle],
]);

const boreSpacing = railSampleSpacing * 2;
/** The open track this far along from a portal is kept by the portal's cutting. */
const portalCuttingLength = 8;
const stationBuildingReach = 8;
const platformReach = 14;
const dockReach = 8;
const hoverPadReach = 4;
const wonderGap = 2;
const regionReach = 9;
const featureReach = 6;
/** How finely the ground round a hill is searched for water and the airfield. */
const groundSpacing = 2.5;
const groundEdgeReach = groundSpacing;
/** The hill's sides rise steeply from the water, like a bank or a cliff. */
const groundEdgeSlope = 3;

const round = (value: number, places = 2): number =>
  Math.round(value * 10 ** places) / 10 ** places;

const findPortal = (railway: Railway, distance: number, facing: number) => {
  const point = findRailPoint(railway, distance);
  const heading = findRailHeading(railway, distance);
  return {
    x: round(point.x),
    z: round(point.z),
    y: round(point.y),
    outX: round(Math.sin(heading) * facing, 4),
    outZ: round(Math.cos(heading) * facing, 4),
  };
};

const isAlongTunnel = (
  railway: Railway,
  tunnel: RailTunnel,
  distance: number,
): boolean => {
  const from = tunnel.fromDistance - tunnelPortalSetback - portalCuttingLength;
  const reach =
    tunnel.toDistance -
    tunnel.fromDistance +
    2 * (tunnelPortalSetback + portalCuttingLength);
  return wrapDistance(railway, distance - from) <= reach;
};

const findGap = (points: readonly MapPoint[], point: MapPoint): number =>
  Math.min(...points.map(({ x, z }) => Math.hypot(point.x - x, point.z - z)));

/**
 * The water and the airfield round the hill, which its sides keep off:
 * the hill is never raised out of the sea, a river or a pool, nor over
 * the levelled airfield.
 */
const listGroundEdges = (
  adventure: IslandAdventure,
  bore: readonly MapPoint[],
): (MapPoint & { reach: number; slope: number })[] => {
  const findBaseHeight = findHeightUnderTunnelHills(adventure.islandId);
  const findGround = (point: MapPoint) =>
    findBaseHeight === undefined
      ? adventure.findHeight(point)
      : findBaseHeight({
          x: point.x / exploreScale,
          z: point.z / exploreScale,
        }) * exploreScale;
  const newLands = findNewLands(adventure.islandId);
  const isSea = (point: MapPoint) => findGround(point) < tunnelHillWetGround;
  const isKept = (point: MapPoint) =>
    isSea(point) ||
    adventure.findCourseKind(point) !== undefined ||
    isInNewLandRiver(
      { x: point.x / exploreScale, z: point.z / exploreScale },
      newLands,
    ) ||
    isOnAirfield(adventure, point, 0);
  const xs = bore.map(({ x }) => x);
  const zs = bore.map(({ z }) => z);
  const reach = tunnelHillReach + groundSpacing;
  const fromX = Math.min(...xs) - reach;
  const fromZ = Math.min(...zs) - reach;
  const columns = Math.ceil((Math.max(...xs) + reach - fromX) / groundSpacing);
  const rows = Math.ceil((Math.max(...zs) + reach - fromZ) / groundSpacing);
  const at = (column: number, row: number) => ({
    x: fromX + column * groundSpacing,
    z: fromZ + row * groundSpacing,
  });
  const kept = Array.from({ length: columns + 1 }, (_, column) =>
    Array.from({ length: rows + 1 }, (_, row) => isKept(at(column, row))),
  );
  const edges: (MapPoint & { reach: number; slope: number })[] = [];
  for (let column = 0; column <= columns; column++) {
    for (let row = 0; row <= rows; row++) {
      const point = at(column, row);
      // Low ground is never raised, so only its edge is kept; a river or
      // the airfield is kept all over.
      const isEdge =
        kept[column][row] &&
        (!isSea(point) ||
          [
            [column - 1, row],
            [column + 1, row],
            [column, row - 1],
            [column, row + 1],
          ].some(
            ([nextColumn, nextRow]) =>
              nextColumn >= 0 &&
              nextColumn <= columns &&
              nextRow >= 0 &&
              nextRow <= rows &&
              !kept[nextColumn][nextRow],
          ));
      if (isEdge && findGap(bore, point) < reach) {
        edges.push({
          ...point,
          reach: groundEdgeReach,
          slope: groundEdgeSlope,
        });
      }
    }
  }
  return edges;
};

const describeHill = (
  railway: Railway,
  tunnel: RailTunnel,
  keepClear: readonly (MapPoint & { reach: number; slope?: number })[],
  adventure: IslandAdventure,
): TunnelHillSite => {
  const start = tunnel.fromDistance - tunnelPortalSetback;
  const end = tunnel.toDistance + tunnelPortalSetback;
  const steps = Math.ceil((end - start) / boreSpacing);
  const bore = Array.from({ length: steps + 1 }, (_, step) => {
    const point = findRailPoint(
      railway,
      start + ((end - start) * step) / steps,
    );
    return { x: round(point.x), z: round(point.z), y: round(point.y) };
  });
  const nearHill = (point: MapPoint, reach: number) =>
    findGap(bore, point) < tunnelHillReach + reach;
  const openTrack = railway.points
    .filter(
      (point, index) =>
        index % 2 === 0 &&
        !point.isInTunnel &&
        !isAlongTunnel(railway, tunnel, point.distance) &&
        nearHill(point, tunnelHillTrackGap),
    )
    .map(({ x, z }) => ({ x: round(x), z: round(z) }));
  return {
    tunnelId: tunnel.id,
    bore,
    portals: [findPortal(railway, start, -1), findPortal(railway, end, 1)],
    openTrack,
    keepClear: [
      ...keepClear.filter((clear) => nearHill(clear, clear.reach)),
      ...listGroundEdges(adventure, bore),
    ].map((clear) => ({
      x: round(clear.x),
      z: round(clear.z),
      reach: round(clear.reach),
      ...(clear.slope === undefined ? {} : { slope: clear.slope }),
    })),
  };
};

const listKeepClear = (islandId: string): (MapPoint & { reach: number })[] => {
  const adventure = findExploreAdventure(islandId);
  const railway = findRailway(islandId);
  const island = islands.find(({ id }) => id === islandId);
  return [
    { ...adventure.dock.from, reach: dockReach },
    { ...adventure.dock.to, reach: dockReach },
    ...listHoverPadPlaces(adventure.hoverPad).map((place) => ({
      ...place,
      reach: hoverPadReach,
    })),
    ...listIslandWonders(islandId).map(({ kind, position }) => ({
      x: position.x * exploreScale,
      z: position.z * exploreScale,
      reach: wonderFootprints[kind] * exploreScale + wonderGap,
    })),
    ...(island?.regions ?? []).map(({ mapPosition }) => ({
      x: mapPosition.x * exploreScale,
      z: mapPosition.z * exploreScale,
      reach: regionReach,
    })),
    ...(landforms.get(islandId)?.features ?? []).map(({ position }) => ({
      x: position.x * exploreScale,
      z: position.z * exploreScale,
      reach: featureReach,
    })),
    ...listPlacedAttractions(islandId).map((attraction) => ({
      ...attraction.centre,
      reach: findAttractionReach(attraction),
    })),
    ...railway.stations.flatMap((station, index) => [
      {
        ...findStationBuildingSpot(railway, index),
        reach: stationBuildingReach,
      },
      { ...findStationPlatformSpot(railway, station), reach: platformReach },
    ]),
  ];
};

/**
 * The hill over each of an Island's tunnels, from its Railway as it is
 * laid on the ground without them. \`generate-tunnel-hills.ts\` writes
 * them into \`island-tunnel-hill-sites.ts\`.
 */
export const describeTunnelHills = (islandId: string): TunnelHillSite[] => {
  if (!hasRailway(islandId)) {
    return [];
  }
  const railway = findRailway(islandId);
  const keepClear = listKeepClear(islandId);
  const adventure = findExploreAdventure(islandId);
  return railway.tunnels.map((tunnel) =>
    describeHill(railway, tunnel, keepClear, adventure),
  );
};
