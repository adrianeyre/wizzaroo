import type { RegionOnMap } from "../../curriculum/island-access.js";
import {
  findPlacedAttraction,
  listPlacedAttractions,
  type PlacedAttraction,
} from "./island-attractions.js";

export type AttractionAction =
  | { kind: "story"; regionId: string; label: string }
  | { kind: "parcel"; targetId: string; targetName: string; label: string }
  | {
      /**
       * The button of a Curiosity or a new land's Attraction, such as
       * "Ring the bell".
       */
      kind: "play";
      label: string;
      news: string;
      tune?: readonly number[];
    };

export interface AttractionCard {
  title: string;
  text: string;
  actions: AttractionAction[];
}

export interface Parcel {
  fromId: string;
  targetId: string;
  targetName: string;
}

const describeAttraction = ({ model }: PlacedAttraction): string =>
  `the ${model.name}`;

const capitalise = (words: string): string =>
  words.charAt(0).toUpperCase() + words.slice(1);

/** The Region a library sends a Child to for a story: English, if open. */
export const findStoryRegion = (
  regions: readonly RegionOnMap[],
): RegionOnMap | undefined =>
  regions.find(
    ({ subject, isUnlocked, access }) =>
      subject === "english" && isUnlocked && access === "open",
  );

/**
 * Which Attraction a parcel from the post office goes to: each one on
 * the Island in turn, starting again after the last. Curiosities get
 * no post.
 */
export const findParcelTarget = (
  islandId: string,
  fromId: string,
  delivered: number,
): PlacedAttraction | undefined => {
  const others = listPlacedAttractions(islandId).filter(
    ({ id, isCuriosity }) => id !== fromId && !isCuriosity,
  );
  return others.length === 0 ? undefined : others[delivered % others.length];
};

export const buildAttractionCard = (
  islandId: string,
  attractionId: string,
  regions: readonly RegionOnMap[],
  delivered: number,
  parcel: Parcel | undefined,
): AttractionCard | undefined => {
  const attraction = findPlacedAttraction(islandId, attractionId);
  if (attraction === undefined) {
    return undefined;
  }
  const actions: AttractionAction[] = [];
  if (attraction.kind === "library") {
    const story = findStoryRegion(regions);
    if (story !== undefined) {
      actions.push({
        kind: "story",
        regionId: story.id,
        label: `Read a story in ${story.name}`,
      });
    }
  }
  if (attraction.kind === "post-office" && parcel === undefined) {
    const target = findParcelTarget(islandId, attraction.id, delivered);
    if (target !== undefined) {
      actions.push({
        kind: "parcel",
        targetId: target.id,
        targetName: describeAttraction(target),
        label: `Deliver a parcel to ${describeAttraction(target)}`,
      });
    }
  }
  if (attraction.family !== "attraction") {
    const { label, news, tune } = attraction.model.play;
    actions.push({ kind: "play", label, news, tune });
  }
  return {
    title: capitalise(describeAttraction(attraction)),
    text: attraction.model.fact,
    actions,
  };
};

export const describeParcel = (parcel: Parcel): string =>
  `You're carrying a parcel for ${parcel.targetName}.`;

export const describeDelivery = (parcel: Parcel): string =>
  `You delivered the parcel to ${parcel.targetName}. Thank you!`;

/** The notes an Attraction plays as the Character comes near, if any. */
export const findAttractionTune = (
  islandId: string,
  attractionId: string,
): readonly number[] | undefined =>
  findPlacedAttraction(islandId, attractionId)?.model.tune;
