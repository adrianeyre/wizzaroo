import { describe, expect, it } from "vitest";
import {
  catalogue,
  featureSlots,
  findChosenFeature,
  findChosenFurniture,
  findShownOffItem,
  findWornItem,
  furnitureSlots,
  isItemInSeason,
  listStarterItems,
  parseCatalogue,
  showOffSlots,
  vehicleModels,
  vehicleSlots,
  wearableSlots,
  type FeatureSlot,
  type FurnitureSlot,
  type Item,
  type WearableSlot,
} from "./catalogue.js";
import { InvalidCurriculumFileError } from "./curriculum-file.js";
import { skills } from "./skills.js";

const prices = { common: 15, uncommon: 30, rare: 60 };

const starterModels: Record<
  FeatureSlot | WearableSlot | FurnitureSlot,
  string | undefined
> = {
  characterType: "wizard",
  bodyColour: undefined,
  hairStyle: "short",
  hairColour: undefined,
  eyes: "round",
  eyeColour: undefined,
  eyebrows: "straight",
  mouth: "smile",
  facialHair: "none",
  hat: "pointy",
  accessory: "none",
  outfit: "tunic",
  back: "none",
  wand: "twig",
  bed: "wooden",
  rug: "round",
  wallpaper: "plain",
  wallPicture: "sunflower",
  shelf: "plank",
  lamp: "desk",
  window: "square",
  plant: "cactus",
  desk: "wooden",
  seat: "beanbag",
  toyBox: "chest",
  clock: "round",
  fishTank: "bowl",
  softToy: "teddy",
  instrument: "drum",
};

const featureChoiceNames = Array.from(
  { length: 10 },
  (_, index) => `choice-${String(index + 1)}`,
);

const buildStarters = () =>
  [...featureSlots, ...wearableSlots, ...furnitureSlots].flatMap((slot) =>
    (featureSlots.some((featureSlot) => featureSlot === slot)
      ? featureChoiceNames
      : ["one", "two"]
    ).map((name) => ({
      id: `${slot.toLowerCase()}-${name}`,
      name: `Starter ${name}`,
      slot,
      rarity: "common",
      unlock: { kind: "starter" },
      ...(starterModels[slot] === undefined
        ? {}
        : { model: starterModels[slot] }),
      colour: "#123456",
    })),
  );

const wizardHat = {
  id: "hat-wizard-blue",
  name: "Blue wizard hat",
  slot: "hat",
  rarity: "uncommon",
  unlock: { kind: "stars" },
  model: "wizard",
  colour: "#2f5fd0",
};

const parseWith = (...items: unknown[]) =>
  parseCatalogue({ prices, items: [...buildStarters(), ...items] }, skills);

const countEarnable = (
  slot: Item["slot"],
  isEarnable = ({ unlock }: Item) =>
    unlock.kind === "stars" || unlock.kind === "skill-mastered",
) => catalogue.filter((item) => item.slot === slot && isEarnable(item)).length;

