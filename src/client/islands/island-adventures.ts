import {
  bridgeCrossing,
  bridgeDeckHeight,
  bridgeSpan,
  bridgeTurn,
} from "../world-map-scene.js";
import {
  findDistanceToSegment,
  smoothStep,
  findTerrainHeight,
  footpathCourses,
  isInNewLandRiver,
  lighthousePosition,
  listAirfieldPlaces,
  meadowAirfield,
  meadowIslet,
  villageCentres,
  type Airfield,
  type MapPoint,
  findNewLandShare,
  newLandFarReaches,
} from "../world-map-terrain.js";
import {
  emberAirfield,
  emberIsle,
  emberIslet,
  steamVentPositions,
} from "./ember-isle.js";
import { farReachTrails } from "./island-far-reach-trails.js";
import {
  frostAirfield,
  frostIsle,
  frostIslet,
  iceBridgeCrossing,
} from "./frost-isle.js";
import {
  findDistanceToCourse,
  type IslandLandform,
  type WaterKind,
} from "./island-landform.js";
import {
  jungleAirfield,
  jungleIslet,
  jungleReach,
  plateauCentre,
  ropeBridgeCrossings,
} from "./jungle-reach.js";
import {
  observatoryHill,
  starfallAirfield,
  starCraterPosition,
  starfallIsle,
  starfallIslet,
} from "./starfall-isle.js";
import {
  caravanTrail,
  desertRuinsCentre,
  marketTownCentre,
  mesaPosition,
  sandsAirfield,
  sandsIslet,
  sunscorchSands,
} from "./sunscorch-sands.js";

export type BridgeMaterial = "stone" | "timber" | "ice" | "iron";

export interface AdventureBridge {
  name: string;
  from: MapPoint;
  to: MapPoint;
  endHeight: number;
  middleHeight: number;
  halfWidth: number;
  material: BridgeMaterial;
  isDrawnByIsland: boolean;
}

export type LookoutLook = "island-landmark" | "watchtower";

export interface Lookout {
  id: string;
  name: string;
  position: MapPoint;
  viewHeight: number;
  look: LookoutLook;
  /**
   * How far from it, in explore units, the Character can climb it, for
   * a Lookout standing on a base wider than a Lookout's usual reach.
   */
  reach?: number;
}

/**
 * Meadow Isle's lighthouse stands on a ring of rocks about 10 explore
 * units across, which are solid (ADR 0061), so it is climbed from the
 * edge of them.
 */
export const lighthouseLookoutReach = 11.5;

export interface FactSign {
  id: string;
  position: MapPoint;
  title: string;
  fact: string;
}

export interface Hideaway {
  id: string;
  position: MapPoint;
  name: string;
  discovery: string;
}

export interface Treasure {
  id: string;
  position: MapPoint;
}

export interface TreasureKind {
  singular: string;
  plural: string;
  colour: string;
}

export interface BouncePads {
  name: string;
  colour: string;
  places: MapPoint[];
}

export interface Dock {
  from: MapPoint;
  to: MapPoint;
  berthSide: -1 | 1;
}

export interface HoverPad {
  centre: MapPoint;
  heading: number;
  slipStart: number;
  slipLevel: number;
}

const hoverPadPlaceSpacing = 1.5;
const hoverPadLandwardReach = 2.5;

export const listHoverPadPlaces = ({
  centre,
  heading,
  slipStart,
}: HoverPad): MapPoint[] =>
  Array.from(
    {
      length:
        Math.floor((slipStart + hoverPadLandwardReach) / hoverPadPlaceSpacing) +
        1,
    },
    (_, step) => {
      const along = hoverPadLandwardReach - step * hoverPadPlaceSpacing;
      return {
        x: centre.x + Math.sin(heading) * along,
        z: centre.z + Math.cos(heading) * along,
      };
    },
  );

export type FriendLook =
  "lamb" | "penguin" | "camel" | "monkey" | "lizard" | "owl";

export interface FriendKind {
  singular: string;
  plural: string;
  look: FriendLook;
}

export interface Friend {
  id: string;
  position: MapPoint;
  name: string;
  greeting: string;
}

export interface Race {
  id: string;
  name: string;
  seconds: number;
  rings: MapPoint[];
}

export interface IslandAdventure {
  islandId: string;
  start: MapPoint;
  startHeading: number;
  trailColour: string;
  trails: MapPoint[][];
  drawnBridges: AdventureBridge[];
  lookouts: Lookout[];
  signs: FactSign[];
  hideaways: Hideaway[];
  treasureKind: TreasureKind;
  treasures: Treasure[];
  bouncePads: BouncePads;
  dock: Dock;
  airfield: Airfield;
  hoverPad: HoverPad;
  friendKind: FriendKind;
  friends: Friend[];
  races: Race[];
  gravity: number;
  findHeight: (point: MapPoint) => number;
  findCourseKind: (point: MapPoint) => WaterKind | undefined;
}

export type SurfaceKind =
  "ground" | "trail" | "bridge" | "shallows" | "water" | "ice" | "lava";

export interface WalkSurface {
  height: number;
  kind: SurfaceKind;
}

export interface WalkLanes {
  findDeck: (point: MapPoint) => WalkSurface | undefined;
}

export interface AdventureWorld {
  adventure: IslandAdventure;
  bridges: AdventureBridge[];
  lanes?: WalkLanes;
}

export const earthGravity = 14;
export const trailHalfWidth = 0.55;
export const swimDepth = 0.32;
export const swimSink = 0.34;
export const exploreScale = 6;
export const exploreHalfWidth = 112 * exploreScale;
/**
 * How far the Island reached east and west before its new lands grew
 * their far reaches (ADR 0068). The Attractions, Curiosities, Quest and
 * Wonder grove placed before then were found inside it, and still are,
 * so none of them moves.
 */
export const firstLandsHalfWidth = 80 * exploreScale;
export const exploreHalfDepth = 25 * exploreScale;
const exploreBoundsRoundness = 4;
/** How far up the Character can step onto a bridge or deck. */
export const bridgeStepUp = 0.8;
const bridgeRampLength = 0.9;
const autoBridgeLongestRun = 9 * exploreScale;
const autoBridgeOverhang = 0.7;
const drawnBridgeJoin = 0.035 * exploreScale;
const trailSampleSpacing = 0.25;
export const pierHalfWidth = 1.3;

const findCourseKindIn =
  (landform: IslandLandform) =>
  (point: MapPoint): WaterKind | undefined =>
    landform.waterCourses.find(
      ({ course, halfWidth }) =>
        findDistanceToCourse(point, course) <= halfWidth + 0.15,
    )?.kind ??
    (isInNewLandRiver(point, landform.newLands) ? "river" : undefined);

const buildTurnedBridgeEnds = (
  centre: MapPoint,
  turn: number,
  span: number,
): { from: MapPoint; to: MapPoint } => {
  const alongX = Math.cos(turn) * (span / 2);
  const alongZ = -Math.sin(turn) * (span / 2);
  return {
    from: { x: centre.x - alongX, z: centre.z - alongZ },
    to: { x: centre.x + alongX, z: centre.z + alongZ },
  };
};

const findGroundAbove = (
  findHeight: (point: MapPoint) => number,
  point: MapPoint,
): number => Math.max(0, findHeight(point));

const meadowStoneBridge: AdventureBridge = {
  name: "stone-bridge",
  ...buildTurnedBridgeEnds(bridgeCrossing, bridgeTurn, bridgeSpan),
  endHeight: bridgeDeckHeight,
  middleHeight: bridgeDeckHeight + 0.35,
  halfWidth: 0.6,
  material: "stone",
  isDrawnByIsland: true,
};

const iceBridgeDeck =
  findGroundAbove(frostIsle.findHeight, iceBridgeCrossing) + 0.3 + 0.91;

const frostIceBridge: AdventureBridge = {
  name: "ice-bridge",
  ...buildTurnedBridgeEnds(iceBridgeCrossing, 0, 4.8),
  endHeight: iceBridgeDeck,
  middleHeight: iceBridgeDeck,
  halfWidth: 0.45,
  material: "ice",
  isDrawnByIsland: true,
};

const jungleRopeBridges: AdventureBridge[] = ropeBridgeCrossings.map(
  ({ at, turn }, bridge) => {
    const base = findGroundAbove(jungleReach.findHeight, at) + 0.75;
    return {
      name: `rope-bridge-${String(bridge + 1)}`,
      ...buildTurnedBridgeEnds(at, turn, 4.2),
      endHeight: base + 0.35,
      middleHeight: base + 0.03,
      halfWidth: 0.4,
      material: "timber",
      isDrawnByIsland: true,
    };
  },
);

const meadowAdventure: IslandAdventure = {
  islandId: "meadow-isle",
  start: { x: -5.6, z: 8.2 },
  startHeading: Math.PI,
  trailColour: "#c9a46b",
  trails: [
    ...footpathCourses,
    [
      villageCentres[1],
      { x: 12, z: 8.6 },
      { x: 17, z: 8.4 },
      { x: 20.4, z: 7.6 },
    ],
    [
      { x: 12, z: 8.6 },
      { x: 15, z: 4.6 },
      { x: 16, z: 2 },
    ],
    [
      { x: 16, z: 2 },
      { x: 17.2, z: -3 },
      { x: 16.2, z: -7 },
      { x: 15, z: -9 },
    ],
    [
      { x: -4, z: 7 },
      { x: -2, z: 5 },
    ],
    [
      { x: -3, z: -2 },
      { x: -6, z: -3 },
      { x: -11, z: -1 },
      { x: -17, z: 1 },
    ],
    [
      { x: -3, z: -2 },
      { x: 2, z: -3 },
    ],
    [villageCentres[2], { x: 2.6, z: -8.8 }, { x: 6, z: -8 }],
    [villageCentres[2], { x: -6, z: -10.4 }, { x: -11, z: -10 }],
    [
      { x: -11, z: -10 },
      { x: -15, z: -9.6 },
      { x: -17.6, z: -9 },
    ],
    [villageCentres[0], { x: -12, z: 10 }, { x: -14, z: 9 }],
    [
      { x: -14, z: 9 },
      { x: -16.6, z: 5 },
      { x: -17, z: 1 },
    ],
    [
      { x: -4, z: 7 },
      { x: -1.3, z: 11.5 },
    ],
    [
      { x: -16.6, z: 5 },
      { x: -22.9, z: 4.5 },
    ],
    [
      { x: 6, z: 9 },
      { x: 5.1, z: 13.9 },
    ],
    [
      { x: -1, z: -9 },
      { x: 0.3, z: -13.4 },
    ],
    [
      { x: -15, z: -9.6 },
      { x: -14.1, z: -5.6 },
    ],
    [
      { x: 20.4, z: 7.6 },
      { x: 21.8, z: 2.6 },
    ],
    [
      { x: -11, z: -1 },
      { x: -10.7, z: -0.1 },
    ],
    [
      { x: -4, z: 7 },
      { x: -4.4, z: 9.4 },
    ],
    [
      { x: -6, z: -10.4 },
      { x: -5.7, z: -9.1 },
    ],
    [
      { x: 0.2, z: -13.1 },
      { x: -2.5, z: -13.9 },
    ],
    [
      { x: 16.3, z: 0.8 },
      { x: 12.4, z: -0.1 },
    ],
    [
      { x: -19.6, z: 4.8 },
      { x: -19.5, z: 3.8 },
    ],
    [
      { x: -17.6, z: -9 },
      { x: -22.5, z: -4.5 },
    ],
    [
      { x: -3.9, z: 6.1 },
      { x: -5.7, z: 5.9 },
    ],
    [
      { x: 5.3, z: 5.5 },
      { x: 5.9, z: 5.4 },
    ],
    [
      { x: 2, z: -3 },
      { x: 5.5, z: -1.6 },
    ],
    [
      { x: -3.2, z: -0.3 },
      { x: -1.4, z: -0.1 },
    ],
    [
      { x: -6.7, z: -2.7 },
      { x: -8, z: -5.9 },
    ],
    [
      { x: -2.5, z: 9.5 },
      { x: -0.6, z: 8.3 },
    ],
    [
      { x: 66.3, z: 0 },
      { x: 64.4, z: 5.6 },
      { x: 59.2, z: 9.8 },
      { x: 52, z: 11.3 },
      { x: 44.9, z: 9.8 },
      { x: 39.6, z: 5.6 },
      { x: 37.7, z: 0 },
      { x: 39.6, z: -5.6 },
      { x: 44.8, z: -9.8 },
      { x: 52, z: -11.3 },
      { x: 60.5, z: -11.5 },
      { x: 64.4, z: -5.6 },
      { x: 66.3, z: 0 },
    ],
    [
      { x: 21.8, z: 2.6 },
      { x: 20, z: 0 },
      { x: 27.5, z: 0 },
      { x: 37.7, z: 0 },
    ],
    [
      { x: 31.5, z: 0 },
      { x: 31.5, z: 5.3 },
    ],
    [
      { x: 39.6, z: -5.6 },
      { x: 35.2, z: -8.6 },
    ],
    [
      { x: 64.5, z: 5.4 },
      { x: 70.1, z: 7.3 },
    ],
    [
      { x: 48.3, z: -10.5 },
      { x: 47.1, z: -16.4 },
    ],
    [
      { x: 45.8, z: 10 },
      { x: 44.6, z: 15.5 },
    ],
    [
      { x: 57.4, z: 10.2 },
      { x: 58.5, z: 15.5 },
    ],
    [
      { x: 64.4, z: -5.6 },
      { x: 69.9, z: -7.5 },
    ],
    [
      { x: 56.3, z: 10.4 },
      { x: 55.1, z: 4.6 },
    ],
    [
      { x: 59.2, z: -11.5 },
      { x: 59.1, z: -15.7 },
    ],
    [
      { x: -37.7, z: 0 },
      { x: -39.6, z: 5.6 },
      { x: -44.8, z: 9.8 },
      { x: -52, z: 11.3 },
      { x: -60.4, z: 11.5 },
      { x: -64.4, z: 5.6 },
      { x: -66.3, z: 0 },
      { x: -64.4, z: -5.6 },
      { x: -59.1, z: -9.8 },
      { x: -52, z: -11.3 },
      { x: -44.8, z: -9.8 },
      { x: -39.6, z: -5.6 },
      { x: -37.7, z: 0 },
    ],
    [
      { x: -20.9, z: -6 },
      { x: -20, z: -5 },
      { x: -27.5, z: -5 },
      { x: -38.2, z: -1.4 },
    ],
    [
      { x: -32.1, z: -3.5 },
      { x: -33.8, z: -8.5 },
    ],
    [
      { x: -39.6, z: 5.6 },
      { x: -34.5, z: 7.8 },
    ],
    [
      { x: -64.4, z: 5.6 },
      { x: -69.8, z: 8 },
    ],
    [
      { x: -46.5, z: -10.2 },
      { x: -45.3, z: -16 },
    ],
    [
      { x: -58.8, z: -9.9 },
      { x: -60, z: -15.5 },
    ],
    [
      { x: -64.6, z: -5 },
      { x: -69.8, z: -6.8 },
    ],
    [
      { x: -47, z: 10.3 },
      { x: -45.9, z: 15.4 },
    ],
    [
      { x: -58.7, z: 11.5 },
      { x: -58.6, z: 16 },
    ],
    [
      { x: -56.3, z: -10.4 },
      { x: -55.1, z: -4.8 },
    ],
  ],
  drawnBridges: [meadowStoneBridge],
  lookouts: [
    {
      id: "lighthouse",
      name: "the Lighthouse",
      position: lighthousePosition,
      viewHeight: 4.4,
      look: "island-landmark",
      reach: lighthouseLookoutReach,
    },
    {
      id: "meadow-watchtower",
      name: "the Meadow Watchtower",
      position: { x: -9.4, z: 4.8 },
      viewHeight: 4.2,
      look: "watchtower",
    },
    {
      id: "meadow-orchard-tower",
      name: "the Orchard Watchtower",
      position: { x: 19.4, z: -1.7 },
      viewHeight: 4.2,
      look: "watchtower",
    },
    {
      id: "meadow-windmill-tower",
      name: "the Windmill Watchtower",
      position: { x: -1, z: 12 },
      viewHeight: 4.2,
      look: "watchtower",
    },
    {
      id: "meadow-duck-pond-tower",
      name: "the Duck Pond Watchtower",
      position: { x: 12.4, z: -0.1 },
      viewHeight: 4.2,
      look: "watchtower",
    },
    {
      id: "meadow-buttercup-tower",
      name: "the Buttercup Watchtower",
      position: { x: 31.5, z: 5.3 },
      viewHeight: 4.2,
      look: "watchtower",
    },
    {
      id: "meadow-willow-tower",
      name: "the Willow Watchtower",
      position: { x: -33.8, z: -8.5 },
      viewHeight: 4.2,
      look: "watchtower",
    },
  ],
  signs: [
    {
      id: "meadow-river",
      position: { x: 0.4, z: 3.4 },
      title: "The River",
      fact: "Rivers start high up in the hills and always flow downhill to the sea.",
    },
    {
      id: "meadow-volcano",
      position: { x: -16.4, z: -7.4 },
      title: "The Volcano",
      fact: "A volcano is a mountain where hot melted rock, called lava, comes up from deep inside the Earth.",
    },
    {
      id: "meadow-lighthouse",
      position: { x: 19.6, z: 6.6 },
      title: "The Lighthouse",
      fact: "A lighthouse shines a bright light at night so ships can see the rocks and stay safe.",
    },
    {
      id: "meadow-village",
      position: { x: -7.6, z: 9 },
      title: "Village Fields",
      fact: "Farmers grow wheat in fields. Wheat is ground into flour to make bread.",
    },
    {
      id: "meadow-bees",
      position: { x: -12.8, z: -1.7 },
      title: "Bees and Flowers",
      fact: "Bees carry pollen from flower to flower. This helps plants make seeds so new plants can grow.",
    },
    {
      id: "meadow-seasons",
      position: { x: 13.8, z: 4.6 },
      title: "The Seasons",
      fact: "There are four seasons: spring, summer, autumn and winter. Days are longest in summer and shortest in winter.",
    },
    {
      id: "meadow-trees",
      position: { x: -4.4, z: -11.5 },
      title: "Deciduous Trees",
      fact: "Deciduous trees, like oaks, lose their leaves in autumn. Evergreen trees, like pines, keep them all year.",
    },
    {
      id: "meadow-compass",
      position: { x: -14.9, z: 5.3 },
      title: "Compass Points",
      fact: "A compass shows North, East, South and West. Remember them in order with Never Eat Shredded Wheat.",
    },
    {
      id: "meadow-minibeasts",
      position: { x: -23.5, z: 4.5 },
      title: "Minibeasts",
      fact: "Minibeasts such as woodlice, worms and beetles live in damp, dark places like under logs and stones.",
    },
    {
      id: "meadow-plant-parts",
      position: { x: 5, z: 14.5 },
      title: "Parts of a Plant",
      fact: "A plant has roots, a stem, leaves and flowers. The roots take in water from the soil.",
    },
    {
      id: "meadow-weather",
      position: { x: 0.5, z: -14 },
      title: "The Weather",
      fact: "Weather changes every day. It can be sunny, rainy, windy, cloudy or snowy, and it changes with the seasons.",
    },
    {
      id: "meadow-evergreen",
      position: { x: -14, z: -5 },
      title: "Evergreen Trees",
      fact: "Evergreen trees, like pine and holly, keep their leaves all year round, even in winter.",
    },
    {
      id: "meadow-farm-animals",
      position: { x: -19.5, z: 3.8 },
      title: "Farm Animals",
      fact: "Cows give us milk, sheep give us wool and hens lay eggs. Farmers look after them every day.",
    },
    {
      id: "meadow-senses",
      position: { x: -22.5, z: -4.5 },
      title: "Our Five Senses",
      fact: "We have five senses: sight, hearing, touch, taste and smell. Which ones can you use right now?",
    },
    {
      id: "meadow-materials",
      position: { x: -5.7, z: 5.9 },
      title: "Materials",
      fact: "Wood, metal, plastic, glass and stone are all materials. Each one is good for different jobs.",
    },
    {
      id: "meadow-baby-animals",
      position: { x: 5.9, z: 5.4 },
      title: "Baby Animals",
      fact: "A baby sheep is a lamb, a baby cow is a calf and a baby horse is a foal.",
    },
    {
      id: "meadow-animal-groups",
      position: { x: 35.2, z: -8.6 },
      title: "Animal Groups",
      fact: "Animals can be sorted into groups: fish, amphibians, reptiles, birds and mammals.",
    },
    {
      id: "meadow-what-animals-eat",
      position: { x: 70.1, z: 7.3 },
      title: "Plant Eaters and Meat Eaters",
      fact: "Herbivores eat plants, carnivores eat meat and omnivores eat both.",
    },
    {
      id: "meadow-our-bodies",
      position: { x: 47.1, z: -16.4 },
      title: "Our Bodies",
      fact: "Your body has a head, neck, shoulders, arms, elbows, hands, legs, knees and feet.",
    },
    {
      id: "meadow-uk-countries",
      position: { x: 44.6, z: 15.5 },
      title: "Countries of the UK",
      fact: "The United Kingdom is made of four countries: England, Scotland, Wales and Northern Ireland.",
    },
    {
      id: "meadow-capital-cities",
      position: { x: -34.5, z: 7.8 },
      title: "Capital Cities",
      fact: "London, Edinburgh, Cardiff and Belfast are the capital cities of the four countries of the UK.",
    },
    {
      id: "meadow-old-toys",
      position: { x: -69.8, z: 8 },
      title: "Toys Long Ago",
      fact: "Long ago, children played with wooden toys, spinning tops and marbles instead of electronic games.",
    },
    {
      id: "meadow-floating",
      position: { x: -45.3, z: -16 },
      title: "Floating and Sinking",
      fact: "Some materials float, like wood and cork. Others sink, like stone and metal.",
    },
    {
      id: "meadow-uk-seas",
      position: { x: -60, z: -15.5 },
      title: "Seas Around the UK",
      fact: "The seas around the UK include the North Sea, the Irish Sea and the English Channel.",
    },
  ],
  hideaways: [
    {
      id: "fox-hollow",
      position: { x: -10, z: -13.6 },
      name: "Fox Hollow",
      discovery:
        "A cosy den under the roots of an old oak. Fresh pawprints lead in and out!",
    },
    {
      id: "picnic-glade",
      position: { x: 8.2, z: 2.5 },
      name: "the Picnic Glade",
      discovery:
        "A sunny clearing with a checked blanket and a basket of apples.",
    },
    {
      id: "badger-sett",
      position: { x: -0.9, z: -3.8 },
      name: "the Badger Sett",
      discovery:
        "Tunnels dug deep into the bank. Badgers sleep here in the day and come out at night.",
    },
    {
      id: "harvest-camp",
      position: { x: -19.8, z: -1 },
      name: "the Harvest Camp",
      discovery:
        "A camp where farmers rest after bringing in the wheat at the end of summer.",
    },
    {
      id: "rabbit-warren",
      position: { x: 22, z: 2 },
      name: "the Rabbit Warren",
      discovery:
        "A maze of burrows dug by rabbits, with lots of ways in and out to stay safe from foxes.",
    },
    {
      id: "birdwatch-hide",
      position: { x: -10.5, z: 0.5 },
      name: "the Birdwatching Hide",
      discovery:
        "A little wooden shelter with a window, where you can watch robins and blackbirds without scaring them.",
    },
    {
      id: "hedgehog-house",
      position: { x: -4.5, z: 10 },
      name: "the Hedgehog House",
      discovery:
        "A cosy pile of leaves and twigs where a hedgehog sleeps through the cold winter months.",
    },
    {
      id: "farm-shed",
      position: { x: -5.5, z: -8.5 },
      name: "the Farm Shed",
      discovery:
        "Buckets, a wheelbarrow and sacks of seeds. Farmers plant seeds in spring and harvest crops in autumn.",
    },
    {
      id: "duck-pond",
      position: { x: 5.5, z: -1.6 },
      name: "the Duck Pond",
      discovery:
        "Ducks paddle in circles here. Their webbed feet push the water like little oars.",
    },
    {
      id: "tree-swing",
      position: { x: -1.4, z: -0.1 },
      name: "the Tree Swing",
      discovery:
        "A rope swing hangs from a big old oak. Someone has carved a heart into the bark.",
    },
    {
      id: "scarecrow-patch",
      position: { x: -8, z: -5.9 },
      name: "the Scarecrow Patch",
      discovery:
        "A smiling scarecrow in a straw hat keeps the crows away from the carrots and cabbages.",
    },
    {
      id: "beehive-corner",
      position: { x: -0.6, z: 8.3 },
      name: "the Beehive Corner",
      discovery:
        "Busy bees buzz in and out of their hives. They turn flower nectar into sweet honey.",
    },
    {
      id: "strawberry-patch",
      position: { x: 58.5, z: 15.5 },
      name: "the Strawberry Patch",
      discovery:
        "Rows of juicy red strawberries, ready for picking in early summer.",
    },
    {
      id: "pond-dipping",
      position: { x: 69.9, z: -7.5 },
      name: "the Pond Dipping Platform",
      discovery:
        "Dip a net in the pond and you might catch tadpoles, water snails or a newt!",
    },
    {
      id: "willow-den",
      position: { x: 55.1, z: 4.6 },
      name: "the Willow Den",
      discovery:
        "A secret den woven from living willow branches. It grows a little bigger every year.",
    },
    {
      id: "owl-box",
      position: { x: 59.1, z: -15.7 },
      name: "the Owl Box",
      discovery:
        "A wooden box high on a tree, where a barn owl raises her owlets.",
    },
    {
      id: "tractor-barn",
      position: { x: -69.8, z: -6.8 },
      name: "the Tractor Barn",
      discovery:
        "A big red tractor lives here. It pulls the plough that gets fields ready for planting.",
    },
    {
      id: "daisy-meadow",
      position: { x: -45.9, z: 15.4 },
      name: "the Daisy Chain Meadow",
      discovery:
        "Thousands of daisies. Pick a few and thread them into a daisy chain crown!",
    },
    {
      id: "mole-hills",
      position: { x: -58.6, z: 16 },
      name: "the Mole Hills",
      discovery:
        "Little piles of soil pushed up by moles digging tunnels underground.",
    },
    {
      id: "old-mill",
      position: { x: -55.1, z: -4.8 },
      name: "the Old Mill",
      discovery:
        "A water wheel turns big millstones that grind wheat into flour.",
    },
  ],
  treasureKind: {
    singular: "Golden Acorn",
    plural: "Golden Acorns",
    colour: "#f5b301",
  },
  treasures: [
    { id: "acorn-mountain", position: { x: 15.6, z: -10.6 } },
    { id: "acorn-volcano", position: { x: -17.4, z: -10.4 } },
    { id: "acorn-islet", position: meadowIslet },
    { id: "acorn-lighthouse", position: { x: 22.4, z: 5.6 } },
    { id: "acorn-lake", position: { x: 11.8, z: -4.4 } },
    { id: "acorn-woods", position: { x: -8, z: -6 } },
    { id: "acorn-beach", position: { x: -20.6, z: 5.6 } },
    { id: "acorn-south", position: { x: 2.4, z: 13.6 } },
    { id: "acorn-9", position: { x: 8.9, z: -14.3 } },
    { id: "acorn-10", position: { x: -23.3, z: -6.6 } },
    { id: "acorn-11", position: { x: -17, z: 11.6 } },
    { id: "acorn-12", position: { x: -3.7, z: 13.7 } },
    { id: "acorn-13", position: { x: 20.8, z: -8 } },
    { id: "acorn-14", position: { x: -0.2, z: 8.8 } },
    { id: "acorn-15", position: { x: 4.7, z: 6.7 } },
    { id: "acorn-16", position: { x: 10.3, z: -9.4 } },
    { id: "acorn-17", position: { x: 4, z: -15 } },
    { id: "acorn-18", position: { x: 4, z: -0.3 } },
    { id: "acorn-19", position: { x: 23.6, z: 0.4 } },
    { id: "acorn-20", position: { x: 16.6, z: -5.9 } },
    { id: "acorn-21", position: { x: -5.5, z: 13 } },
    { id: "acorn-22", position: { x: -6.5, z: 2.5 } },
    { id: "acorn-23", position: { x: 23, z: -1 } },
    { id: "acorn-24", position: { x: -2, z: 0 } },
    { id: "acorn-25", position: { x: 11, z: 1.5 } },
    { id: "acorn-26", position: { x: -12.5, z: 3 } },
    { id: "acorn-27", position: { x: 10, z: 12.5 } },
    { id: "acorn-28", position: { x: -2.5, z: -13 } },
    { id: "acorn-29", position: { x: 7.5, z: 13 } },
    { id: "acorn-30", position: { x: -7.5, z: 2 } },
    { id: "acorn-31", position: { x: 11, z: 3 } },
    { id: "acorn-32", position: { x: 7.5, z: 5.5 } },
    { id: "acorn-33", position: { x: -13, z: 4 } },
    { id: "acorn-34", position: { x: 20.5, z: 4.5 } },
    { id: "acorn-35", position: { x: -6.5, z: 7 } },
    { id: "acorn-36", position: { x: -21.5, z: 2.5 } },
    { id: "acorn-37", position: { x: -21, z: 3.5 } },
    { id: "acorn-38", position: { x: -6.5, z: 3.5 } },
    { id: "acorn-39", position: { x: -6.5, z: 6 } },
    { id: "acorn-40", position: { x: -1, z: 0.5 } },
    { id: "acorn-41", position: { x: 12.8, z: -13.8 } },
    { id: "acorn-42", position: { x: 15.3, z: -2.5 } },
    { id: "acorn-43", position: { x: -14, z: -12.8 } },
    { id: "acorn-44", position: { x: 7.3, z: -4.8 } },
    { id: "acorn-45", position: { x: -19.2, z: -5 } },
    { id: "acorn-46", position: { x: 6.8, z: -11.4 } },
    { id: "acorn-47", position: { x: -13.7, z: 12.2 } },
    { id: "acorn-48", position: { x: 13, z: -7.3 } },
    { id: "acorn-49", position: { x: 1.6, z: -7.4 } },
    { id: "acorn-50", position: { x: -12, z: -7.2 } },
    { id: "acorn-51", position: { x: -14.1, z: -9.5 } },
    { id: "acorn-52", position: { x: 18.4, z: -9.9 } },
    { id: "acorn-53", position: { x: 18.8, z: 1.1 } },
    { id: "acorn-54", position: { x: -8, z: -10.4 } },
    { id: "acorn-55", position: { x: 3.1, z: 9.5 } },
    { id: "acorn-56", position: { x: 2.9, z: 16.5 } },
    { id: "acorn-57", position: { x: 5.3, z: 2.6 } },
    { id: "acorn-58", position: { x: -8.8, z: -2.1 } },
    { id: "acorn-59", position: { x: -8.3, z: 14.8 } },
    { id: "acorn-60", position: { x: 1.2, z: 6 } },
    { id: "acorn-61", position: { x: 66.8, z: -13.9 } },
    { id: "acorn-62", position: { x: 50.9, z: 18.2 } },
    { id: "acorn-63", position: { x: 49.8, z: -6 } },
    { id: "acorn-64", position: { x: 53.2, z: -17.9 } },
    { id: "acorn-65", position: { x: 48.2, z: 6.1 } },
    { id: "acorn-66", position: { x: 37.1, z: 4.9 } },
    { id: "acorn-67", position: { x: 60.9, z: 2.4 } },
    { id: "acorn-68", position: { x: 61.8, z: -3.3 } },
    { id: "acorn-69", position: { x: 42.6, z: -3.4 } },
    { id: "acorn-70", position: { x: 42.6, z: 2.5 } },
    { id: "acorn-71", position: { x: 48.2, z: -11 } },
    { id: "acorn-72", position: { x: 65.4, z: 5.5 } },
    { id: "acorn-73", position: { x: 46.6, z: 10.9 } },
    { id: "acorn-74", position: { x: 52.5, z: 0.3 } },
    { id: "acorn-75", position: { x: 56.6, z: 10.3 } },
    { id: "acorn-76", position: { x: 39.8, z: 14.4 } },
    { id: "acorn-77", position: { x: 57.1, z: -8.3 } },
    { id: "acorn-78", position: { x: 70.8, z: -2.9 } },
    { id: "acorn-79", position: { x: 38.9, z: -6 } },
    { id: "acorn-80", position: { x: 74.2, z: 5 } },
    { id: "acorn-81", position: { x: -38, z: 14.1 } },
    { id: "acorn-82", position: { x: -52.1, z: 17.8 } },
    { id: "acorn-83", position: { x: -53, z: -17.5 } },
    { id: "acorn-84", position: { x: -60.2, z: -0.4 } },
    { id: "acorn-85", position: { x: -48.8, z: 6.3 } },
    { id: "acorn-86", position: { x: -42.8, z: -2.3 } },
    { id: "acorn-87", position: { x: -66.7, z: 12.6 } },
    { id: "acorn-88", position: { x: -62.5, z: 4.3 } },
    { id: "acorn-89", position: { x: -38.2, z: -5.3 } },
    { id: "acorn-90", position: { x: -43.1, z: 3.2 } },
    { id: "acorn-91", position: { x: -47.2, z: -11.2 } },
    { id: "acorn-92", position: { x: -57.4, z: -10.5 } },
    { id: "acorn-93", position: { x: -65.6, z: -4.2 } },
    { id: "acorn-94", position: { x: -56.6, z: 8.8 } },
    { id: "acorn-95", position: { x: -52.5, z: -0.3 } },
    { id: "acorn-96", position: { x: -73.9, z: 5.6 } },
    { id: "acorn-97", position: { x: -38.7, z: 5.2 } },
    { id: "acorn-98", position: { x: -47.1, z: 10.9 } },
    { id: "acorn-99", position: { x: -34, z: 3.1 } },
    { id: "acorn-100", position: { x: -69.9, z: -2.1 } },
    { id: "acorn-east-lake", position: { x: 50.5, z: -5 } },
    { id: "acorn-west-lake", position: { x: -50.5, z: 5.5 } },
    { id: "acorn-east-summit", position: { x: 58, z: -8 } },
    { id: "acorn-west-summit", position: { x: -58, z: 8 } },
  ],
  bouncePads: {
    name: "Bouncy Hay Bale",
    colour: "#e8c35a",
    places: [
      { x: 8.4, z: 10.6 },
      { x: -10.6, z: 13 },
      { x: 1.6, z: -10.6 },
      { x: -5.1, z: 0.4 },
      { x: 13.8, z: 10.9 },
      { x: 4, z: -5.2 },
      { x: -11, z: -4 },
      { x: 17, z: 7 },
      { x: -6.5, z: -13 },
      { x: -11, z: 7.8 },
      { x: 2.3, z: 0.5 },
      { x: -3.2, z: -6.1 },
      { x: 35.8, z: 11.2 },
      { x: 65.9, z: 13.5 },
      { x: 31.4, z: -2.6 },
      { x: 39.6, z: -14 },
      { x: -31.1, z: -0.5 },
      { x: -38.6, z: -13.4 },
      { x: -66.1, z: -12.5 },
      { x: -48.9, z: -5.9 },
    ],
  },
  airfield: meadowAirfield,
  hoverPad: {
    centre: { x: -25.5, z: -6 },
    heading: -0.524,
    slipStart: 1.25,
    slipLevel: 1.28,
  },
  dock: {
    from: { x: -2.5, z: -13.9 },
    to: { x: -3.2, z: -17.8 },
    berthSide: -1,
  },
  friendKind: {
    singular: "Lamb",
    plural: "Lambs",
    look: "lamb",
  },
  friends: [
    {
      id: "lamb-woolly",
      position: { x: -6.1, z: 13.2 },
      name: "Woolly the Lamb",
      greeting:
        "Hello! Sheep grow a woolly coat. Farmers shear it off in summer to make warm jumpers.",
    },
    {
      id: "lamb-clover",
      position: { x: 20.3, z: -5.4 },
      name: "Clover the Lamb",
      greeting:
        "Baa! Lambs are born in spring. We can stand up just a few minutes after we are born.",
    },
    {
      id: "lamb-bramble",
      position: { x: -16.6, z: -2.5 },
      name: "Bramble the Lamb",
      greeting:
        "I munch grass all day long. Sheep are herbivores, which means we only eat plants.",
    },
    {
      id: "lamb-daisy",
      position: { x: -13.5, z: 2.2 },
      name: "Daisy the Lamb",
      greeting:
        "Sheep like to stay together in a group called a flock. It keeps us safe.",
    },
    {
      id: "lamb-pip",
      position: { x: 23.6, z: -1.2 },
      name: "Pip the Lamb",
      greeting:
        "A lamb drinks milk from its mum until it is big enough to eat grass.",
    },
    {
      id: "lamb-bluebell",
      position: { x: 9.4, z: 5.8 },
      name: "Bluebell the Lamb",
      greeting:
        "Every sheep has its own baa, so a mum can find her lamb even in a big flock.",
    },
    {
      id: "watchtower-snowball",
      position: { x: 47.3, z: -0.3 },
      name: "Snowball the Lamb",
      greeting: "A woolly coat keeps sheep warm in winter and cool in summer.",
    },
    {
      id: "watchtower-rosie",
      position: { x: 56.3, z: -3.4 },
      name: "Rosie the Lamb",
      greeting:
        "Sheep can recognise faces, and remember their friends for years!",
    },
    {
      id: "watchtower-hazel",
      position: { x: 74.5, z: -0.1 },
      name: "Hazel the Lamb",
      greeting:
        "A grown-up male sheep is called a ram, and a female sheep is called a ewe.",
    },
    {
      id: "watchtower-biscuit",
      position: { x: -47.7, z: 0.5 },
      name: "Biscuit the Lamb",
      greeting:
        "Sheep have rectangle-shaped pupils, so we can see almost all the way around us.",
    },
    {
      id: "watchtower-marigold",
      position: { x: -55.5, z: 3.5 },
      name: "Marigold the Lamb",
      greeting:
        "A sheepdog helps the farmer move the flock from field to field.",
    },
    {
      id: "watchtower-teasel",
      position: { x: -73.4, z: 0.9 },
      name: "Teasel the Lamb",
      greeting: "Lambs love to run and jump for fun. It's called gambolling!",
    },
  ],
  races: [
    {
      id: "meadow-buttercup-run",
      name: "the Buttercup Run",
      seconds: 135,
      rings: [
        { x: 66.3, z: 0 },
        { x: 61.1, z: 8.3 },
        { x: 51.6, z: 11.2 },
        { x: 42.3, z: 7.8 },
        { x: 37.9, z: -0.7 },
        { x: 43.5, z: -8.8 },
        { x: 53.2, z: -11.3 },
        { x: 62.1, z: -9.1 },
      ],
    },
    {
      id: "meadow-windy-hill-race",
      name: "the Windy Hill Race",
      seconds: 140,
      rings: [
        { x: -37.7, z: 0 },
        { x: -42.9, z: 8.3 },
        { x: -52.4, z: 11.3 },
        { x: -61.6, z: 9.7 },
        { x: -66.1, z: 0.7 },
        { x: -61.7, z: -7.8 },
        { x: -52.4, z: -11.2 },
        { x: -42.9, z: -8.3 },
      ],
    },
  ],
  gravity: earthGravity,
  findHeight: findTerrainHeight,
  findCourseKind: () => undefined,
};

