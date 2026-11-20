import { islands } from "../../curriculum/islands.js";
import {
  balloonFieldFlatRadius,
  buildPlaceGrid,
  findDistanceToNewLandRivers,
  findRunwayOffset,
  meadowNewLands,
  type MapPoint,
  type NewLands,
} from "../world-map-terrain.js";
import {
  attractionKinds,
  type AttractionKind,
  type AttractionModel,
  type LocalPoint,
  type PlaceModel,
} from "./attractions/attraction-kit.js";
import { attractionModels } from "./attractions/attraction-models.js";
import { emberIsle, emberVolcanoPosition } from "./ember-isle.js";
import { frostIsle } from "./frost-isle.js";
import {
  exploreScale,
  findDistanceToTrail,
  isInsideFirstLands,
  withoutFarReachTrails,
  listAdventurePlaces,
  type IslandAdventure,
} from "./island-adventures.js";
import type { AttractionSite } from "./island-attraction-sites.js";
import { toIslandPoint } from "./island-attractions.js";
import type { IslandLandform } from "./island-landform.js";
import {
  findRailway,
  findStationPlatformSpot,
  hasRailway,
} from "./island-railway.js";
import { findGroundPaint } from "./island-ground-colour.js";
import { withoutTunnelHills } from "./island-tunnel-hills.js";
import { listIslandWonders, wonderFootprints } from "./island-wonders.js";
import { jungleReach } from "./jungle-reach.js";
import { starfallIsle } from "./starfall-isle.js";
import { sunscorchSands } from "./sunscorch-sands.js";

export const attractionIslandIds = [
  "meadow-isle",
  "frost-isle",
  "sunscorch-sands",
  "jungle-reach",
  "ember-isle",
  "starfall-isle",
] as const;

/** Attractions that belong on one Island, as the owner asked. */
const pinnedAttractions: Readonly<Record<string, readonly AttractionKind[]>> = {
  "meadow-isle": ["hedge-maze"],
  "frost-isle": ["ice-rink", "hot-springs"],
  "sunscorch-sands": ["oasis"],
  "jungle-reach": ["adventure-playground"],
  "ember-isle": ["fire-station", "volcano-lookout"],
  "starfall-isle": ["rocket-launch-pad"],
};

/** Every Island has a school. */
const everyIslandAttractions: readonly AttractionKind[] = ["school"];

const assignmentSeed = 2026;

export const buildRandom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
};

const shuffle = <T>(items: readonly T[], random: () => number): T[] => {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }
  return shuffled;
};

/**
 * Deals the Attractions out to the Islands. The pinned ones go where
 * the owner asked, a school goes on every Island, and the rest are
 * shuffled and dealt one at a time to the Island with fewest so far,
 * from a fixed seed, so they land at random but stay put.
 */
const dealAttractions = (): Map<string, AttractionKind[]> => {
  const random = buildRandom(assignmentSeed);
  const dealt = new Map<string, AttractionKind[]>(
    attractionIslandIds.map((islandId) => [
      islandId,
      [...everyIslandAttractions, ...(pinnedAttractions[islandId] ?? [])],
    ]),
  );
  const pinned = new Set<AttractionKind>([
    ...everyIslandAttractions,
    ...Object.values(pinnedAttractions).flat(),
  ]);
  const order = shuffle(attractionIslandIds, random);
  shuffle(
    attractionKinds.filter((kind) => !pinned.has(kind)),
    random,
  ).forEach((kind) => {
    const islandId = order.reduce((fewest, candidate) =>
      (dealt.get(candidate)?.length ?? 0) < (dealt.get(fewest)?.length ?? 0)
        ? candidate
        : fewest,
    );
    dealt.get(islandId)?.push(kind);
  });
  return dealt;
};

const dealtAttractions = dealAttractions();

export const listIslandAttractionKinds = (
  islandId: string,
): readonly AttractionKind[] => dealtAttractions.get(islandId) ?? [];

/* ------------------------------------------------------------------ */
/* Placing                                                             */
/* ------------------------------------------------------------------ */

const landforms = new Map<string, IslandLandform>([
  ["frost-isle", frostIsle],
  ["sunscorch-sands", sunscorchSands],
  ["jungle-reach", jungleReach],
  ["ember-isle", emberIsle],
  ["starfall-isle", starfallIsle],
]);

export const findNewLands = (islandId: string): NewLands =>
  landforms.get(islandId)?.newLands ?? meadowNewLands;

