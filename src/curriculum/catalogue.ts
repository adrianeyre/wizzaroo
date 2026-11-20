import catalogueFile from "./catalogue.json" with { type: "json" };
import {
  InvalidCurriculumFileError,
  isNonEmptyList,
  kebabCaseShape,
  readFields,
} from "./curriculum-file.js";
import { skills, type Skill } from "./skills.js";

export const featureSlots = [
  "characterType",
  "bodyColour",
  "hairStyle",
  "hairColour",
  "eyes",
  "eyeColour",
  "eyebrows",
  "mouth",
  "facialHair",
] as const;

export const wearableSlots = [
  "hat",
  "accessory",
  "outfit",
  "back",
  "wand",
] as const;

export const showOffSlots = ["pet", "mount", "emote", "spellEffect"] as const;

export const characterSlots = [
  ...featureSlots,
  ...wearableSlots,
  ...showOffSlots,
] as const;

export const furnitureSlots = [
  "bed",
  "rug",
  "wallpaper",
  "wallPicture",
  "shelf",
  "lamp",
  "window",
  "plant",
  "desk",
  "seat",
  "toyBox",
  "clock",
  "fishTank",
  "softToy",
  "instrument",
] as const;

export const vehicleSlots = ["vehicle"] as const;

export const itemSlots = [
  ...characterSlots,
  ...furnitureSlots,
  ...vehicleSlots,
] as const;

export type FeatureSlot = (typeof featureSlots)[number];

export type WearableSlot = (typeof wearableSlots)[number];

export type ShowOffSlot = (typeof showOffSlots)[number];

export type CharacterSlot = (typeof characterSlots)[number];

export type FurnitureSlot = (typeof furnitureSlots)[number];

export type VehicleSlot = (typeof vehicleSlots)[number];

export type ItemSlot = (typeof itemSlots)[number];

export const characterTypeModels = [
  "wizard",
  "warrior",
  "knight",
  "archer",
  "pirate",
  "ninja",
  "astronaut",
  "fairy",
  "explorer",
  "inventor",
  "superhero",
  "dragon-tamer",
  "chef",
  "detective",
  "royal",
  "cowhand",
  "rock-star",
  "gardener",
  "painter",
  "scientist",
] as const;

export const hairStyleModels = [
  "short",
  "bald",
  "spiky",
  "curly",
  "long",
  "ponytail",
  "bun",
  "mohawk",
  "afro",
  "braids",
  "bob",
  "pigtails",
  "space-buns",
  "quiff",
  "locs",
] as const;

export const eyesModels = [
  "round",
  "sleepy",
  "sparkly",
  "winking",
  "happy",
  "wide",
  "starry",
  "hearts",
  "determined",
  "dots",
  "cat",
  "lashes",
  "spiral",
  "side-glance",
  "flower",
] as const;

export const eyebrowsModels = [
  "straight",
  "arched",
  "bushy",
  "thin",
  "cross",
  "worried",
  "raised",
  "wavy",
  "dots",
  "chunky",
] as const;

export const mouthModels = [
  "smile",
  "grin",
  "laugh",
  "tongue",
  "little-o",
  "smirk",
  "toothy",
  "gap-tooth",
  "fangs",
  "neutral",
  "cat",
  "surprised",
  "buck-teeth",
  "wavy",
  "whistle",
] as const;

export const facialHairModels = [
  "none",
  "moustache",
  "handlebar",
  "full-beard",
  "goatee",
  "stubble",
  "wizard-beard",
  "sideburns",
  "chin-strap",
  "curly-moustache",
  "braided-beard",
  "pencil-moustache",
  "walrus",
  "mutton-chops",
  "soul-patch",
] as const;

