import { describe, expect, it } from "vitest";
import {
  buildNumberFactQuestions,
  numberFactDifficulties,
} from "./missing-number-facts.js";

const tokenShape = /\d+(?:\.\d+)?|[()+−×÷²³]/g;

const evaluateSide = (side: string): number => {
  const tokens = side.replace(/,/g, "").match(tokenShape) ?? [];
  let position = 0;
  const readFactor = (): number => {
    const token = tokens[position++];
    const value = token === "(" ? readSum() : Number(token);
    if (token === "(") {
      position++;
    }
    if (tokens[position] === "²") {
      position++;
      return value ** 2;
    }
    if (tokens[position] === "³") {
      position++;
      return value ** 3;
    }
    return value;
  };
  const readProduct = (): number => {
    let value = readFactor();
    while (tokens[position] === "×" || tokens[position] === "÷") {
      const operator = tokens[position++];
      const next = readFactor();
      value = operator === "×" ? value * next : value / next;
    }
    return value;
  };
  const readSum = (): number => {
    let value = readProduct();
    while (tokens[position] === "+" || tokens[position] === "−") {
      const operator = tokens[position++];
      const next = readProduct();
      value = operator === "+" ? value + next : value - next;
    }
    return value;
  };
  return readSum();
};

const isSentenceTrue = (sentence: string, answer: number) => {
  const [left, right] = sentence
    .replace("?", `(${String(answer)})`)
    .split(" = ");
  return Math.abs(evaluateSide(left) - evaluateSide(right)) < 0.0001;
};

describe("buildNumberFactQuestions", () => {
  it("makes every sentence true when its answer fills the gap, with enough slips to choose from", () => {
    for (const year of [3, 4, 5, 6] as const) {
      for (const difficulty of numberFactDifficulties) {
        const questions = buildNumberFactQuestions(year, difficulty);
        expect(questions.length).toBeGreaterThanOrEqual(5);
        for (const { sentence, answer, slips } of questions) {
          expect(sentence).toContain("?");
          expect(isSentenceTrue(sentence, answer)).toBe(true);
          expect(slips.length).toBeGreaterThanOrEqual(3);
          expect(slips).not.toContain(answer);
        }
      }
    }
  });

  it("uses the Year 3 tables in Year 3 and order of operations in Year 6", () => {
    expect(buildNumberFactQuestions(3, 1)[0].sentence).toBe("1 × 3 = ?");
    expect(buildNumberFactQuestions(6, 1)[0]).toMatchObject({
      sentence: "3 + 4 × 5 = ?",
      answer: 23,
    });
  });
});
