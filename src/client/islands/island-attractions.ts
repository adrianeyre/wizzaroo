import type { MapPoint } from "../world-map-terrain.js";
import {
  groundPadSkirt,
  terraceBankSlope,
  type AttractionKind,
  type AttractionModel,
  type DeckSurface,
  type LocalPoint,
  type PlayRide,
} from "./attractions/attraction-kit.js";
import { attractionModels } from "./attractions/attraction-models.js";
import type {
  CuriosityKind,
  CuriosityModel,
} from "./curiosities/curiosity-kit.js";
import { curiosityModels } from "./curiosities/curiosity-models.js";
import type {
  NewLandAttractionKind,
  NewLandAttractionModel,
} from "./new-land-attractions/new-land-attraction-kit.js";
import { newLandAttractionModels } from "./new-land-attractions/new-land-attraction-models.js";
import {
  exploreScale,
  type ExploreInteraction,
  type IslandAdventure,
  type WalkLanes,
  type WalkSurface,
} from "./island-adventures.js";
import { attractionSites } from "./island-attraction-sites.js";
import { curiositySites } from "./island-curiosity-sites.js";
import { newLandAttractionSites } from "./island-new-land-attraction-sites.js";
import type { Blocker } from "./island-walker.js";

interface PlacedSpot {
  id: string;
  islandId: string;
  centre: MapPoint;
  ground: number;
  padDepth: number;
  turn: number;
  padColour: string;
}

/**
 * Which set a placed thing comes from: the first thirty Attractions,
 * dealt out at random; the fifteen more each Island has of its own on
 * its new lands; or the smaller Curiosities.
 */
export type PlacedFamily = "attraction" | "new-land-attraction" | "curiosity";

/**
 * Something placed on an Island: an Attraction, or one of the smaller
 * Curiosities. They are walked among, visited and drawn the same way,
 * so most of the game treats them alike.
 */
export type PlacedAttraction =
  | (PlacedSpot & {
      kind: AttractionKind;
      model: AttractionModel;
      family: "attraction";
      isCuriosity: false;
    })
  | (PlacedSpot & {
      kind: NewLandAttractionKind;
      model: NewLandAttractionModel;
      family: "new-land-attraction";
      isCuriosity: false;
    })
  | (PlacedSpot & {
      kind: CuriosityKind;
      model: CuriosityModel;
      family: "curiosity";
      isCuriosity: true;
    });

/** Turns a local point of an Attraction into a point on the Island. */
export const toIslandPoint = (
  { centre, turn }: { centre: MapPoint; turn: number },
  local: LocalPoint,
): MapPoint => ({
  x: centre.x + local.x * Math.cos(turn) + local.z * Math.sin(turn),
  z: centre.z - local.x * Math.sin(turn) + local.z * Math.cos(turn),
});

/** Turns a point on the Island into the Attraction's local units. */
export const toLocalPoint = (
  { centre, turn }: { centre: MapPoint; turn: number },
  point: MapPoint,
): LocalPoint => {
  const x = point.x - centre.x;
  const z = point.z - centre.z;
  return {
    x: x * Math.cos(turn) - z * Math.sin(turn),
    z: x * Math.sin(turn) + z * Math.cos(turn),
  };
};

const placedByIsland = new Map<string, PlacedAttraction[]>();

/**
 * The Island's Attractions, then the Attractions on its new lands, then
 * its Curiosities, where `island-attraction-sites.ts`,
 * `island-new-land-attraction-sites.ts` and `island-curiosity-sites.ts`
 * keep them.
 */
export const listPlacedAttractions = (
  islandId: string,
): readonly PlacedAttraction[] => {
  const known = placedByIsland.get(islandId);
  if (known !== undefined) {
    return known;
  }
  const attractions = (attractionSites[islandId] ?? []).map(
    (site): PlacedAttraction => ({
      id: `${islandId}-${site.kind}`,
      islandId,
      kind: site.kind,
      model: attractionModels[site.kind],
      family: "attraction",
      isCuriosity: false,
      centre: site.centre,
      ground: site.ground,
      padDepth: site.padDepth,
      turn: site.turn,
      padColour: site.padColour,
    }),
  );
  const curiosities = (curiositySites[islandId] ?? []).map(
    (site): PlacedAttraction => ({
      id: `${islandId}-${site.kind}`,
      islandId,
      kind: site.kind,
      model: curiosityModels[site.kind],
      family: "curiosity",
      isCuriosity: true,
      centre: site.centre,
      ground: site.ground,
      padDepth: site.padDepth,
      turn: site.turn,
      padColour: site.padColour,
    }),
  );
  const newLandAttractions = (newLandAttractionSites[islandId] ?? []).map(
    (site): PlacedAttraction => ({
      id: `${islandId}-${site.kind}`,
      islandId,
      kind: site.kind,
      model: newLandAttractionModels[site.kind],
      family: "new-land-attraction",
      isCuriosity: false,
      centre: site.centre,
      ground: site.ground,
      padDepth: site.padDepth,
      turn: site.turn,
      padColour: site.padColour,
    }),
  );
  const placed = [...attractions, ...newLandAttractions, ...curiosities];
  placedByIsland.set(islandId, placed);
  return placed;
};