const frostAdventure: IslandAdventure = {
  islandId: "frost-isle",
  start: { x: 1.4, z: 4.4 },
  startHeading: Math.PI,
  trailColour: "#9fb4c8",
  trails: [
    [
      { x: -6, z: 1 },
      { x: -1, z: 2.6 },
      { x: 4, z: 3 },
      { x: 9.3, z: 1 },
    ],
    [
      { x: 14.1, z: 1 },
      { x: 16.4, z: 3.6 },
      { x: 18, z: 6 },
    ],
    [
      { x: 14.1, z: 1 },
      { x: 16, z: -2.4 },
      { x: 19, z: -6 },
    ],
    [
      { x: 4, z: 3 },
      { x: 6, z: 7.4 },
      { x: 7, z: 10 },
    ],
    [
      { x: 7, z: 10 },
      { x: 1, z: 11 },
      { x: -4, z: 10 },
    ],
    [
      { x: -4, z: 10 },
      { x: -10, z: 11 },
      { x: -15, z: 10 },
    ],
    [
      { x: -15, z: 10 },
      { x: -18, z: 6 },
      { x: -18, z: 2 },
    ],
    [
      { x: -18, z: 2 },
      { x: -16, z: -3.6 },
      { x: -13, z: -8 },
    ],
    [
      { x: -13, z: -8 },
      { x: -5, z: -9 },
      { x: 3, z: -8 },
    ],
    [
      { x: 3, z: -8 },
      { x: 3.6, z: -2 },
      { x: 4, z: 3 },
    ],
    [
      { x: -6, z: 1 },
      { x: -12, z: 2 },
      { x: -18, z: 2 },
    ],
    [
      { x: 18, z: 6 },
      { x: 15.6, z: 9.4 },
      { x: 10, z: 10.4 },
      { x: 7, z: 10 },
    ],
    [
      { x: -16, z: -3.6 },
      { x: -23.9, z: -3.5 },
    ],
    [
      { x: 10, z: 10.4 },
      { x: 9.3, z: 9 },
    ],
    [
      { x: 18, z: 6 },
      { x: 22.6, z: 1.4 },
    ],
    [
      { x: 3.6, z: -2 },
      { x: 8.5, z: -5.2 },
    ],
    [
      { x: -23.9, z: -3.5 },
      { x: -20.4, z: -6.6 },
    ],
    [
      { x: 8.5, z: -5.2 },
      { x: 10.7, z: -10 },
    ],
    [
      { x: -5, z: -9 },
      { x: -2.8, z: -5.5 },
    ],
    [
      { x: 1, z: 11 },
      { x: 2.9, z: 11.8 },
    ],
    [
      { x: -12, z: 2 },
      { x: -12.4, z: 3.4 },
    ],
    [
      { x: 0.8, z: -8.3 },
      { x: 1.4, z: -12.9 },
    ],
    [
      { x: -23.9, z: -3.5 },
      { x: -24.3, z: 1.2 },
    ],
    [
      { x: 19, z: -6 },
      { x: 23.7, z: -4.6 },
    ],
    [
      { x: -10.1, z: 11 },
      { x: -10.3, z: 12.2 },
    ],
    [
      { x: 16.5, z: -2.9 },
      { x: 14.7, z: -4.4 },
    ],
    [
      { x: 20.9, z: -5.4 },
      { x: 22, z: -9 },
    ],
    [
      { x: -9.7, z: 1.6 },
      { x: -10, z: -0.2 },
    ],
    [
      { x: -2.2, z: 2.2 },
      { x: -2.4, z: 2.8 },
    ],
    [
      { x: 20.9, z: -5.4 },
      { x: 20.3, z: -2.1 },
    ],
    [
      { x: 66.3, z: 0 },
      { x: 64.4, z: 5.6 },
      { x: 59.2, z: 9.8 },
      { x: 52, z: 11.3 },
      { x: 44.2, z: 10.7 },
      { x: 39.6, z: 5.6 },
      { x: 37.7, z: 0 },
      { x: 39.6, z: -5.6 },
      { x: 44.8, z: -9.8 },
      { x: 52, z: -11.3 },
      { x: 61.1, z: -12.4 },
      { x: 64.4, z: -5.6 },
      { x: 66.3, z: 0 },
    ],
    [
      { x: 20.2, z: -5.6 },
      { x: 20, z: -5 },
      { x: 27.5, z: -5 },
      { x: 38.2, z: -1.4 },
    ],
    [
      { x: 31.8, z: -3.5 },
      { x: 33.3, z: -7.9 },
    ],
    [
      { x: 64.4, z: 5.6 },
      { x: 69.6, z: 8.1 },
    ],
    [
      { x: 39.4, z: 4.9 },
      { x: 33.7, z: 6.8 },
    ],
    [
      { x: 57.4, z: 10.2 },
      { x: 58.6, z: 15.9 },
    ],
    [
      { x: 45.3, z: 10.8 },
      { x: 44.9, z: 16 },
    ],
    [
      { x: 64.6, z: -5.1 },
      { x: 70.1, z: -7 },
    ],
    [
      { x: 48.8, z: -10.6 },
      { x: 47.6, z: -16.3 },
    ],
    [
      { x: 48.8, z: -10.6 },
      { x: 49.7, z: -4.9 },
    ],
    [
      { x: 55.6, z: 10.6 },
      { x: 54.4, z: 4.8 },
    ],
    [
      { x: -37.7, z: 0 },
      { x: -39.6, z: 5.6 },
      { x: -44.8, z: 9.8 },
      { x: -52, z: 11.3 },
      { x: -61.1, z: 12.4 },
      { x: -64.4, z: 5.6 },
      { x: -66.3, z: 0 },
      { x: -64.4, z: -5.6 },
      { x: -59.1, z: -9.8 },
      { x: -52, z: -11.3 },
      { x: -44.2, z: -10.7 },
      { x: -39.6, z: -5.6 },
      { x: -37.7, z: 0 },
    ],
    [
      { x: -20, z: -3.5 },
      { x: -20, z: -1.5 },
      { x: -27.5, z: -1.5 },
      { x: -37.7, z: 0 },
    ],
    [
      { x: -39.6, z: 5.6 },
      { x: -34.6, z: 8.6 },
    ],
    [
      { x: -39.6, z: -5.6 },
      { x: -34.2, z: -8 },
    ],
    [
      { x: -64.4, z: -5.5 },
      { x: -69.9, z: -7.4 },
    ],
    [
      { x: -58.8, z: -9.9 },
      { x: -60, z: -15.7 },
    ],
    [
      { x: -64.4, z: 5.6 },
      { x: -69.6, z: 7.9 },
    ],
    [
      { x: -46.2, z: 10.1 },
      { x: -45, z: 15.9 },
    ],
    [
      { x: -56.1, z: -10.4 },
      { x: -54.9, z: -4.7 },
    ],
    [
      { x: -47.4, z: -10.9 },
      { x: -47, z: -16.5 },
    ],
    [
      { x: -64.1, z: 6.3 },
      { x: -58.8, z: 3.7 },
    ],
  ],
  drawnBridges: [frostIceBridge],
  lookouts: [
    {
      id: "polar-lookout",
      name: "the Polar Lookout",
      position: { x: 19, z: -6 },
      viewHeight: 4.6,
      look: "island-landmark",
    },
    {
      id: "frost-watchtower",
      name: "the Snowy Watchtower",
      position: { x: -9, z: -4.4 },
      viewHeight: 4.2,
      look: "watchtower",
    },
    {
      id: "frost-glacier-tower",
      name: "the Glacier Watchtower",
      position: { x: -7.9, z: 3.9 },
      viewHeight: 4.2,
      look: "watchtower",
    },
    {
      id: "frost-iceberg-tower",
      name: "the Iceberg Watchtower",
      position: { x: -24.5, z: -3.5 },
      viewHeight: 4.2,
      look: "watchtower",
    },
    {
      id: "frost-walrus-tower",
      name: "the Walrus Watchtower",
      position: { x: -24.3, z: 1.2 },
      viewHeight: 4.2,
      look: "watchtower",
    },
    {
      id: "frost-narwhal-tower",
      name: "the Narwhal Watchtower",
      position: { x: 33.3, z: -7.9 },
      viewHeight: 4.2,
      look: "watchtower",
    },
    {
      id: "frost-snowfield-tower",
      name: "the Snowfield Watchtower",
      position: { x: -34.6, z: 8.6 },
      viewHeight: 4.2,
      look: "watchtower",
    },
  ],
  signs: [
    {
      id: "frost-ice",
      position: { x: 9.6, z: -1.6 },
      title: "Frozen Water",
      fact: "Water freezes into ice when it gets colder than 0 degrees Celsius.",
    },
    {
      id: "frost-igloo",
      position: { x: 4.6, z: 8.6 },
      title: "Igloos",
      fact: "Igloos are built from blocks of hard snow. Snow traps air, which keeps the inside warm.",
    },
    {
      id: "frost-aurora",
      position: { x: 1.6, z: -6 },
      title: "The Northern Lights",
      fact: "The Northern Lights are glowing colours in the sky, seen near the North Pole on dark nights.",
    },
    {
      id: "frost-animals",
      position: { x: -14, z: 7.4 },
      title: "Polar Animals",
      fact: "Polar bears live in the Arctic in the north. Penguins live in the Antarctic in the south.",
    },
    {
      id: "frost-melting",
      position: { x: -0.2, z: 12.3 },
      title: "Melting",
      fact: "When ice warms up above 0 degrees Celsius it melts and turns back into liquid water.",
    },
    {
      id: "frost-blubber",
      position: { x: -4.4, z: -8 },
      title: "Blubber",
      fact: "Seals and whales have a thick layer of fat called blubber under their skin to keep them warm in icy water.",
    },
    {
      id: "frost-glaciers",
      position: { x: 7.5, z: 3.2 },
      title: "Glaciers",
      fact: "A glacier is a huge river of ice that moves very slowly downhill, carving out valleys as it goes.",
    },
    {
      id: "frost-poles",
      position: { x: 2.6, z: -1 },
      title: "The Poles",
      fact: "The North and South Poles are the coldest places on Earth because they get the least heat from the Sun.",
    },
    {
      id: "frost-penguins",
      position: { x: 9, z: 8.5 },
      title: "Penguins",
      fact: "Emperor penguin fathers keep their egg warm on their feet for about two months while the mothers find food.",
    },
    {
      id: "frost-snowflakes",
      position: { x: 23, z: 1 },
      title: "Snowflakes",
      fact: "Every snowflake is made of tiny ice crystals, and most snowflakes have six points.",
    },
    {
      id: "frost-continents",
      position: { x: 9, z: -5.5 },
      title: "The Seven Continents",
      fact: "There are seven continents. Antarctica is the coldest, and it is almost all covered in ice.",
    },
    {
      id: "frost-explorers",
      position: { x: -20, z: -7 },
      title: "Polar Explorers",
      fact: "In 1909 Matthew Henson was part of a team that tried to be the first to reach the North Pole.",
    },
    {
      id: "frost-hot-and-cold",
      position: { x: 23.7, z: -4.6 },
      title: "Hot and Cold Places",
      fact: "The hottest places are near the Equator, the imaginary line round the middle of the Earth. The coldest are near the Poles.",
    },
    {
      id: "frost-keeping-warm",
      position: { x: -10.3, z: 12.2 },
      title: "Keeping Warm",
      fact: "Wool, fur and feathers trap warm air next to the body. That is why polar animals have thick coats.",
    },
    {
      id: "frost-endurance",
      position: { x: 14.7, z: -4.4 },
      title: "Ships in the Ice",
      fact: "Ernest Shackleton's ship, the Endurance, was crushed by sea ice in Antarctica in 1915. All of his crew made it home safely.",
    },
    {
      id: "frost-offspring",
      position: { x: 14.9, z: 9.3 },
      title: "Animal Babies",
      fact: "Animals have babies called offspring. A baby penguin is a chick and a baby seal is a pup.",
    },
    {
      id: "frost-five-oceans",
      position: { x: 69.6, z: 8.1 },
      title: "The Five Oceans",
      fact: "The five oceans are the Pacific, Atlantic, Indian, Southern and Arctic Oceans.",
    },
    {
      id: "frost-animal-needs",
      position: { x: 33.7, z: 6.8 },
      title: "What Animals Need",
      fact: "All animals need water, food and air to survive.",
    },
    {
      id: "frost-changing-shape",
      position: { x: 58.6, z: 15.9 },
      title: "Squash, Bend, Twist and Stretch",
      fact: "Some solid objects change shape when you squash, bend, twist or stretch them.",
    },
    {
      id: "frost-seeds-and-bulbs",
      position: { x: 44.9, z: 16 },
      title: "Seeds and Bulbs",
      fact: "Plants grow from seeds and bulbs. They need water, light and warmth to grow well.",
    },
    {
      id: "frost-food-chains",
      position: { x: -34.2, z: -8 },
      title: "Ocean Food Chains",
      fact: "A food chain shows what eats what. In the sea, fish eat krill, and seals eat fish.",
    },
    {
      id: "frost-great-fire",
      position: { x: -69.9, z: -7.4 },
      title: "The Great Fire of London",
      fact: "In 1666 a fire started in a bakery on Pudding Lane and spread across London for four days.",
    },
    {
      id: "frost-staying-healthy",
      position: { x: -60, z: -15.7 },
      title: "Staying Healthy",
      fact: "Exercise, healthy food and washing your hands all help to keep your body healthy.",
    },
    {
      id: "frost-arctic-antarctic",
      position: { x: -69.6, z: 7.9 },
      title: "Arctic and Antarctic",
      fact: "The Arctic is a frozen ocean around the North Pole. Antarctica is a frozen continent around the South Pole.",
    },
  ],
  hideaways: [
    {
      id: "snow-cave",
      position: { x: -21.2, z: 6 },
      name: "the Snow Cave",
      discovery:
        "A hollow carved into a snowdrift. It is quieter and warmer inside than out in the wind.",
    },
    {
      id: "explorers-camp",
      position: { x: -3, z: -1 },
      name: "the Explorers' Camp",
      discovery:
        "Sledges, snowshoes and a map of the ice. Polar explorers set off from here.",
    },
    {
      id: "penguin-huddle",
      position: { x: 8.9, z: 13.7 },
      name: "the Penguin Huddle",
      discovery:
        "A sheltered dip where penguins could huddle together to keep warm.",
    },
    {
      id: "husky-kennels",
      position: { x: -14.2, z: 0.4 },
      name: "the Husky Kennels",
      discovery:
        "A camp where sled dogs rest before pulling sledges across the snow.",
    },
    {
      id: "seal-rock",
      position: { x: 11, z: -10.5 },
      name: "Seal Rock",
      discovery:
        "A flat rock by the sea where seals pull themselves out of the water to rest in the sunshine.",
    },
    {
      id: "ice-hole",
      position: { x: -2.5, z: -5 },
      name: "the Fishing Hole",
      discovery:
        "A round hole cut in the ice. People who live in the Arctic fish through holes like this.",
    },
    {
      id: "arctic-fox-den",
      position: { x: 3.5, z: 12 },
      name: "the Arctic Fox Den",
      discovery:
        "A den dug into the snow. Arctic foxes have white fur in winter so they blend in with the snow.",
    },
    {
      id: "sled-shed",
      position: { x: -12.5, z: 4 },
      name: "the Sled Shed",
      discovery:
        "Wooden sledges and harnesses. Dogs pulled sledges like these across the ice before there were snowmobiles.",
    },
    {
      id: "walrus-beach",
      position: { x: 22, z: -9 },
      name: "the Walrus Beach",
      discovery:
        "Walruses snooze in a big heap. They use their long tusks to pull themselves out of the water.",
    },
    {
      id: "frozen-waterfall",
      position: { x: -10, z: -0.2 },
      name: "the Frozen Waterfall",
      discovery:
        "A whole waterfall frozen solid into icicles taller than a house. It sparkles blue in the sun.",
    },
    {
      id: "snowball-fort",
      position: { x: -2.4, z: 2.8 },
      name: "the Snowball Fort",
      discovery:
        "Snow walls with a pile of snowballs ready to throw. Somebody had a great snowball fight here!",
    },
    {
      id: "reindeer-shelter",
      position: { x: 20.3, z: -2.1 },
      name: "the Reindeer Shelter",
      discovery:
        "Reindeer rest here out of the wind. They dig through the snow with their hooves to find moss to eat.",
    },
    {
      id: "ice-skating-pond",
      position: { x: 70.1, z: -7 },
      name: "the Ice Skating Pond",
      discovery:
        "A frozen pond as smooth as glass, perfect for gliding and spinning on skates.",
    },
    {
      id: "snow-angel-field",
      position: { x: 47.6, z: -16.3 },
      name: "the Snow Angel Field",
      discovery:
        "Lie down in the deep snow and wave your arms and legs to make a snow angel.",
    },
    {
      id: "ice-hotel",
      position: { x: 49.7, z: -4.9 },
      name: "the Ice Hotel",
      discovery:
        "A hotel carved from ice, with ice beds covered in warm reindeer skins.",
    },
    {
      id: "frozen-shipwreck",
      position: { x: 54.4, z: 4.8 },
      name: "the Frozen Shipwreck",
      discovery:
        "An old wooden ship trapped in the ice long ago. Its mast still points at the sky.",
    },
    {
      id: "polar-bear-den",
      position: { x: -45, z: 15.9 },
      name: "the Polar Bear Den",
      discovery:
        "A snow den where a mother polar bear keeps her cubs warm through the winter.",
    },
    {
      id: "snowflake-workshop",
      position: { x: -54.9, z: -4.7 },
      name: "the Snowflake Workshop",
      discovery:
        "Magnifying glasses show that every snowflake has six sides and its own pattern.",
    },
    {
      id: "ice-fishing-hut",
      position: { x: -47, z: -16.5 },
      name: "the Ice Fishing Hut",
      discovery:
        "A little hut over a hole in the ice, where people fish for Arctic char.",
    },
    {
      id: "arctic-hare-hollow",
      position: { x: -58.8, z: 3.7 },
      name: "the Arctic Hare Hollow",
      discovery:
        "Arctic hares turn white in winter so foxes can't spot them against the snow.",
    },
  ],
  treasureKind: {
    singular: "Snow Crystal",
    plural: "Snow Crystals",
    colour: "#7dd3fc",
  },
  treasures: [
    { id: "crystal-peak", position: { x: -15, z: -12 } },
    { id: "crystal-islet", position: frostIslet },
    { id: "crystal-east-peak", position: { x: 19, z: -12.6 } },
    { id: "crystal-channel", position: { x: 12.4, z: 8 } },
    { id: "crystal-grotto", position: { x: -20.6, z: -1.6 } },
    { id: "crystal-fort", position: { x: 21, z: 3.4 } },
    { id: "crystal-ridge", position: { x: 6, z: -13.4 } },
    { id: "crystal-shore", position: { x: -8, z: 12.4 } },
    { id: "crystal-9", position: { x: -22.6, z: -8 } },
    { id: "crystal-10", position: { x: -0.9, z: -13.6 } },
    { id: "crystal-11", position: { x: 12.4, z: -15 } },
    { id: "crystal-12", position: { x: 10.3, z: -8 } },
    { id: "crystal-13", position: { x: 23.6, z: -2.4 } },
    { id: "crystal-14", position: { x: -18.4, z: 10.2 } },
    { id: "crystal-15", position: { x: 22.9, z: -9.4 } },
    { id: "crystal-16", position: { x: -24, z: 1.8 } },
    { id: "crystal-17", position: { x: 4, z: 14.4 } },
    { id: "crystal-18", position: { x: 6.1, z: -5.2 } },
    { id: "crystal-19", position: { x: 14.5, z: -3.8 } },
    { id: "crystal-20", position: { x: -5.8, z: -14.3 } },
    { id: "crystal-21", position: { x: -11, z: -1 } },
    { id: "crystal-22", position: { x: -12.5, z: -2.5 } },
    { id: "crystal-23", position: { x: 20, z: -0.5 } },
    { id: "crystal-24", position: { x: 15, z: -2 } },
    { id: "crystal-25", position: { x: -23, z: 0 } },
    { id: "crystal-26", position: { x: -23.5, z: 3.5 } },
    { id: "crystal-27", position: { x: -14.5, z: -3 } },
    { id: "crystal-28", position: { x: 7, z: 11 } },
    { id: "crystal-29", position: { x: 19.5, z: 1 } },
    { id: "crystal-30", position: { x: 9.5, z: 5 } },
    { id: "crystal-31", position: { x: -1.5, z: 3.5 } },
    { id: "crystal-32", position: { x: -1, z: 2 } },
    { id: "crystal-33", position: { x: 12, z: -13.5 } },
    { id: "crystal-34", position: { x: -5.5, z: -5.5 } },
    { id: "crystal-35", position: { x: 8.5, z: -8.5 } },
    { id: "crystal-36", position: { x: -9.5, z: 12 } },
    { id: "crystal-37", position: { x: -11, z: 0.5 } },
    { id: "crystal-38", position: { x: -5.5, z: -4 } },
    { id: "crystal-39", position: { x: 6, z: 14.5 } },
    { id: "crystal-40", position: { x: 8.5, z: 5.5 } },
    { id: "crystal-41", position: { x: 12.3, z: 12.1 } },
    { id: "crystal-42", position: { x: -19.7, z: -11 } },
    { id: "crystal-43", position: { x: 16.5, z: -15.2 } },
    { id: "crystal-44", position: { x: -11.8, z: -14.1 } },
    { id: "crystal-45", position: { x: -16.5, z: -8.8 } },
    { id: "crystal-46", position: { x: -8.4, z: -8.1 } },
    { id: "crystal-47", position: { x: -3.6, z: 13.8 } },
    { id: "crystal-48", position: { x: 15.1, z: -11.7 } },
    { id: "crystal-49", position: { x: 8.6, z: -15.2 } },
    { id: "crystal-50", position: { x: 18.5, z: -9.5 } },
    { id: "crystal-51", position: { x: -3.7, z: -11.8 } },
    { id: "crystal-52", position: { x: -16.9, z: -1.2 } },
    { id: "crystal-53", position: { x: 18.2, z: 9 } },
    { id: "crystal-54", position: { x: 4.5, z: -10.7 } },
    { id: "crystal-55", position: { x: 6.1, z: 0.5 } },
    { id: "crystal-56", position: { x: 2, z: 5.6 } },
    { id: "crystal-57", position: { x: -13.3, z: 12.4 } },
    { id: "crystal-58", position: { x: -6.5, z: -10.6 } },
    { id: "crystal-59", position: { x: -20.9, z: 2 } },
    { id: "crystal-60", position: { x: -7.3, z: 9.4 } },
    { id: "crystal-61", position: { x: 52.3, z: 18.2 } },
    { id: "crystal-62", position: { x: 38.3, z: 13.8 } },
    { id: "crystal-63", position: { x: 66.6, z: -13.7 } },
    { id: "crystal-64", position: { x: 43.5, z: -2.6 } },
    { id: "crystal-65", position: { x: 53, z: -18 } },
    { id: "crystal-66", position: { x: 57.1, z: -7 } },
    { id: "crystal-67", position: { x: 38.9, z: -7 } },
    { id: "crystal-68", position: { x: 52.3, z: -0.3 } },
    { id: "crystal-69", position: { x: 74, z: -3.5 } },
    { id: "crystal-70", position: { x: 63.7, z: -4.5 } },
    { id: "crystal-71", position: { x: 41.5, z: 2.9 } },
    { id: "crystal-72", position: { x: 61.2, z: 3.1 } },
    { id: "crystal-73", position: { x: 47.3, z: 7.7 } },
    { id: "crystal-74", position: { x: 56.5, z: 11 } },
    { id: "crystal-75", position: { x: 48.8, z: -10.1 } },
    { id: "crystal-76", position: { x: 65.6, z: 4.8 } },
    { id: "crystal-77", position: { x: 36.4, z: 3.3 } },
    { id: "crystal-78", position: { x: 34.2, z: -3.5 } },
    { id: "crystal-79", position: { x: 70.1, z: 3.3 } },
    { id: "crystal-80", position: { x: 43.8, z: -13.9 } },
    { id: "crystal-81", position: { x: -38.4, z: 14 } },
    { id: "crystal-82", position: { x: -53.8, z: -17.6 } },
    { id: "crystal-83", position: { x: -51.2, z: 17.6 } },
    { id: "crystal-84", position: { x: -48.7, z: -5.7 } },
    { id: "crystal-85", position: { x: -60.6, z: -1.9 } },
    { id: "crystal-86", position: { x: -42.4, z: -2.9 } },
    { id: "crystal-87", position: { x: -67, z: 12.8 } },
    { id: "crystal-88", position: { x: -73.8, z: 4.7 } },
    { id: "crystal-89", position: { x: -42.3, z: 2.7 } },
    { id: "crystal-90", position: { x: -48.3, z: 8.3 } },
    { id: "crystal-91", position: { x: -57.7, z: -10.9 } },
    { id: "crystal-92", position: { x: -64.8, z: 6.1 } },
    { id: "crystal-93", position: { x: -32.1, z: -3.4 } },
    { id: "crystal-94", position: { x: -65.6, z: -4.5 } },
    { id: "crystal-95", position: { x: -57.3, z: 8.6 } },
    { id: "crystal-96", position: { x: -55.3, z: 0.2 } },
    { id: "crystal-97", position: { x: -47.2, z: -10.9 } },
    { id: "crystal-98", position: { x: -62.8, z: 15.6 } },
    { id: "crystal-99", position: { x: -38.1, z: 4.8 } },
    { id: "crystal-100", position: { x: -38.4, z: -6.2 } },
    { id: "crystal-east-lake", position: { x: 53, z: -0.5 } },
    { id: "crystal-west-lake", position: { x: -49, z: -5 } },
    { id: "crystal-east-summit", position: { x: 58, z: -8 } },
    { id: "crystal-west-summit", position: { x: -58, z: 8 } },
  ],
  bouncePads: {
    name: "Snow Trampoline",
    colour: "#e0f2fe",
    places: [
      { x: -1, z: 6.4 },
      { x: -11.6, z: -5.4 },
      { x: 17, z: 0 },
      { x: -9.3, z: -11.5 },
      { x: -17, z: -4.5 },
      { x: 14.5, z: 3.9 },
      { x: 6, z: -2.5 },
      { x: 1.5, z: 8.5 },
      { x: -20, z: -3.5 },
      { x: -6.8, z: 12.3 },
      { x: -5.8, z: 6.9 },
      { x: 6.5, z: -8 },
      { x: 65.3, z: 13.9 },
      { x: 31.1, z: -0.1 },
      { x: 39.3, z: -13.9 },
      { x: 58.7, z: -15.3 },
      { x: -38.3, z: -13.8 },
      { x: -31.2, z: 1.6 },
      { x: -52.2, z: 4.5 },
      { x: -65.8, z: -12.7 },
    ],
  },
  airfield: frostAirfield,
  hoverPad: {
    centre: { x: 27.5, z: -6.5 },
    heading: 0,
    slipStart: 1,
    slipLevel: 0.66,
  },
  dock: {
    from: { x: 1.4, z: -12.9 },
    to: { x: 1.7, z: -16.8 },
    berthSide: 1,
  },
  friendKind: {
    singular: "Penguin",
    plural: "Penguins",
    look: "penguin",
  },
  friends: [
    {
      id: "penguin-pebble",
      position: { x: -16.7, z: 16.2 },
      name: "Pebble the Penguin",
      greeting:
        "Hello! Penguins are birds, but we can't fly. We use our wings as flippers to swim.",
    },
    {
      id: "penguin-flipper",
      position: { x: 15.6, z: -8.1 },
      name: "Flipper the Penguin",
      greeting:
        "I swim very fast under the water to catch fish and krill to eat.",
    },
    {
      id: "penguin-waddles",
      position: { x: -18.6, z: 8.8 },
      name: "Waddles the Penguin",
      greeting:
        "On the ice we waddle, or slide along on our tummies. That is called tobogganing!",
    },
    {
      id: "penguin-frosty",
      position: { x: 21.5, z: 4.4 },
      name: "Frosty the Penguin",
      greeting:
        "Emperor penguin dads keep their egg warm on their feet all through the dark winter.",
    },
    {
      id: "penguin-sleet",
      position: { x: -0.4, z: -9.1 },
      name: "Sleet the Penguin",
      greeting:
        "My black back is hard to see from above, and my white tummy is hard to see from below. It keeps me safe in the sea.",
    },
    {
      id: "penguin-snowdrop",
      position: { x: -17.2, z: 5.5 },
      name: "Snowdrop the Penguin",
      greeting:
        "When a blizzard blows, penguins huddle together in a big group to share our warmth.",
    },
    {
      id: "watchtower-iceberg",
      position: { x: 74.4, z: 1.8 },
      name: "Iceberg the Penguin",
      greeting:
        "Penguins can drink seawater. A special gland above our eyes gets rid of the salt.",
    },
    {
      id: "watchtower-blizzard",
      position: { x: 46.8, z: 2.3 },
      name: "Blizzard the Penguin",
      greeting: "Emperor penguins can dive more than 500 metres deep!",
    },
    {
      id: "watchtower-puddle",
      position: { x: 58.6, z: -1.5 },
      name: "Puddle the Penguin",
      greeting:
        "Penguin chicks have fluffy grey down. Waterproof feathers grow later.",
    },
    {
      id: "watchtower-tux",
      position: { x: -47.1, z: 0.3 },
      name: "Tux the Penguin",
      greeting:
        "Little penguins are only about 30 centimetres tall, the smallest penguins of all.",
    },
    {
      id: "watchtower-nippy",
      position: { x: -73.2, z: -0.6 },
      name: "Nippy the Penguin",
      greeting:
        "Some penguins build nests from pebbles. A shiny pebble makes a great gift!",
    },
    {
      id: "watchtower-glacier",
      position: { x: -57.7, z: 16 },
      name: "Glacier the Penguin",
      greeting:
        "Penguins live in the southern half of the world, never at the North Pole.",
    },
  ],
  races: [
    {
      id: "frost-snowshoe-sprint",
      name: "the Snowshoe Sprint",
      seconds: 140,
      rings: [
        { x: 66.3, z: 0 },
        { x: 60.9, z: 8.4 },
        { x: 51.2, z: 11.2 },
        { x: 41.9, z: 8.2 },
        { x: 38, z: -1 },
        { x: 43.9, z: -9.1 },
        { x: 53.8, z: -11.5 },
        { x: 62.4, z: -9.6 },
      ],
    },
    {
      id: "frost-icicle-dash",
      name: "the Icicle Dash",
      seconds: 140,
      rings: [
        { x: -37.7, z: 0 },
        { x: -43.1, z: 8.4 },
        { x: -52.8, z: 11.4 },
        { x: -62, z: 10.6 },
        { x: -66, z: 1 },
        { x: -61.7, z: -7.7 },
        { x: -52.2, z: -11.3 },
        { x: -42.6, z: -8.9 },
      ],
    },
  ],
  gravity: earthGravity,
  findHeight: frostIsle.findHeight,
  findCourseKind: findCourseKindIn(frostIsle),
};