export const hatModels = [
  "none",
  "pointy",
  "cap",
  "wizard",
  "top-hat",
  "crown",
  "wreath",
  "tricorn",
  "horns",
  "mortarboard",
  "pumpkin",
  "beanie",
  "bunny-ears",
  "bow",
  "cowboy",
  "chef",
  "flower-crown",
  "pith-helmet",
  "headband",
  "feathered-cap",
  "propeller-cap",
  "knight-helmet",
  "viking-helmet",
  "goggles",
  "space-helmet",
  "beret",
] as const;

export const accessoryModels = [
  "none",
  "round-glasses",
  "bow-tie",
  "shades",
  "heart-glasses",
  "monocle",
  "eyepatch",
  "scarf",
  "ninja-mask",
  "hero-mask",
  "necklace",
  "medal",
  "apron",
  "necktie",
  "sash",
  "bandana",
  "star-glasses",
  "lab-goggles",
  "headphones",
] as const;

export const outfitModels = [
  "tunic",
  "cloak",
  "robe",
  "starry-robe",
  "rainbow-robe",
  "striped-top",
  "raincoat",
  "armour",
  "space-suit",
  "jumper",
  "caped-tunic",
  "scarf-jumper",
  "dress",
  "overalls",
  "explorer-shirt",
  "ninja-suit",
  "pirate-coat",
  "hero-suit",
  "leather-jerkin",
  "scale-armour",
  "hoodie",
] as const;

export const backModels = [
  "none",
  "backpack",
  "cape",
  "quiver",
  "round-shield",
  "kite-shield",
  "fairy-wings",
  "turtle-shell",
  "katana",
  "gear-pack",
  "jetpack",
  "dragon-wings",
  "balloons",
] as const;

export const wandModels = [
  "none",
  "twig",
  "star",
  "crystal",
  "lightning",
  "snake",
  "comet",
  "heart",
  "golden",
  "staff",
  "sword",
  "axe",
  "bow",
  "cutlass",
  "throwing-star",
  "flag",
  "torch",
  "wrench",
  "dragon-egg",
  "whisk",
  "magnifying-glass",
  "lasso",
  "guitar",
  "watering-can",
  "paintbrush",
] as const;

export const petModels = [
  "cat",
  "puppy",
  "bunny",
  "owl",
  "fox",
  "dragonling",
  "hamster",
  "panda",
  "piglet",
  "lamb",
  "mouse",
  "bear-cub",
  "hedgehog",
  "unicorn",
  "penguin",
  "duckling",
  "phoenix-chick",
  "frog",
  "tortoise",
] as const;

export const mountModels = ["broomstick", "cloud", "dragon"] as const;

export const emoteModels = [
  "wave",
  "cheer",
  "dance",
  "spin",
  "jump",
  "bow",
  "wobble",
  "shimmy",
  "nod",
  "bounce",
  "stretch",
  "limbo",
  "sway",
  "spin-jump",
] as const;

export const spellEffectModels = [
  "sparkles",
  "star-trail",
  "bubbles",
  "rainbow",
  "fireflies",
  "snowfall",
  "confetti",
  "fizzy-spiral",
  "fireworks",
  "comet-ring",
  "autumn-leaves",
  "rain-shower",
  "galaxy",
  "fountain",
  "crackle",
  "halo",
  "pixie-dust",
  "crystal-orbit",
  "whirlwind",
] as const;

export const bedModels = [
  "wooden",
  "bunk",
  "canopy",
  "hammock",
  "rocket",
  "castle",
  "boat",
  "cloud",
  "race-car",
  "dragon",
] as const;

export const rugModels = [
  "round",
  "striped",
  "star",
  "rainbow",
  "moon",
  "map",
  "heart",
  "flower",
  "checkers",
  "paw",
] as const;

export const wallpaperModels = [
  "plain",
  "stripes",
  "dots",
  "stars",
  "forest",
  "ocean",
  "hearts",
  "clouds",
  "bricks",
  "space",
] as const;

export const wallPictureModels = [
  "sunflower",
  "boat",
  "castle",
  "rocket",
  "dinosaur",
  "rainbow",
  "cat",
  "whale",
  "planet",
  "unicorn",
] as const;