export const placeIslandAttractions = (
  adventure: IslandAdventure,
): readonly PlacedAttraction[] => listPlacedAttractions(adventure.islandId);

/* ------------------------------------------------------------------ */
/* Walking among them                                                  */
/* ------------------------------------------------------------------ */

export const listAttractionBlockers = (adventure: IslandAdventure): Blocker[] =>
  placeIslandAttractions(adventure).flatMap((attraction) =>
    (attraction.model.blockers ?? []).map(({ x, z, radius }) => ({
      centre: toIslandPoint(attraction, { x, z }),
      radius,
    })),
  );

/** How far an Attraction reaches, its terrace's bank and all. */
export const findAttractionReach = ({
  model,
  padDepth,
}: PlacedAttraction): number => model.footprint + padDepth * terraceBankSlope;

/**
 * How far out an Attraction's ground pad and its bank reach, as drawn,
 * so the Character walks up the bank instead of into it.
 */
const findBankReach = ({ model, padDepth }: PlacedAttraction): number =>
  model.footprint + (padDepth + groundPadSkirt) * terraceBankSlope;

/** The highest deck of an Attraction under a point, in Island heights. */
export const findAttractionDeck = (
  attraction: PlacedAttraction,
  point: MapPoint,
): WalkSurface | undefined => {
  const local = toLocalPoint(attraction, point);
  const distance = Math.hypot(local.x, local.z);
  if (distance > findBankReach(attraction)) {
    return undefined;
  }
  const decks = (attraction.model.decks ?? [])
    .map((deck) => deck(local))
    .filter((surface): surface is DeckSurface => surface !== undefined);
  const hasPad = attraction.model.hasGroundPad !== false;
  const pad: DeckSurface[] = !hasPad
    ? []
    : distance <= attraction.model.footprint
      ? [{ height: 0, kind: "ground" }]
      : [
          {
            height: -(distance - attraction.model.footprint) / terraceBankSlope,
            kind: "ground",
          },
        ];
  const highest = [...decks, ...pad].reduce<DeckSurface | undefined>(
    (best, surface) =>
      best === undefined || surface.height > best.height ? surface : best,
    undefined,
  );
  return highest === undefined
    ? undefined
    : { height: attraction.ground + highest.height, kind: highest.kind };
};

/**
 * Adds the Attractions' ground pads, decks, ramps and ice to whatever
 * the Character could already walk on.
 */
export const addAttractionLanes = (
  adventure: IslandAdventure,
  lanes: WalkLanes | undefined,
): WalkLanes => {
  const placed = placeIslandAttractions(adventure);
  return {
    findDeck: (point) => {
      const below = lanes?.findDeck(point);
      const attraction = placed.find(
        (candidate) =>
          Math.hypot(
            point.x - candidate.centre.x,
            point.z - candidate.centre.z,
          ) <= findBankReach(candidate),
      );
      const deck =
        attraction === undefined
          ? undefined
          : findAttractionDeck(attraction, point);
      if (deck === undefined) {
        return below;
      }
      return below !== undefined && below.height > deck.height ? below : deck;
    },
  };
};

/* ------------------------------------------------------------------ */
/* Visiting them                                                       */
/* ------------------------------------------------------------------ */

export const listAttractionInteractions = (
  adventure: IslandAdventure,
): ExploreInteraction[] =>
  placeIslandAttractions(adventure).map((attraction) => ({
    kind: "attraction",
    id: attraction.id,
    name: `the ${attraction.model.name}`,
    position: toIslandPoint(attraction, attraction.model.signSpot),
  }));

export const findPlacedAttraction = (
  islandId: string,
  attractionId: string,
): PlacedAttraction | undefined =>
  listPlacedAttractions(islandId).find(({ id }) => id === attractionId);

export interface PlacedRide {
  attraction: PlacedAttraction;
  ride: PlayRide;
}

export const listAttractionRides = (adventure: IslandAdventure): PlacedRide[] =>
  placeIslandAttractions(adventure).flatMap((attraction) =>
    (attraction.model.rides ?? []).map((ride) => ({ attraction, ride })),
  );

/** The places the Island's scenery keeps clear of, in map units. */
export const listAttractionKeepClearPlaces = (islandId: string): MapPoint[] => {
  return listPlacedAttractions(islandId).flatMap((attraction) => {
    const spacing = 4;
    const reach = attraction.model.footprint;
    const points: MapPoint[] = [];
    for (let x = -reach; x <= reach; x += spacing) {
      for (let z = -reach; z <= reach; z += spacing) {
        if (Math.hypot(x, z) <= reach + spacing / 2) {
          const point = toIslandPoint(attraction, { x, z });
          points.push({ x: point.x / exploreScale, z: point.z / exploreScale });
        }
      }
    }
    return points;
  });
};
