import {
  catalogue,
  characterTypeModels,
  eyebrowsModels,
  eyesModels,
  facialHairModels,
  findChosenFeature,
  findShownOffItem,
  findWornItem,
  hairStyleModels,
  isOneOf,
  mouthModels,
  wearableSlots,
  accessoryModels,
  backModels,
  hatModels,
  outfitModels,
  wandModels,
  petModels,
  mountModels,
  emoteModels,
  spellEffectModels,
  type CharacterLoadout,
  type FeatureSlot,
  type Item,
  type WearableSlot,
} from "../../curriculum/catalogue.js";

export type CharacterTypeModel = (typeof characterTypeModels)[number];
export type HairStyleModel = (typeof hairStyleModels)[number];
export type EyesModel = (typeof eyesModels)[number];
export type EyebrowsModel = (typeof eyebrowsModels)[number];
export type MouthModel = (typeof mouthModels)[number];
export type FacialHairModel = (typeof facialHairModels)[number];
export type HatModel = (typeof hatModels)[number];
export type AccessoryModel = (typeof accessoryModels)[number];
export type OutfitModel = (typeof outfitModels)[number];
export type BackModel = (typeof backModels)[number];
export type WandModel = (typeof wandModels)[number];
export type PetModel = (typeof petModels)[number];
export type MountModel = (typeof mountModels)[number];
export type EmoteModel = (typeof emoteModels)[number];
export type SpellEffectModel = (typeof spellEffectModels)[number];

export interface PartLook<Model extends string> {
  model: Model;
  colour: string;
}

export interface CharacterTypeGear {
  hat: PartLook<HatModel>;
  accessory: PartLook<AccessoryModel>;
  outfit: PartLook<OutfitModel>;
  back: PartLook<BackModel>;
  wand: PartLook<WandModel>;
}

export interface CharacterLook extends CharacterTypeGear {
  characterType: CharacterTypeModel;
  skinColour: string;
  hairStyle: HairStyleModel;
  hairColour: string;
  eyes: PartLook<EyesModel>;
  eyebrows: EyebrowsModel;
  mouth: MouthModel;
  facialHair: FacialHairModel;
}

export interface ShowOffLook {
  pet: PartLook<PetModel> | undefined;
  mount: PartLook<MountModel> | undefined;
  emote: EmoteModel | undefined;
  spellEffect: PartLook<SpellEffectModel> | undefined;
}

const nothing = "#000000";

