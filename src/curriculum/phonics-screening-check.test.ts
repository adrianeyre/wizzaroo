import { describe, expect, it } from "vitest";
import { InvalidCurriculumFileError } from "./curriculum-file.js";
import { phonicsGames } from "./phonics-games.js";
import {
  phonicsProgrammeIds,
  phonicsProgrammes,
} from "./phonics-programmes.js";
import {
  alienWordChoice,
  buildPhonicsCheckPracticePaper,
  buildPhonicsScreeningCheckPaper,
  describePhonicsWordSounds,
  findPhonicsWordSounds,
  alienWordsPerPaper,
  parsePhonicsCheckWords,
  phonicsCheckSkillId,
  phonicsCheckWords,
  realWordChoice,
} from "./phonics-screening-check.js";

const buildSeededRandom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
};

const seeds = [1, 2, 3, 4, 5];

describe("the Phonics Screening Check", () => {
  it("plays the Skill of the Crystal Caves game Real or alien?", () => {
    const realOrAlien = phonicsGames.find(({ id }) => id === "real-or-alien");

    expect(realOrAlien?.skillId).toBe(phonicsCheckSkillId);
  });

  it("lists every alien word from Real or alien? in its one bank of alien words", () => {
    const realOrAlien = phonicsGames.find(({ id }) => id === "real-or-alien");
    const gameAlienWords = (realOrAlien?.questions ?? [])
      .filter(({ answer }) => answer === "alien word")
      .map(({ prompt }) => prompt);

    expect(gameAlienWords.length).toBeGreaterThan(0);
    expect(
      gameAlienWords.filter(
        (word) => !phonicsCheckWords.alienWords.includes(word),
      ),
    ).toEqual([]);
  });

  it("has at least 40 real words and 40 alien words, none of them both", () => {
    expect(phonicsCheckWords.realWords.length).toBeGreaterThanOrEqual(40);
    expect(phonicsCheckWords.alienWords.length).toBeGreaterThanOrEqual(40);
    expect(
      phonicsCheckWords.alienWords.filter((word) =>
        phonicsCheckWords.realWords.includes(word),
      ),
    ).toEqual([]);
  });

  it.each(seeds)(
    "shows 10 alien words, then 10 real words, like the real check's half and half (seed %i)",
    (seed) => {
      const { questions } = buildPhonicsScreeningCheckPaper(
        buildSeededRandom(seed),
      );

      expect(questions.map(({ questionType }) => questionType)).toEqual([
        ...Array.from({ length: 10 }, () => "alien-word"),
        ...Array.from({ length: 10 }, () => "real-word"),
      ]);
      for (const question of questions) {
        expect(question.answerShape).toBe("read-aloud");
        expect(question.acceptedAnswers).toEqual([question.prompt]);
        expect(question.key).toBe(question.prompt);
        expect(
          question.questionType === "alien-word"
            ? phonicsCheckWords.alienWords
            : phonicsCheckWords.realWords,
        ).toContain(question.prompt);
      }
    },
  );

  it.each(seeds)(
    "practises telling 5 real words from 5 alien words (seed %i)",
    (seed) => {
      const { questions } = buildPhonicsCheckPracticePaper(
        buildSeededRandom(seed),
      );

      expect(questions).toHaveLength(10);
      expect(
        questions.filter(({ questionType }) => questionType === "alien-word"),
      ).toHaveLength(5);
      for (const question of questions) {
        expect(question.choices).toEqual([realWordChoice, alienWordChoice]);
        expect(question.acceptedAnswers).toEqual([
          question.questionType === "alien-word"
            ? alienWordChoice
            : realWordChoice,
        ]);
      }
    },
  );

  it("refuses a word listed as both real and alien", () => {
    const { realWords, alienWords } = phonicsCheckWords;

    expect(() =>
      parsePhonicsCheckWords({
        realWords,
        alienWords: [...alienWords.slice(1), realWords[0]],
      }),
    ).toThrow(InvalidCurriculumFileError);
  });

  it("refuses fewer than 40 words of a kind", () => {
    expect(() =>
      parsePhonicsCheckWords({
        realWords: phonicsCheckWords.realWords.slice(0, 39),
        alienWords: phonicsCheckWords.alienWords,
      }),
    ).toThrow(InvalidCurriculumFileError);
  });

  it("refuses a word with capitals or spaces", () => {
    expect(() =>
      parsePhonicsCheckWords({
        realWords: phonicsCheckWords.realWords,
        alienWords: [...phonicsCheckWords.alienWords, "Zog bop"],
      }),
    ).toThrow(InvalidCurriculumFileError);
  });
});

