import { describe, expect, it } from "vitest";
import type { YearGroup } from "../../curriculum/skills.js";
import { buildRandom } from "../world-map-terrain.js";
import {
  articleFor,
  buildRingSortPuzzle,
  describeCard,
  describeCardQuestion,
  findEsEnding,
  formalPairs,
  isRightRing,
  listArticlePhrases,
  listRingSortContent,
  maximumRingCount,
  modalVerbs,
  prefixRoots,
  relativePronouns,
  ringSortCardCounts,
  splitStarredSentence,
  spreadCards,
} from "./ring-sort.js";

const yearGroups: readonly YearGroup[] = [1, 2, 3, 4, 5, 6];
const seeds = Array.from({ length: 200 }, (_, seed) => seed + 1);

describe("buildRingSortPuzzle", () => {
  it.each(yearGroups)(
    "deals Year %i a fair, solvable puzzle for every seed",
    (yearGroup) => {
      for (const seed of seeds) {
        const { rings, cards } = buildRingSortPuzzle(
          yearGroup,
          buildRandom(seed),
        );
        expect(rings.length).toBeGreaterThanOrEqual(2);
        expect(rings.length).toBeLessThanOrEqual(maximumRingCount);
        expect(cards).toHaveLength(ringSortCardCounts[yearGroup]);
        const ringIds = rings.map(({ id }) => id);
        expect(new Set(ringIds).size).toBe(rings.length);
        expect(cards.every(({ ringId }) => ringIds.includes(ringId))).toBe(
          true,
        );
        const perRing = ringIds.map(
          (ringId) => cards.filter((card) => card.ringId === ringId).length,
        );
        expect(Math.max(...perRing) - Math.min(...perRing)).toBeLessThanOrEqual(
          1,
        );
        expect(new Set(cards.map(({ id }) => id)).size).toBe(cards.length);
        expect(new Set(cards.map(({ family }) => family)).size).toBe(
          cards.length,
        );
        for (const card of cards) {
          expect(rings.filter(({ id }) => isRightRing(card, id))).toHaveLength(
            1,
          );
        }
      }
    },
  );

  it("is the same for the same seed and differs between seeds", () => {
    const first = buildRingSortPuzzle(3, buildRandom(9));
    expect(buildRingSortPuzzle(3, buildRandom(9))).toEqual(first);
    expect(buildRingSortPuzzle(3, buildRandom(10))).not.toEqual(first);
  });

  it("always plays in- in Year 4 and, over many plays, every prefix", () => {
    const seen = new Set<string>();
    for (const seed of seeds) {
      const { rings } = buildRingSortPuzzle(4, buildRandom(seed));
      expect(rings[0].id).toBe("in");
      rings.forEach(({ id }) => seen.add(id));
    }
    expect([...seen].toSorted()).toEqual(["il", "im", "in", "inter", "ir"]);
  });
});

