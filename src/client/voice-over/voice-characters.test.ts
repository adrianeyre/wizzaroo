import { describe, expect, it } from "vitest";
import {
  catalogue,
  findItem,
  type CharacterSlot,
} from "../../curriculum/catalogue.js";
import { readAloudVoices } from "./read-aloud-voices.js";
import { voiceCharacters } from "./voice-characters.js";

const characters = readAloudVoices.map(({ character }) => character);

const listChosen = (slot: CharacterSlot): string[] =>
  characters.flatMap(({ loadout }) => {
    const itemId = loadout[slot];
    return itemId === undefined ? [] : [itemId];
  });

describe("the reading voices' characters", () => {
  it("gives every voice a character, and no character without a voice", () => {
    expect(Object.keys(voiceCharacters).sort()).toStrictEqual(
      readAloudVoices.map(({ id }) => id).sort(),
    );
  });

  it("dresses each one only in Catalogue Items, each in its own slot", () => {
    for (const { loadout } of characters) {
      for (const [slot, itemId] of Object.entries(loadout)) {
        expect(findItem(itemId, catalogue)?.slot, itemId).toBe(slot);
      }
    }
  });

  it("makes each a different kind of fantasy character, with their own title", () => {
    const uniqueSlots: readonly CharacterSlot[] = [
      "characterType",
      "outfit",
      "hat",
      "pet",
      "spellEffect",
    ];
    for (const slot of uniqueSlots) {
      const chosen = listChosen(slot);
      expect(chosen, slot).toHaveLength(16);
      expect(new Set(chosen).size, slot).toBe(16);
    }
    expect(new Set(characters.map(({ title }) => title)).size).toBe(16);
  });

  it("gives them every human skin tone the Catalogue has, and many hairstyles", () => {
    const skinTones = new Set(listChosen("bodyColour"));
    for (const tone of [
      "body-peach",
      "body-porcelain",
      "body-sand",
      "body-honey",
      "body-caramel",
      "body-chestnut",
      "body-cocoa",
      "body-deep-brown",
    ]) {
      expect(skinTones.has(tone), tone).toBe(true);
    }
    expect(new Set(listChosen("hairStyle")).size).toBeGreaterThanOrEqual(15);
  });
});
