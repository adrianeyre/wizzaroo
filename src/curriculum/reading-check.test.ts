import { describe, expect, it } from "vitest";
import { InvalidCurriculumFileError } from "./curriculum-file.js";
import {
  buildReadingCheckPaper,
  buildReadingPassagePaper,
  countPassageWords,
  parseReadingPassages,
  readingPassageForms,
  readingPassages,
  readingQuestionTypes,
} from "./reading-check.js";

const buildSeededRandom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
};

const [firstPassage] = readingPassages;

describe("the Reading paper", () => {
  it("has at least 4 passages, with fiction, non-fiction and poetry among them", () => {
    expect(readingPassages.length).toBeGreaterThanOrEqual(4);
    expect(new Set(readingPassages.map(({ form }) => form))).toEqual(
      new Set(readingPassageForms),
    );
  });

  describe.each(readingPassages)("$title", (passage) => {
    it("is 250 to 450 words long", () => {
      const wordCount = countPassageWords(passage.text);

      expect(wordCount).toBeGreaterThanOrEqual(250);
      expect(wordCount).toBeLessThanOrEqual(450);
    });

    it("asks at least 10 questions, of every question type", () => {
      expect(passage.questions.length).toBeGreaterThanOrEqual(10);
      expect(
        new Set(passage.questions.map(({ questionType }) => questionType)),
      ).toEqual(new Set(readingQuestionTypes));
    });

    it.each([1, 2, 3, 4])(
      "builds a paper of 8 of its questions in the order the text raises them (seed %i)",
      (seed) => {
        const paper = buildReadingPassagePaper(
          passage,
          buildSeededRandom(seed),
        );
        const questionIds = passage.questions.map(({ id }) => id);
        const positions = paper.questions.map(({ key }) =>
          questionIds.indexOf(key.replace(`${passage.id}:`, "")),
        );

        expect(paper.passageTitle).toBe(passage.title);
        expect(paper.passage).toBe(passage.text);
        expect(paper.questions).toHaveLength(8);
        expect(positions.every((position) => position >= 0)).toBe(true);
        expect(positions).toEqual(
          positions.toSorted((first, second) => first - second),
        );
        expect(
          new Set(paper.questions.map(({ questionType }) => questionType)).size,
        ).toBe(readingQuestionTypes.length);
      },
    );
  });

  it("picks a passage at random", () => {
    const titles = new Set(
      Array.from(
        { length: 30 },
        (_, seed) =>
          buildReadingCheckPaper(buildSeededRandom(seed)).passageTitle,
      ),
    );

    expect(titles.size).toBe(readingPassages.length);
  });

  it("refuses a passage that is too short", () => {
    expect(() =>
      parseReadingPassages([{ ...firstPassage, text: "Too short to read." }]),
    ).toThrow(InvalidCurriculumFileError);
  });

  it("refuses a passage with fewer than 10 questions", () => {
    expect(() =>
      parseReadingPassages([
        { ...firstPassage, questions: firstPassage.questions.slice(0, 9) },
      ]),
    ).toThrow(InvalidCurriculumFileError);
  });

  it("refuses a passage in a form it doesn't know", () => {
    expect(() =>
      parseReadingPassages([{ ...firstPassage, form: "comic" }]),
    ).toThrow(InvalidCurriculumFileError);
  });

  it("refuses two passages with the same ID", () => {
    expect(() => parseReadingPassages([firstPassage, firstPassage])).toThrow(
      InvalidCurriculumFileError,
    );
  });
});
