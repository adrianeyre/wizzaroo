import { describe, expect, it } from "vitest";
import { InvalidCurriculumFileError } from "./curriculum-file.js";
import { gapMark } from "./english-questions.js";
import {
  buildSpellingCheckLine,
  buildSpellingCheckPaper,
  buildSpellingCheckQuestion,
  parseSpellingCheckWords,
  spellingCheckWords,
} from "./spelling-check.js";
import { spellingWordLists } from "./spelling-words.js";

const buildSeededRandom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
};

const wordListSkillId = "english.word-list-upper-key-stage-2";

describe("the Spelling paper", () => {
  it("has at least 60 words, most of them from the Years 5 and 6 word list", () => {
    const listWords = spellingCheckWords.filter(
      ({ skillId }) => skillId === wordListSkillId,
    );

    expect(spellingCheckWords.length).toBeGreaterThanOrEqual(60);
    expect(listWords.length).toBeGreaterThanOrEqual(60);
  });

  it("includes every word the Years 5 and 6 word list Skill already teaches", () => {
    const words = spellingCheckWords.map(({ word }) => word);

    for (const { word } of spellingWordLists[wordListSkillId]) {
      expect(words, word).toContain(word);
    }
  });

  it("asks for each word in a sentence with the word taken out", () => {
    for (const spellingWord of spellingCheckWords) {
      const question = buildSpellingCheckQuestion(spellingWord);

      expect(question.prompt.split(gapMark)).toHaveLength(2);
      expect(question.prompt.replace(gapMark, spellingWord.word)).toBe(
        spellingWord.sentence,
      );
      expect(question.prompt).not.toMatch(
        new RegExp(String.raw`\b${spellingWord.word}\b`),
      );
      expect(question.spokenWord).toBe(`spelling-check.${spellingWord.word}`);
      expect(question.answerShape).toBe("words");
      expect(question.acceptedAnswers).toEqual([spellingWord.word]);
    }
  });

  it("asks 10 different words a paper", () => {
    const { questions } = buildSpellingCheckPaper(buildSeededRandom(3));

    expect(new Set(questions.map(({ key }) => key)).size).toBe(10);
  });

  it("says the word, then the sentence, then the word again", () => {
    expect(buildSpellingCheckLine("yacht")).toBe(
      "The word is yacht. A white yacht sailed into the harbour. The word is yacht.",
    );
  });

  it("refuses to voice a word that isn't on the paper", () => {
    expect(() => buildSpellingCheckLine("zebra")).toThrow(RangeError);
  });

  it.each([
    [
      "a sentence without the word",
      { word: "yacht", sentence: "A boat sailed.", skillId: wordListSkillId },
    ],
    [
      "a sentence with the word twice",
      {
        word: "queue",
        sentence: "The queue was a long queue.",
        skillId: wordListSkillId,
      },
    ],
    [
      "a Skill the paper doesn't test",
      {
        word: "queue",
        sentence: "We joined the queue.",
        skillId: "maths.durations",
      },
    ],
    [
      "a word with capital letters",
      { word: "Queue", sentence: "Queue here.", skillId: wordListSkillId },
    ],
    [
      "a sentence with no full stop",
      {
        word: "queue",
        sentence: "We joined the queue",
        skillId: wordListSkillId,
      },
    ],
  ])("refuses %s", (_, entry) => {
    expect(() => parseSpellingCheckWords([entry])).toThrow(
      InvalidCurriculumFileError,
    );
  });

  it("refuses the same word twice", () => {
    const entry = {
      word: "queue",
      sentence: "We joined the queue.",
      skillId: wordListSkillId,
    };

    expect(() => parseSpellingCheckWords([entry, entry])).toThrow(
      InvalidCurriculumFileError,
    );
  });
});
