import type { MapPoint } from "../world-map-terrain.js";
import type { IslandAdventure } from "./island-adventures.js";
import {
  tunnelHillSites,
  type TunnelHillSite,
} from "./island-tunnel-hill-sites.js";

type HeightFinder = (point: MapPoint) => number;

/**
 * How high a tunnel's hill rises above the track over it, when exploring.
 * It is higher than the World Map's portals, which are drawn at the map
 * Train's size, so the hill stands above every portal, on the Island and
 * on the World Map.
 */
export const tunnelHillCrest = 16;

/** How far out from the tunnel the hill's rounded sides reach. */
export const tunnelHillReach = 30;

/** Behind the portal's face, how far before the hill starts to rise. */
export const tunnelHillPortalInset = 0.6;
const portalFaceSlope = 1.8;

/** Beside the track in front of a portal, how far the ground stays as it was. */
export const tunnelHillCuttingHalfWidth = 3;
const cuttingSideSlope = 1.2;

/** How close to the open track the hill's sides come. */
export const tunnelHillTrackGap = 3;
const trackSideSlope = 1.2;
const keepClearSlope = 1.5;

/** Ground lower than this, when exploring, is the sea's or wet, and is never raised. */
export const tunnelHillWetGround = 0.6;

// The heights are in World Map units; the sites are in exploring units.
const exploreScale = 6;

interface HillShape {
  site: TunnelHillSite;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

const shapes = new Map<string, readonly HillShape[]>();

const findShapes = (islandId: string): readonly HillShape[] => {
  const known = shapes.get(islandId);
  if (known !== undefined) {
    return known;
  }
  const built = (tunnelHillSites[islandId] ?? []).map((site) => {
    const xs = site.bore.map(({ x }) => x);
    const zs = site.bore.map(({ z }) => z);
    return {
      site,
      minX: Math.min(...xs) - tunnelHillReach,
      maxX: Math.max(...xs) + tunnelHillReach,
      minZ: Math.min(...zs) - tunnelHillReach,
      maxZ: Math.max(...zs) + tunnelHillReach,
    };
  });
  shapes.set(islandId, built);
  return built;
};

/** How far `point` is from the tunnel's track, and the track's height there. */
const findNearestBore = (
  bore: TunnelHillSite["bore"],
  x: number,
  z: number,
): { distance: number; y: number } => {
  let distance = Infinity;
  let y = 0;
  for (let index = 0; index < bore.length - 1; index++) {
    const from = bore[index];
    const to = bore[index + 1];
    const alongX = to.x - from.x;
    const alongZ = to.z - from.z;
    const lengthSquared = alongX * alongX + alongZ * alongZ;
    const share =
      lengthSquared === 0
        ? 0
        : Math.min(
            1,
            Math.max(
              0,
              ((x - from.x) * alongX + (z - from.z) * alongZ) / lengthSquared,
            ),
          );
    const gap = Math.hypot(
      x - (from.x + alongX * share),
      z - (from.z + alongZ * share),
    );
    if (gap < distance) {
      distance = gap;
      y = from.y + (to.y - from.y) * share;
    }
  }
  return { distance, y };
};

const findNearestGap = (
  points: readonly MapPoint[],
  x: number,
  z: number,
): number =>
  points.reduce(
    (nearest, point) => Math.min(nearest, Math.hypot(x - point.x, z - point.z)),
    Infinity,
  );

/**
 * How high a tunnel's hill reaches at `point`, in exploring units: a
 * rounded hill over the whole tunnel, cut back to the track in front of
 * each portal, and kept off the open track and whatever stands near it.
 */
export const findTunnelHillHeight = (
  site: TunnelHillSite,
  point: MapPoint,
  ground: number,
): number => {
  const { x, z } = point;
  const nearest = findNearestBore(site.bore, x, z);
  if (nearest.distance >= tunnelHillReach) {
    return -Infinity;
  }
  const rounding =
    (Math.cos((Math.PI * nearest.distance) / tunnelHillReach) + 1) / 2;
  let height = nearest.y + tunnelHillCrest * rounding;
  for (const portal of site.portals) {
    const inward = -(
      (x - portal.x) * portal.outX +
      (z - portal.z) * portal.outZ
    );
    const across = Math.abs(
      (x - portal.x) * portal.outZ - (z - portal.z) * portal.outX,
    );
    height = Math.min(
      height,
      Math.min(ground, portal.y) +
        portalFaceSlope * Math.max(0, inward - tunnelHillPortalInset) +
        cuttingSideSlope * Math.max(0, across - tunnelHillCuttingHalfWidth),
    );
  }
  const trackGap = findNearestGap(site.openTrack, x, z);
  height = Math.min(
    height,
    ground + trackSideSlope * Math.max(0, trackGap - tunnelHillTrackGap),
  );
  for (const clear of site.keepClear) {
    height = Math.min(
      height,
      ground +
        (clear.slope ?? keepClearSlope) *
          Math.max(0, Math.hypot(x - clear.x, z - clear.z) - clear.reach),
    );
  }
  return height;
};

const bases = new Map<string, HeightFinder>();

/**
 * The Island's ground with a hill over each of its tunnels, so every
 * tunnel's portal goes into a hill bigger than itself.
 */
export const raiseTunnelHills = (
  islandId: string,
  findBaseHeight: HeightFinder,
): HeightFinder => {
  bases.set(islandId, findBaseHeight);
  return (point) => {
    const base = findBaseHeight(point);
    if (base * exploreScale < tunnelHillWetGround) {
      return base;
    }
    const x = point.x * exploreScale;
    const z = point.z * exploreScale;
    let highest = base;
    for (const shape of findShapes(islandId)) {
      if (
        x < shape.minX ||
        x > shape.maxX ||
        z < shape.minZ ||
        z > shape.maxZ
      ) {
        continue;
      }
      highest = Math.max(
        highest,
        findTunnelHillHeight(shape.site, { x, z }, base * exploreScale) /
          exploreScale,
      );
    }
    return highest;
  };
};

/**
 * The Island's ground without its tunnels' hills, which is what the
 * Railway's route and tunnels are worked out from.
 */
export const findHeightUnderTunnelHills = (
  islandId: string,
): HeightFinder | undefined => bases.get(islandId);

/**
 * The Island's adventure on the ground without its tunnels' hills. The
 * Railway, and the Attractions' and Curiosities' sites, are laid out on
 * it, and the hills are then shaped round them.
 */
export const withoutTunnelHills = (
  adventure: IslandAdventure,
): IslandAdventure => {
  const findBaseHeight = bases.get(adventure.islandId);
  return findBaseHeight === undefined
    ? adventure
    : {
        ...adventure,
        findHeight: ({ x, z }) =>
          findBaseHeight({ x: x / exploreScale, z: z / exploreScale }) *
          exploreScale,
      };
};