const sandsAdventure: IslandAdventure = {
  islandId: "sunscorch-sands",
  start: { x: -2.6, z: 5.6 },
  startHeading: Math.PI,
  trailColour: "#b07b46",
  trails: [
    caravanTrail,
    [
      { x: -6, z: 9 },
      { x: -2, z: 5 },
      { x: 2, z: 2 },
    ],
    [
      { x: -17, z: 4 },
      { x: -11, z: 7.4 },
      { x: -6, z: 9 },
    ],
    [
      { x: -6, z: -5 },
      { x: -6, z: -7 },
      { x: -11, z: -7.6 },
      { x: -16, z: -7 },
    ],
    [{ x: -16, z: -7 }, { x: -13, z: -10.4 }, desertRuinsCentre],
    [
      { x: -6, z: -7 },
      { x: 0, z: -8.6 },
      { x: 6, z: -8 },
    ],
    [
      { x: 6, z: -8 },
      { x: 11, z: -9 },
      { x: 14, z: -10.4 },
    ],
    [
      { x: 14, z: -10.4 },
      { x: 17.4, z: -7.6 },
      { x: 19, z: -4 },
    ],
    [{ x: 12, z: 3.4 }, marketTownCentre],
    [
      { x: 19, z: -4 },
      { x: 18, z: 0 },
      { x: 16, z: 3.6 },
    ],
    [
      { x: -13, z: -10.4 },
      { x: -14.7, z: -14 },
    ],
    [
      { x: -24, z: 1 },
      { x: -23.1, z: -4.4 },
    ],
    [
      { x: 12, z: 3.4 },
      { x: 9.9, z: 0.5 },
    ],
    [
      { x: 23, z: 4 },
      { x: 22.1, z: 3.7 },
    ],
    [
      { x: 13, z: 6 },
      { x: 17.6, z: 10.6 },
    ],
    [
      { x: -11, z: -12 },
      { x: -9.6, z: -12.4 },
    ],
    [
      { x: 13, z: 6 },
      { x: 6.5, z: 9.2 },
    ],
    [
      { x: 6.5, z: 9.2 },
      { x: 2.1, z: 9.9 },
    ],
    [
      { x: -12, z: -2 },
      { x: -11.8, z: -1.5 },
    ],
    [
      { x: -9.6, z: -12.4 },
      { x: -9.2, z: -15.3 },
    ],
    [
      { x: 15.4, z: 8.4 },
      { x: 12.1, z: 11.7 },
    ],
    [
      { x: -2, z: 5 },
      { x: -2.7, z: 4.1 },
    ],
    [
      { x: 18.7, z: -2.9 },
      { x: 23.8, z: -1.6 },
    ],
    [
      { x: -14.4, z: -13.4 },
      { x: -18.5, z: -11.5 },
    ],
    [
      { x: -13.3, z: 6.1 },
      { x: -14.6, z: 8.4 },
    ],
    [
      { x: 1.4, z: -1.5 },
      { x: 3.2, z: -2.8 },
    ],
    [
      { x: -4.3, z: 7.4 },
      { x: -6.9, z: 4.8 },
    ],
    [
      { x: 17.9, z: -6.5 },
      { x: 15.3, z: -5.4 },
    ],
    [
      { x: 66.3, z: 0 },
      { x: 64.4, z: 5.6 },
      { x: 59.2, z: 9.8 },
      { x: 52, z: 11.3 },
      { x: 44.9, z: 9.8 },
      { x: 39.6, z: 5.6 },
      { x: 37.7, z: 0 },
      { x: 39.6, z: -5.6 },
      { x: 44.8, z: -9.8 },
      { x: 52, z: -11.3 },
      { x: 59.8, z: -10.7 },
      { x: 64.4, z: -5.6 },
      { x: 66.3, z: 0 },
    ],
    [
      { x: 18.1, z: -0.5 },
      { x: 20, z: 0 },
      { x: 27.5, z: 0 },
      { x: 37.7, z: 0 },
    ],
    [
      { x: 31.1, z: 0 },
      { x: 31.1, z: 5.8 },
    ],
    [
      { x: 39.6, z: -5.6 },
      { x: 34.4, z: -8.1 },
    ],
    [
      { x: 64.4, z: -5.6 },
      { x: 69.9, z: -7.7 },
    ],
    [
      { x: 64.4, z: 5.6 },
      { x: 69.7, z: 8.2 },
    ],
    [
      { x: 57.2, z: 10.2 },
      { x: 58.4, z: 16 },
    ],
    [
      { x: 46.1, z: 10.1 },
      { x: 44.9, z: 15.8 },
    ],
    [
      { x: 47.3, z: -10.3 },
      { x: 46.1, z: -16.1 },
    ],
    [
      { x: 58.3, z: -10.8 },
      { x: 58.7, z: -15.6 },
    ],
    [
      { x: 56.2, z: 10.4 },
      { x: 55, z: 4.6 },
    ],
    [
      { x: -37.7, z: 0 },
      { x: -39.6, z: 5.6 },
      { x: -44.8, z: 9.8 },
      { x: -52, z: 11.3 },
      { x: -59.8, z: 10.7 },
      { x: -64.4, z: 5.6 },
      { x: -66.3, z: 0 },
      { x: -64.4, z: -5.6 },
      { x: -59.1, z: -9.8 },
      { x: -52, z: -11.3 },
      { x: -44.8, z: -9.8 },
      { x: -39.6, z: -5.6 },
      { x: -37.7, z: 0 },
    ],
    [
      { x: -19.3, z: -0.2 },
      { x: -20, z: -3 },
      { x: -27.5, z: -3 },
      { x: -37.7, z: 0 },
    ],
    [
      { x: -64.4, z: -5.5 },
      { x: -70.1, z: -7.4 },
    ],
    [
      { x: -31.5, z: -1.8 },
      { x: -33, z: -7.1 },
    ],
    [
      { x: -39.6, z: 5.6 },
      { x: -34.5, z: 8.7 },
    ],
    [
      { x: -57.7, z: -10.1 },
      { x: -58.9, z: -15.9 },
    ],
    [
      { x: -46.3, z: 10.1 },
      { x: -45.1, z: 15.9 },
    ],
    [
      { x: -64.4, z: 5.6 },
      { x: -69.5, z: 8.2 },
    ],
    [
      { x: -46.2, z: -10.1 },
      { x: -45, z: -15.8 },
    ],
    [
      { x: -57.5, z: 10.9 },
      { x: -57.9, z: 15.7 },
    ],
    [
      { x: -56, z: -10.5 },
      { x: -54.8, z: -4.7 },
    ],
  ],
  drawnBridges: [],
  lookouts: [
    {
      id: "stepped-pyramid",
      name: "the Stepped Pyramid",
      position: { x: -16, z: -7 },
      viewHeight: 4.6,
      look: "island-landmark",
    },
    {
      id: "mesa-watchtower",
      name: "the Mesa Watchtower",
      position: { x: mesaPosition.x, z: mesaPosition.z + 0.6 },
      viewHeight: 4,
      look: "watchtower",
    },
    {
      id: "sands-dune-tower",
      name: "the Dune Watchtower",
      position: { x: 4, z: -10.8 },
      viewHeight: 4.2,
      look: "watchtower",
    },
    {
      id: "dune-watchtower",
      name: "the Dune Watchtower",
      position: { x: -15, z: -14.5 },
      viewHeight: 4.2,
      look: "watchtower",
    },
    {
      id: "sands-sunrise-tower",
      name: "the Sunrise Watchtower",
      position: { x: 12.1, z: 11.7 },
      viewHeight: 4.2,
      look: "watchtower",
    },
    {
      id: "sands-mirage-tower",
      name: "the Mirage Watchtower",
      position: { x: 31.1, z: 5.8 },
      viewHeight: 4.2,
      look: "watchtower",
    },
    {
      id: "sands-sphinx-tower",
      name: "the Sphinx Watchtower",
      position: { x: -70.1, z: -7.4 },
      viewHeight: 4.2,
      look: "watchtower",
    },
  ],
  signs: [
    {
      id: "sands-oasis",
      position: { x: 3.4, z: 6.8 },
      title: "The Oasis",
      fact: "An oasis is a place in the desert where water comes up from under the ground, so plants can grow.",
    },
    {
      id: "sands-camels",
      position: { x: -9, z: -3.6 },
      title: "Camels",
      fact: "Camels store fat in their humps. It helps them travel a long way without food.",
    },
    {
      id: "sands-pyramid",
      position: { x: -13, z: -4.8 },
      title: "Pyramids",
      fact: "The ancient Egyptians built pyramids more than 4,000 years ago, using huge blocks of stone.",
    },
    {
      id: "sands-market",
      position: { x: 9.6, z: 5.4 },
      title: "Trading",
      fact: "Long ago, traders crossed deserts in caravans to swap spices, salt and silk.",
    },
    {
      id: "sands-deserts",
      position: { x: -24, z: 2.5 },
      title: "Deserts",
      fact: "A desert is a place that gets very little rain. Some deserts are hot, but Antarctica is a cold desert!",
    },
    {
      id: "sands-dunes",
      position: { x: -10, z: 9.5 },
      title: "Sand Dunes",
      fact: "Wind blows sand into hills called dunes. Dunes slowly move across the desert as the wind keeps blowing.",
    },
    {
      id: "sands-egypt",
      position: { x: 9.6, z: -10.1 },
      title: "Ancient Egypt",
      fact: "The Ancient Egyptians lived beside the River Nile and wrote with picture symbols called hieroglyphs.",
    },
    {
      id: "sands-cactus",
      position: { x: -9.3, z: -8.7 },
      title: "Cactus Plants",
      fact: "A cactus stores water in its thick stem, and its sharp spines stop animals from eating it.",
    },
    {
      id: "sands-hieroglyphs",
      position: { x: -23, z: -5 },
      title: "Hieroglyphs",
      fact: "The ancient Egyptians wrote with hieroglyphs, little pictures that each stood for a sound or an idea.",
    },
    {
      id: "sands-nile",
      position: { x: 9.5, z: 0 },
      title: "The River Nile",
      fact: "The River Nile flooded every year and left rich soil behind, so the ancient Egyptians could grow crops.",
    },
    {
      id: "sands-sun-safety",
      position: { x: 21.5, z: 3.5 },
      title: "Sun Safety",
      fact: "Light from the Sun can damage your eyes, so never look straight at it, even through sunglasses.",
    },
    {
      id: "sands-magnets",
      position: { x: 18, z: 11 },
      title: "Magnets",
      fact: "A compass needle is a magnet. It points north, which helps travellers find their way across the desert.",
    },
    {
      id: "sands-skeletons",
      position: { x: -2.7, z: 4.1 },
      title: "Skeletons",
      fact: "Your skeleton has over 200 bones. It holds you up, helps you move and protects the soft parts inside you.",
    },
    {
      id: "sands-mummies",
      position: { x: 23.8, z: -1.6 },
      title: "Mummies",
      fact: "The Ancient Egyptians made mummies to keep a body safe for the afterlife. They wrapped it in long strips of linen.",
    },
    {
      id: "sands-sundials",
      position: { x: -18.5, z: -11.5 },
      title: "Sundials",
      fact: "A sundial tells the time with a shadow. As the Sun moves across the sky, the shadow moves round the dial.",
    },
    {
      id: "sands-soil",
      position: { x: -14.6, z: 8.4 },
      title: "Soil",
      fact: "Soil is made of tiny bits of rock mixed with rotted plants and animals. Plants grow their roots in it.",
    },
    {
      id: "sands-push-and-pull",
      position: { x: 34.4, z: -8.1 },
      title: "Pushes and Pulls",
      fact: "Forces are pushes and pulls. They can make things start moving, speed up, slow down or stop.",
    },
    {
      id: "sands-reflections",
      position: { x: 69.9, z: -7.7 },
      title: "Reflections",
      fact: "Light bounces off shiny surfaces like mirrors and still water. That is called a reflection.",
    },
    {
      id: "sands-healthy-eating",
      position: { x: 69.7, z: 8.2 },
      title: "Healthy Eating",
      fact: "We need the right amounts of different foods to stay healthy, like fruit, vegetables, protein and carbohydrates.",
    },
    {
      id: "sands-plants-drink",
      position: { x: 58.4, z: 16 },
      title: "How Plants Drink",
      fact: "Water travels up from a plant's roots, through its stem, to its leaves and flowers.",
    },
    {
      id: "sands-stone-age",
      position: { x: -33, z: -7.1 },
      title: "The Stone Age",
      fact: "In the Stone Age, people made tools from stone, bone and wood, and hunted animals for food.",
    },
    {
      id: "sands-papyrus",
      position: { x: -34.5, z: 8.7 },
      title: "Papyrus",
      fact: "The Ancient Egyptians made paper called papyrus from reeds that grew beside the Nile.",
    },
    {
      id: "sands-rocks",
      position: { x: -58.9, z: -15.9 },
      title: "Rocks",
      fact: "Some rocks are hard and some are soft. Sandstone is made from grains of sand pressed together.",
    },
    {
      id: "sands-desert-animals",
      position: { x: -45.1, z: 15.9 },
      title: "Desert Animals",
      fact: "Fennec foxes have huge ears that let heat escape, to keep cool in the desert.",
    },
  ],
  hideaways: [
    {
      id: "nomad-tent",
      position: { x: -4.4, z: -10.1 },
      name: "the Nomad Tent",
      discovery:
        "A tent of woven goat hair. Desert travellers carry their homes with them.",
    },
    {
      id: "hidden-well",
      position: { x: 14.5, z: -1 },
      name: "the Hidden Well",
      discovery:
        "A deep stone well. People dig down to find water hiding under the sand.",
    },
    {
      id: "scarab-shelter",
      position: { x: 7.5, z: -4.5 },
      name: "the Scarab Shelter",
      discovery: "Shady rocks where beetles hide from the midday heat.",
    },
    {
      id: "caravan-rest",
      position: { x: -10.7, z: 3.2 },
      name: "the Caravan Rest",
      discovery:
        "Saddles and water jugs left by traders crossing the dunes with their camels.",
    },
    {
      id: "scribes-tent",
      position: { x: -9, z: -12.5 },
      name: "the Scribe's Tent",
      discovery:
        "Reed pens, ink and a roll of papyrus. Scribes were the people who could read and write hieroglyphs.",
    },
    {
      id: "scorpion-hollow",
      position: { x: 6, z: 9.5 },
      name: "Scorpion Hollow",
      discovery:
        "A shady hollow under a rock, where desert creatures hide from the heat of the day.",
    },
    {
      id: "date-palm-grove",
      position: { x: 1.5, z: 10 },
      name: "the Date Palm Grove",
      discovery:
        "Sweet dates hang from these palms. Date palms grow where there is water under the sand.",
    },
    {
      id: "star-map-camp",
      position: { x: -11.5, z: -1 },
      name: "the Star Map Camp",
      discovery:
        "A camp where desert travellers once used the stars to find their way at night.",
    },
    {
      id: "pharaohs-tomb",
      position: { x: -13.2, z: -10.6 },
      name: "the Pharaoh's Tomb",
      discovery:
        "A secret doorway into a tomb painted with gods, animals and rows of hieroglyphs.",
    },
    {
      id: "spice-stall",
      position: { x: 3.2, z: -2.8 },
      name: "the Spice Stall",
      discovery:
        "Sacks of cinnamon, cumin and saffron. Traders carried spices across the desert by camel.",
    },
    {
      id: "shady-rock",
      position: { x: -6.9, z: 4.8 },
      name: "the Shady Rock",
      discovery:
        "A cool spot in the shadow of a giant rock, where lizards hide from the midday heat.",
    },
    {
      id: "weavers-tent",
      position: { x: 15.3, z: -5.4 },
      name: "the Carpet Weaver's Tent",
      discovery:
        "A loom with a half-woven carpet of red and gold. Each carpet takes many months to make.",
    },
    {
      id: "sphinx-hollow",
      position: { x: 44.9, z: 15.8 },
      name: "the Sphinx Hollow",
      discovery:
        "A stone lion with a pharaoh's face guards this hollow, just like the Great Sphinx in Egypt.",
    },
    {
      id: "pottery-kiln",
      position: { x: 46.1, z: -16.1 },
      name: "the Pottery Kiln",
      discovery:
        "Clay pots bake hard in this hot kiln. Potters painted them with red and black patterns.",
    },
    {
      id: "sand-sledging",
      position: { x: 58.7, z: -15.6 },
      name: "the Sand Sledging Slope",
      discovery: "A steep dune with a wooden sledge at the top. Whoosh!",
    },
    {
      id: "fennec-burrow",
      position: { x: 55, z: 4.6 },
      name: "the Fennec Fox Burrow",
      discovery:
        "Fennec foxes dig cool burrows under the sand to rest in during the hot day.",
    },
    {
      id: "caravanserai",
      position: { x: -69.5, z: 8.2 },
      name: "the Caravanserai",
      discovery:
        "A courtyard inn where traders rested their camels after a long day crossing the desert.",
    },
    {
      id: "temple-door",
      position: { x: -45, z: -15.8 },
      name: "the Hidden Temple Door",
      discovery:
        "A carved stone door half buried in the sand. Who knows what's inside?",
    },
    {
      id: "date-market",
      position: { x: -57.9, z: 15.7 },
      name: "the Date Market",
      discovery: "Stalls piled high with sweet dates, figs and pomegranates.",
    },
    {
      id: "mirage-pool",
      position: { x: -54.8, z: -4.7 },
      name: "the Mirage Pool",
      discovery:
        "Is it water? In hot deserts, the air can bend light to make pools that aren't really there.",
    },
  ],
  treasureKind: {
    singular: "Sun Coin",
    plural: "Sun Coins",
    colour: "#fbbf24",
  },
  treasures: [
    { id: "coin-mesa", position: { x: 15.8, z: -9.4 } },
    { id: "coin-islet", position: sandsIslet },
    { id: "coin-ruins", position: { x: -11.6, z: -13.6 } },
    { id: "coin-oasis", position: { x: 7.8, z: 3.2 } },
    { id: "coin-dunes", position: { x: -20.4, z: -2 } },
    { id: "coin-east", position: { x: 22.6, z: 0.6 } },
    { id: "coin-south", position: { x: 9, z: 10.6 } },
    { id: "coin-west-dune", position: { x: -15.4, z: 8.4 } },
    { id: "coin-9", position: { x: -18.4, z: -13.6 } },
    { id: "coin-10", position: { x: 15.2, z: 12.3 } },
    { id: "coin-11", position: { x: -0.9, z: 11.6 } },
    { id: "coin-12", position: { x: -5.8, z: 1.1 } },
    { id: "coin-13", position: { x: 23.6, z: 6 } },
    { id: "coin-14", position: { x: -21.2, z: -8 } },
    { id: "coin-15", position: { x: -19.8, z: 6 } },
    { id: "coin-16", position: { x: 4, z: -1 } },
    { id: "coin-17", position: { x: 12.4, z: -5.9 } },
    { id: "coin-18", position: { x: -6.5, z: -14.3 } },
    { id: "coin-19", position: { x: -0.2, z: -12.9 } },
    { id: "coin-20", position: { x: 20.8, z: 10.2 } },
    { id: "coin-21", position: { x: 19, z: 16 } },
    { id: "coin-22", position: { x: 23, z: 14 } },
    { id: "coin-23", position: { x: -12, z: 7 } },
    { id: "coin-24", position: { x: 11.5, z: 11.5 } },
    { id: "coin-25", position: { x: -13, z: 8.5 } },
    { id: "coin-26", position: { x: -3.5, z: 4 } },
    { id: "coin-27", position: { x: -0.5, z: 7 } },
    { id: "coin-28", position: { x: -7, z: 3.5 } },
    { id: "coin-29", position: { x: 1.5, z: -3.5 } },
    { id: "coin-30", position: { x: -12.5, z: -11.5 } },
    { id: "coin-31", position: { x: 3, z: -3.5 } },
    { id: "coin-32", position: { x: 13, z: 11.5 } },
    { id: "coin-33", position: { x: 19, z: 14.5 } },
    { id: "coin-34", position: { x: 23.5, z: -1 } },
    { id: "coin-35", position: { x: -21.5, z: 1 } },
    { id: "coin-36", position: { x: -2, z: 5.5 } },
    { id: "coin-37", position: { x: 6, z: -1.5 } },
    { id: "coin-38", position: { x: -20.5, z: 0 } },
    { id: "coin-39", position: { x: 4.5, z: -3 } },
    { id: "coin-40", position: { x: -11.5, z: -10.5 } },
    { id: "coin-41", position: { x: 12.6, z: 2.2 } },
    { id: "coin-42", position: { x: 19, z: -10.6 } },
    { id: "coin-43", position: { x: 15, z: 8.9 } },
    { id: "coin-44", position: { x: 24.6, z: 3 } },
    { id: "coin-45", position: { x: -13.9, z: 3.4 } },
    { id: "coin-46", position: { x: 15.8, z: 4.6 } },
    { id: "coin-47", position: { x: 7.2, z: -12.1 } },
    { id: "coin-48", position: { x: 18.3, z: -7.2 } },
    { id: "coin-49", position: { x: -3.5, z: -13.5 } },
    { id: "coin-50", position: { x: -15.4, z: -2.9 } },
    { id: "coin-51", position: { x: -5.7, z: -3.9 } },
    { id: "coin-52", position: { x: -12.5, z: -7.7 } },
    { id: "coin-53", position: { x: -2.4, z: -7.5 } },
    { id: "coin-54", position: { x: 23.9, z: -4.7 } },
    { id: "coin-55", position: { x: 11, z: 8.2 } },
    { id: "coin-56", position: { x: -7.7, z: 11.5 } },
    { id: "coin-57", position: { x: 3, z: -8 } },
    { id: "coin-58", position: { x: -2.5, z: 1.2 } },
    { id: "coin-59", position: { x: 8.7, z: -7.2 } },
    { id: "coin-60", position: { x: -22.6, z: 5.1 } },
    { id: "coin-61", position: { x: 66.4, z: -13.9 } },
    { id: "coin-62", position: { x: 51, z: 17.8 } },
    { id: "coin-63", position: { x: 52.6, z: -17.7 } },
    { id: "coin-64", position: { x: 59.7, z: 0.1 } },
    { id: "coin-65", position: { x: 49.1, z: -6.5 } },
    { id: "coin-66", position: { x: 48.8, z: 5.7 } },
    { id: "coin-67", position: { x: 36.9, z: 5.4 } },
    { id: "coin-68", position: { x: 42.4, z: 2.7 } },
    { id: "coin-69", position: { x: 42.3, z: -3.3 } },
    { id: "coin-70", position: { x: 65.3, z: 5 } },
    { id: "coin-71", position: { x: 56.9, z: 10.8 } },
    { id: "coin-72", position: { x: 74.1, z: 5.4 } },
    { id: "coin-73", position: { x: 64.9, z: -4.9 } },
    { id: "coin-74", position: { x: 47.4, z: -11.3 } },
    { id: "coin-75", position: { x: 40.1, z: 14.5 } },
    { id: "coin-76", position: { x: 56.7, z: -8.2 } },
    { id: "coin-77", position: { x: 46.8, z: 11.1 } },
    { id: "coin-78", position: { x: 70.4, z: -2.9 } },
    { id: "coin-79", position: { x: 51.9, z: 0.5 } },
    { id: "coin-80", position: { x: 70.1, z: 2.9 } },
    { id: "coin-81", position: { x: -48.5, z: -5.6 } },
    { id: "coin-82", position: { x: -38.3, z: 14.1 } },
    { id: "coin-83", position: { x: -65.8, z: 13.7 } },
    { id: "coin-84", position: { x: -52, z: -17.6 } },
    { id: "coin-85", position: { x: -48.9, z: 6.4 } },
    { id: "coin-86", position: { x: -51.4, z: 17.6 } },
    { id: "coin-87", position: { x: -43.3, z: -2.7 } },
    { id: "coin-88", position: { x: -42.3, z: 2.9 } },
    { id: "coin-89", position: { x: -61.6, z: 3.4 } },
    { id: "coin-90", position: { x: -73.7, z: 5.3 } },
    { id: "coin-91", position: { x: -65.4, z: -4.8 } },
    { id: "coin-92", position: { x: -38.1, z: -5.8 } },
    { id: "coin-93", position: { x: -57.4, z: -10.9 } },
    { id: "coin-94", position: { x: -56.5, z: 8.6 } },
    { id: "coin-95", position: { x: -47.2, z: -11.2 } },
    { id: "coin-96", position: { x: -32.9, z: -2.2 } },
    { id: "coin-97", position: { x: -47.2, z: 11.4 } },
    { id: "coin-98", position: { x: -66.1, z: 5.1 } },
    { id: "coin-99", position: { x: -37.8, z: 5.2 } },
    { id: "coin-100", position: { x: -52.4, z: -0.7 } },
    { id: "coin-east-lake", position: { x: 49, z: 5 } },
    { id: "coin-west-lake", position: { x: -49, z: -5 } },
    { id: "coin-east-summit", position: { x: 58, z: -8 } },
    { id: "coin-west-summit", position: { x: -58, z: 8 } },
  ],
  bouncePads: {
    name: "Sand Spring",
    colour: "#fcd34d",
    places: [
      { x: -1, z: -1.4 },
      { x: -18.6, z: -3.6 },
      { x: 18.4, z: 6.4 },
      { x: 21.5, z: -6.6 },
      { x: 0.5, z: -6.6 },
      { x: -14.9, z: 0.4 },
      { x: -23.5, z: -1 },
      { x: 17.5, z: 2 },
      { x: -0.5, z: -10.5 },
      { x: -8.1, z: 0.4 },
      { x: 20.1, z: -0.5 },
      { x: 11.8, z: -7.1 },
      { x: 36.1, z: 11.3 },
      { x: 65.3, z: 14.3 },
      { x: 38.8, z: -13.5 },
      { x: 31.5, z: -2.1 },
      { x: -38.5, z: -13.7 },
      { x: -31.6, z: 2.6 },
      { x: -65.4, z: -13.4 },
      { x: -60.4, z: -1.9 },
    ],
  },
  airfield: sandsAirfield,
  hoverPad: {
    centre: { x: -27, z: -4 },
    heading: -0.524,
    slipStart: 1.75,
    slipLevel: 1.13,
  },
  dock: {
    from: { x: -9.2, z: -15.3 },
    to: { x: -11.3, z: -18.6 },
    berthSide: 1,
  },
  friendKind: {
    singular: "Camel",
    plural: "Camels",
    look: "camel",
  },
  friends: [
    {
      id: "camel-humphrey",
      position: { x: -19.5, z: 0.8 },
      name: "Humphrey the Camel",
      greeting:
        "Hello! My hump is full of fat, not water. It gives me energy when there's no food about.",
    },
    {
      id: "camel-sandy",
      position: { x: -20.2, z: -8.1 },
      name: "Sandy the Camel",
      greeting:
        "I have two rows of long eyelashes to keep the blowing sand out of my eyes.",
    },
    {
      id: "camel-dune",
      position: { x: -2.4, z: 10.5 },
      name: "Dune the Camel",
      greeting:
        "I can close my nostrils tight when the wind whips the sand around.",
    },
    {
      id: "camel-saffron",
      position: { x: 23.1, z: 14.1 },
      name: "Saffron the Camel",
      greeting: "My wide, padded feet stop me sinking into the soft sand.",
    },
    {
      id: "camel-ziggy",
      position: { x: -2.8, z: -4.6 },
      name: "Ziggy the Camel",
      greeting:
        "When I find water, I can drink a whole bathful in just a few minutes!",
    },
    {
      id: "camel-nutmeg",
      position: { x: 5.7, z: 0.8 },
      name: "Nutmeg the Camel",
      greeting:
        "People have ridden camels across deserts for thousands of years to trade goods.",
    },
    {
      id: "watchtower-toffee",
      position: { x: 47.3, z: -0.3 },
      name: "Toffee the Camel",
      greeting:
        "A baby camel is called a calf. It can walk just a few hours after it is born.",
    },
    {
      id: "watchtower-sahara",
      position: { x: 74.5, z: 0.1 },
      name: "Sahara the Camel",
      greeting:
        "Dromedary camels like me have one hump. Bactrian camels have two.",
    },
    {
      id: "watchtower-pepper",
      position: { x: 54.4, z: -3.6 },
      name: "Pepper the Camel",
      greeting: "Camels can carry heavy loads for many kilometres every day.",
    },
    {
      id: "watchtower-cinnamon",
      position: { x: -47.7, z: 0.6 },
      name: "Cinnamon the Camel",
      greeting:
        "My thick coat keeps out the hot sun by day and the cold at night.",
    },
    {
      id: "watchtower-dusty",
      position: { x: -54.9, z: 3.9 },
      name: "Dusty the Camel",
      greeting:
        "My tough mouth lets me eat prickly desert plants that other animals can't.",
    },
    {
      id: "watchtower-oasis",
      position: { x: -73.3, z: -0.3 },
      name: "Oasis the Camel",
      greeting: "Camels can go a whole week or more without a drink.",
    },
  ],
  races: [
    {
      id: "sands-dune-dash",
      name: "the Dune Dash",
      seconds: 135,
      rings: [
        { x: 66.3, z: 0 },
        { x: 61.2, z: 8.2 },
        { x: 51.8, z: 11.3 },
        { x: 42.6, z: 8 },
        { x: 37.8, z: -0.3 },
        { x: 43.1, z: -8.4 },
        { x: 52.5, z: -11.3 },
        { x: 61.6, z: -8.7 },
      ],
    },
    {
      id: "sands-mirage-run",
      name: "the Mirage Run",
      seconds: 135,
      rings: [
        { x: -37.7, z: 0 },
        { x: -42.8, z: 8.2 },
        { x: -52.2, z: 11.3 },
        { x: -61.4, z: 8.9 },
        { x: -66.2, z: 0.3 },
        { x: -61.4, z: -8 },
        { x: -52.2, z: -11.3 },
        { x: -42.8, z: -8.2 },
      ],
    },
  ],
  gravity: earthGravity,
  findHeight: sunscorchSands.findHeight,
  findCourseKind: findCourseKindIn(sunscorchSands),
};

