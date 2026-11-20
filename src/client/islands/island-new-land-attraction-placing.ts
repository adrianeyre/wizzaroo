import {
  findDistanceToNewLandRivers,
  type MapPoint,
} from "../world-map-terrain.js";
import { terraceBankSlope } from "./attractions/attraction-kit.js";
import {
  exploreScale,
  findDistanceToTrail,
  isInsideExploreBounds,
  type IslandAdventure,
} from "./island-adventures.js";
import {
  buildSiteRules,
  findNewLands,
  findPadColour,
  isOnAirfield,
  listRailCheckPoints,
  trailGap,
  tryInlandSite,
  type Site,
  type SiteRules,
} from "./island-attraction-placing.js";
import { attractionSites } from "./island-attraction-sites.js";
import { curiositySites } from "./island-curiosity-sites.js";
import type { NewLandAttractionSite } from "./island-new-land-attraction-sites.js";
import { questSites } from "./island-quest-sites.js";
import { tunnelHillSites } from "./island-tunnel-hill-sites.js";
import { tunnelHillReach, withoutTunnelHills } from "./island-tunnel-hills.js";
import {
  newLandAttractionIslandIds,
  newLandAttractionKindsByIsland,
  type NewLandAttractionKind,
  type NewLandAttractionModel,
} from "./new-land-attractions/new-land-attraction-kit.js";
import { newLandAttractionModels } from "./new-land-attractions/new-land-attraction-models.js";

/** How far one keeps from the first thirty Attractions, beyond both footprints. */
export const newLandAttractionGap = 24;
/** How far they keep from each other, beyond both footprints. */
export const newLandAttractionSpacing = 14;
/** How far one keeps from a Curiosity, beyond both footprints. */
export const newLandCuriosityGap = 12;
/** How far one keeps from a Quest Islander, thing or Find, beyond its footprint. */
const questGap = 6;
/** How far its terrace keeps from a hill over a tunnel. */
const tunnelHillGap = 6;
/** How far one keeps from where the Character starts. */
const startGap = 14;
/** How far one keeps from the new lands' rivers and streams. */
const riverGap = 1.5;
/** The new lands start this far out from the middle, in explore units. */
const newLandsInnerEdge = 35 * exploreScale;
const newLandsOuterEdge = 110 * exploreScale;
const newLandsHalfDepth = 26 * exploreScale;
const placingAttempts = 20_000;
const validSitesToCompare = 30;
/** How much a bumpy site counts against a well spread-out one. */
const roughnessWeight = 4;

/** A small, steady random (mulberry32), as the Curiosities use. */
const buildSpreadRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
};

export const listIslandNewLandAttractionKinds = (
  islandId: string,
): readonly NewLandAttractionKind[] => {
  const known = newLandAttractionIslandIds.find((id) => id === islandId);
  return known === undefined ? [] : newLandAttractionKindsByIsland[known];
};

/** Which new land one stands on: -1 the west, 1 the east. */
export type NewLandSide = -1 | 1;

/**
 * Which new land each of an Island's fifteen stands on: every other
 * one in the Island's list goes west, the rest east, so each new land
 * has seven or eight.
 */
export const findNewLandSide = (
  islandId: string,
  kind: NewLandAttractionKind,
): NewLandSide =>
  listIslandNewLandAttractionKinds(islandId).indexOf(kind) % 2 === 0 ? -1 : 1;

interface Neighbour {
  centre: MapPoint;
  reach: number;
}

/** Everything placed before them, with how far to keep from each. */
const listNeighbours = (islandId: string): Neighbour[] => [
  ...(attractionSites[islandId] ?? []).map(({ centre, footprint }) => ({
    centre,
    reach: footprint + newLandAttractionGap,
  })),
  ...(curiositySites[islandId] ?? []).map(({ centre, footprint }) => ({
    centre,
    reach: footprint + newLandCuriosityGap,
  })),
  ...(questSites[islandId] ?? []).map(({ centre }) => ({
    centre,
    reach: questGap,
  })),
];

const listTunnelBores = (islandId: string): MapPoint[] =>
  (tunnelHillSites[islandId] ?? []).flatMap(({ bore }) => bore);