describe("following the Child's Phonics Programme", () => {
  const findProgramme = (id: string) => {
    const programme = phonicsProgrammes.find(
      (phonicsProgramme) => phonicsProgramme.id === id,
    );
    if (programme === undefined) {
      throw new Error(`no Phonics Programme "${id}"`);
    }
    return programme;
  };
  const littleWandle = findProgramme("little-wandle");
  const readWriteInc = findProgramme("read-write-inc");

  it("splits a word into the fewest of the programme's graphemes, then the earliest taught", () => {
    expect(findPhonicsWordSounds("chip", littleWandle)).toEqual({
      graphemes: ["ch", "i", "p"],
      stageTerm: "Phase 2",
    });
    expect(findPhonicsWordSounds("rain", littleWandle)).toEqual({
      graphemes: ["r", "ai", "n"],
      stageTerm: "Phase 3",
    });
    expect(findPhonicsWordSounds("sat", readWriteInc)).toEqual({
      graphemes: ["s", "a", "t"],
      stageTerm: "Set 1",
    });
  });

  it("reads a split digraph as one sound, taught in a later stage", () => {
    expect(findPhonicsWordSounds("cake", littleWandle)).toEqual({
      graphemes: ["c", "a-e", "k"],
      stageTerm: "Phase 5",
    });
  });

  it("names the programme's own stage in the note for the grown-up", () => {
    const sounds = findPhonicsWordSounds("chip", littleWandle);

    expect(
      sounds === undefined
        ? undefined
        : describePhonicsWordSounds(sounds, littleWandle),
    ).toBe(
      "Sounds: ch · i · p (taught by Phase 2 in Little Wandle Letters and Sounds Revised)",
    );
  });

  it.each(phonicsProgrammeIds)(
    "has enough real and alien words %s can sound out for a whole paper",
    (programmeId) => {
      const programme = findProgramme(programmeId);
      const countSoundable = (words: readonly string[]) =>
        words.filter(
          (word) => findPhonicsWordSounds(word, programme) !== undefined,
        ).length;

      expect(
        countSoundable(phonicsCheckWords.alienWords),
      ).toBeGreaterThanOrEqual(alienWordsPerPaper);
      expect(
        countSoundable(phonicsCheckWords.realWords),
      ).toBeGreaterThanOrEqual(20 - alienWordsPerPaper);
    },
  );

  it.each(phonicsProgrammeIds)(
    "builds every paper from words %s can sound out, each with its note",
    (programmeId) => {
      const programme = findProgramme(programmeId);
      for (const seed of [1, 2, 3, 4, 5]) {
        const paper = buildPhonicsScreeningCheckPaper(
          buildSeededRandom(seed),
          programme,
        );
        const practice = buildPhonicsCheckPracticePaper(
          buildSeededRandom(seed),
          programme,
        );

        expect(paper.questions).toHaveLength(20);
        expect(practice.questions).toHaveLength(10);
        for (const { prompt, soundNote } of paper.questions) {
          expect(
            findPhonicsWordSounds(prompt, programme),
            prompt,
          ).toBeDefined();
          expect(soundNote).toContain(programme.name);
        }
        for (const { prompt } of practice.questions) {
          expect(
            findPhonicsWordSounds(prompt, programme),
            prompt,
          ).toBeDefined();
        }
      }
    },
  );
});