const jungleAdventure: IslandAdventure = {
  islandId: "jungle-reach",
  start: { x: -4.6, z: 8 },
  startHeading: Math.PI,
  trailColour: "#8a6a3c",
  trails: [
    [
      { x: -2, z: 5 },
      { x: 0.4, z: 4.2 },
      { x: 2.1, z: 3.2 },
    ],
    [
      { x: 5.1, z: 0.2 },
      { x: 6, z: -4.4 },
      { x: 6, z: -9 },
    ],
    [
      { x: 6, z: -4.4 },
      { x: 10, z: 1 },
    ],
    [
      { x: 6, z: -9 },
      { x: 12, z: -8.4 },
      { x: 18, z: -6 },
    ],
    [
      { x: 18, z: -6 },
      { x: 17.6, z: 0 },
      { x: 15, z: 6 },
    ],
    [
      { x: 15, z: 6 },
      { x: 11.7, z: 8.6 },
    ],
    [
      { x: 8.5, z: 11.4 },
      { x: 3, z: 11.6 },
      { x: -2, z: 11.4 },
      { x: -8, z: 12 },
    ],
    [
      { x: -2, z: 5 },
      { x: -5, z: 9 },
      { x: -8, z: 12 },
    ],
    [
      { x: -8, z: 12 },
      { x: -12, z: 10 },
      { x: -15, z: 7 },
    ],
    [
      { x: -15, z: 7 },
      { x: -17.6, z: 2 },
      { x: -17, z: -4 },
    ],
    [
      { x: -17, z: -4 },
      { x: -10, z: -4.4 },
      { x: -4, z: -4 },
    ],
    [
      { x: -4, z: -4 },
      { x: -3.4, z: 0.6 },
      { x: -2, z: 5 },
    ],
    [
      { x: -4, z: -4 },
      { x: -5.4, z: -7.6 },
      { x: -4.6, z: -10 },
      { x: 0.6, z: -10.6 },
    ],
    [
      { x: 12, z: -8.4 },
      { x: 12.4, z: -10.9 },
    ],
    [
      { x: -10, z: -4.4 },
      { x: -10.7, z: -3.5 },
    ],
    [
      { x: -17.6, z: 2 },
      { x: -21.4, z: 0.7 },
    ],
    [
      { x: -21.4, z: 0.7 },
      { x: -21.1, z: 4.4 },
    ],
    [
      { x: -17.6, z: 2 },
      { x: -17.4, z: 2 },
    ],
    [
      { x: -15, z: 7 },
      { x: -10.5, z: 4.3 },
    ],
    [
      { x: 0.6, z: -10.6 },
      { x: 0.2, z: -9.6 },
    ],
    [
      { x: -3.4, z: 0.6 },
      { x: -5.9, z: 1.3 },
    ],
    [
      { x: 6, z: -4.4 },
      { x: 3.1, z: -4.5 },
    ],
    [
      { x: -5, z: 11.7 },
      { x: -4.8, z: 13.3 },
    ],
    [
      { x: 16.1, z: -6.8 },
      { x: 17.8, z: -11 },
    ],
    [
      { x: -4.5, z: 8.4 },
      { x: -3.7, z: 9 },
    ],
    [
      { x: -17.1, z: -3.5 },
      { x: -21.4, z: -3.9 },
    ],
    [
      { x: 8, z: -8.8 },
      { x: 8.4, z: -13.1 },
    ],
    [
      { x: 17.7, z: -2.1 },
      { x: 21, z: -1.9 },
    ],
    [
      { x: 0.9, z: 3.9 },
      { x: 1.9, z: 5.7 },
    ],
    [
      { x: -3.2, z: 1.3 },
      { x: -2, z: 0.9 },
    ],
    [
      { x: -13, z: 9 },
      { x: -11.5, z: 7.5 },
    ],
    [
      { x: 66.3, z: 0 },
      { x: 64.4, z: 5.6 },
      { x: 59.2, z: 9.8 },
      { x: 52, z: 11.3 },
      { x: 44.9, z: 9.8 },
      { x: 39.6, z: 5.6 },
      { x: 37.7, z: 0 },
      { x: 39.6, z: -5.6 },
      { x: 44.8, z: -9.8 },
      { x: 52, z: -11.3 },
      { x: 60.5, z: -11.5 },
      { x: 64.4, z: -5.6 },
      { x: 66.3, z: 0 },
    ],
    [
      { x: 18, z: -6 },
      { x: 20, z: -6 },
      { x: 27.5, z: -6 },
      { x: 38.5, z: -2.3 },
    ],
    [
      { x: 32.3, z: -4.4 },
      { x: 33.9, z: -9.2 },
    ],
    [
      { x: 39.4, z: 4.9 },
      { x: 33.7, z: 6.8 },
    ],
    [
      { x: 64.4, z: 5.6 },
      { x: 69.4, z: 8.9 },
    ],
    [
      { x: 45.9, z: 10 },
      { x: 44.7, z: 15.6 },
    ],
    [
      { x: 48.3, z: -10.5 },
      { x: 47.1, z: -16.4 },
    ],
    [
      { x: 57.7, z: 10.1 },
      { x: 58.9, z: 15.7 },
    ],
    [
      { x: 64.4, z: -5.5 },
      { x: 70, z: -7.4 },
    ],
    [
      { x: 48.3, z: -10.5 },
      { x: 49.6, z: -4.7 },
    ],
    [
      { x: 31.7, z: -4.6 },
      { x: 31.1, z: -2.7 },
    ],
    [
      { x: -37.7, z: 0 },
      { x: -39.6, z: 5.6 },
      { x: -44.8, z: 9.8 },
      { x: -52, z: 11.3 },
      { x: -60.4, z: 11.5 },
      { x: -64.4, z: 5.6 },
      { x: -66.3, z: 0 },
      { x: -64.4, z: -5.6 },
      { x: -59.1, z: -9.8 },
      { x: -52, z: -11.3 },
      { x: -44.8, z: -9.8 },
      { x: -39.6, z: -5.6 },
      { x: -37.7, z: 0 },
    ],
    [
      { x: -20.4, z: 1.1 },
      { x: -20, z: 0 },
      { x: -27.5, z: 0 },
      { x: -37.7, z: 0 },
    ],
    [
      { x: -39.6, z: -5.6 },
      { x: -34.4, z: -8 },
    ],
    [
      { x: -39.6, z: 5.6 },
      { x: -34.3, z: 7.8 },
    ],
    [
      { x: -64.4, z: -5.6 },
      { x: -69.5, z: -8.2 },
    ],
    [
      { x: -64.4, z: 5.6 },
      { x: -69.7, z: 8.2 },
    ],
    [
      { x: -58.3, z: -10 },
      { x: -59.5, z: -15.8 },
    ],
    [
      { x: -46.2, z: 10.1 },
      { x: -45, z: 15.9 },
    ],
    [
      { x: -46.4, z: -10.1 },
      { x: -45.2, z: -16 },
    ],
    [
      { x: -58, z: 11.4 },
      { x: -57.9, z: 15.7 },
    ],
    [
      { x: -64.7, z: 4.6 },
      { x: -59.1, z: 2.7 },
    ],
  ],
  drawnBridges: jungleRopeBridges,
  lookouts: [
    {
      id: "firefly-treehouse",
      name: "the Firefly Treehouse",
      position: { x: -2, z: 5 },
      viewHeight: 4,
      look: "island-landmark",
    },
    {
      id: "canopy-watchtower",
      name: "the Canopy Watchtower",
      position: { x: plateauCentre.x - 2.6, z: plateauCentre.z + 1.2 },
      viewHeight: 4.4,
      look: "watchtower",
    },
    {
      id: "jungle-vine-tower",
      name: "the Vine Watchtower",
      position: { x: 19.4, z: 1.8 },
      viewHeight: 4.2,
      look: "watchtower",
    },
    {
      id: "vine-watchtower",
      name: "the Vine Watchtower",
      position: { x: 12.5, z: -11.5 },
      viewHeight: 4.2,
      look: "watchtower",
    },
    {
      id: "jungle-toucan-tower",
      name: "the Toucan Watchtower",
      position: { x: 17.8, z: -11 },
      viewHeight: 4.2,
      look: "watchtower",
    },
    {
      id: "jungle-jaguar-tower",
      name: "the Jaguar Watchtower",
      position: { x: 33.9, z: -9.2 },
      viewHeight: 4.2,
      look: "watchtower",
    },
    {
      id: "jungle-orchid-tower",
      name: "the Orchid Watchtower",
      position: { x: -34.4, z: -8 },
      viewHeight: 4.2,
      look: "watchtower",
    },
  ],
  signs: [
    {
      id: "jungle-rainforest",
      position: { x: -6.6, z: 5.4 },
      title: "Rainforests",
      fact: "Rainforests get rain nearly every day. More kinds of animals live in them than anywhere else on Earth.",
    },
    {
      id: "jungle-waterfall",
      position: { x: -1.4, z: -3 },
      title: "Waterfalls",
      fact: "A waterfall forms where a river flows over hard rock and drops down a cliff.",
    },
    {
      id: "jungle-delta",
      position: { x: 9.4, z: 5.4 },
      title: "The Delta",
      fact: "A delta is where a river splits into smaller streams just before it reaches the sea.",
    },
    {
      id: "jungle-temple",
      position: { x: -14.4, z: -1.4 },
      title: "The Lost Temple",
      fact: "The ancient Maya built stone temples in the rainforests of Central America.",
    },
    {
      id: "jungle-food-chains",
      position: { x: -1.6, z: 13 },
      title: "Food Chains",
      fact: "A food chain shows what eats what. Plants make food from sunlight, and animals get energy by eating.",
    },
    {
      id: "jungle-layers",
      position: { x: 1.9, z: -11.5 },
      title: "Rainforest Layers",
      fact: "A rainforest has layers: the forest floor, the understorey, the canopy and the tallest emergent trees.",
    },
    {
      id: "jungle-water-cycle",
      position: { x: 7.5, z: -5.9 },
      title: "The Water Cycle",
      fact: "Water evaporates from the sea, forms clouds, falls as rain and flows back to the sea in rivers.",
    },
    {
      id: "jungle-camouflage",
      position: { x: -7.9, z: -5.2 },
      title: "Camouflage",
      fact: "Some animals, like chameleons and stick insects, blend in with their homes so predators cannot spot them.",
    },
    {
      id: "jungle-vertebrates",
      position: { x: -11, z: -3 },
      title: "Vertebrates",
      fact: "Animals with a backbone are vertebrates. Fish, amphibians, reptiles, birds and mammals all have one.",
    },
    {
      id: "jungle-deforestation",
      position: { x: -22, z: 0.5 },
      title: "Changing Habitats",
      fact: "When rainforests are cut down, the animals that lived there lose their homes and can become endangered.",
    },
    {
      id: "jungle-teeth",
      position: { x: -21, z: 5 },
      title: "Teeth",
      fact: "Meat eaters such as jaguars have sharp canine teeth for tearing. Plant eaters have flat teeth for grinding.",
    },
    {
      id: "jungle-maya",
      position: { x: -18, z: 2 },
      title: "The Maya",
      fact: "The Maya built great stone cities and pyramids in the rainforests of Central America over a thousand years ago.",
    },
    {
      id: "jungle-digestion",
      position: { x: -3.7, z: 9 },
      title: "Digestion",
      fact: "When you swallow, food travels down a tube called the oesophagus to your stomach, where it is broken down.",
    },
    {
      id: "jungle-sound",
      position: { x: -21.4, z: -3.9 },
      title: "Sound",
      fact: "Sounds are made when things vibrate. The vibrations travel through the air into your ears.",
    },
    {
      id: "jungle-states-of-matter",
      position: { x: 8.4, z: -13.1 },
      title: "Solids, Liquids and Gases",
      fact: "Water can be a solid (ice), a liquid (water) or a gas (water vapour). Heating and cooling change it from one to another.",
    },
    {
      id: "jungle-classification",
      position: { x: 21, z: -1.9 },
      title: "Sorting Living Things",
      fact: "Scientists sort living things into groups using keys, by asking yes or no questions about them.",
    },
    {
      id: "jungle-pitch",
      position: { x: 33.7, z: 6.8 },
      title: "High and Low Sounds",
      fact: "Small, tight or short things make high sounds. Big, loose or long things make low sounds.",
    },
    {
      id: "jungle-conductors",
      position: { x: 69.4, z: 8.9 },
      title: "Conductors and Insulators",
      fact: "Metals let electricity flow through them. Plastic and wood do not, so they are called insulators.",
    },
    {
      id: "jungle-evaporation",
      position: { x: 44.7, z: 15.6 },
      title: "Evaporation",
      fact: "When the sun warms a puddle, the water evaporates and rises into the air as water vapour.",
    },
    {
      id: "jungle-romans",
      position: { x: 47.1, z: -16.4 },
      title: "The Romans",
      fact: "The Romans came to Britain nearly 2,000 years ago and built straight roads, towns and bath houses.",
    },
    {
      id: "jungle-rivers",
      position: { x: -34.3, z: 7.8 },
      title: "Rivers",
      fact: "A river starts at its source, often high in the hills, and ends at its mouth, where it meets the sea.",
    },
    {
      id: "jungle-endangered",
      position: { x: -69.5, z: -8.2 },
      title: "Endangered Animals",
      fact: "When forests are cut down, animals like orangutans lose their homes and can become endangered.",
    },
    {
      id: "jungle-biomes",
      position: { x: -69.7, z: 8.2 },
      title: "Biomes",
      fact: "A biome is a big area with its own climate, plants and animals, such as a rainforest, desert or tundra.",
    },
    {
      id: "jungle-invertebrates",
      position: { x: -59.5, z: -15.8 },
      title: "Invertebrates",
      fact: "Invertebrates have no backbone. Insects, spiders, worms and snails are all invertebrates.",
    },
  ],
  hideaways: [
    {
      id: "sloth-hideout",
      position: { x: 21.5, z: -5.9 },
      name: "the Sloth Hideout",
      discovery:
        "A leafy shelter where sloths hang upside down and hardly move all day.",
    },
    {
      id: "frog-pond-camp",
      position: { x: 3.3, z: 9.5 },
      name: "the Frog Pond Camp",
      discovery:
        "Brightly coloured frogs live here. Their colours warn hungry animals to stay away.",
    },
    {
      id: "orchid-den",
      position: { x: -12.8, z: -8 },
      name: "the Orchid Den",
      discovery:
        "A den full of orchids, flowers that grow high up on the branches of trees.",
    },
    {
      id: "explorers-base",
      position: { x: 6.8, z: -0.3 },
      name: "the Explorers' Base",
      discovery:
        "Binoculars, a net and a notebook full of rainforest animals spotted nearby.",
    },
    {
      id: "frog-pool",
      position: { x: -10, z: 4 },
      name: "the Frog Pool",
      discovery:
        "A still pool full of tadpoles. Frogs are amphibians, so they begin life in water and later live on land too.",
    },
    {
      id: "sloth-tree",
      position: { x: 0, z: -9 },
      name: "the Sloth Tree",
      discovery:
        "A sloth hangs here so slowly that green algae grows in its fur, which helps it hide in the leaves.",
    },
    {
      id: "explorers-hammock",
      position: { x: -6.5, z: 1.5 },
      name: "the Explorer's Hammock",
      discovery:
        "A hammock strung between trees, safely off the ground and away from the ants.",
    },
    {
      id: "drum-clearing",
      position: { x: 2.5, z: -4.5 },
      name: "the Drum Clearing",
      discovery:
        "Hollow log drums. Hitting them makes the wood vibrate, and the vibrations travel through the air as sound.",
    },
    {
      id: "waterfall-cave",
      position: { x: 1.9, z: 5.7 },
      name: "the Waterfall Cave",
      discovery:
        "A hidden cave behind a curtain of falling water. It's damp, echoey and full of glowing mushrooms.",
    },
    {
      id: "parrot-perch",
      position: { x: -2, z: 0.9 },
      name: "the Parrot Perch",
      discovery:
        "Bright red, blue and yellow parrots squawk from the branches and crack nuts with their strong beaks.",
    },
    {
      id: "banana-grove",
      position: { x: 9.9, z: -8.9 },
      name: "the Banana Grove",
      discovery:
        "Bunches of bananas hang under huge leaves. Bananas grow pointing up towards the sun!",
    },
    {
      id: "hidden-canoe",
      position: { x: -11.5, z: 7.5 },
      name: "the Hidden Canoe",
      discovery:
        "A wooden canoe carved from a single tree trunk, ready to paddle down the river.",
    },
    {
      id: "jaguar-ledge",
      position: { x: 58.9, z: 15.7 },
      name: "the Jaguar's Ledge",
      discovery:
        "A rocky ledge where a jaguar likes to nap. Its spotty coat hides it in the dappled shade.",
    },
    {
      id: "hummingbird-garden",
      position: { x: 70, z: -7.4 },
      name: "the Hummingbird Garden",
      discovery:
        "Tiny hummingbirds hover by the flowers, beating their wings up to 80 times a second.",
    },
    {
      id: "mangrove-hut",
      position: { x: 49.6, z: -4.7 },
      name: "the Mangrove Hut",
      discovery:
        "A hut on stilts among mangrove trees, whose roots grow down into salty water.",
    },
    {
      id: "butterfly-house",
      position: { x: 31.1, z: -2.7 },
      name: "the Butterfly House",
      discovery:
        "Blue morpho butterflies flutter everywhere. Their wings shimmer like metal.",
    },
    {
      id: "leafcutter-trail",
      position: { x: -45, z: 15.9 },
      name: "the Leafcutter Ant Trail",
      discovery:
        "A line of ants carrying pieces of leaf many times heavier than themselves.",
    },
    {
      id: "hidden-lagoon",
      position: { x: -45.2, z: -16 },
      name: "the Hidden Lagoon",
      discovery: "A still green lagoon where turtles bask on logs in the sun.",
    },
    {
      id: "tree-frog-hollow",
      position: { x: -57.9, z: 15.7 },
      name: "the Tree Frog Hollow",
      discovery:
        "Bright red-eyed tree frogs cling to the leaves with their sticky toes.",
    },
    {
      id: "cocoa-grove",
      position: { x: -59.1, z: 2.7 },
      name: "the Cocoa Grove",
      discovery:
        "Cocoa pods grow straight out of the tree trunks. Their beans are used to make chocolate!",
    },
  ],
  treasureKind: {
    singular: "Parrot Feather",
    plural: "Parrot Feathers",
    colour: "#ef4444",
  },
  treasures: [
    { id: "feather-plateau", position: { x: -3.6, z: -11.6 } },
    { id: "feather-islet", position: jungleIslet },
    { id: "feather-delta", position: { x: 9.8, z: 13.6 } },
    { id: "feather-ridge", position: { x: 15, z: -10 } },
    { id: "feather-falls", position: { x: 0.6, z: -5.4 } },
    { id: "feather-temple", position: { x: -19.6, z: -6 } },
    { id: "feather-west", position: { x: -20.6, z: 2.6 } },
    { id: "feather-north", position: { x: 9.6, z: -12.4 } },
    { id: "feather-9", position: { x: 20.1, z: -11.5 } },
    { id: "feather-10", position: { x: -23.3, z: -1.7 } },
    { id: "feather-11", position: { x: 3.3, z: 4.6 } },
    { id: "feather-12", position: { x: 16.6, z: -2.4 } },
    { id: "feather-13", position: { x: -4.4, z: 1.1 } },
    { id: "feather-14", position: { x: 13.8, z: -14.3 } },
    { id: "feather-15", position: { x: 22.2, z: -1.7 } },
    { id: "feather-16", position: { x: -0.2, z: 1.1 } },
    { id: "feather-17", position: { x: 11, z: -8 } },
    { id: "feather-18", position: { x: 3.3, z: -2.4 } },
    { id: "feather-19", position: { x: -10.7, z: 6.7 } },
    { id: "feather-20", position: { x: -14.9, z: 10.9 } },
    { id: "feather-21", position: { x: 5, z: 6.5 } },
    { id: "feather-22", position: { x: 0, z: 10 } },
    { id: "feather-23", position: { x: 6, z: -3.5 } },
    { id: "feather-24", position: { x: -3, z: 10.5 } },
    { id: "feather-25", position: { x: 16.5, z: -11 } },
    { id: "feather-26", position: { x: 16, z: -12.5 } },
    { id: "feather-27", position: { x: -9, z: 7 } },
    { id: "feather-28", position: { x: 6, z: 8 } },
    { id: "feather-29", position: { x: 10, z: -5 } },
    { id: "feather-30", position: { x: -1.5, z: 10 } },
    { id: "feather-31", position: { x: 18.5, z: -11 } },
    { id: "feather-32", position: { x: 5, z: 12 } },
    { id: "feather-33", position: { x: 4, z: 6 } },
    { id: "feather-34", position: { x: 9.5, z: -4 } },
    { id: "feather-35", position: { x: 3, z: 6.5 } },
    { id: "feather-36", position: { x: -22, z: -2.5 } },
    { id: "feather-37", position: { x: 20.5, z: -1.5 } },
    { id: "feather-38", position: { x: -19, z: 15 } },
    { id: "feather-39", position: { x: 14.5, z: -2.5 } },
    { id: "feather-40", position: { x: 8, z: -3.5 } },
    { id: "feather-41", position: { x: 6.9, z: 3.1 } },
    { id: "feather-42", position: { x: 12.4, z: 7.9 } },
    { id: "feather-43", position: { x: -3.1, z: -7.7 } },
    { id: "feather-44", position: { x: 22, z: -9 } },
    { id: "feather-45", position: { x: 5.3, z: -12.2 } },
    { id: "feather-46", position: { x: 17.3, z: 3.9 } },
    { id: "feather-47", position: { x: -13.8, z: -4.7 } },
    { id: "feather-48", position: { x: 12.4, z: 4.4 } },
    { id: "feather-49", position: { x: 15.4, z: -7 } },
    { id: "feather-50", position: { x: -23.5, z: 3.3 } },
    { id: "feather-51", position: { x: -11.1, z: -5.8 } },
    { id: "feather-52", position: { x: -16.9, z: 4.9 } },
    { id: "feather-53", position: { x: -5.6, z: -6.9 } },
    { id: "feather-54", position: { x: -0.5, z: -12.6 } },
    { id: "feather-55", position: { x: -15.2, z: 1.4 } },
    { id: "feather-56", position: { x: -17.3, z: 9.8 } },
    { id: "feather-57", position: { x: 19.4, z: -8.4 } },
    { id: "feather-58", position: { x: 4.8, z: -6 } },
    { id: "feather-59", position: { x: 12.2, z: -0.5 } },
    { id: "feather-60", position: { x: -19.2, z: 12.1 } },
    { id: "feather-61", position: { x: 37.9, z: 13.5 } },
    { id: "feather-62", position: { x: 65.8, z: -14.5 } },
    { id: "feather-63", position: { x: 50.5, z: 18.1 } },
    { id: "feather-64", position: { x: 52.9, z: -17.5 } },
    { id: "feather-65", position: { x: 55.6, z: 5.8 } },
    { id: "feather-66", position: { x: 55.4, z: -6.1 } },
    { id: "feather-67", position: { x: 38.5, z: -6.3 } },
    { id: "feather-68", position: { x: 61.7, z: 2.7 } },
    { id: "feather-69", position: { x: 62.2, z: -3.5 } },
    { id: "feather-70", position: { x: 73.7, z: 5.5 } },
    { id: "feather-71", position: { x: 48, z: -11.4 } },
    { id: "feather-72", position: { x: 46.5, z: 10.8 } },
    { id: "feather-73", position: { x: 31.5, z: 2.2 } },
    { id: "feather-74", position: { x: 39.3, z: 4 } },
    { id: "feather-75", position: { x: 52.7, z: -0.8 } },
    { id: "feather-76", position: { x: 56.8, z: 11 } },
    { id: "feather-77", position: { x: 68.7, z: 4.1 } },
    { id: "feather-78", position: { x: 70.4, z: -2.6 } },
    { id: "feather-79", position: { x: 57.9, z: -11.1 } },
    { id: "feather-80", position: { x: 54.1, z: 15.4 } },
    { id: "feather-81", position: { x: -51.8, z: 17.9 } },
    { id: "feather-82", position: { x: -52.1, z: -17.8 } },
    { id: "feather-83", position: { x: -66.4, z: -13.8 } },
    { id: "feather-84", position: { x: -43.3, z: 2.1 } },
    { id: "feather-85", position: { x: -48.5, z: -6.1 } },
    { id: "feather-86", position: { x: -66, z: 13.5 } },
    { id: "feather-87", position: { x: -48.6, z: 7.6 } },
    { id: "feather-88", position: { x: -61.2, z: -2.3 } },
    { id: "feather-89", position: { x: -74.1, z: 5 } },
    { id: "feather-90", position: { x: -42.2, z: -3 } },
    { id: "feather-91", position: { x: -31.2, z: 3.3 } },
    { id: "feather-92", position: { x: -65.1, z: 5.7 } },
    { id: "feather-93", position: { x: -69.2, z: -3.2 } },
    { id: "feather-94", position: { x: -47.2, z: -11.2 } },
    { id: "feather-95", position: { x: -57.5, z: -11.1 } },
    { id: "feather-96", position: { x: -56.7, z: 9.3 } },
    { id: "feather-97", position: { x: -39.4, z: 4.8 } },
    { id: "feather-98", position: { x: -38.4, z: -5.6 } },
    { id: "feather-99", position: { x: -70, z: 3 } },
    { id: "feather-100", position: { x: -54.2, z: 0.5 } },
    { id: "feather-east-lake", position: { x: 55.5, z: 4.5 } },
    { id: "feather-west-lake", position: { x: -50, z: -5.5 } },
    { id: "feather-east-summit", position: { x: 58, z: -8 } },
    { id: "feather-west-summit", position: { x: -58, z: 8 } },
  ],
  bouncePads: {
    name: "Bouncy Mushroom",
    colour: "#f472b6",
    places: [
      { x: -9.6, z: 0.4 },
      { x: 12, z: -3.4 },
      { x: -11, z: 11 },
      { x: 13.8, z: 1.8 },
      { x: -18.4, z: 7.4 },
      { x: -13.5, z: 3.9 },
      { x: 12.5, z: -6.5 },
      { x: 1.5, z: 12.5 },
      { x: 16, z: -0.5 },
      { x: -8, z: 8.3 },
      { x: -7.4, z: -2 },
      { x: 3, z: -8 },
      { x: 59.4, z: -15.7 },
      { x: 39.1, z: -13.5 },
      { x: 44.5, z: -0.2 },
      { x: 65.3, z: 14.4 },
      { x: -38.3, z: -13.3 },
      { x: -31.4, z: -2 },
      { x: -38.7, z: 13.2 },
      { x: -53.3, z: 5.1 },
    ],
  },
  airfield: jungleAirfield,
  hoverPad: {
    centre: { x: -25, z: -1 },
    heading: 0.131,
    slipStart: 1.25,
    slipLevel: 0.81,
  },
  dock: {
    from: { x: -4.8, z: 13.3 },
    to: { x: -6.1, z: 17 },
    berthSide: -1,
  },
  friendKind: {
    singular: "Monkey",
    plural: "Monkeys",
    look: "monkey",
  },
  friends: [
    {
      id: "monkey-mango",
      position: { x: -18.8, z: 14.7 },
      name: "Mango the Monkey",
      greeting:
        "Hello! Some monkeys use their long tails like an extra hand to hold onto branches.",
    },
    {
      id: "monkey-coco",
      position: { x: -16.3, z: -7.8 },
      name: "Coco the Monkey",
      greeting: "Monkeys live together in big family groups called troops.",
    },
    {
      id: "monkey-kiwi",
      position: { x: -14.5, z: 10.4 },
      name: "Kiwi the Monkey",
      greeting:
        "Howler monkeys are so loud you can hear them from 5 kilometres away!",
    },
    {
      id: "monkey-banjo",
      position: { x: -0.3, z: 9.6 },
      name: "Banjo the Monkey",
      greeting:
        "I eat fruit, leaves, seeds and insects. That makes me an omnivore.",
    },
    {
      id: "monkey-tamarind",
      position: { x: -19.1, z: -1.3 },
      name: "Tamarind the Monkey",
      greeting:
        "Monkeys groom each other's fur to keep clean and to stay good friends.",
    },
    {
      id: "monkey-zuri",
      position: { x: 6, z: 7.5 },
      name: "Zuri the Monkey",
      greeting:
        "Most monkeys live high up in the canopy, the top layer of the rainforest.",
    },
    {
      id: "watchtower-papaya",
      position: { x: 57.6, z: -0.7 },
      name: "Papaya the Monkey",
      greeting:
        "Spider monkeys swing from branch to branch using their long arms and tails.",
    },
    {
      id: "watchtower-bongo",
      position: { x: 74.5, z: 0.1 },
      name: "Bongo the Monkey",
      greeting: "Capuchin monkeys use stones as tools to crack open nuts.",
    },
    {
      id: "watchtower-lulu",
      position: { x: 50, z: 3.3 },
      name: "Lulu the Monkey",
      greeting: "Baby monkeys ride around on their mum's back.",
    },
    {
      id: "watchtower-kiki",
      position: { x: -48.7, z: -0.2 },
      name: "Kiki the Monkey",
      greeting:
        "Monkeys talk to each other with calls, faces and body movements.",
    },
    {
      id: "watchtower-tango",
      position: { x: -73.4, z: -0.4 },
      name: "Tango the Monkey",
      greeting:
        "Monkeys help the forest grow by dropping fruit seeds wherever we go.",
    },
    {
      id: "watchtower-juju",
      position: { x: -55.2, z: -3.9 },
      name: "Juju the Monkey",
      greeting: "Gorillas aren't monkeys, they're apes. Apes don't have tails!",
    },
  ],
  races: [
    {
      id: "jungle-vine-dash",
      name: "the Vine Dash",
      seconds: 135,
      rings: [
        { x: 66.3, z: 0 },
        { x: 61.1, z: 8.3 },
        { x: 51.6, z: 11.2 },
        { x: 42.3, z: 7.8 },
        { x: 37.9, z: -0.7 },
        { x: 43.5, z: -8.8 },
        { x: 53.2, z: -11.3 },
        { x: 62.1, z: -9.1 },
      ],
    },
    {
      id: "jungle-canopy-run",
      name: "the Canopy Run",
      seconds: 140,
      rings: [
        { x: -37.7, z: 0 },
        { x: -42.9, z: 8.3 },
        { x: -52.4, z: 11.3 },
        { x: -61.6, z: 9.7 },
        { x: -66.1, z: 0.7 },
        { x: -61.7, z: -7.8 },
        { x: -52.4, z: -11.2 },
        { x: -42.9, z: -8.3 },
      ],
    },
  ],
  gravity: earthGravity,
  findHeight: jungleReach.findHeight,
  findCourseKind: findCourseKindIn(jungleReach),
};