export const characterTypeGear: Record<CharacterTypeModel, CharacterTypeGear> =
  {
    wizard: {
      hat: { model: "wizard", colour: "#5b3fc4" },
      accessory: { model: "none", colour: nothing },
      outfit: { model: "robe", colour: "#5b3fc4" },
      back: { model: "none", colour: nothing },
      wand: { model: "staff", colour: "#8b5a2b" },
    },
    warrior: {
      hat: { model: "viking-helmet", colour: "#8d8d96" },
      accessory: { model: "none", colour: nothing },
      outfit: { model: "leather-jerkin", colour: "#a0522d" },
      back: { model: "round-shield", colour: "#a0522d" },
      wand: { model: "axe", colour: "#9aa3b5" },
    },
    knight: {
      hat: { model: "knight-helmet", colour: "#b8c0cc" },
      accessory: { model: "none", colour: nothing },
      outfit: { model: "armour", colour: "#9aa3b5" },
      back: { model: "kite-shield", colour: "#2f5fd0" },
      wand: { model: "sword", colour: "#d8dde6" },
    },
    archer: {
      hat: { model: "feathered-cap", colour: "#3f8f3a" },
      accessory: { model: "none", colour: nothing },
      outfit: { model: "tunic", colour: "#3f8f3a" },
      back: { model: "quiver", colour: "#8b5a2b" },
      wand: { model: "bow", colour: "#8b5a2b" },
    },
    pirate: {
      hat: { model: "tricorn", colour: "#26262e" },
      accessory: { model: "eyepatch", colour: "#1b1b24" },
      outfit: { model: "pirate-coat", colour: "#b8322a" },
      back: { model: "none", colour: nothing },
      wand: { model: "cutlass", colour: "#d8dde6" },
    },
    ninja: {
      hat: { model: "headband", colour: "#d6262e" },
      accessory: { model: "ninja-mask", colour: "#2a2a3a" },
      outfit: { model: "ninja-suit", colour: "#2a2a3a" },
      back: { model: "katana", colour: "#2a2a3a" },
      wand: { model: "throwing-star", colour: "#9aa3b5" },
    },
    astronaut: {
      hat: { model: "space-helmet", colour: "#e8ecf2" },
      accessory: { model: "none", colour: nothing },
      outfit: { model: "space-suit", colour: "#e8ecf2" },
      back: { model: "jetpack", colour: "#b8c0cc" },
      wand: { model: "flag", colour: "#d6262e" },
    },
    fairy: {
      hat: { model: "flower-crown", colour: "#f08cc8" },
      accessory: { model: "none", colour: nothing },
      outfit: { model: "dress", colour: "#f08cc8" },
      back: { model: "fairy-wings", colour: "#bfe8ff" },
      wand: { model: "star", colour: "#f2d34f" },
    },
    explorer: {
      hat: { model: "pith-helmet", colour: "#d8c08a" },
      accessory: { model: "scarf", colour: "#d6262e" },
      outfit: { model: "explorer-shirt", colour: "#c9a46a" },
      back: { model: "backpack", colour: "#8b5a2b" },
      wand: { model: "torch", colour: "#d9822b" },
    },
    inventor: {
      hat: { model: "goggles", colour: "#c9822b" },
      accessory: { model: "none", colour: nothing },
      outfit: { model: "overalls", colour: "#3a7bd5" },
      back: { model: "gear-pack", colour: "#c9822b" },
      wand: { model: "wrench", colour: "#9aa3b5" },
    },
    superhero: {
      hat: { model: "none", colour: nothing },
      accessory: { model: "hero-mask", colour: "#1b1b24" },
      outfit: { model: "hero-suit", colour: "#d6262e" },
      back: { model: "cape", colour: "#f2c530" },
      wand: { model: "none", colour: nothing },
    },
    "dragon-tamer": {
      hat: { model: "horns", colour: "#f2e2c4" },
      accessory: { model: "none", colour: nothing },
      outfit: { model: "scale-armour", colour: "#2f8f6f" },
      back: { model: "dragon-wings", colour: "#2f8f6f" },
      wand: { model: "dragon-egg", colour: "#f2c530" },
    },
    chef: {
      hat: { model: "chef", colour: "#f7f7f7" },
      accessory: { model: "apron", colour: "#f7f7f7" },
      outfit: { model: "tunic", colour: "#d6262e" },
      back: { model: "none", colour: nothing },
      wand: { model: "whisk", colour: "#c8ced8" },
    },
    detective: {
      hat: { model: "cap", colour: "#7a5a3a" },
      accessory: { model: "necktie", colour: "#7a1f1f" },
      outfit: { model: "raincoat", colour: "#b8925a" },
      back: { model: "none", colour: nothing },
      wand: { model: "magnifying-glass", colour: "#8b5a2b" },
    },
    royal: {
      hat: { model: "crown", colour: "#f4c430" },
      accessory: { model: "sash", colour: "#2f5fd0" },
      outfit: { model: "robe", colour: "#b8322a" },
      back: { model: "cape", colour: "#7a1f1f" },
      wand: { model: "golden", colour: "#e0b100" },
    },
    cowhand: {
      hat: { model: "cowboy", colour: "#a86a32" },
      accessory: { model: "bandana", colour: "#d6262e" },
      outfit: { model: "leather-jerkin", colour: "#8b5a2b" },
      back: { model: "none", colour: nothing },
      wand: { model: "lasso", colour: "#d8b46a" },
    },
    "rock-star": {
      hat: { model: "none", colour: nothing },
      accessory: { model: "star-glasses", colour: "#f2c530" },
      outfit: { model: "jumper", colour: "#7a3fc4" },
      back: { model: "none", colour: nothing },
      wand: { model: "guitar", colour: "#d6262e" },
    },
    gardener: {
      hat: { model: "cowboy", colour: "#e8cf8a" },
      accessory: { model: "none", colour: nothing },
      outfit: { model: "overalls", colour: "#4f8f3a" },
      back: { model: "none", colour: nothing },
      wand: { model: "watering-can", colour: "#3f9d5a" },
    },
    painter: {
      hat: { model: "beret", colour: "#d6262e" },
      accessory: { model: "none", colour: nothing },
      outfit: { model: "striped-top", colour: "#1d2a6b" },
      back: { model: "none", colour: nothing },
      wand: { model: "paintbrush", colour: "#3a6fd9" },
    },
    scientist: {
      hat: { model: "none", colour: nothing },
      accessory: { model: "lab-goggles", colour: "#3fa0ff" },
      outfit: { model: "raincoat", colour: "#f4f7fa" },
      back: { model: "none", colour: nothing },
      wand: { model: "crystal", colour: "#7fd6a4" },
    },
  };

