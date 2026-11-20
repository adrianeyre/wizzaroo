import {
  findDistanceToNewLandRivers,
  type MapPoint,
} from "../world-map-terrain.js";
import type { LocalPoint } from "./attractions/attraction-kit.js";
import {
  curiosityIslandIds,
  curiosityKindsByIsland,
  type CuriosityKind,
  type CuriosityModel,
} from "./curiosities/curiosity-kit.js";
import { curiosityModels } from "./curiosities/curiosity-models.js";
import {
  exploreHalfDepth,
  firstLandsHalfWidth,
  exploreScale,
  findDistanceToTrail,
  isInsideFirstLands,
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
  tryShoreSite,
  tryShoreSiteAt,
  type Site,
  type SiteRules,
} from "./island-attraction-placing.js";
import { attractionSites } from "./island-attraction-sites.js";
import type { CuriositySite } from "./island-curiosity-sites.js";

/** How far a Curiosity keeps from an Attraction, beyond both their footprints. */
export const curiosityAttractionGap = 42;
/** How far Curiosities keep from each other, beyond both their footprints. */
export const curiosityGap = 24;
/** How far a Curiosity keeps from where the Character starts. */
const startGap = 14;
/** How far a Curiosity keeps from the rivers and streams. */
const riverGap = 1.5;
const placingAttempts = 8000;
const shorePlacingAttempts = 12_000;
const validSitesToCompare = 24;
/** How much a bumpy site counts against a well spread-out one. */
const roughnessWeight = 4;

/**
 * A small, steady random (mulberry32). The Attractions' generator gives
 * the next number from the last too simply, so pairs of its numbers,
 * used as a spot's x and z, fall on a few lines across the Island and
 * miss most of it; this one mixes its bits well enough to reach every
 * corner.
 */
const buildSpreadRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
};

export const listIslandCuriosityKinds = (
  islandId: string,
): readonly CuriosityKind[] => {
  const known = curiosityIslandIds.find((id) => id === islandId);
  return known === undefined ? [] : curiosityKindsByIsland[known];
};

interface Neighbour {
  centre: MapPoint;
  footprint: number;
}

const listNeighbourAttractions = (islandId: string): Neighbour[] =>
  (attractionSites[islandId] ?? []).map(({ centre, footprint }) => ({
    centre,
    footprint,
  }));

const listRiverCheckPoints = (reach: number): LocalPoint[] => [
  { x: 0, z: 0 },
  ...Array.from({ length: 12 }, (_, index) => {
    const angle = (index / 12) * Math.PI * 2;
    return {
      x: Math.sin(angle) * (reach + riverGap),
      z: Math.cos(angle) * (reach + riverGap),
    };
  }),
];

const isClearCuriositySpot = (
  rules: SiteRules,
  model: CuriosityModel,
  centre: MapPoint,
  attractions: readonly Neighbour[],
  placed: readonly Neighbour[],
): boolean => {
  const { adventure } = rules;
  const reach = model.footprint;
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
    attractions.some(
      (other) =>
        Math.hypot(other.centre.x - centre.x, other.centre.z - centre.z) <=
        other.footprint + reach + curiosityAttractionGap,
    ) ||
    placed.some(
      (other) =>
        Math.hypot(other.centre.x - centre.x, other.centre.z - centre.z) <=
        other.footprint + reach + curiosityGap,
    )
  ) {
    return false;
  }
  if (
    model.setting === "inland" &&
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

/** How far a site is from the nearest thing already placed. */
const findSpread = (centre: MapPoint, others: readonly Neighbour[]): number =>
  Math.min(
    Infinity,
    ...others.map((other) =>
      Math.hypot(other.centre.x - centre.x, other.centre.z - centre.z),
    ),
  );

const placeOneCuriosity = (
  rules: SiteRules,
  kind: CuriosityKind,
  seed: number,
  attractions: readonly Neighbour[],
  placed: readonly CuriositySite[],
): CuriositySite | undefined => {
  const model = curiosityModels[kind];
  const random = buildSpreadRandom(seed);
  const sites: Site[] = [];
  const attempts =
    model.setting === "shore" ? shorePlacingAttempts : placingAttempts;
  for (
    let attempt = 0;
    attempt < attempts && sites.length < validSitesToCompare;
    attempt++
  ) {
    const centre = {
      x: (random() * 2 - 1) * (firstLandsHalfWidth - model.footprint),
      z: (random() * 2 - 1) * (exploreHalfDepth - model.footprint),
    };
    if (
      !isInsideFirstLands(centre) ||
      !isClearCuriositySpot(rules, model, centre, attractions, placed)
    ) {
      continue;
    }
    const site =
      model.setting === "shore"
        ? tryShoreSite(rules, model, centre)
        : tryInlandSite(rules, model, centre);
    if (site !== undefined) {
      sites.push(site);
    }
  }
  const others = [...attractions, ...placed];
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

const islandSeeds: Record<string, number> = {
  "meadow-isle": 1103,
  "frost-isle": 2207,
  "sunscorch-sands": 3301,
  "jungle-reach": 4409,
  "ember-isle": 5503,
  "starfall-isle": 6607,
};

/**
 * Finds where each of an Island's Curiosities stands: anywhere on the
 * Island, old lands or new, on dry, nearly level ground clear of the
 * trails, rivers, Railway, airfield, Wonders, places and Attractions,
 * or on the beach facing the sea for shore ones. Each is put where it
 * is furthest from everything placed so far, so they spread out over
 * the whole Island. `island-curiosity-sites.ts` keeps what this finds;
 * `pnpm run generate:attraction-sites` writes it again.
 */
export const findCuriositySites = (
  adventure: IslandAdventure,
): CuriositySite[] => {
  const rules = buildSiteRules(adventure);
  const attractions = listNeighbourAttractions(adventure.islandId);
  const kinds = listIslandCuriosityKinds(adventure.islandId).toSorted(
    (first, second) =>
      curiosityModels[second].footprint - curiosityModels[first].footprint,
  );
  const placed: CuriositySite[] = [];
  kinds.forEach((kind, index) => {
    const seed = (islandSeeds[adventure.islandId] ?? 11) * 37 + index * 1213;
    const curiosity = placeOneCuriosity(rules, kind, seed, attractions, placed);
    if (curiosity !== undefined) {
      placed.push(curiosity);
    }
  });
  return placed;
};

/** Why a kept Curiosity site no longer fits, or undefined if it still does. */
export const checkCuriositySite = (
  adventure: IslandAdventure,
  site: CuriositySite,
  others: readonly CuriositySite[],
): string | undefined => {
  const model = curiosityModels[site.kind];
  if (model.footprint !== site.footprint) {
    return `${site.kind} has a footprint of ${String(model.footprint)}, not ${String(site.footprint)}`;
  }
  const rules = buildSiteRules(adventure);
  if (
    !isClearCuriositySpot(
      rules,
      model,
      site.centre,
      listNeighbourAttractions(adventure.islandId),
      others,
    )
  ) {
    return `${site.kind} is too near something`;
  }
  const found =
    model.setting === "shore"
      ? tryShoreSiteAt(rules, model, site.centre, site.turn)
      : tryInlandSite(rules, model, site.centre);
  if (found === undefined) {
    return `${site.kind} no longer has level ground${model.setting === "shore" ? " by the sea" : ""}`;
  }
  if (Math.abs(found.ground - site.ground) > 0.01) {
    return `${site.kind} stands at ${found.ground.toFixed(2)}, not ${site.ground.toFixed(2)}`;
  }
  return undefined;
};
