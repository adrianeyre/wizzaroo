import type { PlaceModel } from "../attractions/attraction-kit.js";
import type { CuriosityPlay } from "../curiosities/curiosity-kit.js";

/**
 * Fifteen more Attractions for each Island, each its own and in the
 * Island's style, standing on its two new lands: some on the west
 * land and some on the east (ADR 0068). They are built to the same
 * limits as the first thirty Attractions, and every one also has a
 * button on its card, as a Curiosity does.
 */
export const newLandAttractionKindsByIsland = {
  "meadow-isle": [
    "swan-boat-lake",
    "bouncy-castle",
    "strawberry-field",
    "tractor-train",
    "sheepdog-trials",
    "village-fete",
    "pony-stables",
    "grass-sledge-hill",
    "apple-orchard",
    "bluebell-wood",
    "puppet-theatre",
    "canal-lock",
    "duck-race",
    "kite-hill",
    "cricket-pitch",
  ],
  "frost-isle": [
    "ice-palace",
    "bobsleigh-track",
    "ski-jump",
    "snowball-range",
    "glacier-bridge",
    "curling-sheet",
    "polar-research-base",
    "icebreaker-ship",
    "mountain-rescue-hut",
    "snowmobile-trail",
    "seal-lagoon",
    "snow-tubing-hill",
    "yeti-cave",
    "ice-climbing-wall",
    "mammoth-museum",
  ],
  "sunscorch-sands": [
    "stone-age-village",
    "iron-age-hillfort",
    "chariot-racetrack",
    "desert-fort",
    "sand-yachts",
    "dune-buggy-track",
    "date-palm-grove",
    "papyrus-workshop",
    "sandstone-arches",
    "dinosaur-park",
    "archimedes-screw",
    "pottery-kiln",
    "sand-slide-tower",
    "windcatcher-house",
    "painted-cave",
  ],
  "jungle-reach": [
    "vine-swing-glade",
    "strangler-fig-ruins",
    "rainforest-biome",
    "stilt-village",
    "cacao-farm",
    "gorilla-sanctuary",
    "elephant-pool",
    "jungle-coaster",
    "bat-cave",
    "hummingbird-garden",
    "hydro-power-house",
    "giant-kapok-climb",
    "orchid-house",
    "high-ropes-course",
    "insect-house",
  ],
  "ember-isle": [
    "volcano-museum",
    "dragon-boat-lake",
    "minotaur-labyrinth",
    "greek-temple",
    "sutton-hoo-mound",
    "glassblowing-studio",
    "geothermal-plant",
    "mine-cart-ride",
    "chilli-farm",
    "pompeii-street",
    "bronze-colossus",
    "firework-tower",
    "lava-flume",
    "obsidian-quarry",
    "dragon-hatchery",
  ],
  "starfall-isle": [
    "planetarium-dome",
    "mars-base",
    "drop-tower",
    "space-shuttle",
    "star-flyer",
    "mirror-maze",
    "camera-obscura",
    "astronaut-centrifuge",
    "beagle-ship",
    "giant-heart",
    "home-front-house",
    "lunar-lander",
    "black-hole-slide",
    "shadow-garden",
    "inventors-hall",
  ],
} as const;

export type NewLandAttractionIslandId =
  keyof typeof newLandAttractionKindsByIsland;

export type NewLandAttractionKind =
  (typeof newLandAttractionKindsByIsland)[NewLandAttractionIslandId][number];

export const newLandAttractionIslandIds: readonly NewLandAttractionIslandId[] =
  [
    "meadow-isle",
    "frost-isle",
    "sunscorch-sands",
    "jungle-reach",
    "ember-isle",
    "starfall-isle",
  ];

export const newLandAttractionKinds: readonly NewLandAttractionKind[] =
  newLandAttractionIslandIds.flatMap(
    (islandId) => newLandAttractionKindsByIsland[islandId],
  );

export interface NewLandAttractionModel extends PlaceModel {
  kind: NewLandAttractionKind;
  /** The Island it belongs on, in that Island's style. */
  islandId: NewLandAttractionIslandId;
  /** Every one teaches something from the National Curriculum. */
  curriculumLink: string;
  /** Its card's button, such as "Ring the bell". */
  play: CuriosityPlay;
}

/* ------------------------------------------------------------------ */
/* Limits: the first thirty Attractions' own                           */
/* ------------------------------------------------------------------ */

/** Triangles in its near model, moving parts and wanderers included. */
export const newLandAttractionNearTriangles = 16_000;
/** Triangles in its far model, moving parts and wanderers included. */
export const newLandAttractionFarTriangles = 6_000;
export const newLandAttractionSmallestFootprint = 6;
export const newLandAttractionLargestFootprint = 14;
export const newLandAttractionMovingPartLimit = 6;
/** Moving parts and their orbiting copies together, each a mesh. */
export const newLandAttractionMovingCopyLimit = 12;