const getFeatureModel = <Model extends string>(
  models: readonly [Model, ...Model[]],
  item: Item,
): Model => (isOneOf(models, item.model) ? item.model : models[0]);

const getWornPart = <Model extends string>(
  models: readonly Model[],
  item: Item | undefined,
  gear: PartLook<Model>,
): PartLook<Model> =>
  item !== undefined && isOneOf(models, item.model)
    ? { model: item.model, colour: item.colour }
    : gear;

export const buildCharacterLook = (
  loadout: CharacterLoadout,
  items: readonly Item[] = catalogue,
): CharacterLook => {
  const getFeature = (slot: FeatureSlot) =>
    findChosenFeature(loadout, slot, items);
  const getWorn = (slot: WearableSlot) => findWornItem(loadout, slot, items);
  const characterType = getFeatureModel(
    characterTypeModels,
    getFeature("characterType"),
  );
  const gear = characterTypeGear[characterType];

  return {
    characterType,
    skinColour: getFeature("bodyColour").colour,
    hairStyle: getFeatureModel(hairStyleModels, getFeature("hairStyle")),
    hairColour: getFeature("hairColour").colour,
    eyes: {
      model: getFeatureModel(eyesModels, getFeature("eyes")),
      colour: getFeature("eyeColour").colour,
    },
    eyebrows: getFeatureModel(eyebrowsModels, getFeature("eyebrows")),
    mouth: getFeatureModel(mouthModels, getFeature("mouth")),
    facialHair: getFeatureModel(facialHairModels, getFeature("facialHair")),
    hat: getWornPart(hatModels, getWorn("hat"), gear.hat),
    accessory: getWornPart(
      accessoryModels,
      getWorn("accessory"),
      gear.accessory,
    ),
    outfit: getWornPart(outfitModels, getWorn("outfit"), gear.outfit),
    back: getWornPart(backModels, getWorn("back"), gear.back),
    wand: getWornPart(wandModels, getWorn("wand"), gear.wand),
  };
};

const findShownOffPart = <Model extends string>(
  models: readonly Model[],
  item: Item | undefined,
): PartLook<Model> | undefined =>
  item !== undefined && isOneOf(models, item.model)
    ? { model: item.model, colour: item.colour }
    : undefined;

export const buildShowOffLook = (
  loadout: CharacterLoadout,
  items: readonly Item[] = catalogue,
): ShowOffLook => ({
  pet: findShownOffPart(petModels, findShownOffItem(loadout, "pet", items)),
  mount: findShownOffPart(
    mountModels,
    findShownOffItem(loadout, "mount", items),
  ),
  emote: findShownOffPart(
    emoteModels,
    findShownOffItem(loadout, "emote", items),
  )?.model,
  spellEffect: findShownOffPart(
    spellEffectModels,
    findShownOffItem(loadout, "spellEffect", items),
  ),
});

export const describeCharacter = (
  characterName: string,
  loadout: CharacterLoadout,
  items: readonly Item[] = catalogue,
): string => {
  const characterType = findChosenFeature(loadout, "characterType", items);
  const wornNames = wearableSlots.flatMap((slot) => {
    const item = findWornItem(loadout, slot, items);
    return item === undefined || item.model === "none" ? [] : [item.name];
  });
  const typeDescription = `${characterName} the ${characterType.name}`;
  const mount = findShownOffItem(loadout, "mount", items);
  const pet = findShownOffItem(loadout, "pet", items);
  return [
    typeDescription,
    ...(wornNames.length === 0 ? [] : [`wearing ${wornNames.join(", ")}`]),
    ...(mount === undefined ? [] : [`riding a ${mount.name}`]),
    ...(pet === undefined ? [] : [`with a ${pet.name}`]),
  ].join(", ");
};
