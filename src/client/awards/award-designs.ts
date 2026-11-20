/**
 * How each Island's Quest Trophy looks as a 3D Award (ADR 0059): its
 * metal, the stone of its plinth, its gem, the shape of its cup and the
 * emblem on its lid, each chosen for the Island's own Quest.
 */

export type AwardCupShape = "chalice" | "tulip" | "urn";

export type AwardEmblem =
  "flower" | "snowflake" | "sun" | "jaguar" | "flame" | "star";

export interface AwardDesign {
  islandId: string;
  /** The cup, lid and handles. */
  metal: string;
  /** The trims: the bands, the nameplate and the emblem's details. */
  trim: string;
  plinth: string;
  gem: string;
  cup: AwardCupShape;
  emblem: AwardEmblem;
  /** Whether the emblem glows, as a flame does. */
  isEmblemGlowing: boolean;
}

const gold = "#f2c14e";
const paleGold = "#ffe08a";
const roseGold = "#e8a27c";
const silver = "#dfe6ee";
const platinum = "#c9d3e6";

export const awardDesigns: readonly AwardDesign[] = [
  {
    islandId: "meadow-isle",
    metal: gold,
    trim: paleGold,
    plinth: "#2f6b3a",
    gem: "#ff6fa8",
    cup: "chalice",
    emblem: "flower",
    isEmblemGlowing: false,
  },
  {
    islandId: "frost-isle",
    metal: silver,
    trim: "#a9e4ff",
    plinth: "#1d3557",
    gem: "#5ce1e6",
    cup: "tulip",
    emblem: "snowflake",
    isEmblemGlowing: false,
  },
  {
    islandId: "sunscorch-sands",
    metal: gold,
    trim: "#ffd36b",
    plinth: "#8a4b1f",
    gem: "#ff8c1a",
    cup: "urn",
    emblem: "sun",
    isEmblemGlowing: false,
  },
  {
    islandId: "jungle-reach",
    metal: paleGold,
    trim: gold,
    plinth: "#1f4d2b",
    gem: "#2ee59d",
    cup: "chalice",
    emblem: "jaguar",
    isEmblemGlowing: false,
  },
  {
    islandId: "ember-isle",
    metal: roseGold,
    trim: "#ffb36b",
    plinth: "#2a1a1f",
    gem: "#ff3d2e",
    cup: "urn",
    emblem: "flame",
    isEmblemGlowing: true,
  },
  {
    islandId: "starfall-isle",
    metal: platinum,
    trim: paleGold,
    plinth: "#1b1f4b",
    gem: "#7b6cff",
    cup: "tulip",
    emblem: "star",
    isEmblemGlowing: false,
  },
];

const defaultDesign = awardDesigns[0];

export const findAwardDesign = (islandId: string): AwardDesign =>
  awardDesigns.find((design) => design.islandId === islandId) ?? {
    ...defaultDesign,
    islandId,
  };