describe("catalogue", () => {
  it("has nine Features to make a Character with and five slots to dress it in", () => {
    expect(featureSlots).toEqual([
      "characterType",
      "bodyColour",
      "hairStyle",
      "hairColour",
      "eyes",
      "eyeColour",
      "eyebrows",
      "mouth",
      "facialHair",
    ]);
    expect(wearableSlots).toEqual([
      "hat",
      "accessory",
      "outfit",
      "back",
      "wand",
    ]);
  });

  it("offers at least 10 free choices for every Feature", () => {
    for (const slot of featureSlots) {
      const choices = catalogue.filter((item) => item.slot === slot);
      expect(choices.length).toBeGreaterThanOrEqual(10);
      expect(choices.every(({ starCost }) => starCost === null)).toBe(true);
    }
  });

  it("offers at least 10 Character Types, among them a Wizard and a Warrior", () => {
    const characterTypes = catalogue
      .filter(({ slot }) => slot === "characterType")
      .map(({ name }) => name);

    expect(characterTypes.length).toBeGreaterThanOrEqual(10);
    expect(characterTypes).toEqual(
      expect.arrayContaining(["Wizard", "Warrior", "Knight", "Pirate"]),
    );
  });

  it("gives every slot to dress a free starter set of 2 or 3 choices", () => {
    for (const slot of wearableSlots) {
      const starters = listStarterItems(slot);
      expect(starters.length).toBeGreaterThanOrEqual(2);
      expect(starters.length).toBeLessThanOrEqual(3);
      expect(starters.every(({ starCost }) => starCost === null)).toBe(true);
    }
  });

  it("has Items to earn with Stars in every slot to dress, two of them tied to Skills", () => {
    for (const slot of wearableSlots) {
      expect(countEarnable(slot)).toBeGreaterThanOrEqual(5);
    }
    expect(
      catalogue
        .filter(
          ({ slot, unlock }) =>
            wearableSlots.some((wearableSlot) => wearableSlot === slot) &&
            unlock.kind === "skill-mastered",
        )
        .map(({ unlock }) => unlock),
    ).toEqual([
      { kind: "skill-mastered", skillId: "maths.number-bonds-10" },
      { kind: "skill-mastered", skillId: "phonics.sound-s" },
    ]);
  });

  it("starts every Pet, Mount, Emote and Spell Effect slot empty, with Items to earn in each", () => {
    expect(showOffSlots).toEqual(["pet", "mount", "emote", "spellEffect"]);
    for (const slot of showOffSlots) {
      expect(listStarterItems(slot)).toEqual([]);
    }
    expect(countEarnable("pet")).toBe(19);
    expect(countEarnable("mount")).toBe(3);
    expect(countEarnable("emote")).toBe(14);
    expect(countEarnable("spellEffect")).toBe(19);
    expect(
      catalogue.filter(({ slot }) => slot === "mount").map(({ name }) => name),
    ).toEqual(["Flying Broomstick", "Fluffy Cloud", "Friendly Dragon"]);
  });

  it("sells 30 Vehicles for Stars, one of each model, with none free to start", () => {
    expect(vehicleSlots).toEqual(["vehicle"]);
    const vehicles = catalogue.filter(({ slot }) => slot === "vehicle");
    expect(vehicles).toHaveLength(30);
    expect(listStarterItems("vehicle")).toEqual([]);
    expect(vehicles.map(({ model }) => model).toSorted()).toEqual(
      [...vehicleModels].toSorted(),
    );
    vehicles.forEach(({ unlock, starCost }) => {
      expect(unlock.kind).toBe("stars");
      expect(starCost).toBeGreaterThan(0);
    });
    expect(vehicles.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        "Horse and Cart",
        "Sports Car",
        "Family Car",
        "Delivery Van",
        "Motorcycle",
        "Red Bicycle",
      ]),
    );
  });

  it("gives every place in a Room 2 or 3 free starters and 8 Furniture Items to earn", () => {
    expect(furnitureSlots).toEqual([
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
    ]);
    for (const slot of furnitureSlots) {
      const starters = listStarterItems(slot);
      expect(starters.length).toBeGreaterThanOrEqual(2);
      expect(starters.length).toBeLessThanOrEqual(3);
      expect(countEarnable(slot)).toBe(8);
    }
  });

  it("ties one Pet, Mount, Emote, Spell Effect and piece of Furniture each to a Skill", () => {
    const countTiedToSkills = (slots: readonly Item["slot"][]) =>
      catalogue.filter(
        ({ slot, unlock }) =>
          slots.includes(slot) && unlock.kind === "skill-mastered",
      ).length;

    for (const slot of showOffSlots) {
      expect(countTiedToSkills([slot])).toBe(1);
    }
    expect(countTiedToSkills(furnitureSlots)).toBe(1);
  });

  it("has Gifts, Family Chest Items, welcome-back gifts and seasonal Items", () => {
    const countUnlockedBy = (kind: Item["unlock"]["kind"]) =>
      catalogue.filter(({ unlock }) => unlock.kind === kind).length;

    expect(countUnlockedBy("gift")).toBeGreaterThan(0);
    expect(countUnlockedBy("family-chest")).toBeGreaterThan(0);
    expect(countUnlockedBy("welcome-back")).toBeGreaterThan(0);
    expect(countUnlockedBy("season")).toBeGreaterThan(0);
  });
});