const emberAdventure: IslandAdventure = {
  islandId: "ember-isle",
  start: { x: -12.6, z: 3.6 },
  startHeading: Math.PI / 2,
  trailColour: "#6b4a3a",
  trails: [
    [
      { x: -17, z: -5 },
      { x: -12, z: -4.4 },
      { x: -7, z: -4 },
    ],
    [
      { x: -7, z: -4 },
      { x: 1, z: -3.2 },
      { x: 9, z: -3 },
    ],
    [
      { x: 9, z: -3 },
      { x: 14, z: -3.6 },
      { x: 19, z: -4 },
    ],
    [
      { x: -7, z: -4 },
      { x: -3.6, z: -5.6 },
      { x: -1.4, z: -6.6 },
    ],
    [
      { x: -17, z: 5 },
      { x: -12, z: 8 },
      { x: -8, z: 9 },
    ],
    [
      { x: -8, z: 9 },
      { x: -2, z: 8 },
      { x: 3, z: 7 },
    ],
    [
      { x: 3, z: 7 },
      { x: 9, z: 7.6 },
      { x: 15, z: 7 },
    ],
    [
      { x: 15, z: 7 },
      { x: 18, z: 2 },
      { x: 19, z: -4 },
    ],
    [
      { x: 9, z: -3 },
      { x: 6, z: 2 },
      { x: 3, z: 7 },
    ],
    [
      { x: -17, z: -5 },
      { x: -17, z: 0 },
      { x: -17, z: 5 },
    ],
    [
      { x: 9, z: -3 },
      { x: 10.6, z: -7.4 },
      { x: 11.8, z: -12.2 },
    ],
    [
      { x: -7, z: -4 },
      { x: -6, z: -7.6 },
      { x: -4, z: -12.4 },
    ],
    [
      { x: -1.4, z: -6.6 },
      { x: -0.8, z: -8 },
    ],
    [
      { x: -17, z: 5 },
      { x: -20.2, z: 9.5 },
    ],
    [
      { x: -17, z: 0 },
      { x: -22.4, z: 0.9 },
    ],
    [
      { x: 10.6, z: -7.4 },
      { x: 14.4, z: -8.4 },
    ],
    [
      { x: -20.2, z: 9.5 },
      { x: -16.5, z: 11.7 },
    ],
    [
      { x: -6, z: -7.6 },
      { x: -8.1, z: -10.5 },
    ],
    [
      { x: 9, z: 7.6 },
      { x: 8.6, z: 5.6 },
    ],
    [
      { x: -20.2, z: 9.5 },
      { x: -22.1, z: 7 },
    ],
    [
      { x: 1, z: -3.2 },
      { x: 1, z: -1.1 },
    ],
    [
      { x: -6.2, z: 8.7 },
      { x: -5.8, z: 11 },
    ],
    [
      { x: -16.6, z: -4.9 },
      { x: -16.1, z: -8.7 },
    ],
    [
      { x: -17, z: -3.3 },
      { x: -20.7, z: -3.3 },
    ],
    [
      { x: -8.2, z: -4.1 },
      { x: -8.5, z: -0.8 },
    ],
    [
      { x: -11.2, z: 8.2 },
      { x: -10.8, z: 6.7 },
    ],
    [
      { x: -17, z: -2 },
      { x: -15.2, z: -2 },
    ],
    [
      { x: 10.9, z: -3.2 },
      { x: 11.2, z: -0.5 },
    ],
    [
      { x: 66.3, z: 0 },
      { x: 64.4, z: 5.6 },
      { x: 59.2, z: 9.8 },
      { x: 52, z: 11.3 },
      { x: 44.2, z: 10.7 },
      { x: 39.6, z: 5.6 },
      { x: 37.7, z: 0 },
      { x: 39.6, z: -5.6 },
      { x: 44.8, z: -9.8 },
      { x: 52, z: -11.3 },
      { x: 61.1, z: -12.4 },
      { x: 64.4, z: -5.6 },
      { x: 66.3, z: 0 },
    ],
    [
      { x: 18.9, z: -3.7 },
      { x: 20, z: -3.5 },
      { x: 27.5, z: -3.5 },
      { x: 37.7, z: 0 },
    ],
    [
      { x: 39.6, z: -5.6 },
      { x: 35.1, z: -9.3 },
    ],
    [
      { x: 64.4, z: 5.6 },
      { x: 69.6, z: 8 },
    ],
    [
      { x: 39.2, z: 4.3 },
      { x: 33.8, z: 6.1 },
    ],
    [
      { x: 57.1, z: 10.2 },
      { x: 58.3, z: 16 },
    ],
    [
      { x: 64.5, z: -5.2 },
      { x: 70.2, z: -7.1 },
    ],
    [
      { x: 44.7, z: 10.7 },
      { x: 44.3, z: 15.9 },
    ],
    [
      { x: 48.7, z: -10.6 },
      { x: 47.5, z: -16.4 },
    ],
    [
      { x: 30.8, z: -2.4 },
      { x: 31.1, z: -3.1 },
    ],
    [
      { x: 48.7, z: -10.6 },
      { x: 50.1, z: -5.5 },
    ],
    [
      { x: -37.7, z: 0 },
      { x: -39.6, z: 5.6 },
      { x: -44.8, z: 9.8 },
      { x: -52, z: 11.3 },
      { x: -61.1, z: 12.4 },
      { x: -64.4, z: 5.6 },
      { x: -66.3, z: 0 },
      { x: -64.4, z: -5.6 },
      { x: -59.1, z: -9.8 },
      { x: -52, z: -11.3 },
      { x: -44.2, z: -10.7 },
      { x: -39.6, z: -5.6 },
      { x: -37.7, z: 0 },
    ],
    [
      { x: -20.4, z: 0.6 },
      { x: -20, z: 3 },
      { x: -27.5, z: 3 },
      { x: -37.7, z: 0 },
    ],
    [
      { x: -31.3, z: 1.9 },
      { x: -33, z: 7.6 },
    ],
    [
      { x: -64.7, z: -4.6 },
      { x: -70.3, z: -6.5 },
    ],
    [
      { x: -58.1, z: -10 },
      { x: -59.2, z: -15.2 },
    ],
    [
      { x: -39.5, z: -5.5 },
      { x: -34.1, z: -7.3 },
    ],
    [
      { x: -47.2, z: 10.3 },
      { x: -46.1, z: 15.8 },
    ],
    [
      { x: -64.4, z: 5.6 },
      { x: -69.6, z: 7.8 },
    ],
    [
      { x: -46.2, z: -10.9 },
      { x: -45.8, z: -16 },
    ],
    [
      { x: -48.2, z: 10.5 },
      { x: -49.4, z: 4.7 },
    ],
    [
      { x: -63.9, z: 6.6 },
      { x: -58.8, z: 4.1 },
    ],
  ],
  drawnBridges: [],
  lookouts: [
    {
      id: "obsidian-lookout",
      name: "the Obsidian Lookout",
      position: { x: 19, z: -4 },
      viewHeight: 4.6,
      look: "island-landmark",
    },
    {
      id: "ash-watchtower",
      name: "the Ash Watchtower",
      position: { x: -10.4, z: 2.6 },
      viewHeight: 4.2,
      look: "watchtower",
    },
    {
      id: "ember-cinder-tower",
      name: "the Cinder Watchtower",
      position: { x: 6.8, z: 9.5 },
      viewHeight: 4.2,
      look: "watchtower",
    },
    {
      id: "cinder-watchtower",
      name: "the Cinder Watchtower",
      position: { x: -0.5, z: -8.5 },
      viewHeight: 4.2,
      look: "watchtower",
    },
    {
      id: "ember-forge-tower",
      name: "the Forge Watchtower",
      position: { x: -12.9, z: -4.7 },
      viewHeight: 4.2,
      look: "watchtower",
    },
    {
      id: "ember-magma-tower",
      name: "the Magma Watchtower",
      position: { x: 35.1, z: -9.3 },
      viewHeight: 4.2,
      look: "watchtower",
    },
    {
      id: "ember-basalt-tower",
      name: "the Basalt Watchtower",
      position: { x: -33, z: 7.6 },
      viewHeight: 4.2,
      look: "watchtower",
    },
  ],
  signs: [
    {
      id: "ember-lava",
      position: { x: 7.4, z: -6.6 },
      title: "Lava",
      fact: "Lava is melted rock. It can be over 1,000 degrees Celsius, so never touch it!",
    },
    {
      id: "ember-rock",
      position: { x: -14.4, z: 3 },
      title: "Igneous Rock",
      fact: "When lava cools down it turns into hard rock called igneous rock, like basalt and obsidian.",
    },
    {
      id: "ember-steam",
      position: { x: 4, z: 0.6 },
      title: "Steam Vents",
      fact: "Steam vents puff out water that has been heated by hot rock deep under the ground.",
    },
    {
      id: "ember-forge",
      position: { x: -4.6, z: -2.4 },
      title: "The Iron Age",
      fact: "In the Iron Age, people heated iron in hot fires to make strong tools and swords.",
    },
    {
      id: "ember-rock-types",
      position: { x: 13.1, z: -5.2 },
      title: "Rock Types",
      fact: "There are three kinds of rock: igneous rock from cooled lava, sedimentary rock from layers, and metamorphic rock.",
    },
    {
      id: "ember-fossils",
      position: { x: 11.7, z: 8.8 },
      title: "Fossils",
      fact: "Fossils are the remains of plants and animals from long ago, kept in sedimentary rock.",
    },
    {
      id: "ember-earthquakes",
      position: { x: -7.2, z: -8 },
      title: "Earthquakes",
      fact: "The Earth's crust is made of giant pieces called plates. When they slip past each other, the ground shakes.",
    },
    {
      id: "ember-bronze-age",
      position: { x: -14.9, z: 8.1 },
      title: "The Bronze Age",
      fact: "In the Bronze Age, people mixed copper and tin to make bronze, which is harder than either metal.",
    },
    {
      id: "ember-mary-anning",
      position: { x: -20.5, z: 10 },
      title: "Mary Anning",
      fact: "Mary Anning found the fossil of an ichthyosaur on a beach in Dorset when she was about twelve years old.",
    },
    {
      id: "ember-burning",
      position: { x: -23, z: 1 },
      title: "Irreversible Changes",
      fact: "Burning is an irreversible change. Once wood has burnt to ash, it can never turn back into wood.",
    },
    {
      id: "ember-pompeii",
      position: { x: 15, z: -8.5 },
      title: "Pompeii",
      fact: "In AD 79 the volcano Vesuvius erupted and buried the Roman town of Pompeii under ash.",
    },
    {
      id: "ember-plates",
      position: { x: -16, z: 12 },
      title: "Moving Plates",
      fact: "The Earth's crust is broken into giant plates. Where they push together, mountains and volcanoes form.",
    },
    {
      id: "ember-vikings",
      position: { x: -16.1, z: -8.7 },
      title: "The Vikings",
      fact: "The Vikings sailed from Scandinavia in longships and settled in Britain over 1,000 years ago.",
    },
    {
      id: "ember-ancient-greece",
      position: { x: 4.8, z: -3.5 },
      title: "Ancient Greece",
      fact: "The Ancient Greeks held the first Olympic Games more than 2,700 years ago, in honour of their god Zeus.",
    },
    {
      id: "ember-dissolving",
      position: { x: -20.7, z: -3.3 },
      title: "Dissolving",
      fact: "When sugar dissolves in water it seems to vanish, but it is still there. You can taste it, and get it back by evaporating the water.",
    },
    {
      id: "ember-friction",
      position: { x: -8.5, z: -0.8 },
      title: "Friction",
      fact: "Friction is a force that slows things down when two surfaces rub together. Rough surfaces make more friction.",
    },
    {
      id: "ember-levers",
      position: { x: 69.6, z: 8 },
      title: "Levers and Pulleys",
      fact: "Levers, pulleys and gears let a small force move something heavy.",
    },
    {
      id: "ember-air-resistance",
      position: { x: 33.8, z: 6.1 },
      title: "Air Resistance",
      fact: "Air resistance pushes against things moving through the air. Parachutes use it to fall slowly.",
    },
    {
      id: "ember-reversible",
      position: { x: 58.3, z: 16 },
      title: "Reversible Changes",
      fact: "Melting ice and dissolving salt are reversible changes, because you can get the ice or salt back.",
    },
    {
      id: "ember-life-cycles",
      position: { x: 70.2, z: -7.1 },
      title: "Life Cycles",
      fact: "A frog's life cycle goes from egg, to tadpole, to froglet, to frog.",
    },
    {
      id: "ember-anglo-saxons",
      position: { x: -70.3, z: -6.5 },
      title: "The Anglo-Saxons",
      fact: "The Anglo-Saxons came to Britain after the Romans left, and gave England its name.",
    },
    {
      id: "ember-hard-materials",
      position: { x: -59.2, z: -15.2 },
      title: "Hard Materials",
      fact: "Diamond is the hardest natural material. It can even scratch glass!",
    },
    {
      id: "ember-ring-of-fire",
      position: { x: -34.1, z: -7.3 },
      title: "The Ring of Fire",
      fact: "Most of the world's volcanoes are around the edge of the Pacific Ocean, in a zone called the Ring of Fire.",
    },
    {
      id: "ember-water-resistance",
      position: { x: -46.1, z: 15.8 },
      title: "Water Resistance",
      fact: "Water resistance slows things down in water. Fish and boats have smooth, pointed shapes to move easily.",
    },
  ],
  hideaways: [
    {
      id: "miners-camp",
      position: { x: -12.1, z: 11.6 },
      name: "the Miners' Camp",
      discovery:
        "Picks, lamps and baskets of shiny rocks dug out of the mountain.",
    },
    {
      id: "hot-spring-hut",
      position: { x: 15.9, z: 0.4 },
      name: "the Hot Spring Hut",
      discovery:
        "Water heated deep underground bubbles up here, warm enough for a bath.",
    },
    {
      id: "blacksmiths-forge",
      position: { x: 1.2, z: 10.2 },
      name: "the Blacksmith's Forge",
      discovery:
        "An old forge where iron was heated until it glowed and hammered into tools.",
    },
    {
      id: "ash-garden",
      position: { x: -5.8, z: 5.3 },
      name: "the Ash Garden",
      discovery:
        "Plants grow well here because volcanic ash makes very rich soil.",
    },
    {
      id: "blacksmith-forge",
      position: { x: -8.5, z: -11 },
      name: "the Blacksmith's Forge",
      discovery:
        "An anvil and tongs. Heating iron makes it soft enough to hammer into tools.",
    },
    {
      id: "hot-spring",
      position: { x: 8.5, z: 5 },
      name: "the Hot Spring",
      discovery:
        "Warm water bubbling up from underground, heated by hot rock deep below.",
    },
    {
      id: "roman-villa",
      position: { x: -22.5, z: 6.5 },
      name: "the Roman Villa",
      discovery:
        "Broken mosaic tiles in the ash. The Romans made pictures from thousands of tiny coloured stones.",
    },
    {
      id: "crystal-geode",
      position: { x: 1, z: -0.5 },
      name: "the Crystal Geode",
      discovery:
        "A rock split open to show sparkling crystals that grew inside it very slowly.",
    },
    {
      id: "viking-longhouse",
      position: { x: -10.8, z: 6.7 },
      name: "the Viking Longhouse",
      discovery:
        "A long wooden hall with a fire in the middle. Whole families, and their animals, lived inside.",
    },
    {
      id: "lava-tube",
      position: { x: 11.1, z: -8.4 },
      name: "the Lava Tube",
      discovery:
        "A tunnel left behind when flowing lava cooled on the outside and drained away inside.",
    },
    {
      id: "glassblowers-hut",
      position: { x: -15.2, z: -2 },
      name: "the Glassblower's Hut",
      discovery:
        "Glass is made by melting sand in a fierce fire. Here it's blown into bubbles to make bottles and bowls.",
    },
    {
      id: "greek-temple",
      position: { x: 11.2, z: -0.5 },
      name: "the Greek Temple",
      discovery:
        "Tall stone columns hold up the roof of a temple built by the Ancient Greeks.",
    },
    {
      id: "basalt-steps",
      position: { x: 44.3, z: 15.9 },
      name: "the Basalt Steps",
      discovery:
        "Six-sided stone columns made when lava cooled very slowly, like giant stepping stones.",
    },
    {
      id: "mud-pools",
      position: { x: 47.5, z: -16.4 },
      name: "the Hot Mud Pools",
      discovery:
        "Bubbling grey mud, heated from underground. Blup, blup, blup!",
    },
    {
      id: "saxon-village",
      position: { x: 31.1, z: -3.1 },
      name: "the Anglo-Saxon Village",
      discovery:
        "Thatched wooden houses around a great hall, where the village chief held feasts.",
    },
    {
      id: "gemstone-mine",
      position: { x: 50.1, z: -5.5 },
      name: "the Gemstone Mine",
      discovery:
        "A tunnel glittering with red garnets and purple amethysts in the rock.",
    },
    {
      id: "bellows-workshop",
      position: { x: -69.6, z: 7.8 },
      name: "the Bellows Workshop",
      discovery:
        "Pump the bellows to puff air into the fire and make it roar hotter.",
    },
    {
      id: "sulphur-springs",
      position: { x: -45.8, z: -16 },
      name: "the Sulphur Springs",
      discovery:
        "Yellow crystals around a steaming spring. Phew, it smells like rotten eggs!",
    },
    {
      id: "ash-observatory",
      position: { x: -49.4, z: 4.7 },
      name: "the Ash Cloud Observatory",
      discovery:
        "Scientists watch the volcano from here to warn people before it erupts.",
    },
    {
      id: "dragon-cave",
      position: { x: -58.8, z: 4.1 },
      name: "the Dragon Rock Cave",
      discovery:
        "A cave shaped like a sleeping dragon's head. Don't worry, it's only rock!",
    },
  ],
  treasureKind: {
    singular: "Fire Opal",
    plural: "Fire Opals",
    colour: "#fb7185",
  },
  treasures: [
    { id: "opal-crater-rim", position: { x: 1.2, z: -11.2 } },
    { id: "opal-islet", position: emberIslet },
    { id: "opal-north-east", position: { x: 12.4, z: -11.4 } },
    { id: "opal-north-west", position: { x: -4, z: -12.4 } },
    { id: "opal-cliffs", position: { x: 21, z: 2 } },
    { id: "opal-quarry", position: { x: -19.4, z: 7 } },
    { id: "opal-shore", position: { x: -4, z: 10 } },
    { id: "opal-plain", position: { x: -20.6, z: -1.6 } },
    { id: "opal-9", position: { x: 1.2, z: -5.2 } },
    { id: "opal-10", position: { x: -18.4, z: 12.3 } },
    { id: "opal-11", position: { x: 17.3, z: -9.4 } },
    { id: "opal-12", position: { x: -17, z: -8.7 } },
    { id: "opal-13", position: { x: -13.5, z: -4.5 } },
    { id: "opal-14", position: { x: -24, z: 4.6 } },
    { id: "opal-15", position: { x: 18, z: 5.3 } },
    { id: "opal-16", position: { x: -3, z: -6.6 } },
    { id: "opal-17", position: { x: -16.3, z: -1 } },
    { id: "opal-18", position: { x: 4.7, z: -13.6 } },
    { id: "opal-19", position: { x: -6.5, z: 1.1 } },
    { id: "opal-20", position: { x: 5.4, z: -3.1 } },
    { id: "opal-21", position: { x: 11.5, z: -7.5 } },
    { id: "opal-22", position: { x: -15, z: 0 } },
    { id: "opal-23", position: { x: -12, z: -6 } },
    { id: "opal-24", position: { x: -12, z: -3 } },
    { id: "opal-25", position: { x: 4, z: -2 } },
    { id: "opal-26", position: { x: 10, z: -8 } },
    { id: "opal-27", position: { x: -12, z: -4.5 } },
    { id: "opal-28", position: { x: -12, z: 6 } },
    { id: "opal-29", position: { x: 8.5, z: 2 } },
    { id: "opal-30", position: { x: 24, z: 14 } },
    { id: "opal-31", position: { x: -12.5, z: 7 } },
    { id: "opal-32", position: { x: 10.5, z: -10.5 } },
    { id: "opal-33", position: { x: 14.5, z: -2 } },
    { id: "opal-34", position: { x: -14, z: -1 } },
    { id: "opal-35", position: { x: -13, z: -2 } },
    { id: "opal-36", position: { x: -11, z: -7 } },
    { id: "opal-37", position: { x: -10, z: -8 } },
    { id: "opal-38", position: { x: -14.5, z: -9 } },
    { id: "opal-39", position: { x: -1.5, z: 10.5 } },
    { id: "opal-40", position: { x: -22, z: 3.5 } },
    { id: "opal-41", position: { x: 3.7, z: -8.5 } },
    { id: "opal-42", position: { x: 21.9, z: -2.8 } },
    { id: "opal-43", position: { x: 4.2, z: 11.7 } },
    { id: "opal-44", position: { x: 21.5, z: -6 } },
    { id: "opal-45", position: { x: -1.7, z: -3.2 } },
    { id: "opal-46", position: { x: -19.9, z: -6.4 } },
    { id: "opal-47", position: { x: 0.7, z: -14.2 } },
    { id: "opal-48", position: { x: 12.2, z: 5.5 } },
    { id: "opal-49", position: { x: 5.8, z: 6.4 } },
    { id: "opal-50", position: { x: -3, z: 3.9 } },
    { id: "opal-51", position: { x: 9.4, z: 10.6 } },
    { id: "opal-52", position: { x: -8.5, z: 4.6 } },
    { id: "opal-53", position: { x: -3.3, z: -9.7 } },
    { id: "opal-54", position: { x: -17.6, z: 9.2 } },
    { id: "opal-55", position: { x: 5.4, z: -10.9 } },
    { id: "opal-56", position: { x: 13.4, z: 1.6 } },
    { id: "opal-57", position: { x: -6.5, z: -13.1 } },
    { id: "opal-58", position: { x: -9.5, z: 11.3 } },
    { id: "opal-59", position: { x: 15.6, z: -6 } },
    { id: "opal-60", position: { x: 9, z: 8 } },
    { id: "opal-61", position: { x: 50.8, z: 18.1 } },
    { id: "opal-62", position: { x: 37.4, z: 13.2 } },
    { id: "opal-63", position: { x: 66.9, z: -13.9 } },
    { id: "opal-64", position: { x: 54.1, z: 5.6 } },
    { id: "opal-65", position: { x: 57.2, z: -6.2 } },
    { id: "opal-66", position: { x: 53.5, z: -17.7 } },
    { id: "opal-67", position: { x: 42.4, z: 2.4 } },
    { id: "opal-68", position: { x: 61.7, z: 2.6 } },
    { id: "opal-69", position: { x: 61.4, z: -2.7 } },
    { id: "opal-70", position: { x: 56.3, z: 10.9 } },
    { id: "opal-71", position: { x: 47.2, z: 7.5 } },
    { id: "opal-72", position: { x: 39.4, z: -6 } },
    { id: "opal-73", position: { x: 48.4, z: -11.4 } },
    { id: "opal-74", position: { x: 31.3, z: 1.9 } },
    { id: "opal-75", position: { x: 52, z: -1 } },
    { id: "opal-76", position: { x: 65.4, z: -5.6 } },
    { id: "opal-77", position: { x: 70.8, z: -2.3 } },
    { id: "opal-78", position: { x: 65.1, z: 6.1 } },
    { id: "opal-79", position: { x: 70.3, z: 2.6 } },
    { id: "opal-80", position: { x: 38.4, z: 4.8 } },
    { id: "opal-81", position: { x: -57.9, z: 17.3 } },
    { id: "opal-82", position: { x: -52.7, z: -17.5 } },
    { id: "opal-83", position: { x: -59.6, z: -2 } },
    { id: "opal-84", position: { x: -52, z: 17.4 } },
    { id: "opal-85", position: { x: -38.4, z: 5.6 } },
    { id: "opal-86", position: { x: -48, z: -7.1 } },
    { id: "opal-87", position: { x: -56.5, z: -8.1 } },
    { id: "opal-88", position: { x: -42.5, z: 2.4 } },
    { id: "opal-89", position: { x: -38.7, z: -5.1 } },
    { id: "opal-90", position: { x: -64.3, z: 6 } },
    { id: "opal-91", position: { x: -67.2, z: 12.7 } },
    { id: "opal-92", position: { x: -74, z: 5.1 } },
    { id: "opal-93", position: { x: -47.9, z: 9.8 } },
    { id: "opal-94", position: { x: -65.7, z: -4.3 } },
    { id: "opal-95", position: { x: -62.7, z: 15.5 } },
    { id: "opal-96", position: { x: -54, z: 1.8 } },
    { id: "opal-97", position: { x: -57.1, z: 9 } },
    { id: "opal-98", position: { x: -34.2, z: 3 } },
    { id: "opal-99", position: { x: -41.4, z: 15.4 } },
    { id: "opal-100", position: { x: -41, z: -15.8 } },
    { id: "opal-east-lake", position: { x: 53, z: 5 } },
    { id: "opal-west-lake", position: { x: -49, z: -6 } },
    { id: "opal-east-summit", position: { x: 58, z: -8 } },
    { id: "opal-west-summit", position: { x: -58, z: 8 } },
  ],
  bouncePads: {
    name: "Steam Vent",
    colour: "#f5f5f4",
    places: [
      ...steamVentPositions,
      { x: -0.9, z: 6 },
      { x: 8.2, z: -10.8 },
      { x: -19.8, z: 2.5 },
      { x: -2.5, z: 8.5 },
      { x: 18.5, z: 2.5 },
      { x: -18.5, z: 0 },
      { x: 18, z: -7.2 },
      { x: 3.9, z: 4.1 },
      { x: 8.3, z: 0.1 },
      { x: 65.8, z: 13.6 },
      { x: 59.3, z: -15.3 },
      { x: 41.3, z: -14.8 },
      { x: 44.2, z: -2.8 },
      { x: -37.5, z: 12.6 },
      { x: -66.8, z: -12.3 },
      { x: -31.1, z: -1.2 },
      { x: -37.3, z: -12.6 },
    ],
  },
  airfield: emberAirfield,
  hoverPad: {
    centre: { x: -34, z: -1 },
    heading: -0.524,
    slipStart: 4.75,
    slipLevel: 1,
  },
  dock: {
    from: { x: -5.8, z: 11 },
    to: { x: -7.7, z: 14.4 },
    berthSide: -1,
  },
  friendKind: {
    singular: "Lizard",
    plural: "Lizards",
    look: "lizard",
  },
  friends: [
    {
      id: "lizard-cinder",
      position: { x: 24.3, z: 12.7 },
      name: "Cinder the Lizard",
      greeting:
        "Hello! Lizards are reptiles. We are cold-blooded, so we bask on warm rocks to heat up.",
    },
    {
      id: "lizard-blaze",
      position: { x: 19.3, z: -0.6 },
      name: "Blaze the Lizard",
      greeting:
        "Lizards hatch from eggs. That's the very start of our life cycle.",
    },
    {
      id: "lizard-flint",
      position: { x: 21.9, z: 14.7 },
      name: "Flint the Lizard",
      greeting:
        "If a bird grabs my tail, it can drop off so I can escape. It grows back later!",
    },
    {
      id: "lizard-ash",
      position: { x: 15.1, z: 3.8 },
      name: "Ash the Lizard",
      greeting:
        "My skin is covered in dry scales. I shed my old skin as I grow bigger.",
    },
    {
      id: "lizard-sparky",
      position: { x: 15.9, z: -3.3 },
      name: "Sparky the Lizard",
      greeting:
        "Geckos have tiny hairs on their toes that let them climb straight up walls.",
    },
    {
      id: "lizard-magma",
      position: { x: -9.6, z: -5.9 },
      name: "Magma the Lizard",
      greeting:
        "Some lizards smell the air by flicking out their tongues. Sniff sniff!",
    },
    {
      id: "watchtower-ember",
      position: { x: 56.8, z: 0.1 },
      name: "Ember the Lizard",
      greeting: "Chameleons can change colour to show how they feel.",
    },
    {
      id: "watchtower-scales",
      position: { x: 47.7, z: 2.4 },
      name: "Scales the Lizard",
      greeting:
        "Some lizards can run across water for a short way without sinking!",
    },
    {
      id: "watchtower-pumice",
      position: { x: 74.5, z: 0.9 },
      name: "Pumice the Lizard",
      greeting: "The Komodo dragon is the biggest lizard in the world.",
    },
    {
      id: "watchtower-obsidian",
      position: { x: -53.7, z: -3.2 },
      name: "Obsidian the Lizard",
      greeting: "Lizards are vertebrates. We have a backbone, just like you.",
    },
    {
      id: "watchtower-basalt",
      position: { x: -45.8, z: -1.8 },
      name: "Basalt the Lizard",
      greeting: "Most lizards eat insects. Crunch, crunch!",
    },
    {
      id: "watchtower-tinder",
      position: { x: -72.9, z: 0.1 },
      name: "Tinder the Lizard",
      greeting:
        "Some lizards puff themselves up to look bigger and scare away predators.",
    },
  ],
  races: [
    {
      id: "ember-cinder-sprint",
      name: "the Cinder Sprint",
      seconds: 140,
      rings: [
        { x: 66.3, z: 0 },
        { x: 60.9, z: 8.4 },
        { x: 51.2, z: 11.2 },
        { x: 41.9, z: 8.2 },
        { x: 38, z: -1 },
        { x: 43.9, z: -9.1 },
        { x: 53.8, z: -11.5 },
        { x: 62.4, z: -9.6 },
      ],
    },
    {
      id: "ember-magma-dash",
      name: "the Magma Dash",
      seconds: 140,
      rings: [
        { x: -37.7, z: 0 },
        { x: -43.1, z: 8.4 },
        { x: -52.8, z: 11.4 },
        { x: -62, z: 10.6 },
        { x: -66, z: 1 },
        { x: -61.7, z: -7.7 },
        { x: -52.2, z: -11.3 },
        { x: -42.6, z: -8.9 },
      ],
    },
  ],
  gravity: earthGravity,
  findHeight: emberIsle.findHeight,
  findCourseKind: findCourseKindIn(emberIsle),
};