describe("ring sort content", () => {
  it.each(yearGroups)("gives Year %i at least 20 cards", (yearGroup) => {
    const { rings, cards } = listRingSortContent(yearGroup);
    expect(cards.length).toBeGreaterThanOrEqual(20);
    for (const ring of rings) {
      expect(
        cards.filter(({ ringId }) => ringId === ring.id).length,
      ).toBeGreaterThanOrEqual(4);
    }
    for (const card of cards) {
      expect(card.word.trim()).toBe(card.word);
      expect(card.word).not.toBe("");
      expect(card.explanation).toContain(card.sortedText);
      expect(describeCardQuestion(yearGroup, card)).toContain(card.word);
    }
  });

  it("adds -es exactly when a Year 1 noun ends in s, x, z, ch or sh", () => {
    for (const card of listRingSortContent(1).cards) {
      const ending = findEsEnding(card.word);
      expect(card.ringId).toBe(ending === undefined ? "s" : "es");
      expect(card.sortedText).toBe(`${card.word}${card.ringId}`);
    }
    expect(
      listRingSortContent(1).cards.find(({ word }) => word === "fox")
        ?.explanation,
    ).toBe("Words ending in x add -es: foxes.");
  });

  it("shows each Year 2 and Year 5 word in a sentence", () => {
    for (const yearGroup of [2, 5] as const) {
      for (const card of listRingSortContent(yearGroup).cards) {
        expect(`${card.before}${card.word}${card.after}`).toMatch(/[.?]$/);
        expect(card.before + card.after).not.toBe("");
      }
    }
  });

  it("uses an before vowel sounds in Year 3, including the silent h", () => {
    for (const [phrase, sound] of listArticlePhrases()) {
      const startsWithVowel = /^[aeiou]/.test(phrase);
      if (sound === "vowel") {
        expect(startsWithVowel).toBe(true);
      }
      if (sound === "consonant") {
        expect(startsWithVowel).toBe(false);
      }
      if (sound === "silent-h") {
        expect(phrase.startsWith("h")).toBe(true);
      }
      if (sound === "you") {
        expect(phrase.startsWith("u")).toBe(true);
      }
    }
    const cards = listRingSortContent(3).cards;
    expect(cards.find(({ word }) => word === "hour")?.sortedText).toBe(
      "an hour",
    );
    expect(cards.find(({ word }) => word === "unicorn")?.sortedText).toBe(
      "a unicorn",
    );
    expect(cards.every(({ before }) => before === "___ ")).toBe(true);
    expect(articleFor("you")).toBe("a");
  });

  it("follows the Year 4 prefix spelling rules", () => {
    expect(prefixRoots.il.every((root) => root.startsWith("l"))).toBe(true);
    expect(prefixRoots.ir.every((root) => root.startsWith("r"))).toBe(true);
    expect(prefixRoots.im.every((root) => /^[mp]/.test(root))).toBe(true);
    expect(prefixRoots.in.every((root) => !/^[lmpr]/.test(root))).toBe(true);
    for (const card of listRingSortContent(4).cards) {
      expect(card.sortedText).toBe(`${card.ringId}${card.word}`);
    }
  });

  it("only puts true modal verbs and relative pronouns in their Year 5 rings", () => {
    for (const card of listRingSortContent(5).cards) {
      const word = card.word.toLowerCase();
      if (card.ringId === "modal") {
        expect(modalVerbs).toContain(word);
      }
      if (card.ringId === "relative") {
        expect(relativePronouns).toContain(word);
        expect(card.before).not.toBe("");
      }
      if (card.ringId === "neither") {
        expect(modalVerbs).not.toContain(word);
      }
    }
  });

  it("pairs every Year 6 everyday word with its formal word in the same sentence", () => {
    const cards = listRingSortContent(6).cards;
    for (const [everyday, formal, template] of formalPairs) {
      expect(template.split("___")).toHaveLength(2);
      const formalCard = cards.find(({ id }) => id === `formal-${formal}`);
      const everydayCard = cards.find(
        ({ id }) => id === `everyday-${everyday}`,
      );
      expect(formalCard?.explanation).toContain(everyday);
      expect(everydayCard?.explanation).toContain(formal);
      expect(formalCard?.family).toBe(everydayCard?.family);
    }
  });
});

describe("helpers", () => {
  it("splits a starred sentence", () => {
    expect(splitStarredSentence("The *quick* fox ran.")).toEqual({
      before: "The ",
      word: "quick",
      after: " fox ran.",
    });
    expect(() => splitStarredSentence("No star here.")).toThrow();
  });

  it("spreads cards evenly over the rings", () => {
    const counts = spreadCards(4, 10, buildRandom(3));
    expect(counts.reduce((sum, count) => sum + count, 0)).toBe(10);
    expect(counts.toSorted()).toEqual([2, 2, 3, 3]);
  });

  it("reads a gap aloud as blank", () => {
    const card = listRingSortContent(3).cards[0];
    expect(describeCard(card)).toBe(`blank ${card.word}${card.after}`);
  });
});