export const listDefaultLandSamples = (footprint: number): LocalPoint[] => [
  { x: 0, z: 0 },
  ...[
    [0.35, 6],
    [0.7, 10],
    [1, 14],
  ].flatMap(([share, count]) =>
    Array.from({ length: count }, (_, index) => {
      const angle = (index / count) * Math.PI * 2;
      return {
        x: Math.sin(angle) * footprint * share,
        z: Math.cos(angle) * footprint * share,
      };
    }),
  ),
];

const newLandsInnerEdge = 35 * exploreScale;
const newLandsOuterEdge = 79 * exploreScale;
const newLandsHalfDepth = 24 * exploreScale;
const placingAttempts = 2500;
const shorePlacingAttempts = 9000;
const validSitesToCompare = 14;
export const lowestInland = 0.35;
const highestInland = 26;
const lowestShore = 0.02;
const highestShore = 7;
const deepestSea = -0.25;
const attractionGap = 40;
const wonderGap = 7;
const placeGap = 4;
const railGap = 6;
const stationGap = 16;
export const trailGap = 2.5;
const regionGap = 3.6 * exploreScale;
const featureGap = 2.4 * exploreScale;
const bigTopGap = 40 * exploreScale;
const shoreTurns = 32;

export interface SiteRules {
  islandId: string;
  /** Where a site may reach: the Island's first lands, unless told otherwise. */
  isInBounds: (point: MapPoint) => boolean;
  adventure: IslandAdventure;
  isRailNear: (point: MapPoint) => boolean;
  keepClear: { centre: MapPoint; reach: number }[];
}

export const buildSiteRules = (
  adventureOnHills: IslandAdventure,
): SiteRules => {
  // Sites are found on the ground without the hills over the tunnels,
  // which are then kept off them (`island-tunnel-hills.ts`).
  // and without the trails out to the far reaches, which were laid
  // after them (ADR 0068).
  const adventure = withoutFarReachTrails(withoutTunnelHills(adventureOnHills));
  const { islandId } = adventure;
  const railway = hasRailway(islandId) ? findRailway(islandId) : undefined;
  const railPoints = (railway?.points ?? []).map(({ x, z }) => ({ x, z }));
  const stationSpots =
    railway === undefined
      ? []
      : railway.stations.map((station) =>
          findStationPlatformSpot(railway, station),
        );
  const island = islands.find(({ id }) => id === islandId);
  const keepClear = [
    ...listAdventurePlaces(adventure).map((centre) => ({
      centre,
      reach: placeGap,
    })),
    ...stationSpots.map((centre) => ({ centre, reach: stationGap })),
    ...(island?.regions ?? []).map(({ mapPosition }) => ({
      centre: {
        x: mapPosition.x * exploreScale,
        z: mapPosition.z * exploreScale,
      },
      reach: regionGap,
    })),
    ...(landforms.get(islandId)?.features ?? []).map(({ position }) => ({
      centre: { x: position.x * exploreScale, z: position.z * exploreScale },
      reach: featureGap,
    })),
    ...listIslandWonders(islandId).map(({ kind, position }) => ({
      centre: { x: position.x * exploreScale, z: position.z * exploreScale },
      reach: wonderFootprints[kind] * exploreScale + wonderGap,
    })),
  ];
  return {
    islandId,
    isInBounds: isInsideFirstLands,
    adventure,
    isRailNear: buildPlaceGrid(railPoints, railGap),
    keepClear,
  };
};

const runwayHalfLength = 7.5 * exploreScale;
const runwayHalfWidth = 1.5 * exploreScale;
const helipadReach = 1.8 * exploreScale;

export const isOnAirfield = (
  adventure: IslandAdventure,
  point: MapPoint,
  reach: number,
) => {
  const { runway, helipad, balloonField } = adventure.airfield;
  const { along, across } = findRunwayOffset(runway, point);
  const isOnStrip =
    Math.abs(along) <= runwayHalfLength + reach + placeGap &&
    Math.abs(across) <= runwayHalfWidth + reach + placeGap;
  const isOnPad =
    Math.hypot(point.x - helipad.centre.x, point.z - helipad.centre.z) <=
    helipadReach + reach + placeGap;
  const isOnBalloonField =
    Math.hypot(
      point.x - balloonField.centre.x,
      point.z - balloonField.centre.z,
    ) <=
    balloonFieldFlatRadius * exploreScale + reach + placeGap;
  return isOnStrip || isOnPad || isOnBalloonField;
};

export interface Site {
  centre: MapPoint;
  ground: number;
  padDepth: number;
  turn: number;
  roughness: number;
}

const findSiteHeights = (
  adventure: IslandAdventure,
  centre: MapPoint,
  turn: number,
  samples: readonly LocalPoint[],
): number[] =>
  samples.map((local) =>
    adventure.findHeight(toIslandPoint({ centre, turn }, local)),
  );

