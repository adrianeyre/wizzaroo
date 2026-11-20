import { describe, expect, it } from "vitest";
import { yearGroups } from "../../curriculum/skills.js";
import { buildRandom } from "../world-map-terrain.js";
import {
  describePattern,
  findPatternRange,
  isInPattern,
  isNextLetter,
  measureCrossing,
  pickTightropeWords,
  splitLetters,
  tightropeLetters,
  tightropeWordCounts,
  tightropeWordLists,
} from "./tightrope-words.js";

describe("tightrope word lists", () => {
  it.each(yearGroups)(
    "hold at least 20 different words for Year %i",
    (yearGroup) => {
      const words = tightropeWordLists[yearGroup].map(({ word }) => word);
      expect(words.length).toBeGreaterThanOrEqual(20);
      expect(new Set(words).size).toBe(words.length);
    },
  );

  it.each(yearGroups)(
    "spell every Year %i word with a to z only, with its pattern in place",
    (yearGroup) => {
      for (const entry of tightropeWordLists[yearGroup]) {
        expect(entry.word).toMatch(/^[a-z]+$/);
        expect(
          splitLetters(entry.word).every((letter) =>
            tightropeLetters.includes(letter),
          ),
        ).toBe(true);
        const { start, end } = findPatternRange(entry);
        expect(entry.word.slice(start, end)).toBe(entry.pattern);
        expect(entry.pattern.length).toBeLessThan(entry.word.length);
        expect(entry.rule.length).toBeGreaterThan(10);
      }
    },
  );

  it.each(yearGroups)(
    "never give a Year %i word away in its clue",
    (yearGroup) => {
      for (const { word, clue } of tightropeWordLists[yearGroup]) {
        expect(clue.toLowerCase()).not.toContain(word);
      }
    },
  );

  it("shows how Years 2 and 3 words are made, and a root word from Year 4 where there is one", () => {
    for (const yearGroup of [2, 3] as const) {
      for (const { word, madeFrom } of tightropeWordLists[yearGroup]) {
        expect(madeFrom, word).toMatch(/^[a-z]+ \+ [a-z]+$/);
      }
    }
    for (const { madeFrom } of tightropeWordLists[1]) {
      expect(madeFrom).toBeUndefined();
    }
  });

  it("joins Year 2 and Year 3 parts to make the word, apart from y changing to i", () => {
    for (const yearGroup of [2, 3] as const) {
      for (const { word, madeFrom } of tightropeWordLists[yearGroup]) {
        const joined = (madeFrom ?? "").replace(" + ", "");
        expect(joined.replace("yn", "in").replace("yl", "il"), word).toBe(word);
      }
    }
  });

  it("keeps to each Year's spelling patterns", () => {
    const patternsByYear = {
      1: ["ff", "ll", "ss", "zz", "ck", "nk", "tch"],
      2: ["ful", "less", "ness", "ly"],
      3: ["dis", "mis", "re", "sub", "super", "anti", "auto"],
      4: ["ous", "tion", "sion", "ssion", "cian"],
      5: ["able", "ible", "cious", "tious", "cial", "tial"],
      6: [
        "ferred",
        "ferring",
        "ference",
        "feree",
        "ant",
        "ance",
        "ent",
        "ence",
      ],
    };
    for (const yearGroup of yearGroups) {
      const used = new Set(
        tightropeWordLists[yearGroup].map(({ pattern }) => pattern),
      );
      expect([...used].toSorted()).toEqual(
        patternsByYear[yearGroup].toSorted(),
      );
    }
  });

  it("names prefixes, suffixes and letter teams the way a Child sees them", () => {
    expect(describePattern(tightropeWordLists[1][0])).toBe("ff");
    expect(describePattern(tightropeWordLists[2][0])).toBe("-ful");
    expect(describePattern(tightropeWordLists[3][0])).toBe("dis-");
  });
});

describe("picking the words for a play", () => {
  it("draws 6 words in Years 1 and 2 and 8 from Year 3", () => {
    expect(tightropeWordCounts).toEqual({ 1: 6, 2: 6, 3: 8, 4: 8, 5: 8, 6: 8 });
  });

  it("never repeats a word within a play, over many seeds and every Year", () => {
    for (const yearGroup of yearGroups) {
      for (let seed = 1; seed <= 200; seed++) {
        const words = pickTightropeWords(yearGroup, buildRandom(seed));
        expect(words).toHaveLength(tightropeWordCounts[yearGroup]);
        expect(new Set(words.map(({ word }) => word)).size).toBe(words.length);
        expect(
          words.every((entry) => tightropeWordLists[yearGroup].includes(entry)),
        ).toBe(true);
      }
    }
  });

  it("gives different words on different plays, but the same for the same seed", () => {
    const words = (seed: number) =>
      pickTightropeWords(6, buildRandom(seed)).map(({ word }) => word);
    expect(words(3)).toEqual(words(3));
    expect(words(3)).not.toEqual(words(4));
  });

  it("can always be spelled letter by letter, over many seeds", () => {
    for (const yearGroup of yearGroups) {
      for (let seed = 1; seed <= 50; seed++) {
        for (const { word } of pickTightropeWords(
          yearGroup,
          buildRandom(seed),
        )) {
          for (const [index, letter] of splitLetters(word).entries()) {
            expect(isNextLetter(word, index, letter)).toBe(true);
            const wrong = tightropeLetters.find((other) => other !== letter);
            expect(isNextLetter(word, index, wrong ?? "")).toBe(false);
          }
          expect(isNextLetter(word, word.length, "a")).toBe(false);
        }
      }
    }
  });
});

describe("letter checks", () => {
  it("accepts a capital letter typed for the next letter", () => {
    expect(isNextLetter("careful", 0, "C")).toBe(true);
    expect(isNextLetter("careful", 1, "C")).toBe(false);
  });

  it("finds the outlined pattern at the start or the end", () => {
    const careful = tightropeWordLists[2][0];
    const range = findPatternRange(careful);
    expect(range).toEqual({ start: 4, end: 7 });
    expect(isInPattern(range, 3)).toBe(false);
    expect(isInPattern(range, 4)).toBe(true);
    expect(findPatternRange(tightropeWordLists[3][0])).toEqual({
      start: 0,
      end: 3,
    });
  });
});

describe("the acrobat's crossing", () => {
  it("runs from 0 at the start to 1 at the far platform", () => {
    expect(measureCrossing(0, 0, 5, 6)).toBe(0);
    expect(measureCrossing(3, 0, 5, 6)).toBe(0.5);
    expect(measureCrossing(0, 4, 8, 8)).toBe(1 / 16);
    expect(measureCrossing(6, 0, 5, 6)).toBe(1);
    expect(measureCrossing(5, 5, 5, 6)).toBe(1);
  });
});