export const shelfModels = [
  "plank",
  "bookcase",
  "ladder",
  "treasure",
  "crystal",
  "cloud",
  "tree",
  "honeycomb",
  "pirate",
  "rainbow",
] as const;

export const lampModels = [
  "desk",
  "lantern",
  "mushroom",
  "moon",
  "lava",
  "star",
  "rocket",
  "cloud",
  "jellyfish",
  "globe",
] as const;

export const windowModels = [
  "square",
  "round",
  "arched",
  "porthole",
  "stained-glass",
  "tower",
  "diamond",
  "heart",
  "shuttered",
  "castle",
] as const;

export const plantModels = [
  "cactus",
  "fern",
  "sunflower",
  "bonsai",
  "flytrap",
  "tree",
  "rose",
  "palm",
  "tulips",
  "spider",
] as const;

export const deskModels = [
  "wooden",
  "school",
  "drawing",
  "log",
  "round",
  "computer",
  "science",
  "standing",
  "glass",
  "wizard",
] as const;

export const seatModels = [
  "beanbag",
  "stool",
  "armchair",
  "rocking",
  "toadstool",
  "sofa",
  "gaming",
  "egg",
  "swing",
  "throne",
] as const;

export const toyBoxModels = [
  "chest",
  "basket",
  "crate",
  "barrel",
  "star",
  "car",
  "wagon",
  "robot",
  "treasure",
  "dragon-egg",
] as const;

export const clockModels = [
  "round",
  "square",
  "sun",
  "flower",
  "alarm",
  "star",
  "cat",
  "owl",
  "cuckoo",
  "rocket",
] as const;

export const fishTankModels = [
  "bowl",
  "small",
  "big",
  "tall",
  "tropical",
  "castle",
  "turtle",
  "coral",
  "jellyfish",
  "shipwreck",
] as const;

export const softToyModels = [
  "teddy",
  "bunny",
  "kitten",
  "puppy",
  "penguin",
  "elephant",
  "octopus",
  "dinosaur",
  "unicorn",
  "dragon",
] as const;

export const instrumentModels = [
  "drum",
  "xylophone",
  "tambourine",
  "trumpet",
  "guitar",
  "keyboard",
  "drum-kit",
  "cello",
  "harp",
  "piano",
] as const;

export const vehicleModels = [
  "bicycle",
  "tandem-bicycle",
  "penny-farthing",
  "tricycle",
  "kick-scooter",
  "skateboard",
  "motorcycle",
  "moped",
  "quad-bike",
  "horse-and-cart",
  "family-car",
  "sports-car",
  "van",
  "pickup-truck",
  "jeep",
  "taxi",
  "police-car",
  "fire-engine",
  "ambulance",
  "double-decker-bus",
  "ice-cream-van",
  "tractor",
  "golf-buggy",
  "go-kart",
  "monster-truck",
  "camper-van",
  "racing-car",
  "vintage-car",
  "dune-buggy",
  "tuk-tuk",
] as const;

const modelsBySlot: Record<ItemSlot, readonly string[]> = {
  characterType: characterTypeModels,
  bodyColour: [],
  hairStyle: hairStyleModels,
  hairColour: [],
  eyes: eyesModels,
  eyeColour: [],
  eyebrows: eyebrowsModels,
  mouth: mouthModels,
  facialHair: facialHairModels,
  hat: hatModels,
  accessory: accessoryModels,
  outfit: outfitModels,
  back: backModels,
  wand: wandModels,
  pet: petModels,
  mount: mountModels,
  emote: emoteModels,
  spellEffect: spellEffectModels,
  bed: bedModels,
  rug: rugModels,
  wallpaper: wallpaperModels,
  wallPicture: wallPictureModels,
  shelf: shelfModels,
  lamp: lampModels,
  window: windowModels,
  plant: plantModels,
  desk: deskModels,
  seat: seatModels,
  toyBox: toyBoxModels,
  clock: clockModels,
  fishTank: fishTankModels,
  softToy: softToyModels,
  instrument: instrumentModels,
  vehicle: vehicleModels,
};

