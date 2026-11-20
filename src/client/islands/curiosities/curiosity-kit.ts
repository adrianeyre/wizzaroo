import type { PlaceModel } from "../attractions/attraction-kit.js";

/**
 * Twenty Curiosities for each Island, each in the Island's own style.
 * A Curiosity is smaller than an Attraction, stands anywhere on the
 * Island rather than only on its new lands, and is always something
 * to play with as well as look at (ADR 0056).
 */
export const curiosityKindsByIsland = {
  "meadow-isle": [
    "windmill",
    "water-mill",
    "scarecrow",
    "wishing-well",
    "giant-sunflowers",
    "frog-pond",
    "maypole",
    "rabbit-warren",
    "haystack-slide",
    "snail-race",
    "weather-station",
    "picnic-spot",
    "bug-hotel",
    "bird-table",
    "butterfly-garden",
    "giant-seesaw",
    "telephone-box",
    "ice-cream-van",
    "stepping-stones",
    "flower-clock",
  ],
  "frost-isle": [
    "snowflake-lab",
    "igloo",
    "penguin-colony",
    "polar-bear-den",
    "husky-sled",
    "toboggan-run",
    "ice-sculptures",
    "snow-globe",
    "ice-fishing-hut",
    "frozen-waterfall",
    "reindeer-paddock",
    "aurora-viewpoint",
    "ski-lift",
    "snow-fort",
    "walrus-rocks",
    "hot-chocolate-hut",
    "icicle-xylophone",
    "arctic-fox-den",
    "cuckoo-clock-chalet",
    "frost-fair",
  ],
  "sunscorch-sands": [
    "nile-felucca",
    "sphinx",
    "camel-caravan",
    "sundial",
    "cactus-garden",
    "sandboard-dune",
    "meerkat-mound",
    "fossil-dig",
    "shaduf",
    "spice-market",
    "magic-carpet",
    "scorpion-rocks",
    "tortoise-pen",
    "giant-sandcastle",
    "pharaoh-tomb",
    "solar-farm",
    "compass-rose",
    "ostrich-run",
    "sand-timer",
    "bedouin-tent",
  ],
  "jungle-reach": [
    "canopy-walkway",
    "mangrove-boardwalk",
    "toucan-tree",
    "monkey-swings",
    "giant-lily-pads",
    "mayan-temple",
    "orangutan-nest",
    "tiger-lookout",
    "hippo-wallow",
    "drum-circle",
    "river-raft",
    "banana-plantation",
    "crocodile-creek",
    "circuit-garden",
    "bamboo-chimes",
    "snake-tree",
    "leafcutter-ants",
    "sloth-hammock",
    "flytrap-patch",
    "parrot-perch",
  ],
  "ember-isle": [
    "geyser",
    "lava-tube-cave",
    "sleeping-dragon",
    "blacksmith-forge",
    "viking-longship",
    "viking-longhouse",
    "crystal-geode",
    "mud-pools",
    "seismograph",
    "orrery",
    "gear-machine",
    "trebuchet",
    "phoenix-nest",
    "steam-engine",
    "lava-fountain",
    "greek-theatre",
    "olympic-torch",
    "basalt-columns",
    "pulley-lift",
    "salamander-rocks",
  ],
  "starfall-isle": [
    "observatory",
    "moon-phase-garden",
    "satellite-dish",
    "ufo-landing",
    "meteorite-crater",
    "lunar-rover",
    "constellation-garden",
    "gyroscope-trainer",
    "rainbow-prism",
    "periscope",
    "lightning-tower",
    "finch-aviary",
    "codebreaker-hut",
    "planet-trail",
    "wind-turbines",
    "moon-bounce",
    "space-station-frame",
    "alien-garden",
    "robot-workshop",
    "morse-code-lamp",
  ],
} as const;

export type CuriosityIslandId = keyof typeof curiosityKindsByIsland;

export type CuriosityKind =
  (typeof curiosityKindsByIsland)[CuriosityIslandId][number];

export const curiosityIslandIds: readonly CuriosityIslandId[] = [
  "meadow-isle",
  "frost-isle",
  "sunscorch-sands",
  "jungle-reach",
  "ember-isle",
  "starfall-isle",
];

export const curiosityKinds: readonly CuriosityKind[] =
  curiosityIslandIds.flatMap((islandId) => curiosityKindsByIsland[islandId]);

/**
 * What the Character does when the Child presses the Curiosity's
 * button on its card, such as "Ring the bell" or "Grind some flour".
 */
export interface CuriosityPlay {
  /** The button's words: a short instruction, such as "Make a wish". */
  label: string;
  /** What happened, shown for a few seconds after the button is pressed. */
  news: string;
  /** Notes (MIDI numbers) played when the button is pressed, if any. */
  tune?: readonly number[];
}

export interface CuriosityModel extends PlaceModel {
  kind: CuriosityKind;
  /** The Island it belongs on, in that Island's style. */
  islandId: CuriosityIslandId;
  /** Every Curiosity teaches something from the National Curriculum. */
  curriculumLink: string;
  play: CuriosityPlay;
}

/* ------------------------------------------------------------------ */
/* Limits                                                              */
/* ------------------------------------------------------------------ */

/** Triangles in a Curiosity's near model, moving parts and wanderers included. */
export const curiosityNearTriangles = 10_000;
/** Triangles in its far model, which is a single still mesh. */
export const curiosityFarTriangles = 800;
export const curiositySmallestFootprint = 2.5;
export const curiosityLargestFootprint = 8;
export const curiosityMovingPartLimit = 4;
/** Moving parts and their orbiting copies together, each a mesh. */
export const curiosityMovingCopyLimit = 8;