const isClearSpot = (
  rules: SiteRules,
  model: AttractionModel,
  centre: MapPoint,
  placed: readonly AttractionSite[],
): boolean => {
  const { adventure } = rules;
  const reach = model.footprint;
  const mapCentre = { x: centre.x / exploreScale, z: centre.z / exploreScale };
  if (Math.abs(centre.x) - reach < newLandsInnerEdge) {
    return false;
  }
  if (
    findDistanceToTrail(adventure, centre) <= reach + trailGap ||
    findDistanceToNewLandRivers(mapCentre, findNewLands(rules.islandId)) <=
      reach / exploreScale + 0.9 ||
    isOnAirfield(adventure, centre, reach)
  ) {
    return false;
  }
  if (
    rules.keepClear.some(
      (place) =>
        Math.hypot(place.centre.x - centre.x, place.centre.z - centre.z) <=
        place.reach + reach,
    )
  ) {
    return false;
  }
  if (
    placed.some(
      (other) =>
        Math.hypot(other.centre.x - centre.x, other.centre.z - centre.z) <=
        other.footprint + reach + attractionGap,
    )
  ) {
    return false;
  }
  if (model.kind === "funfair") {
    const bigTop = islands
      .find(({ id }) => id === rules.islandId)
      ?.regions.find(({ landmark }) => landmark === "big-top");
    if (
      bigTop !== undefined &&
      Math.hypot(
        bigTop.mapPosition.x * exploreScale - centre.x,
        bigTop.mapPosition.z * exploreScale - centre.z,
      ) < bigTopGap
    ) {
      return false;
    }
  }
  return listRailCheckPoints(reach).every(
    (local) =>
      !rules.isRailNear({ x: centre.x + local.x, z: centre.z + local.z }),
  );
};

export const listRailCheckPoints = (reach: number): LocalPoint[] => [
  { x: 0, z: 0 },
  ...Array.from({ length: 12 }, (_, index) => {
    const angle = (index / 12) * Math.PI * 2;
    return { x: Math.sin(angle) * reach, z: Math.cos(angle) * reach };
  }),
  ...Array.from({ length: 6 }, (_, index) => {
    const angle = (index / 6) * Math.PI * 2;
    return {
      x: Math.sin(angle) * reach * 0.5,
      z: Math.cos(angle) * reach * 0.5,
    };
  }),
];

const findInlandTurn = (islandId: string, centre: MapPoint): number => {
  if (islandId === "ember-isle") {
    const volcano = {
      x: emberVolcanoPosition.x * exploreScale,
      z: emberVolcanoPosition.z * exploreScale,
    };
    return Math.atan2(centre.x - volcano.x, centre.z - volcano.z);
  }
  return Math.atan2(-centre.x, -centre.z);
};

const hasPad = (model: PlaceModel): boolean => model.hasGroundPad !== false;

/**
 * How much the ground may rise across a site. An Attraction with a
 * ground pad stands on a terrace level with the site's highest point,
 * banked down to the land round it, so it can take a slope; one
 * without stands on the ground itself and needs it nearly level.
 */
const allowedRise = (model: PlaceModel): number =>
  hasPad(model) ? 1.2 + model.footprint * 0.12 : 0.9 + model.footprint * 0.05;

const terraceLift = 0.03;
const terraceFooting = 0.5;

const settleSite = (
  model: PlaceModel,
  heights: readonly number[],
): { ground: number; padDepth: number; roughness: number } => {
  const lowest = Math.min(...heights);
  const highest = Math.max(...heights);
  return hasPad(model)
    ? {
        ground: highest + terraceLift,
        padDepth: highest - lowest + terraceFooting,
        roughness: highest - lowest,
      }
    : {
        ground:
          heights.reduce((sum, height) => sum + height, 0) / heights.length,
        padDepth: 0,
        roughness: highest - lowest,
      };
};

export const tryInlandSite = (
  rules: SiteRules,
  model: PlaceModel & { kind: string },
  centre: MapPoint,
): Site | undefined => {
  const turn =
    model.kind === "volcano-lookout"
      ? findInlandTurn(rules.islandId, centre)
      : Math.atan2(-centre.x, -centre.z);
  const samples = model.landSamples ?? listDefaultLandSamples(model.footprint);
  if (
    !samples.every((local) =>
      rules.isInBounds(toIslandPoint({ centre, turn }, local)),
    )
  ) {
    return undefined;
  }
  const heights = findSiteHeights(rules.adventure, centre, turn, samples);
  const lowest = Math.min(...heights);
  const highest = Math.max(...heights);
  if (
    lowest < lowestInland ||
    highest > highestInland ||
    highest - lowest > allowedRise(model) ||
    samples.some(
      (local) =>
        rules.adventure.findCourseKind(
          toIslandPoint({ centre, turn }, local),
        ) !== undefined,
    )
  ) {
    return undefined;
  }
  return { centre, turn, ...settleSite(model, heights) };
};