export type CharacterLoadout = Partial<Record<CharacterSlot, string>>;

export type RoomLoadout = Partial<Record<FurnitureSlot, string>>;

const rarities = ["common", "uncommon", "rare"] as const;

export type Rarity = (typeof rarities)[number];

export type ItemPrices = Record<Rarity, number>;

export type ItemUnlock =
  | { kind: "starter" }
  | { kind: "stars" }
  | { kind: "skill-mastered"; skillId: string }
  | { kind: "season"; months: number[] }
  | { kind: "gift" }
  | { kind: "family-chest" }
  | { kind: "welcome-back" };

export interface Item {
  id: string;
  name: string;
  slot: ItemSlot;
  rarity: Rarity;
  unlock: ItemUnlock;
  starCost: number | null;
  model: string | undefined;
  colour: string;
}

const itemFields = [
  "id",
  "name",
  "slot",
  "rarity",
  "unlock",
  "model",
  "colour",
];
const unlockFields = ["kind", "skillId", "months"];
const catalogueFields = ["prices", "items"];
const fewestStarterItemsPerSlot = 2;
const mostStarterItemsPerSlot = 3;
const fewestChoicesPerFeature = 10;
const colourShape = /^#[0-9a-f]{6}$/;
const firstMonth = 1;
const lastMonth = 12;

const unlockKindsBoughtWithStars = new Set<ItemUnlock["kind"]>([
  "stars",
  "skill-mastered",
  "season",
  "gift",
]);

export const isCharacterSlot = (value: unknown): value is CharacterSlot =>
  characterSlots.some((slot) => slot === value);

export const isFeatureSlot = (value: unknown): value is FeatureSlot =>
  featureSlots.some((slot) => slot === value);

export const isFurnitureSlot = (value: unknown): value is FurnitureSlot =>
  furnitureSlots.some((slot) => slot === value);

export const isVehicleSlot = (value: unknown): value is VehicleSlot =>
  vehicleSlots.some((slot) => slot === value);

export const isShowOffSlot = (value: unknown): value is ShowOffSlot =>
  showOffSlots.some((slot) => slot === value);

const isItemSlot = (value: unknown): value is ItemSlot =>
  itemSlots.some((slot) => slot === value);

export const isOneOf = <Value extends string>(
  values: readonly Value[],
  value: unknown,
): value is Value => values.some((candidate) => candidate === value);

const isRarity = (value: unknown): value is Rarity =>
  rarities.some((rarity) => rarity === value);

const isMonth = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= firstMonth &&
  value <= lastMonth;

const parseItemPrices = (prices: unknown): ItemPrices => {
  const fields = readFields(prices, rarities, "The Catalogue's prices");
  const [common, uncommon, rare] = rarities.map((rarity) => {
    const price = fields.get(rarity);
    if (typeof price !== "number" || !Number.isInteger(price) || price < 1) {
      throw new InvalidCurriculumFileError(
        `The Catalogue needs a whole number of Stars for a ${rarity} Item`,
      );
    }
    return price;
  });
  return { common, uncommon, rare };
};

