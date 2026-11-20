import type { IslandQuest } from "../../curriculum/island-quests.js";
import {
  findDistanceToNewLandRivers,
  type MapPoint,
} from "../world-map-terrain.js";
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
  isOnAirfield,
  listRailCheckPoints,
  lowestInland,
  type SiteRules,
} from "./island-attraction-placing.js";
import { attractionSites } from "./island-attraction-sites.js";
import { curiositySites } from "./island-curiosity-sites.js";
import type { QuestSite, QuestSiteKind } from "./island-quest-sites.js";

/** How far round each kind of Quest spot reaches. */
export const questSiteReach: Record<QuestSiteKind, number> = {
  thing: 1.6,
  islander: 0.8,
  find: 0.6,
};

/** How far a Quest spot keeps from an Attraction, beyond its footprint. */
export const questAttractionGap = 31;
/** How far a Quest spot keeps from a Curiosity, beyond its footprint. */
export const questCuriosityGap = 10;
/** How far Quest spots keep from each other. */
export const questSiteGap = 14;
const startGap = 8;
const trailGap = 1.2;
const riverGap = 1.2;
const highestGround = 26;
const mostRise = 0.7;
const placingAttempts = 4000;
const validSitesToCompare = 16;
const roughnessWeight = 6;

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

interface Neighbour {
  centre: MapPoint;
  reach: number;
}

const listPlacedNeighbours = (islandId: string): Neighbour[] => [
  ...(attractionSites[islandId] ?? []).map(({ centre, footprint }) => ({
    centre,
    reach: footprint + questAttractionGap,
  })),
  ...(curiositySites[islandId] ?? []).map(({ centre, footprint }) => ({
    centre,
    reach: footprint + questCuriosityGap,
  })),
];

const listGroundSamples = (centre: MapPoint, reach: number): MapPoint[] => [
  centre,
  ...Array.from({ length: 8 }, (_, index) => {
    const angle = (index / 8) * Math.PI * 2;
    return {
      x: centre.x + Math.sin(angle) * (reach + 0.4),
      z: centre.z + Math.cos(angle) * (reach + 0.4),
    };
  }),
];

/** The ground under a spot, if it is dry, nearly level and on land the Character can reach. */
const findQuestGround = (
  rules: SiteRules,
  centre: MapPoint,
  reach: number,
): { ground: number; roughness: number } | undefined => {
  const samples = listGroundSamples(centre, reach);
  if (!samples.every(isInsideFirstLands)) {
    return undefined;
  }
  const { adventure } = rules;
  const heights = samples.map((point) => adventure.findHeight(point));
  const lowest = Math.min(...heights);
  const highest = Math.max(...heights);
  if (
    lowest < lowestInland ||
    highest > highestGround ||
    highest - lowest > mostRise ||
    samples.some((point) => adventure.findCourseKind(point) !== undefined)
  ) {
    return undefined;
  }
  return { ground: heights[0], roughness: highest - lowest };
};

const isClearQuestSpot = (
  rules: SiteRules,
  centre: MapPoint,
  reach: number,
  neighbours: readonly Neighbour[],
  placed: readonly QuestSite[],
): boolean => {
  const { adventure } = rules;
  if (
    Math.hypot(centre.x - adventure.start.x, centre.z - adventure.start.z) <=
      reach + startGap ||
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
        questSiteGap,
    )
  ) {
    return false;
  }
  return listRailCheckPoints(reach + 1).every(
    (local) =>
      !rules.isRailNear({ x: centre.x + local.x, z: centre.z + local.z }),
  );
};

const findSpread = (centre: MapPoint, others: readonly QuestSite[]): number =>
  Math.min(
    Infinity,
    ...others.map((other) =>
      Math.hypot(other.centre.x - centre.x, other.centre.z - centre.z),
    ),
  );

interface WantedSpot {
  id: string;
  kind: QuestSiteKind;
}

