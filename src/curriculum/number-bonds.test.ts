import { describe, expect, it } from "vitest";
import {
  buildNumberBondQuestions,
  generateNumberBondQuestion,
  numberBondDifficulties,
  type NumberBondQuestion,
  type NumberSentence,
} from "./number-bonds.js";

const isSentenceTrue = ({ left, operator, right, result }: NumberSentence) =>
  operator === "+" ? left + right === result : left - right === result;

const isBondToTen = ({ left, operator, right, result }: NumberSentence) =>
  operator === "+" ? result === 10 : left === 10 && right + result === 10;

const listSentenceNumbers = ({ left, right, result }: NumberSentence) => [
  left,
  right,
  result,
];

const describeQuestion = ({ sentence, blank }: NumberBondQuestion) =>
  `${sentence.operator}:${blank}:${String(sentence.left)}:${String(sentence.right)}`;

describe("buildNumberBondQuestions", () => {
  it.each(numberBondDifficulties)(
    "makes every Question at Difficulty %i a true number bond to 10 whose answer fills the blank",
    (difficulty) => {
      for (const question of buildNumberBondQuestions(difficulty)) {
        expect(isSentenceTrue(question.sentence)).toBe(true);
        expect(isBondToTen(question.sentence)).toBe(true);
        expect(question.answer).toBe(question.sentence[question.blank]);
        for (const number of listSentenceNumbers(question.sentence)) {
          expect(Number.isInteger(number)).toBe(true);
          expect(number).toBeGreaterThanOrEqual(0);
          expect(number).toBeLessThanOrEqual(10);
        }
      }
    },
  );

  it.each(numberBondDifficulties)(
    "never repeats a Question at Difficulty %i",
    (difficulty) => {
      const questions =
        buildNumberBondQuestions(difficulty).map(describeQuestion);

      expect(new Set(questions).size).toBe(questions.length);
    },
  );

  it("asks only for the second part of an addition at Difficulty 1, and never 0 or 10", () => {
    const questions = buildNumberBondQuestions(1);

    expect(questions.map(({ answer }) => answer)).toEqual([
      9, 8, 7, 6, 5, 4, 3, 2, 1,
    ]);
    expect(
      questions.every(
        ({ sentence, blank }) => sentence.operator === "+" && blank === "right",
      ),
    ).toBe(true);
  });

  it("hides either part of an addition at Difficulty 2, from 0 to 10", () => {
    const questions = buildNumberBondQuestions(2);

    expect(questions).toHaveLength(22);
    expect(questions).toContainEqual({
      sentence: { left: 3, operator: "+", right: 7, result: 10 },
      blank: "left",
      answer: 3,
    });
    expect(questions).toContainEqual({
      sentence: { left: 0, operator: "+", right: 10, result: 10 },
      blank: "right",
      answer: 10,
    });
    expect(questions.some(({ sentence }) => sentence.operator === "-")).toBe(
      false,
    );
  });

  it("adds the related subtraction facts at Difficulty 3", () => {
    const questions = buildNumberBondQuestions(3);

    expect(questions).toHaveLength(44);
    expect(questions).toEqual(
      expect.arrayContaining(buildNumberBondQuestions(2)),
    );
    expect(questions).toContainEqual({
      sentence: { left: 10, operator: "-", right: 4, result: 6 },
      blank: "result",
      answer: 6,
    });
    expect(questions).toContainEqual({
      sentence: { left: 10, operator: "-", right: 4, result: 6 },
      blank: "right",
      answer: 4,
    });
  });
});

describe("generateNumberBondQuestion", () => {
  it.each(numberBondDifficulties)(
    "can produce every Question at Difficulty %i and nothing else",
    (difficulty) => {
      const questions = buildNumberBondQuestions(difficulty);
      const generated = questions.map((_, index) =>
        generateNumberBondQuestion(
          difficulty,
          () => (index + 0.5) / questions.length,
        ),
      );

      expect(generated).toEqual(questions);
    },
  );

  it.each(numberBondDifficulties)(
    "produces a Question at Difficulty %i at both ends of the random range",
    (difficulty) => {
      const questions = buildNumberBondQuestions(difficulty);

      expect(generateNumberBondQuestion(difficulty, () => 0)).toEqual(
        questions[0],
      );
      expect(
        generateNumberBondQuestion(difficulty, () => 1 - Number.EPSILON),
      ).toEqual(questions.at(-1));
    },
  );

  it.each(numberBondDifficulties)(
    "only ever produces correct Questions at Difficulty %i from Math.random",
    (difficulty) => {
      for (let attempt = 0; attempt < 1000; attempt += 1) {
        const { sentence, blank, answer } = generateNumberBondQuestion(
          difficulty,
          Math.random,
        );

        expect(isSentenceTrue(sentence)).toBe(true);
        expect(isBondToTen(sentence)).toBe(true);
        expect(answer).toBe(sentence[blank]);
      }
    },
  );
});