const parseItemUnlock = (
  unlock: unknown,
  itemId: string,
  knownSkills: readonly Skill[],
): ItemUnlock => {
  const fields = readFields(
    unlock,
    unlockFields,
    `The unlock rule of Item "${itemId}"`,
  );
  const kind = fields.get("kind");
  const skillId = fields.get("skillId");
  const months = fields.get("months");
  if (kind === "skill-mastered") {
    if (!knownSkills.some(({ id }) => id === skillId)) {
      throw new InvalidCurriculumFileError(
        `Item "${itemId}" is tied to "${String(skillId)}", which isn't a Skill`,
      );
    }
    return { kind, skillId: String(skillId) };
  }
  if (kind === "season") {
    if (!isNonEmptyList(months) || !months.every(isMonth)) {
      throw new InvalidCurriculumFileError(
        `Seasonal Item "${itemId}" needs the months it comes back in, from 1 to 12`,
      );
    }
    return { kind, months };
  }
  if (skillId !== undefined || months !== undefined) {
    throw new InvalidCurriculumFileError(
      `Item "${itemId}" has a skillId or months its unlock rule doesn't use`,
    );
  }
  if (
    kind === "starter" ||
    kind === "stars" ||
    kind === "gift" ||
    kind === "family-chest" ||
    kind === "welcome-back"
  ) {
    return { kind };
  }
  throw new InvalidCurriculumFileError(
    `Item "${itemId}" has an unlock rule of a kind the Catalogue doesn't know`,
  );
};

const parseItem = (
  itemFile: unknown,
  prices: ItemPrices,
  knownSkills: readonly Skill[],
): Item => {
  const fields = readFields(itemFile, itemFields, "A Catalogue Item");
  const id = fields.get("id");
  const name = fields.get("name");
  const slot = fields.get("slot");
  const rarity = fields.get("rarity");
  const colour = fields.get("colour");
  const model = fields.get("model");
  if (typeof id !== "string" || !kebabCaseShape.test(id)) {
    throw new InvalidCurriculumFileError(
      'A Catalogue Item needs an ID shaped like "hat-wizard-blue"',
    );
  }
  if (typeof name !== "string" || name.trim() === "") {
    throw new InvalidCurriculumFileError(
      `Item "${id}" needs a name a Child can read`,
    );
  }
  if (!isItemSlot(slot)) {
    throw new InvalidCurriculumFileError(
      `Item "${id}" needs a slot, one of ${itemSlots.join(", ")}`,
    );
  }
  if (!isRarity(rarity)) {
    throw new InvalidCurriculumFileError(
      `Item "${id}" needs a rarity, one of ${rarities.join(", ")}`,
    );
  }
  if (typeof colour !== "string" || !colourShape.test(colour)) {
    throw new InvalidCurriculumFileError(
      `Item "${id}" needs a colour shaped like "#4fa3e0"`,
    );
  }
  const slotModels = modelsBySlot[slot];
  if (slotModels.length === 0 && model !== undefined) {
    throw new InvalidCurriculumFileError(
      `Item "${id}" has a model, which the ${slot} slot doesn't use`,
    );
  }
  if (slotModels.length > 0 && !isOneOf(slotModels, model)) {
    throw new InvalidCurriculumFileError(
      `Item "${id}" needs a model, one of ${slotModels.join(", ")}`,
    );
  }
  const unlock = parseItemUnlock(fields.get("unlock"), id, knownSkills);
  if (isFeatureSlot(slot) && unlock.kind !== "starter") {
    throw new InvalidCurriculumFileError(
      `Item "${id}" is a ${slot} Feature, so it must be free to choose`,
    );
  }
  return {
    id,
    name,
    slot,
    rarity,
    unlock,
    starCost: unlockKindsBoughtWithStars.has(unlock.kind)
      ? prices[rarity]
      : null,
    model: isOneOf(slotModels, model) ? model : undefined,
    colour,
  };
};

