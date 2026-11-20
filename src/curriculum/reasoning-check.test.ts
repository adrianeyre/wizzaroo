import { describe, expect, it } from "vitest";
import { InvalidCurriculumFileError } from "./curriculum-file.js";
import {
  buildReasoningCheckPaper,
  parseReasoningCheckQuestions,
  reasoningCheckQuestions,
  reasoningQuestionTypes,
} from "./reasoning-check.js";

const buildSeededRandom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
};

const validProblem = {
  id: "share-the-sweets",
  questionType: "number",
  skillId: "maths.divide-large-numbers",
  prompt: "Share 96 sweets between 8 children. How many each?",
  answerShape: "number",
  answers: ["12"],
};

describe("the Reasoning paper", () => {
  it("has at least 30 word problems, at least 5 of each question type", () => {
    expect(reasoningCheckQuestions.length).toBeGreaterThanOrEqual(30);
    for (const questionType of reasoningQuestionTypes) {
      expect(
        reasoningCheckQuestions.filter(
          (question) => question.questionType === questionType,
        ).length,
        questionType,
      ).toBeGreaterThanOrEqual(5);
    }
  });

  it.each([1, 2, 3, 4, 5, 6, 7, 8])(
    "asks every question type in each paper (seed %i)",
    (seed) => {
      const { questions } = buildReasoningCheckPaper(buildSeededRandom(seed));

      expect(
        new Set(questions.map(({ questionType }) => questionType)).size,
      ).toBe(reasoningQuestionTypes.length);
    },
  );

  it("parses a well-formed word problem", () => {
    expect(parseReasoningCheckQuestions([validProblem])).toEqual([
      { ...validProblem, choices: [] },
    ]);
  });

  it.each([
    ["an unknown question type", { questionType: "riddles" }],
    ["a Skill that isn't in the curriculum", { skillId: "maths.riddles" }],
    ["a number answer that isn't a number", { answers: ["twelve"] }],
    [
      "an answer that isn't one of its choices",
      { answerShape: "choice", choices: ["10", "11"], answers: ["12"] },
    ],
    [
      "the same choice twice",
      { answerShape: "choice", choices: ["12", "12"], answers: ["12"] },
    ],
    ["no answers", { answers: [] }],
    ["a field it doesn't know", { hint: "Divide." }],
  ])("refuses a word problem with %s", (_, change) => {
    expect(() =>
      parseReasoningCheckQuestions([{ ...validProblem, ...change }]),
    ).toThrow(InvalidCurriculumFileError);
  });

  it("refuses two word problems with the same ID", () => {
    expect(() =>
      parseReasoningCheckQuestions([validProblem, validProblem]),
    ).toThrow(InvalidCurriculumFileError);
  });
});