const starfallAdventure: IslandAdventure = {
  islandId: "starfall-isle",
  start: { x: -2.6, z: 8.4 },
  startHeading: Math.PI,
  trailColour: "#a5a3c8",
  trails: [
    [
      { x: -4, z: 11 },
      { x: -9, z: 9 },
      { x: -14, z: 6 },
    ],
    [
      { x: -14, z: 6 },
      { x: -17, z: 0.6 },
      { x: -17, z: -5 },
    ],
    [
      { x: -17, z: -5 },
      { x: -11, z: -6.4 },
      { x: -5, z: -6 },
    ],
    [
      { x: -5, z: -6 },
      { x: 1, z: -8.4 },
      { x: 7, z: -9 },
    ],
    [
      { x: 7, z: -9 },
      { x: 12, z: -6.4 },
      { x: 17, z: -3 },
    ],
    [
      { x: 17, z: -3 },
      { x: 17.6, z: 2.6 },
      { x: 16, z: 8 },
    ],
    [
      { x: 16, z: 8 },
      { x: 10.6, z: 6.4 },
      { x: 5, z: 6 },
    ],
    [
      { x: 5, z: 6 },
      { x: 0.6, z: 8.6 },
      { x: -4, z: 11 },
    ],
    [
      { x: 5, z: 6 },
      { x: 0, z: 0 },
      { x: -5, z: -6 },
    ],
    [
      { x: 5, z: 6 },
      { x: 9, z: -1 },
      { x: 12, z: -6.4 },
    ],
    [
      { x: 1, z: -8.4 },
      { x: 0.7, z: -9 },
    ],
    [
      { x: -14, z: 6 },
      { x: -9.5, z: 2.4 },
    ],
    [
      { x: 1, z: -8.4 },
      { x: 2.3, z: -4.6 },
    ],
    [
      { x: -11, z: -6.4 },
      { x: -11, z: -4.6 },
    ],
    [
      { x: 17.6, z: 2.6 },
      { x: 19.9, z: 2.5 },
    ],
    [
      { x: -9.5, z: 2.4 },
      { x: -5, z: 4.7 },
    ],
    [
      { x: -17, z: -5 },
      { x: -19.3, z: -11.4 },
    ],
    [
      { x: -19.3, z: -11.4 },
      { x: -23.4, z: -10.6 },
    ],
    [
      { x: -5, z: 4.7 },
      { x: -5, z: 1.6 },
    ],
    [
      { x: -6.1, z: 10.2 },
      { x: -6.7, z: 11.7 },
    ],
    [
      { x: -3.3, z: -6.7 },
      { x: -4.9, z: -10.7 },
    ],
    [
      { x: 11.8, z: 6.8 },
      { x: 12, z: 6.1 },
    ],
    [
      { x: 9.9, z: -2.7 },
      { x: 6.7, z: -4.5 },
    ],
    [
      { x: -18.2, z: -8.3 },
      { x: -20, z: -7.7 },
    ],
    [
      { x: 10.4, z: -3.5 },
      { x: 13, z: -2.1 },
    ],
    [
      { x: 15.2, z: 7.8 },
      { x: 14.2, z: 11.2 },
    ],
    [
      { x: -17, z: 0.6 },
      { x: -21.1, z: 1.1 },
    ],
    [
      { x: -11.5, z: 4 },
      { x: -12.6, z: 2.7 },
    ],
    [
      { x: 14.1, z: -5 },
      { x: 14.5, z: -5.6 },
    ],
    [
      { x: 66.3, z: 0 },
      { x: 64.4, z: 5.6 },
      { x: 59.2, z: 9.8 },
      { x: 52, z: 11.3 },
      { x: 44.9, z: 9.8 },
      { x: 39.6, z: 5.6 },
      { x: 37.7, z: 0 },
      { x: 39.6, z: -5.6 },
      { x: 44.8, z: -9.8 },
      { x: 52, z: -11.3 },
      { x: 60.5, z: -11.5 },
      { x: 64.4, z: -5.6 },
      { x: 66.3, z: 0 },
    ],
    [
      { x: 19.9, z: 2.5 },
      { x: 20, z: 2 },
      { x: 27.5, z: 2 },
      { x: 37.7, z: 0 },
    ],
    [
      { x: 30.9, z: 1.3 },
      { x: 32, z: 6.9 },
    ],
    [
      { x: 39.6, z: -5.6 },
      { x: 34.9, z: -8.9 },
    ],
    [
      { x: 57, z: 10.3 },
      { x: 58.2, z: 15.9 },
    ],
    [
      { x: 64.4, z: 5.6 },
      { x: 69.5, z: 7.6 },
    ],
    [
      { x: 64.5, z: -5.2 },
      { x: 70.1, z: -7.1 },
    ],
    [
      { x: 45.6, z: 10 },
      { x: 44.5, z: 15.4 },
    ],
    [
      { x: 48.1, z: -10.5 },
      { x: 46.9, z: -16.1 },
    ],
    [
      { x: 59.1, z: -11.5 },
      { x: 59, z: -15.6 },
    ],
    [
      { x: 48.7, z: -10.6 },
      { x: 49.8, z: -5.1 },
    ],
    [
      { x: -37.7, z: 0 },
      { x: -39.6, z: 5.6 },
      { x: -44.8, z: 9.8 },
      { x: -52, z: 11.3 },
      { x: -60.4, z: 11.5 },
      { x: -64.4, z: 5.6 },
      { x: -66.3, z: 0 },
      { x: -64.4, z: -5.6 },
      { x: -59.1, z: -9.8 },
      { x: -52, z: -11.3 },
      { x: -44.8, z: -9.8 },
      { x: -39.6, z: -5.6 },
      { x: -37.7, z: 0 },
    ],
    [
      { x: -19.9, z: -7.7 },
      { x: -20, z: -8 },
      { x: -27.5, z: -8 },
      { x: -39.1, z: -4.1 },
    ],
    [
      { x: -32.5, z: -6.3 },
      { x: -33.1, z: -8 },
    ],
    [
      { x: -39.6, z: 5.6 },
      { x: -34.6, z: 8.4 },
    ],
    [
      { x: -64.5, z: -5.3 },
      { x: -70.1, z: -7.2 },
    ],
    [
      { x: -58.7, z: -9.9 },
      { x: -59.9, z: -15.7 },
    ],
    [
      { x: -64.4, z: 5.6 },
      { x: -69.8, z: 8 },
    ],
    [
      { x: -47, z: -10.3 },
      { x: -45.8, z: -16.1 },
    ],
    [
      { x: -46.1, z: 10.1 },
      { x: -44.9, z: 15.7 },
    ],
    [
      { x: -48.1, z: 10.5 },
      { x: -49.3, z: 4.9 },
    ],
    [
      { x: -56.5, z: -10.3 },
      { x: -55.3, z: -4.6 },
    ],
  ],
  drawnBridges: [],
  lookouts: [
    {
      id: "comet-observatory",
      name: "the Comet Observatory",
      position: observatoryHill,
      viewHeight: 4.4,
      look: "island-landmark",
    },
    {
      id: "signal-tower",
      name: "the Signal Tower",
      position: { x: 16, z: 8 },
      viewHeight: 5,
      look: "island-landmark",
    },
    {
      id: "starfall-stargazer-tower",
      name: "the Stargazer Tower",
      position: { x: -10, z: -8.7 },
      viewHeight: 4.2,
      look: "watchtower",
    },
    {
      id: "comet-watchtower",
      name: "the Comet Watchtower",
      position: { x: 0.5, z: -9.5 },
      viewHeight: 4.2,
      look: "watchtower",
    },
    {
      id: "starfall-nebula-tower",
      name: "the Nebula Watchtower",
      position: { x: -4.9, z: -10.7 },
      viewHeight: 4.2,
      look: "watchtower",
    },
    {
      id: "starfall-meteor-tower",
      name: "the Meteor Watchtower",
      position: { x: 32, z: 6.9 },
      viewHeight: 4.2,
      look: "watchtower",
    },
    {
      id: "starfall-galaxy-tower",
      name: "the Galaxy Watchtower",
      position: { x: -33.1, z: -8 },
      viewHeight: 4.2,
      look: "watchtower",
    },
  ],
  signs: [
    {
      id: "starfall-moon",
      position: { x: -1.6, z: 2.6 },
      title: "The Moon",
      fact: "The Moon has less gravity than the Earth, so astronauts can jump much higher there. Try jumping here!",
    },
    {
      id: "starfall-crater",
      position: { x: 6, z: 9.6 },
      title: "Craters",
      fact: "A crater is a round hole made when a rock from space, called a meteorite, crashes into the ground.",
    },
    {
      id: "starfall-planets",
      position: { x: 3.6, z: -7.4 },
      title: "The Planets",
      fact: "Eight planets travel around the Sun. Earth is the third planet from the Sun.",
    },
    {
      id: "starfall-stones",
      position: { x: -14.4, z: -2.6 },
      title: "Standing Stones",
      fact: "Stone Age people built stone circles, like Stonehenge, lined up with the Sun.",
    },
    {
      id: "starfall-sun",
      position: { x: 16.6, z: 2.5 },
      title: "The Sun",
      fact: "The Sun is a star. The Earth travels all the way around it once a year, which takes about 365 days.",
    },
    {
      id: "starfall-day-night",
      position: { x: -10, z: 6.7 },
      title: "Day and Night",
      fact: "The Earth spins round once every 24 hours. It is day on the side facing the Sun and night on the other side.",
    },
    {
      id: "starfall-gravity",
      position: { x: -14.2, z: -7.3 },
      title: "Gravity",
      fact: "Gravity pulls things towards each other. On the Moon gravity is weaker, so you could jump about six times higher!",
    },
    {
      id: "starfall-shadows",
      position: { x: 8.2, z: 4.6 },
      title: "Shadows",
      fact: "A shadow forms when something blocks light. Shadows are longest in the morning and evening, when the Sun is low.",
    },
    {
      id: "starfall-light",
      position: { x: -9, z: 2 },
      title: "How Light Travels",
      fact: "Light travels in straight lines. We see things when light bounces off them and into our eyes.",
    },
    {
      id: "starfall-constellations",
      position: { x: 2.5, z: -4 },
      title: "Constellations",
      fact: "A constellation is a group of stars that makes a picture in the sky, like the Plough or Orion.",
    },
    {
      id: "starfall-moon-landing",
      position: { x: -11, z: -4 },
      title: "The Moon Landing",
      fact: "In 1969 Neil Armstrong and Buzz Aldrin became the first people to walk on the Moon.",
    },
    {
      id: "starfall-meteors",
      position: { x: 20.5, z: 2.5 },
      title: "Meteors",
      fact: "A meteor is a bit of space rock burning up in our sky. If it lands on Earth it is called a meteorite.",
    },
    {
      id: "starfall-heart",
      position: { x: 12, z: 6.1 },
      title: "The Heart",
      fact: "Your heart pumps blood all round your body. The blood carries oxygen from your lungs to every part of you.",
    },
    {
      id: "starfall-evolution",
      position: { x: 6.7, z: -4.5 },
      title: "Evolution",
      fact: "Over millions of years, living things slowly change to suit where they live. This is called evolution.",
    },
    {
      id: "starfall-circuits",
      position: { x: -20, z: -7.7 },
      title: "Electric Circuits",
      fact: "A circuit must be a complete loop for electricity to flow. Open a switch and the bulb goes out.",
    },
    {
      id: "starfall-darwin",
      position: { x: 13, z: -2.1 },
      title: "Charles Darwin",
      fact: "Charles Darwin sailed round the world on HMS Beagle. Studying finches on the Galapagos Islands helped him explain evolution.",
    },
    {
      id: "starfall-seeing",
      position: { x: 34.9, z: -8.9 },
      title: "How We See",
      fact: "We see things because light travels from them into our eyes.",
    },
    {
      id: "starfall-circuit-symbols",
      position: { x: 58.2, z: 15.9 },
      title: "Circuit Symbols",
      fact: "Scientists draw circuits with symbols. A circle with a cross is a bulb, and a long and a short line make a cell.",
    },
    {
      id: "starfall-adaptation",
      position: { x: 69.5, z: 7.6 },
      title: "Adaptation",
      fact: "Animals are adapted to where they live. Camels store fat, and polar bears have thick fur.",
    },
    {
      id: "starfall-inheritance",
      position: { x: 70.1, z: -7.1 },
      title: "Inheritance",
      fact: "Children look a bit like their parents, but never exactly the same. That's called inheritance.",
    },
    {
      id: "starfall-microorganisms",
      position: { x: -34.6, z: 8.4 },
      title: "Microorganisms",
      fact: "Microorganisms are living things too small to see. Some, like yeast, help us make bread.",
    },
    {
      id: "starfall-time-zones",
      position: { x: -70.1, z: -7.2 },
      title: "Time Zones",
      fact: "When it's midday in London, it's night-time in Australia, because the spinning Earth faces the Sun at different times.",
    },
    {
      id: "starfall-latitude",
      position: { x: -59.9, z: -15.7 },
      title: "Latitude and Longitude",
      fact: "Lines of latitude and longitude help us find any place on a map or globe.",
    },
    {
      id: "starfall-evacuees",
      position: { x: -69.8, z: 8 },
      title: "Evacuees",
      fact: "In the Second World War, many children were sent from cities to the countryside to keep them safe from bombs.",
    },
  ],
  hideaways: [
    {
      id: "stargazers-camp",
      position: { x: 4.7, z: -0.3 },
      name: "the Stargazers' Camp",
      discovery:
        "Blankets and a telescope pointed at the sky, ready for a clear night.",
    },
    {
      id: "meteor-den",
      position: { x: 11, z: -5.2 },
      name: "the Meteor Den",
      discovery:
        "A shelter built beside a cooled space rock that fell from the sky long ago.",
    },
    {
      id: "rocket-workshop",
      position: { x: -20.5, z: -2.4 },
      name: "the Rocket Workshop",
      discovery:
        "Plans for a rocket pinned to the wall. Rockets need lots of power to escape Earth's gravity.",
    },
    {
      id: "moonbeam-hollow",
      position: { x: -1.6, z: -4.5 },
      name: "Moonbeam Hollow",
      discovery:
        "A quiet hollow lit by moonlight. The Moon shines because it reflects light from the Sun.",
    },
    {
      id: "astronaut-tent",
      position: { x: -4.5, z: 5 },
      name: "the Astronaut's Tent",
      discovery:
        "Helmets and moon boots. Astronauts need spacesuits because there is no air to breathe in space.",
    },
    {
      id: "mirror-garden",
      position: { x: -19.5, z: -12 },
      name: "the Mirror Garden",
      discovery:
        "Shiny mirrors that reflect light from one to the next, just like a periscope.",
    },
    {
      id: "battery-hut",
      position: { x: -24, z: -10.5 },
      name: "the Battery Hut",
      discovery:
        "Wires, bulbs and batteries. A bulb only lights up when the circuit is a complete loop.",
    },
    {
      id: "galileo-corner",
      position: { x: -5, z: 1 },
      name: "Galileo's Corner",
      discovery:
        "A small telescope. Galileo used one to discover four moons going round the planet Jupiter.",
    },
    {
      id: "moonstone-cave",
      position: { x: 14.2, z: 11.2 },
      name: "the Moonstone Cave",
      discovery:
        "Pale stones glow softly in the dark of this cave, like a hundred tiny moons.",
    },
    {
      id: "planetarium-tent",
      position: { x: -21.1, z: 1.1 },
      name: "the Planetarium Tent",
      discovery:
        "Lie back and look up: the roof of this tent is painted with every constellation in the night sky.",
    },
    {
      id: "solar-panel-farm",
      position: { x: -12.6, z: 2.7 },
      name: "the Solar Panel Farm",
      discovery:
        "Rows of solar panels turn sunlight into electricity to power the Island's telescopes.",
    },
    {
      id: "comet-camp",
      position: { x: 14.5, z: -5.6 },
      name: "the Comet Camp",
      discovery:
        "Sleeping bags and a telescope pointing at the sky. Comets are giant balls of ice and dust with glowing tails.",
    },
    {
      id: "meteorite-garden",
      position: { x: 44.5, z: 15.4 },
      name: "the Meteorite Garden",
      discovery:
        "Rocks that fell from space, some made of iron and nickel. They're billions of years old!",
    },
    {
      id: "space-probe-workshop",
      position: { x: 46.9, z: -16.1 },
      name: "the Space Probe Workshop",
      discovery:
        "Engineers build probes here to fly past planets and send back photos.",
    },
    {
      id: "aurora-hammock",
      position: { x: 59, z: -15.6 },
      name: "the Aurora Hammock",
      discovery:
        "Swing in a hammock and watch green and purple lights ripple across the sky.",
    },
    {
      id: "fossil-finders-tent",
      position: { x: 49.8, z: -5.1 },
      name: "the Fossil Finder's Tent",
      discovery:
        "Brushes, maps and a fossil fish. Fossils show how living things have changed over time.",
    },
    {
      id: "gravity-swing",
      position: { x: -45.8, z: -16.1 },
      name: "the Gravity Swing",
      discovery:
        "Gravity pulls the swing back down every time you go up. Wheee!",
    },
    {
      id: "north-star-den",
      position: { x: -44.9, z: 15.7 },
      name: "the North Star Den",
      discovery:
        "Sailors used the North Star to find their way, because it stays in the same place in the sky.",
    },
    {
      id: "moon-rock-cave",
      position: { x: -49.3, z: 4.9 },
      name: "the Moon Rock Cave",
      discovery:
        "Grey dusty rocks just like the ones astronauts brought back from the Moon.",
    },
    {
      id: "mission-control-hut",
      position: { x: -55.3, z: -4.6 },
      name: "the Mission Control Hut",
      discovery:
        "Screens and buttons for talking to astronauts. Three, two, one, lift off!",
    },
  ],
  treasureKind: {
    singular: "Fallen Star",
    plural: "Fallen Stars",
    colour: "#fde047",
  },
  treasures: [
    { id: "star-hill", position: { x: 8.4, z: -11.2 } },
    { id: "star-islet", position: starfallIslet },
    { id: "star-west-islet", position: { x: -21, z: -10 } },
    {
      id: "star-crater",
      position: { x: starCraterPosition.x, z: starCraterPosition.z },
    },
    { id: "star-east", position: { x: 23.4, z: 2 } },
    { id: "star-south", position: { x: -7, z: 10.6 } },
    { id: "star-moor", position: { x: -12, z: 1 } },
    { id: "star-north", position: { x: -2, z: -11 } },
    { id: "star-9", position: { x: -6.5, z: 3.2 } },
    { id: "star-10", position: { x: 2.6, z: -12.2 } },
    { id: "star-11", position: { x: 12.4, z: 11.6 } },
    { id: "star-12", position: { x: -13.5, z: 9.5 } },
    { id: "star-13", position: { x: -6.5, z: -11.5 } },
    { id: "star-14", position: { x: 1.2, z: 6 } },
    { id: "star-15", position: { x: 6.8, z: -4.5 } },
    { id: "star-16", position: { x: 15.2, z: -5.9 } },
    { id: "star-17", position: { x: 20.1, z: 10.2 } },
    { id: "star-18", position: { x: 12.4, z: 6 } },
    { id: "star-19", position: { x: -3.7, z: -1 } },
    { id: "star-20", position: { x: 0.5, z: -1 } },
    { id: "star-21", position: { x: -1.5, z: -0.5 } },
    { id: "star-22", position: { x: -21, z: 1 } },
    { id: "star-23", position: { x: -21.5, z: -8 } },
    { id: "star-24", position: { x: -18.5, z: 0.5 } },
    { id: "star-25", position: { x: 11, z: 4.5 } },
    { id: "star-26", position: { x: 12.5, z: 4 } },
    { id: "star-27", position: { x: -11, z: -0.5 } },
    { id: "star-28", position: { x: 23, z: 4.5 } },
    { id: "star-29", position: { x: 14, z: 3 } },
    { id: "star-30", position: { x: -8, z: 5 } },
    { id: "star-31", position: { x: 22.5, z: 0 } },
    { id: "star-32", position: { x: -4, z: -11 } },
    { id: "star-33", position: { x: -12.5, z: -0.5 } },
    { id: "star-34", position: { x: 21, z: 8.5 } },
    { id: "star-35", position: { x: -19.5, z: 1 } },
    { id: "star-36", position: { x: -7.5, z: 6 } },
    { id: "star-37", position: { x: -2, z: -1.5 } },
    { id: "star-38", position: { x: -7, z: 7 } },
    { id: "star-39", position: { x: 10.5, z: 5.5 } },
    { id: "star-40", position: { x: 22.5, z: 5.5 } },
    { id: "star-41", position: { x: 11.8, z: -8.8 } },
    { id: "star-42", position: { x: -18.5, z: 6.7 } },
    { id: "star-43", position: { x: 20.3, z: -4.7 } },
    { id: "star-44", position: { x: -17.1, z: -8.5 } },
    { id: "star-45", position: { x: -3.6, z: 7.9 } },
    { id: "star-46", position: { x: -2.4, z: -7.8 } },
    { id: "star-47", position: { x: -12.9, z: -10.3 } },
    { id: "star-48", position: { x: 17.5, z: 11.5 } },
    { id: "star-49", position: { x: 4.5, z: 2.9 } },
    { id: "star-50", position: { x: 0.7, z: -6.2 } },
    { id: "star-51", position: { x: 14.9, z: 0.3 } },
    { id: "star-52", position: { x: -6.1, z: -3.3 } },
    { id: "star-53", position: { x: -15.3, z: 3.5 } },
    { id: "star-54", position: { x: 4, z: 11.7 } },
    { id: "star-55", position: { x: -6.9, z: -8.4 } },
    { id: "star-56", position: { x: 22.3, z: -2.8 } },
    { id: "star-57", position: { x: 16.7, z: 5.3 } },
    { id: "star-58", position: { x: -17.3, z: -2.1 } },
    { id: "star-59", position: { x: -1.2, z: 9.3 } },
    { id: "star-60", position: { x: 8.8, z: -6.5 } },
    { id: "star-61", position: { x: 51.5, z: 18.1 } },
    { id: "star-62", position: { x: 67.6, z: -13.5 } },
    { id: "star-63", position: { x: 53.1, z: -18 } },
    { id: "star-64", position: { x: 56.2, z: -5.7 } },
    { id: "star-65", position: { x: 43.7, z: -2.5 } },
    { id: "star-66", position: { x: 61.6, z: -3.4 } },
    { id: "star-67", position: { x: 53, z: 5.8 } },
    { id: "star-68", position: { x: 37.7, z: 4.9 } },
    { id: "star-69", position: { x: 61.1, z: 2.9 } },
    { id: "star-70", position: { x: 39.1, z: -5.8 } },
    { id: "star-71", position: { x: 42.8, z: 2.5 } },
    { id: "star-72", position: { x: 48.2, z: 7.5 } },
    { id: "star-73", position: { x: 56.3, z: 9.8 } },
    { id: "star-74", position: { x: 48.4, z: -10.2 } },
    { id: "star-75", position: { x: 70.6, z: -2.4 } },
    { id: "star-76", position: { x: 33.2, z: 2.2 } },
    { id: "star-77", position: { x: 73.9, z: 5.4 } },
    { id: "star-78", position: { x: 65.6, z: 4.7 } },
    { id: "star-79", position: { x: 66.2, z: -4.6 } },
    { id: "star-80", position: { x: 57.6, z: -11.1 } },
    { id: "star-81", position: { x: -31.1, z: 2 } },
    { id: "star-82", position: { x: -52.4, z: -17.6 } },
    { id: "star-83", position: { x: -43.6, z: 1.7 } },
    { id: "star-84", position: { x: -50.8, z: 17.4 } },
    { id: "star-85", position: { x: -66.6, z: 12.8 } },
    { id: "star-86", position: { x: -60.4, z: -1.9 } },
    { id: "star-87", position: { x: -62.2, z: 4.3 } },
    { id: "star-88", position: { x: -38.1, z: -5.8 } },
    { id: "star-89", position: { x: -48.1, z: -8.1 } },
    { id: "star-90", position: { x: -53, z: 0.1 } },
    { id: "star-91", position: { x: -31.6, z: -3.1 } },
    { id: "star-92", position: { x: -47.2, z: 11.2 } },
    { id: "star-93", position: { x: -57.4, z: -10.5 } },
    { id: "star-94", position: { x: -42.4, z: -3.1 } },
    { id: "star-95", position: { x: -38.8, z: 5.2 } },
    { id: "star-96", position: { x: -65.6, z: -4.3 } },
    { id: "star-97", position: { x: -56.5, z: 8.5 } },
    { id: "star-98", position: { x: -73.6, z: -3.6 } },
    { id: "star-99", position: { x: -62.7, z: 15.7 } },
    { id: "star-100", position: { x: -69.4, z: -2.1 } },
    { id: "star-east-lake", position: { x: 44.5, z: -2 } },
    { id: "star-west-lake", position: { x: -44.5, z: 2 } },
    { id: "star-east-summit", position: { x: 58, z: -8 } },
    { id: "star-west-summit", position: { x: -58, z: 8 } },
  ],
  bouncePads: {
    name: "Moon Bounce Ring",
    colour: "#c4b5fd",
    places: [
      { x: -8.4, z: -1.6 },
      { x: 11.6, z: 1.4 },
      { x: -18.4, z: 3.4 },
      { x: 20.1, z: 6 },
      { x: 1.2, z: 10.9 },
      { x: 20.1, z: -1 },
      { x: -15.5, z: 0.5 },
      { x: -10, z: 10 },
      { x: 1.5, z: 1.5 },
      { x: 7.3, z: 1.6 },
      { x: 3.6, z: -10.9 },
      { x: -8.3, z: -5.9 },
      { x: 65.4, z: 14.3 },
      { x: 31.6, z: -2.5 },
      { x: 40.3, z: -14.4 },
      { x: 36.5, z: 11.5 },
      { x: -57.9, z: 15.7 },
      { x: -38.1, z: -12.9 },
      { x: -65.9, z: -12.9 },
      { x: -38.8, z: 13.2 },
    ],
  },
  airfield: starfallAirfield,
  hoverPad: {
    centre: { x: -25, z: -7 },
    heading: -3.011,
    slipStart: 1.25,
    slipLevel: 1.14,
  },
  dock: {
    from: { x: -6.7, z: 11.7 },
    to: { x: -8.7, z: 15.1 },
    berthSide: -1,
  },
  friendKind: {
    singular: "Owl",
    plural: "Owls",
    look: "owl",
  },
  friends: [
    {
      id: "owl-hoot",
      position: { x: 23.7, z: 13.1 },
      name: "Hoot the Owl",
      greeting:
        "Hello! Owls are nocturnal. We sleep in the day and hunt at night.",
    },
    {
      id: "owl-luna",
      position: { x: -6.6, z: 8.2 },
      name: "Luna the Owl",
      greeting:
        "I can turn my head almost all the way round to look behind me.",
    },
    {
      id: "owl-orion",
      position: { x: -2.6, z: -1.2 },
      name: "Orion the Owl",
      greeting:
        "My soft, fringed feathers let me fly almost silently through the night.",
    },
    {
      id: "owl-nova",
      position: { x: -11.9, z: -0.5 },
      name: "Nova the Owl",
      greeting:
        "Owls have huge eyes that gather lots of light, so we can see in the dark.",
    },
    {
      id: "owl-twinkle",
      position: { x: 19.8, z: 9.7 },
      name: "Twinkle the Owl",
      greeting:
        "Some owls have one ear higher than the other, to tell exactly where a sound is coming from.",
    },
    {
      id: "owl-sirius",
      position: { x: 2, z: 7.2 },
      name: "Sirius the Owl",
      greeting:
        "Owls swallow mice whole, then cough up the bones and fur in a little bundle called a pellet.",
    },
    {
      id: "watchtower-comet",
      position: { x: 56.1, z: 1.1 },
      name: "Comet the Owl",
      greeting: "A group of owls is called a parliament.",
    },
    {
      id: "watchtower-galaxy",
      position: { x: 74.2, z: 0.7 },
      name: "Galaxy the Owl",
      greeting: "Owls can't move their eyes, so we turn our heads instead.",
    },
    {
      id: "watchtower-stardust",
      position: { x: 48.3, z: 2.5 },
      name: "Stardust the Owl",
      greeting:
        "Barn owls have heart-shaped faces that funnel sounds into their ears.",
    },
    {
      id: "watchtower-moonbeam",
      position: { x: -56.9, z: 3.4 },
      name: "Moonbeam the Owl",
      greeting: "Owls have sharp claws called talons for catching food.",
    },
    {
      id: "watchtower-meteor",
      position: { x: -47.9, z: -2.9 },
      name: "Meteor the Owl",
      greeting: "Snowy owls hunt in the daytime during the long Arctic summer.",
    },
    {
      id: "watchtower-aurora",
      position: { x: -73.3, z: 1.2 },
      name: "Aurora the Owl",
      greeting: "Baby owls are called owlets.",
    },
  ],
  races: [
    {
      id: "starfall-comet-run",
      name: "the Comet Run",
      seconds: 135,
      rings: [
        { x: 66.3, z: 0 },
        { x: 61.1, z: 8.3 },
        { x: 51.6, z: 11.2 },
        { x: 42.3, z: 7.8 },
        { x: 37.9, z: -0.7 },
        { x: 43.5, z: -8.8 },
        { x: 53.2, z: -11.3 },
        { x: 62.1, z: -9.1 },
      ],
    },
    {
      id: "starfall-moonbeam-dash",
      name: "the Moonbeam Dash",
      seconds: 140,
      rings: [
        { x: -37.7, z: 0 },
        { x: -42.9, z: 8.3 },
        { x: -52.4, z: 11.3 },
        { x: -61.6, z: 9.7 },
        { x: -66.1, z: 0.7 },
        { x: -61.7, z: -7.8 },
        { x: -52.4, z: -11.2 },
        { x: -42.9, z: -8.3 },
      ],
    },
  ],
  gravity: earthGravity * 0.38,
  findHeight: starfallIsle.findHeight,
  findCourseKind: findCourseKindIn(starfallIsle),
};