describe("parseCatalogue", () => {
  it("prices each Item by its rarity, and gives no price to an Item that isn't sold", () => {
    const [hat] = parseWith(wizardHat).slice(-1);

    expect(hat).toEqual({ ...wizardHat, slot: "hat", starCost: 30 });
    expect(parseWith().every(({ starCost }) => starCost === null)).toBe(true);
  });

  it.each([
    ["an ID that isn't kebab-case", { ...wizardHat, id: "Wizard Hat" }],
    ["no name", { ...wizardHat, name: " " }],
    ["a slot that doesn't exist", { ...wizardHat, slot: "wings" }],
    ["a rarity that doesn't exist", { ...wizardHat, rarity: "legendary" }],
    ["a colour that isn't hex", { ...wizardHat, colour: "blue" }],
    ["a field it doesn't know", { ...wizardHat, price: 5 }],
    [
      "an unlock rule of a kind it doesn't know",
      { ...wizardHat, unlock: { kind: "streak" } },
    ],
    [
      "a Skill that doesn't exist",
      {
        ...wizardHat,
        unlock: { kind: "skill-mastered", skillId: "maths.made-up" },
      },
    ],
    [
      "a season with no months",
      { ...wizardHat, unlock: { kind: "season", months: [] } },
    ],
    [
      "a season in month 13",
      { ...wizardHat, unlock: { kind: "season", months: [13] } },
    ],
    [
      "months on an Item that isn't seasonal",
      { ...wizardHat, unlock: { kind: "stars", months: [12] } },
    ],
    ["no model", { ...wizardHat, model: undefined }],
    ["a model its slot doesn't have", { ...wizardHat, model: "staff" }],
    [
      "a model on a slot that is only a colour",
      {
        ...wizardHat,
        id: "body-model",
        slot: "bodyColour",
        unlock: { kind: "starter" },
      },
    ],
    [
      "a Feature that costs Stars",
      {
        ...wizardHat,
        id: "eyes-paid",
        slot: "eyes",
        model: "round",
      },
    ],
    [
      "a free starter Pet",
      {
        ...wizardHat,
        id: "pet-free",
        slot: "pet",
        model: "cat",
        unlock: { kind: "starter" },
      },
    ],
  ])("refuses an Item with %s", (_, item) => {
    expect(() => parseWith(item)).toThrow(InvalidCurriculumFileError);
  });

  it("refuses two Items with the same ID", () => {
    expect(() => parseWith(wizardHat, wizardHat)).toThrow(
      'Two Items have the ID "hat-wizard-blue"',
    );
  });

  it("refuses a slot with fewer than 2 or more than 3 free starter Items", () => {
    const [, ...oneHatShort] = buildStarters().filter(
      ({ slot }) => slot === "hat",
    );
    const others = buildStarters().filter(({ slot }) => slot !== "hat");
    const extraHat = (name: string) => ({
      ...wizardHat,
      id: `hat-${name}`,
      unlock: { kind: "starter" },
    });

    expect(() =>
      parseCatalogue({ prices, items: [...others, ...oneHatShort] }, skills),
    ).toThrow("2 or 3 free starter Items for the hat slot");
    expect(() => parseWith(extraHat("three"), extraHat("four"))).toThrow(
      "2 or 3 free starter Items for the hat slot",
    );
  });

  it("refuses a Feature with fewer than 10 choices", () => {
    const [, ...oneMouthShort] = buildStarters().filter(
      ({ slot }) => slot === "mouth",
    );
    const others = buildStarters().filter(({ slot }) => slot !== "mouth");

    expect(() =>
      parseCatalogue({ prices, items: [...others, ...oneMouthShort] }, skills),
    ).toThrow("at least 10 choices for the mouth Feature");
  });

  it("refuses prices that aren't a whole number of Stars for every rarity", () => {
    expect(() =>
      parseCatalogue(
        { prices: { common: 15, uncommon: 30 }, items: buildStarters() },
        skills,
      ),
    ).toThrow(InvalidCurriculumFileError);
    expect(() =>
      parseCatalogue(
        { prices: { ...prices, rare: 0 }, items: buildStarters() },
        skills,
      ),
    ).toThrow(InvalidCurriculumFileError);
    expect(() => parseCatalogue({ prices, items: [] }, skills)).toThrow(
      InvalidCurriculumFileError,
    );
  });
});