/** How far its terrace and bank reach, at their deepest. */
const findTerraceReach = (model: NewLandAttractionModel, padDepth: number) =>
  model.footprint + padDepth * terraceBankSlope;

const listRiverCheckPoints = (reach: number) => [
  { x: 0, z: 0 },
  ...Array.from({ length: 12 }, (_, index) => {
    const angle = (index / 12) * Math.PI * 2;
    return {
      x: Math.sin(angle) * (reach + riverGap),
      z: Math.cos(angle) * (reach + riverGap),
    };
  }),
];

const isClearSpot = (
  rules: SiteRules,
  model: NewLandAttractionModel,
  centre: MapPoint,
  neighbours: readonly Neighbour[],
  placed: readonly NewLandAttractionSite[],
): boolean => {
  const { adventure } = rules;
  const reach = model.footprint;
  if (Math.abs(centre.x) - reach < newLandsInnerEdge) {
    return false;
  }
  if (
    Math.hypot(centre.x - adventure.start.x, centre.z - adventure.start.z) <=
    reach + startGap
  ) {
    return false;
  }
  if (
    findDistanceToTrail(adventure, centre) <= reach + trailGap ||
    findDistanceToNewLandRivers(
      { x: centre.x / exploreScale, z: centre.z / exploreScale },
      findNewLands(rules.islandId),
    ) <=
      (reach + riverGap) / exploreScale ||
    isOnAirfield(adventure, centre, reach)
  ) {
    return false;
  }
  if (
    rules.keepClear.some(
      (place) =>
        Math.hypot(place.centre.x - centre.x, place.centre.z - centre.z) <=
        place.reach + reach,
    ) ||
    neighbours.some(
      (other) =>
        Math.hypot(other.centre.x - centre.x, other.centre.z - centre.z) <=
        other.reach + reach,
    ) ||
    placed.some(
      (other) =>
        Math.hypot(other.centre.x - centre.x, other.centre.z - centre.z) <=
        other.footprint + reach + newLandAttractionSpacing,
    )
  ) {
    return false;
  }
  if (
    listRiverCheckPoints(reach).some(
      (local) =>
        adventure.findCourseKind({
          x: centre.x + local.x,
          z: centre.z + local.z,
        }) !== undefined,
    )
  ) {
    return false;
  }
  return listRailCheckPoints(reach).every(
    (local) =>
      !rules.isRailNear({ x: centre.x + local.x, z: centre.z + local.z }),
  );
};

/** Whether a settled site's terrace keeps off every hill over a tunnel. */
const isClearOfTunnelHills = (
  islandId: string,
  model: NewLandAttractionModel,
  site: Site,
): boolean => {
  const reach =
    findTerraceReach(model, site.padDepth) + tunnelHillReach + tunnelHillGap;
  return listTunnelBores(islandId).every(
    (point) =>
      Math.hypot(point.x - site.centre.x, point.z - site.centre.z) > reach,
  );
};

const findSpread = (centre: MapPoint, others: readonly MapPoint[]): number =>
  Math.min(
    Infinity,
    ...others.map((other) =>
      Math.hypot(other.x - centre.x, other.z - centre.z),
    ),
  );

const placeOne = (
  rules: SiteRules,
  kind: NewLandAttractionKind,
  seed: number,
  neighbours: readonly Neighbour[],
  placed: readonly NewLandAttractionSite[],
): NewLandAttractionSite | undefined => {
  const model = newLandAttractionModels[kind];
  const side = findNewLandSide(rules.islandId, kind);
  const random = buildSpreadRandom(seed);
  const sites: Site[] = [];
  for (
    let attempt = 0;
    attempt < placingAttempts && sites.length < validSitesToCompare;
    attempt++
  ) {
    const centre = {
      x:
        side *
        (newLandsInnerEdge +
          model.footprint +
          random() * (newLandsOuterEdge - newLandsInnerEdge - model.footprint)),
      z: (random() * 2 - 1) * newLandsHalfDepth,
    };
    if (
      !isInsideExploreBounds(centre) ||
      !isClearSpot(rules, model, centre, neighbours, placed)
    ) {
      continue;
    }
    const site = tryInlandSite(rules, model, centre);
    if (
      site !== undefined &&
      isClearOfTunnelHills(rules.islandId, model, site)
    ) {
      sites.push(site);
    }
  }
  const others = [
    ...neighbours.map(({ centre }) => centre),
    ...placed.map(({ centre }) => centre),
  ];
  const best = sites
    .map((site) => ({
      site,
      score:
        Math.min(400, findSpread(site.centre, others)) -
        site.roughness * roughnessWeight,
    }))
    .toSorted((first, second) => second.score - first.score)
    .at(0)?.site;
  if (best === undefined) {
    return undefined;
  }
  return {
    kind,
    footprint: model.footprint,
    centre: best.centre,
    ground: best.ground,
    padDepth: best.padDepth,
    turn: best.turn,
    padColour: model.padColour ?? findPadColour(rules.islandId, best),
  };
};