/** Joins the trails out to the new lands' far reaches onto an Island's own. */
const withFarReachTrails = (adventure: IslandAdventure): IslandAdventure => ({
  ...adventure,
  trails: [
    ...adventure.trails,
    ...(farReachTrails[adventure.islandId] ?? []).map((trail) => [...trail]),
  ],
});

/**
 * The Island without the trails out to its far reaches, as the
 * Attractions, Curiosities and Quest placed before them were found on
 * it. Those trails wind clear of all of them.
 */
export const withoutFarReachTrails = (
  adventure: IslandAdventure,
): IslandAdventure => {
  const farTrails = farReachTrails[adventure.islandId] ?? [];
  return farTrails.length === 0
    ? adventure
    : {
        ...adventure,
        trails: adventure.trails.slice(
          0,
          adventure.trails.length - farTrails.length,
        ),
      };
};

export const islandAdventures: readonly IslandAdventure[] = [
  meadowAdventure,
  frostAdventure,
  sandsAdventure,
  jungleAdventure,
  emberAdventure,
  starfallAdventure,
].map(withFarReachTrails);

export class IslandWithoutAdventureError extends Error {
  override name = "IslandWithoutAdventureError";
}

const scalePoint = ({ x, z }: MapPoint): MapPoint => ({
  x: x * exploreScale,
  z: z * exploreScale,
});