/** Every spot a Quest needs: its things, then its Islanders, then the Finds lying about. */
export const listWantedQuestSpots = (quest: IslandQuest): WantedSpot[] => [
  ...quest.things.map(({ id }) => ({ id, kind: "thing" as const })),
  ...quest.islanders.map(({ id }) => ({ id, kind: "islander" as const })),
  ...quest.lyingFindIds.map((id) => ({ id, kind: "find" as const })),
];

const placeOneSpot = (
  rules: SiteRules,
  wanted: WantedSpot,
  seed: number,
  neighbours: readonly Neighbour[],
  placed: readonly QuestSite[],
): QuestSite | undefined => {
  const random = buildSpreadRandom(seed);
  const reach = questSiteReach[wanted.kind];
  const found: { centre: MapPoint; ground: number; roughness: number }[] = [];
  for (
    let attempt = 0;
    attempt < placingAttempts && found.length < validSitesToCompare;
    attempt++
  ) {
    const centre = {
      x: (random() * 2 - 1) * (firstLandsHalfWidth - reach),
      z: (random() * 2 - 1) * (exploreHalfDepth - reach),
    };
    if (
      !isInsideFirstLands(centre) ||
      !isClearQuestSpot(rules, centre, reach, neighbours, placed)
    ) {
      continue;
    }
    const ground = findQuestGround(rules, centre, reach);
    if (ground !== undefined) {
      found.push({ centre, ...ground });
    }
  }
  const best = found
    .map((site) => ({
      site,
      score:
        Math.min(300, findSpread(site.centre, placed)) -
        site.roughness * roughnessWeight,
    }))
    .toSorted((first, second) => second.score - first.score)
    .at(0)?.site;
  if (best === undefined) {
    return undefined;
  }
  return {
    id: wanted.id,
    kind: wanted.kind,
    centre: best.centre,
    ground: best.ground,
    turn: Math.atan2(-best.centre.x, -best.centre.z) + (random() - 0.5) * 1.6,
  };
};

const islandSeeds: Record<string, number> = {
  "meadow-isle": 7121,
  "frost-isle": 7243,
  "sunscorch-sands": 7369,
  "jungle-reach": 7487,
  "ember-isle": 7603,
  "starfall-isle": 7727,
};

/**
 * Finds where each of a Quest's things, Islanders and lying Finds stands
 * on its Island: on dry, nearly level ground, clear of the trails,
 * rivers, Railway, airfield, Wonders, places, Attractions and
 * Curiosities, each where it is furthest from the spots placed so far.
 * `island-quest-sites.ts` keeps what this finds; `pnpm run
 * generate:attraction-sites` writes it again.
 */
export const findQuestSites = (
  adventure: IslandAdventure,
  quest: IslandQuest,
): QuestSite[] => {
  const rules = buildSiteRules(adventure);
  const neighbours = listPlacedNeighbours(adventure.islandId);
  const placed: QuestSite[] = [];
  listWantedQuestSpots(quest).forEach((wanted, index) => {
    const seed = (islandSeeds[adventure.islandId] ?? 13) * 41 + index * 977;
    const site = placeOneSpot(rules, wanted, seed, neighbours, placed);
    if (site !== undefined) {
      placed.push(site);
    }
  });
  return placed;
};

/** Why a kept Quest site no longer fits, or undefined if it still does. */
export const checkQuestSite = (
  adventure: IslandAdventure,
  site: QuestSite,
  others: readonly QuestSite[],
): string | undefined => {
  const rules = buildSiteRules(adventure);
  const reach = questSiteReach[site.kind];
  if (
    !isClearQuestSpot(
      rules,
      site.centre,
      reach,
      listPlacedNeighbours(adventure.islandId),
      others,
    )
  ) {
    return `${site.id} is too near something`;
  }
  const ground = findQuestGround(rules, site.centre, reach);
  if (ground === undefined) {
    return `${site.id} no longer has dry, level ground`;
  }
  if (Math.abs(ground.ground - site.ground) > 0.01) {
    return `${site.id} stands at ${ground.ground.toFixed(2)}, not ${site.ground.toFixed(2)}`;
  }
  return undefined;
};