export const parseCatalogue = (
  catalogueContent: unknown,
  knownSkills: readonly Skill[],
): Item[] => {
  const fields = readFields(catalogueContent, catalogueFields, "The Catalogue");
  const prices = parseItemPrices(fields.get("prices"));
  const itemFiles = fields.get("items");
  if (!isNonEmptyList(itemFiles)) {
    throw new InvalidCurriculumFileError("The Catalogue needs a list of Items");
  }
  const items = itemFiles.map((itemFile) =>
    parseItem(itemFile, prices, knownSkills),
  );

  const itemIds = new Set<string>();
  for (const { id } of items) {
    if (itemIds.has(id)) {
      throw new InvalidCurriculumFileError(`Two Items have the ID "${id}"`);
    }
    itemIds.add(id);
  }
  for (const slot of featureSlots) {
    const choiceCount = items.filter((item) => item.slot === slot).length;
    if (choiceCount < fewestChoicesPerFeature) {
      throw new InvalidCurriculumFileError(
        `The Catalogue needs at least ${String(fewestChoicesPerFeature)} choices for the ${slot} Feature`,
      );
    }
  }
  for (const slot of [...wearableSlots, ...furnitureSlots]) {
    const starterCount = items.filter(
      (item) => item.slot === slot && item.unlock.kind === "starter",
    ).length;
    if (
      starterCount < fewestStarterItemsPerSlot ||
      starterCount > mostStarterItemsPerSlot
    ) {
      throw new InvalidCurriculumFileError(
        `The Catalogue needs 2 or 3 free starter Items for the ${slot} slot`,
      );
    }
  }
  for (const slot of [...showOffSlots, ...vehicleSlots]) {
    if (
      items.some((item) => item.slot === slot && item.unlock.kind === "starter")
    ) {
      throw new InvalidCurriculumFileError(
        `The ${slot} slot starts empty, so none of its Items can be a starter`,
      );
    }
  }
  return items;
};

export const catalogue = parseCatalogue(catalogueFile, skills);

export const findItem = (
  itemId: string,
  items: readonly Item[] = catalogue,
): Item | undefined => items.find(({ id }) => id === itemId);

export const listStarterItems = (
  slot: ItemSlot,
  items: readonly Item[] = catalogue,
): Item[] =>
  items.filter((item) => item.slot === slot && item.unlock.kind === "starter");

export const isItemInSeason = (item: Item, localDate: string): boolean =>
  item.unlock.kind !== "season" ||
  item.unlock.months.includes(Number(localDate.slice(5, 7)));

const findChosenItem = <Slot extends ItemSlot>(
  loadout: Partial<Record<Slot, string>>,
  slot: Slot,
  items: readonly Item[],
): Item | undefined => {
  const chosenItemId = loadout[slot];
  const chosenItem =
    chosenItemId === undefined ? undefined : findItem(chosenItemId, items);
  return chosenItem?.slot === slot ? chosenItem : undefined;
};

const findEyeColourMatchingEyes = (
  loadout: CharacterLoadout,
  items: readonly Item[],
): Item | undefined => {
  const eyes = findChosenFeature(loadout, "eyes", items);
  return listStarterItems("eyeColour", items).find(
    ({ colour }) => colour === eyes.colour,
  );
};

export const findChosenFeature = (
  loadout: CharacterLoadout,
  slot: FeatureSlot,
  items: readonly Item[] = catalogue,
): Item => {
  const [firstStarter] = listStarterItems(slot, items);
  const unchosenFeature =
    slot === "eyeColour"
      ? (findEyeColourMatchingEyes(loadout, items) ?? firstStarter)
      : firstStarter;
  return findChosenItem(loadout, slot, items) ?? unchosenFeature;
};

export const findWornItem = (
  loadout: CharacterLoadout,
  slot: WearableSlot,
  items: readonly Item[] = catalogue,
): Item | undefined => findChosenItem(loadout, slot, items);

export const findShownOffItem = (
  loadout: CharacterLoadout,
  slot: ShowOffSlot,
  items: readonly Item[] = catalogue,
): Item | undefined => findChosenItem(loadout, slot, items);

export const findChosenFurniture = (
  room: RoomLoadout,
  slot: FurnitureSlot,
  items: readonly Item[] = catalogue,
): Item => {
  const [firstStarter] = listStarterItems(slot, items);
  return findChosenItem(room, slot, items) ?? firstStarter;
};

export const isRoomLoadout = (value: unknown): value is RoomLoadout =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  Object.entries(value).every(
    ([slot, itemId]) => isFurnitureSlot(slot) && typeof itemId === "string",
  );