const shrinkPoint = ({ x, z }: MapPoint): MapPoint => ({
  x: x / exploreScale,
  z: z / exploreScale,
});

export const scalePlaceForExplore = <Place extends { mapPosition: MapPoint }>(
  place: Place,
): Place => ({ ...place, mapPosition: scalePoint(place.mapPosition) });

const scaleBridgeForExplore = (bridge: AdventureBridge): AdventureBridge => ({
  ...bridge,
  from: scalePoint(bridge.from),
  to: scalePoint(bridge.to),
  endHeight: bridge.endHeight * exploreScale,
  middleHeight: bridge.middleHeight * exploreScale,
  halfWidth: bridge.halfWidth * exploreScale,
});

const scaleLookoutForExplore = (lookout: Lookout): Lookout => ({
  ...lookout,
  position: scalePoint(lookout.position),
  viewHeight:
    lookout.look === "island-landmark"
      ? lookout.viewHeight * exploreScale
      : lookout.viewHeight,
});

const scaleAirstripForExplore = <
  Airstrip extends { centre: MapPoint; level: number },
>(
  airstrip: Airstrip,
): Airstrip => ({
  ...airstrip,
  centre: scalePoint(airstrip.centre),
  level: airstrip.level * exploreScale,
});

const scaleAdventureForExplore = (
  adventure: IslandAdventure,
): IslandAdventure => ({
  ...adventure,
  start: scalePoint(adventure.start),
  trails: adventure.trails.map((trail) => trail.map(scalePoint)),
  drawnBridges: adventure.drawnBridges.map(scaleBridgeForExplore),
  lookouts: adventure.lookouts.map(scaleLookoutForExplore),
  signs: adventure.signs.map((sign) => ({
    ...sign,
    position: scalePoint(sign.position),
  })),
  hideaways: adventure.hideaways.map((hideaway) => ({
    ...hideaway,
    position: scalePoint(hideaway.position),
  })),
  treasures: adventure.treasures.map((treasure) => ({
    ...treasure,
    position: scalePoint(treasure.position),
  })),
  bouncePads: {
    ...adventure.bouncePads,
    places: adventure.bouncePads.places.map(scalePoint),
  },
  dock: {
    ...adventure.dock,
    from: scalePoint(adventure.dock.from),
    to: scalePoint(adventure.dock.to),
  },
  airfield: {
    runway: scaleAirstripForExplore(adventure.airfield.runway),
    helipad: scaleAirstripForExplore(adventure.airfield.helipad),
    balloonField: scaleAirstripForExplore(adventure.airfield.balloonField),
  },
  hoverPad: {
    ...adventure.hoverPad,
    centre: scalePoint(adventure.hoverPad.centre),
    slipStart: adventure.hoverPad.slipStart * exploreScale,
    slipLevel: adventure.hoverPad.slipLevel * exploreScale,
  },
  friends: adventure.friends.map((friend) => ({
    ...friend,
    position: scalePoint(friend.position),
  })),
  races: adventure.races.map((race) => ({
    ...race,
    rings: race.rings.map(scalePoint),
  })),
  findHeight: (point) =>
    adventure.findHeight(shrinkPoint(point)) * exploreScale,
  findCourseKind: (point) => adventure.findCourseKind(shrinkPoint(point)),
});

const exploreAdventures: readonly IslandAdventure[] = islandAdventures.map(
  scaleAdventureForExplore,
);

export const findExploreAdventure = (islandId: string): IslandAdventure => {
  const adventure = exploreAdventures.find(
    (candidate) => candidate.islandId === islandId,
  );
  if (adventure === undefined) {
    throw new IslandWithoutAdventureError(
      `Island "${islandId}" has nothing to explore`,
    );
  }
  return adventure;
};

export const findIslandAdventure = (islandId: string): IslandAdventure => {
  const adventure = islandAdventures.find(
    (candidate) => candidate.islandId === islandId,
  );
  if (adventure === undefined) {
    throw new IslandWithoutAdventureError(
      `Island "${islandId}" has nothing to explore`,
    );
  }
  return adventure;
};

export const hasIslandAdventure = (islandId: string): boolean =>
  islandAdventures.some((candidate) => candidate.islandId === islandId);

const isOnDrawnBridge = (
  adventure: IslandAdventure,
  point: MapPoint,
): boolean =>
  adventure.drawnBridges.some(
    (bridge) =>
      findBridgeDeck(bridge, point, adventure.findHeight(point)) !== undefined,
  );

const isBesideDrawnBridge = (
  adventure: IslandAdventure,
  point: MapPoint,
): boolean =>
  isOnDrawnBridge(adventure, point) ||
  adventure.drawnBridges.some(
    ({ from, to }) =>
      Math.min(
        Math.hypot(point.x - from.x, point.z - from.z),
        Math.hypot(point.x - to.x, point.z - to.z),
      ) <= drawnBridgeJoin,
  );

const isWetFor = (adventure: IslandAdventure, point: MapPoint): boolean => {
  const kind = adventure.findCourseKind(point);
  const ground = adventure.findHeight(point);
  return (
    !isOnDrawnBridge(adventure, point) &&
    (kind === "river" || kind === "lava" || (kind === undefined && ground < 0))
  );
};

const listTrailSamples = (trail: readonly MapPoint[]): MapPoint[] =>
  trail.slice(1).flatMap((end, index) => {
    const start = trail[index];
    const length = Math.hypot(end.x - start.x, end.z - start.z);
    const steps = Math.max(1, Math.ceil(length / trailSampleSpacing));
    return Array.from(
      { length: steps + (index === trail.length - 2 ? 1 : 0) },
      (_, step) => ({
        x: start.x + ((end.x - start.x) * step) / steps,
        z: start.z + ((end.z - start.z) * step) / steps,
      }),
    );
  });

const buildBridgeOverRun = (
  adventure: IslandAdventure,
  first: MapPoint,
  last: MapPoint,
  isLava: boolean,
  name: string,
): AdventureBridge => {
  const length = Math.max(0.01, Math.hypot(last.x - first.x, last.z - first.z));
  const outX = ((last.x - first.x) / length) * autoBridgeOverhang;
  const outZ = ((last.z - first.z) / length) * autoBridgeOverhang;
  const overhungFrom = { x: first.x - outX, z: first.z - outZ };
  const overhungTo = { x: last.x + outX, z: last.z + outZ };
  const from = isBesideDrawnBridge(adventure, first) ? first : overhungFrom;
  const to = isBesideDrawnBridge(adventure, last) ? last : overhungTo;
  const spanSteps = Math.max(1, Math.ceil(length / trailSampleSpacing));
  const endHeight =
    Math.max(
      findGroundAbove(adventure.findHeight, from),
      findGroundAbove(adventure.findHeight, to),
      ...Array.from({ length: spanSteps + 1 }, (_, step) =>
        findGroundAbove(adventure.findHeight, {
          x: first.x + ((last.x - first.x) * step) / spanSteps,
          z: first.z + ((last.z - first.z) * step) / spanSteps,
        }),
      ),
    ) + 0.12;
  return {
    name,
    from,
    to,
    endHeight,
    middleHeight: endHeight + 0.4,
    halfWidth: 0.55,
    material: isLava ? "iron" : "timber",
    isDrawnByIsland: false,
  };
};

export const buildTrailBridges = (
  adventure: IslandAdventure,
): AdventureBridge[] =>
  adventure.trails.flatMap((trail, trailIndex) => {
    const runs: { first: MapPoint; last: MapPoint; isLava: boolean }[] = [];
    trail.slice(1).forEach((end, segment) => {
      const samples = listTrailSamples([trail[segment], end]);
      let runStart: number | undefined;
      samples.forEach((sample, index) => {
        const isWet = isWetFor(adventure, sample);
        if (isWet && runStart === undefined) {
          runStart = index;
        }
        const isRunOver = !isWet || index === samples.length - 1;
        if (runStart !== undefined && isRunOver) {
          const lastIndex = isWet ? index : index - 1;
          const first = samples[runStart];
          const last = samples[lastIndex];
          const isLava = samples
            .slice(runStart, lastIndex + 1)
            .some((point) => adventure.findCourseKind(point) === "lava");
          runs.push({ first, last, isLava });
          runStart = undefined;
        }
      });
    });
    return runs
      .filter(
        ({ first, last }) =>
          Math.hypot(last.x - first.x, last.z - first.z) <=
          autoBridgeLongestRun,
      )
      .map(({ first, last, isLava }, runIndex) =>
        buildBridgeOverRun(
          adventure,
          first,
          last,
          isLava,
          `trail-bridge-${String(trailIndex + 1)}-${String(runIndex + 1)}`,
        ),
      );
  });

export const pierDeckHeight = 1.25;

export const buildDockPier = (adventure: IslandAdventure): AdventureBridge => {
  const { from, to } = adventure.dock;
  const length = Math.hypot(to.x - from.x, to.z - from.z);
  return {
    name: "dock-pier",
    from,
    to: {
      x: to.x + ((to.x - from.x) / length) * bridgeRampLength,
      z: to.z + ((to.z - from.z) / length) * bridgeRampLength,
    },
    endHeight: pierDeckHeight,
    middleHeight: pierDeckHeight,
    halfWidth: pierHalfWidth,
    material: "timber",
    isDrawnByIsland: true,
  };
};

export const buildAdventureWorld = (
  adventure: IslandAdventure,
  extras: { bridges?: readonly AdventureBridge[]; lanes?: WalkLanes } = {},
): AdventureWorld => ({
  adventure,
  bridges: [
    ...adventure.drawnBridges,
    buildDockPier(adventure),
    ...buildTrailBridges(adventure),
    ...(extras.bridges ?? []),
  ],
  lanes: extras.lanes,
});

const findLaneUnderfoot = (
  world: AdventureWorld,
  point: MapPoint,
  ground: number,
  fromHeight: number,
): WalkSurface | undefined => {
  const lane = world.lanes?.findDeck(point);
  return lane !== undefined &&
    lane.height >= ground - 0.05 &&
    fromHeight >= lane.height - bridgeStepUp
    ? lane
    : undefined;
};

export const findBridgeDeck = (
  bridge: AdventureBridge,
  point: MapPoint,
  ground: number,
): number | undefined => {
  const spanX = bridge.to.x - bridge.from.x;
  const spanZ = bridge.to.z - bridge.from.z;
  const spanLength = Math.hypot(spanX, spanZ);
  const along =
    ((point.x - bridge.from.x) * spanX + (point.z - bridge.from.z) * spanZ) /
    (spanLength * spanLength);
  if (along < 0 || along > 1) {
    return undefined;
  }
  const across = Math.hypot(
    point.x - (bridge.from.x + along * spanX),
    point.z - (bridge.from.z + along * spanZ),
  );
  if (across > bridge.halfWidth) {
    return undefined;
  }
  const arch = 1 - (2 * along - 1) ** 2;
  const deck =
    bridge.endHeight + (bridge.middleHeight - bridge.endHeight) * arch;
  const groundAbove = Math.max(0, ground);
  const fromNearestEnd = Math.min(along, 1 - along) * spanLength;
  const ramp = smoothStep(0, bridgeRampLength, fromNearestEnd);
  return deck > groundAbove ? groundAbove + (deck - groundAbove) * ramp : deck;
};

export const findDistanceToTrail = (
  adventure: IslandAdventure,
  point: MapPoint,
): number =>
  Math.min(
    Infinity,
    ...adventure.trails.flatMap((trail) =>
      trail
        .slice(1)
        .map((end, index) => findDistanceToSegment(point, trail[index], end)),
    ),
  );

const findBridgeUnderfoot = (
  world: AdventureWorld,
  point: MapPoint,
  ground: number,
  fromHeight: number,
): number | undefined =>
  world.bridges
    .map((bridge) => findBridgeDeck(bridge, point, ground))
    .filter(
      (deck): deck is number =>
        deck !== undefined && fromHeight >= deck - bridgeStepUp,
    )
    .toSorted((first, second) => second - first)
    .at(0);

export const findWalkSurface = (
  world: AdventureWorld,
  point: MapPoint,
  fromHeight: number,
): WalkSurface => {
  const { adventure } = world;
  const ground = adventure.findHeight(point);
  const deck = findBridgeUnderfoot(world, point, ground, fromHeight);
  const lane = findLaneUnderfoot(world, point, ground, fromHeight);
  if (deck !== undefined && deck >= ground - 0.05) {
    return lane !== undefined && lane.height > deck
      ? lane
      : { height: deck, kind: "bridge" };
  }
  if (lane !== undefined) {
    return lane;
  }
  const courseKind = adventure.findCourseKind(point);
  if (courseKind === "lava") {
    return { height: Math.max(0.02, ground + 0.1), kind: "lava" };
  }
  if (courseKind === "ice") {
    return { height: Math.max(0.02, ground + 0.1), kind: "ice" };
  }
  if (courseKind === "river") {
    return { height: Math.max(0.02, ground + 0.1), kind: "water" };
  }
  if (ground < -swimDepth) {
    return { height: 0, kind: "water" };
  }
  if (ground < 0) {
    return { height: 0, kind: "shallows" };
  }
  const isOnTrail = findDistanceToTrail(adventure, point) <= trailHalfWidth;
  return { height: ground, kind: isOnTrail ? "trail" : "ground" };
};

const findExploreReach = ({ x, z }: MapPoint): number =>
  (Math.abs(x / exploreHalfWidth) ** exploreBoundsRoundness +
    Math.abs(z / exploreHalfDepth) ** exploreBoundsRoundness) **
  (1 / exploreBoundsRoundness);

export const isInsideExploreBounds = (point: MapPoint): boolean =>
  findExploreReach(point) <= 1;

/**
 * Whether a point is on the Island as it was before its far reaches
 * grew: inside its first bounds, and where the far reaches leave the
 * ground as it was.
 */
export const isInsideFirstLands = ({ x, z }: MapPoint): boolean =>
  (Math.abs(x / firstLandsHalfWidth) ** exploreBoundsRoundness +
    Math.abs(z / exploreHalfDepth) ** exploreBoundsRoundness) **
    (1 / exploreBoundsRoundness) <=
    1 &&
  findNewLandShare(
    { x: x / exploreScale, z: z / exploreScale },
    newLandFarReaches,
  ) <= 0;

export const keepInsideExploreBounds = (point: MapPoint): MapPoint => {
  const reach = findExploreReach(point);
  return reach <= 1 ? point : { x: point.x / reach, z: point.z / reach };
};

export const listAdventurePlaces = (adventure: IslandAdventure): MapPoint[] => [
  ...adventure.lookouts.map(({ position }) => position),
  ...adventure.signs.map(({ position }) => position),
  ...adventure.hideaways.map(({ position }) => position),
  ...adventure.bouncePads.places,
  ...adventure.friends.map(({ position }) => position),
  ...adventure.races.flatMap(({ rings }) => rings),
  adventure.dock.from,
  adventure.dock.to,
  ...listAirfieldPlaces(adventure.airfield),
  ...listHoverPadPlaces(adventure.hoverPad),
];

export type ExploreInteraction =
  | { kind: "region"; id: string; name: string; position: MapPoint }
  | {
      kind: "lookout";
      id: string;
      name: string;
      position: MapPoint;
      reach?: number;
    }
  | { kind: "sign"; id: string; name: string; position: MapPoint }
  | { kind: "hideaway"; id: string; name: string; position: MapPoint }
  | { kind: "friend"; id: string; name: string; position: MapPoint }
  | { kind: "dock"; id: string; name: string; position: MapPoint }
  | { kind: "attraction"; id: string; name: string; position: MapPoint }
  | { kind: "islander"; id: string; name: string; position: MapPoint }
  | { kind: "quest-thing"; id: string; name: string; position: MapPoint };

export const dockInteractionId = "dock";

export const findDockMiddle = ({ dock }: IslandAdventure): MapPoint => ({
  x: (dock.from.x + dock.to.x) / 2,
  z: (dock.from.z + dock.to.z) / 2,
});

export interface PlaceToVisit {
  id: string;
  name: string;
  mapPosition: MapPoint;
}

export const lookoutBlockRadius = 0.75;

export const interactionReach: Record<ExploreInteraction["kind"], number> = {
  region: 3.4 * exploreScale,
  lookout: lookoutBlockRadius * exploreScale + 1.2,
  sign: 1.8,
  hideaway: 2.2,
  friend: 2,
  dock: 2.2 * exploreScale,
  attraction: 2.4,
  islander: 2,
  "quest-thing": 2.8,
};

export const friendBlockRadius = 0.45;

export const treasureReach = 0.95;
export const regionBlockRadius = 2.4 * exploreScale;

const findFlatDistance = (from: MapPoint, to: MapPoint): number =>
  Math.hypot(from.x - to.x, from.z - to.z);

export const listExploreInteractions = (
  adventure: IslandAdventure,
  regions: readonly PlaceToVisit[],
): ExploreInteraction[] => [
  ...regions.map(({ id, name, mapPosition }): ExploreInteraction => ({
    kind: "region",
    id,
    name,
    position: mapPosition,
  })),
  ...adventure.lookouts.map(
    ({ id, name, position, reach }): ExploreInteraction => ({
      kind: "lookout",
      id,
      name,
      position,
      ...(reach === undefined ? {} : { reach }),
    }),
  ),
  ...adventure.signs.map(({ id, title, position }): ExploreInteraction => ({
    kind: "sign",
    id,
    name: title,
    position,
  })),
  ...adventure.hideaways.map(({ id, name, position }): ExploreInteraction => ({
    kind: "hideaway",
    id,
    name,
    position,
  })),
  ...adventure.friends.map(({ id, name, position }): ExploreInteraction => ({
    kind: "friend",
    id,
    name,
    position,
  })),
  {
    kind: "dock",
    id: dockInteractionId,
    name: "the Dock",
    position: findDockMiddle(adventure),
  },
];

/** How near the Character must be to an interaction to reach it. */
export const findInteractionReach = (
  interaction: ExploreInteraction,
): number =>
  interaction.kind === "lookout" && interaction.reach !== undefined
    ? interaction.reach
    : interactionReach[interaction.kind];

export const listNearbyInteractions = (
  interactions: readonly ExploreInteraction[],
  point: MapPoint,
): ExploreInteraction[] =>
  interactions
    .map((interaction) => ({
      interaction,
      distance: findFlatDistance(interaction.position, point),
    }))
    .filter(
      ({ interaction, distance }) =>
        distance <= findInteractionReach(interaction),
    )
    .toSorted((first, second) => first.distance - second.distance)
    .map(({ interaction }) => interaction);

export const isWithinReachOf = (
  interaction: ExploreInteraction,
  point: MapPoint,
): boolean =>
  findFlatDistance(interaction.position, point) <=
  findInteractionReach(interaction);

export const findTreasureHeight = (
  world: AdventureWorld,
  treasure: Treasure,
): number =>
  Math.max(0, findWalkSurface(world, treasure.position, Infinity).height);

export const listTreasuresInReach = (
  world: AdventureWorld,
  point: MapPoint & { y: number },
  foundTreasureIds: readonly string[],
): Treasure[] =>
  world.adventure.treasures.filter(
    (treasure) =>
      !foundTreasureIds.includes(treasure.id) &&
      findFlatDistance(treasure.position, point) <= treasureReach &&
      Math.abs(findTreasureHeight(world, treasure) - point.y) <= 1.6,
  );

export const listExploreBlockers = (
  adventure: IslandAdventure,
  regions: readonly PlaceToVisit[],
): { centre: MapPoint; radius: number }[] => [
  ...regions.map(({ mapPosition }) => ({
    centre: mapPosition,
    radius: regionBlockRadius,
  })),
  ...adventure.lookouts
    .filter(({ position }) =>
      regions.every(
        ({ mapPosition }) => findFlatDistance(mapPosition, position) > 0.5,
      ),
    )
    .map(({ position, look }) => ({
      centre: position,
      radius:
        look === "island-landmark"
          ? lookoutBlockRadius * exploreScale
          : lookoutBlockRadius,
    })),
  ...adventure.friends.map(({ position }) => ({
    centre: position,
    radius: friendBlockRadius,
  })),
];
