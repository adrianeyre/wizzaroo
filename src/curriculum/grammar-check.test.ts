import { describe, expect, it } from "vitest";
import { InvalidCurriculumFileError } from "./curriculum-file.js";
import {
  buildGrammarCheckPaper,
  buildReusedGrammarQuestion,
  describeGrammarGap,
  describeGrammarPrompt,
  grammarCheckQuestions,
  grammarQuestionTypes,
  parseGrammarCheckQuestions,
  reusedGrammarQuestions,
} from "./grammar-check.js";

const buildSeededRandom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
};

describe("the Grammar paper", () => {
  it("authors at least 40 questions of its own, and reuses the Years 4 to 6 English game questions", () => {
    expect(grammarCheckQuestions.length).toBeGreaterThanOrEqual(40);
    expect(reusedGrammarQuestions.length).toBeGreaterThan(150);
  });

  it("asks every question type from its own or the reused questions", () => {
    const askedTypes = new Set([
      ...grammarCheckQuestions.map(({ questionType }) => questionType),
      ...reusedGrammarQuestions.map(({ bank }) => bank.questionType),
    ]);

    expect([...askedTypes].toSorted()).toEqual(
      [...grammarQuestionTypes].toSorted(),
    );
  });

  it("asks some questions that need a word typed, not ticked", () => {
    expect(
      grammarCheckQuestions.filter(({ answerShape }) => answerShape === "words")
        .length,
    ).toBeGreaterThanOrEqual(8);
  });

  it.each([1, 2, 3, 4, 5, 6, 7, 8])(
    "mixes all 12 question types in each paper (seed %i)",
    (seed) => {
      const { questions } = buildGrammarCheckPaper(buildSeededRandom(seed));

      expect(
        new Set(questions.map(({ questionType }) => questionType)).size,
      ).toBe(12);
    },
  );

  it("turns every reused question into a Tick one question whose answer is not among its slips", () => {
    for (const reused of reusedGrammarQuestions) {
      const question = buildReusedGrammarQuestion(reused, () => 0.5);

      expect(question.choices).toContain(reused.question.answer);
      expect(reused.question.slips).not.toContain(reused.question.answer);
      expect(question.prompt).toMatch(/Tick one\./);
      expect(question.prompt).not.toMatch(/\n$/);
    }
  });

  it("keeps punctuation that follows a gap against the gap", () => {
    expect(
      describeGrammarGap({ before: "I was tired.", after: ", I finished." }),
    ).toBe("I was tired. ___, I finished.");
    expect(describeGrammarGap({ before: "", after: "it was raining." })).toBe(
      "___ it was raining.",
    );
  });

  it("asks for the word class a sentence's word belongs to", () => {
    expect(
      describeGrammarPrompt(
        {
          kind: "word-class",
          sentence: "You should wear a helmet.",
          wordClass: "modal verb",
        },
        "Tick one.",
      ),
    ).toBe(
      "Which word in this sentence is a modal verb? Tick one.\nYou should wear a helmet.",
    );
    expect(
      describeGrammarPrompt(
        { kind: "word-class", sentence: "Owls hunt.", wordClass: "subject" },
        "Tick one.",
      ),
    ).toBe("Which word in this sentence is the subject? Tick one.\nOwls hunt.");
  });

  it("refuses an authored question whose type it doesn't know", () => {
    expect(() =>
      parseGrammarCheckQuestions([
        {
          id: "riddle",
          questionType: "riddles",
          skillId: "english.verb-tenses",
          prompt: "Why?",
          answerShape: "words",
          answers: ["because"],
        },
      ]),
    ).toThrow(InvalidCurriculumFileError);
  });
});