/** The new lands' far reaches are inside the bounds too. */
const buildNewLandSiteRules = (adventure: IslandAdventure): SiteRules => ({
  ...buildSiteRules(adventure),
  // With the trails out to the far reaches, which these keep off.
  adventure: withoutTunnelHills(adventure),
  isInBounds: isInsideExploreBounds,
});

const islandSeeds: Record<string, number> = {
  "meadow-isle": 1709,
  "frost-isle": 2711,
  "sunscorch-sands": 3719,
  "jungle-reach": 4723,
  "ember-isle": 5737,
  "starfall-isle": 6743,
};

/**
 * Finds where each of an Island's fifteen new-land Attractions stands:
 * on its own new land, west or east, on dry ground clear of the trails,
 * rivers, Railway, airfield, Wonders, places, the hills over the
 * tunnels, the first thirty Attractions, the Curiosities and the Quest,
 * each where it is furthest from everything placed so far. The biggest
 * are placed first. `island-new-land-attraction-sites.ts` keeps what
 * this finds; `pnpm run generate:attraction-sites` writes it again,
 * after the Attractions, Curiosities and Quest, so none of those move.
 */
export const findNewLandAttractionSites = (
  adventure: IslandAdventure,
): NewLandAttractionSite[] => {
  const rules = buildNewLandSiteRules(adventure);
  const neighbours = listNeighbours(adventure.islandId);
  const kinds = listIslandNewLandAttractionKinds(adventure.islandId).toSorted(
    (first, second) =>
      newLandAttractionModels[second].footprint -
      newLandAttractionModels[first].footprint,
  );
  const placed: NewLandAttractionSite[] = [];
  kinds.forEach((kind, index) => {
    const seed = (islandSeeds[adventure.islandId] ?? 13) * 41 + index * 1361;
    const site = placeOne(rules, kind, seed, neighbours, placed);
    if (site !== undefined) {
      placed.push(site);
    }
  });
  return placed;
};

/** Why a kept site no longer fits, or undefined if it still does. */
export const checkNewLandAttractionSite = (
  adventure: IslandAdventure,
  site: NewLandAttractionSite,
  others: readonly NewLandAttractionSite[],
): string | undefined => {
  const model = newLandAttractionModels[site.kind];
  if (model.footprint !== site.footprint) {
    return `${site.kind} has a footprint of ${String(model.footprint)}, not ${String(site.footprint)}`;
  }
  const rules = buildNewLandSiteRules(adventure);
  if (
    !isClearSpot(
      rules,
      model,
      site.centre,
      listNeighbours(adventure.islandId),
      others,
    )
  ) {
    return `${site.kind} is too near something`;
  }
  const found = tryInlandSite(rules, model, site.centre);
  if (found === undefined) {
    return `${site.kind} no longer has level ground`;
  }
  if (!isClearOfTunnelHills(adventure.islandId, model, found)) {
    return `${site.kind} is on a hill over a tunnel`;
  }
  if (Math.abs(found.ground - site.ground) > 0.01) {
    return `${site.kind} stands at ${found.ground.toFixed(2)}, not ${site.ground.toFixed(2)}`;
  }
  if (
    Math.sign(site.centre.x) !== findNewLandSide(adventure.islandId, site.kind)
  ) {
    return `${site.kind} is on the wrong new land`;
  }
  return undefined;
};