export const tryShoreSiteAt = (
  rules: SiteRules,
  model: PlaceModel,
  centre: MapPoint,
  turn: number,
): Site | undefined => {
  const land = model.landSamples ?? [{ x: 0, z: 0 }];
  const sea = model.seaSamples ?? [{ x: 0, z: -model.footprint }];
  const all = [...land, ...sea];
  if (
    !all.every((local) =>
      rules.isInBounds(toIslandPoint({ centre, turn }, local)),
    )
  ) {
    return undefined;
  }
  const landHeights = findSiteHeights(rules.adventure, centre, turn, land);
  const seaHeights = findSiteHeights(rules.adventure, centre, turn, sea);
  const lowest = Math.min(...landHeights);
  const highest = Math.max(...landHeights);
  if (
    lowest < lowestShore ||
    highest > highestShore ||
    highest - lowest > allowedRise(model) ||
    seaHeights.some((height) => height > deepestSea)
  ) {
    return undefined;
  }
  return { centre, turn, ...settleSite(model, landHeights) };
};

export const tryShoreSite = (
  rules: SiteRules,
  model: PlaceModel,
  centre: MapPoint,
): Site | undefined =>
  Array.from(
    { length: shoreTurns },
    (_, step) => (step / shoreTurns) * Math.PI * 2,
  )
    .map((turn) => tryShoreSiteAt(rules, model, centre, turn))
    .filter((site) => site !== undefined)
    .toSorted((first, second) => first.roughness - second.roughness)
    .at(0);

export const findPadColour = (islandId: string, site: Site): string =>
  findGroundPaint(islandId, site.centre, site.ground);

const placeOne = (
  rules: SiteRules,
  kind: AttractionKind,
  seed: number,
  placed: readonly AttractionSite[],
): AttractionSite | undefined => {
  const model = attractionModels[kind];
  const random = buildRandom(seed);
  const sites: Site[] = [];
  for (
    let attempt = 0;
    attempt <
      (model.setting === "shore" ? shorePlacingAttempts : placingAttempts) &&
    sites.length < validSitesToCompare;
    attempt++
  ) {
    const side = random() < 0.5 ? -1 : 1;
    const centre = {
      x:
        side *
        (newLandsInnerEdge +
          model.footprint +
          random() * (newLandsOuterEdge - newLandsInnerEdge - model.footprint)),
      z: (random() * 2 - 1) * newLandsHalfDepth,
    };
    if (!isClearSpot(rules, model, centre, placed)) {
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
  const best = sites
    .toSorted((first, second) => first.roughness - second.roughness)
    .at(0);
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
  "meadow-isle": 101,
  "frost-isle": 203,
  "sunscorch-sands": 307,
  "jungle-reach": 401,
  "ember-isle": 503,
  "starfall-isle": 601,
};

/**
 * Finds where each of an Island's Attractions stands on its new lands:
 * on dry, nearly level ground clear of the trails, rivers, the Railway,
 * the airfield, the Wonders and every place, or for shore Attractions
 * on the beach facing the sea. The biggest are placed first.
 * `island-attraction-sites.ts` keeps what this finds, so the game
 * doesn't search each time; `pnpm run generate:attraction-sites`
 * writes it again.
 */
export const findAttractionSites = (
  adventure: IslandAdventure,
): AttractionSite[] => {
  const rules = buildSiteRules(adventure);
  const kinds = listIslandAttractionKinds(adventure.islandId).toSorted(
    (first, second) =>
      attractionModels[second].footprint - attractionModels[first].footprint,
  );
  const placed: AttractionSite[] = [];
  kinds.forEach((kind, index) => {
    const seed = (islandSeeds[adventure.islandId] ?? 7) * 31 + index * 977;
    const attraction = placeOne(rules, kind, seed, placed);
    if (attraction !== undefined) {
      placed.push(attraction);
    }
  });
  return placed;
};

/** Why a kept site no longer fits, or undefined if it still does. */
export const checkAttractionSite = (
  adventure: IslandAdventure,
  site: AttractionSite,
  others: readonly AttractionSite[],
): string | undefined => {
  const model = attractionModels[site.kind];
  if (model.footprint !== site.footprint) {
    return `${site.kind} has a footprint of ${String(model.footprint)}, not ${String(site.footprint)}`;
  }
  const rules = buildSiteRules(adventure);
  if (!isClearSpot(rules, model, site.centre, others)) {
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