describe("isItemInSeason", () => {
  it("brings a seasonal Item back in its months every year, and keeps every other Item in season", () => {
    const [snowflakeHat] = parseWith({
      ...wizardHat,
      id: "hat-snowflake",
      unlock: { kind: "season", months: [12] },
    }).slice(-1);
    const [plainHat] = parseWith(wizardHat).slice(-1);

    expect(isItemInSeason(snowflakeHat, "2026-12-01")).toBe(true);
    expect(isItemInSeason(snowflakeHat, "2031-12-31")).toBe(true);
    expect(isItemInSeason(snowflakeHat, "2027-01-01")).toBe(false);
    expect(isItemInSeason(plainHat, "2027-06-15")).toBe(true);
  });
});

describe("findChosenFeature and findWornItem", () => {
  const items = parseWith(wizardHat);

  it("falls back to the first free choice for a Feature the Child hasn't chosen", () => {
    expect(findChosenFeature({}, "characterType", items).id).toBe(
      "charactertype-choice-1",
    );
    expect(
      findChosenFeature(
        { characterType: "charactertype-choice-3" },
        "characterType",
        items,
      ).id,
    ).toBe("charactertype-choice-3");
  });

  it("keeps the colour a Child's Eyes came with until the Child chooses an Eye colour", () => {
    const greenEyes = {
      id: "eyes-green",
      name: "Green eyes",
      slot: "eyes",
      rarity: "common",
      unlock: { kind: "starter" },
      model: "round",
      colour: "#3f8f3a",
    };
    const greenEyeColour = {
      id: "eyecolour-green",
      name: "Green",
      slot: "eyeColour",
      rarity: "common",
      unlock: { kind: "starter" },
      colour: "#3f8f3a",
    };
    const eyeItems = parseWith(greenEyes, greenEyeColour);

    expect(
      findChosenFeature({ eyes: "eyes-green" }, "eyeColour", eyeItems).id,
    ).toBe("eyecolour-green");
    expect(
      findChosenFeature(
        { eyes: "eyes-green", eyeColour: "eyecolour-choice-2" },
        "eyeColour",
        eyeItems,
      ).id,
    ).toBe("eyecolour-choice-2");
    expect(findChosenFeature({}, "eyeColour", eyeItems).id).toBe(
      "eyecolour-choice-1",
    );
  });

  it("matches every Eyes' own colour to an Eye colour, so no Character's eyes change colour", () => {
    const eyeColours = new Set(
      listStarterItems("eyeColour").map(({ colour }) => colour),
    );
    const eyes = catalogue.filter(({ slot }) => slot === "eyes");

    expect(eyes.every(({ colour }) => eyeColours.has(colour))).toBe(true);
  });

  it("leaves a slot to dress empty, for the Character Type's own gear, until the Child wears something in it", () => {
    expect(findWornItem({}, "hat", items)).toBeUndefined();
    expect(findWornItem({ hat: "hat-wizard-blue" }, "hat", items)?.id).toBe(
      "hat-wizard-blue",
    );
  });

  it("ignores an Item saved in a slot it doesn't belong to", () => {
    expect(findWornItem({ back: "hat-wizard-blue" }, "back", items)).toBe(
      undefined,
    );
    expect(
      findChosenFeature({ eyes: "hat-wizard-blue" }, "eyes", items).id,
    ).toBe("eyes-choice-1");
  });
});

describe("findShownOffItem and findChosenFurniture", () => {
  const owl = {
    ...wizardHat,
    id: "pet-owl",
    name: "Wise Owl",
    slot: "pet",
    model: "owl",
  };
  const bunkBed = {
    ...wizardHat,
    id: "bed-rocket",
    name: "Rocket Bed",
    slot: "bed",
    model: "rocket",
  };
  const items = parseWith(owl, bunkBed);

  it("shows no Pet until the Child chooses one, and ignores an Item in the wrong slot", () => {
    expect(findShownOffItem({}, "pet", items)).toBeUndefined();
    expect(findShownOffItem({ pet: "pet-owl" }, "pet", items)?.id).toBe(
      "pet-owl",
    );
    expect(findShownOffItem({ mount: "pet-owl" }, "mount", items)).toBe(
      undefined,
    );
  });

  it("furnishes every place in a Room with its first free starter until the Child chooses", () => {
    expect(findChosenFurniture({}, "bed", items).id).toBe("bed-one");
    expect(findChosenFurniture({ bed: "bed-rocket" }, "bed", items).id).toBe(
      "bed-rocket",
    );
    expect(findChosenFurniture({ bed: "pet-owl" }, "bed", items).id).toBe(
      "bed-one",
    );
  });
});
