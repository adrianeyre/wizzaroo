import { describe, expect, it } from "vitest";
import {
  arithmeticPaperPlan,
  arithmeticQuestionTypes,
  buildArithmeticCheckPaper,
  buildArithmeticQuestion,
  formatFraction,
  type ArithmeticQuestionType,
} from "./arithmetic-check.js";
import { isCheckAnswerRight, parseCheckNumber } from "./checks.js";

const seeds = Array.from({ length: 40 }, (_, index) => index * 97 + 3);

const buildSeededRandom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
};

const tokenShape = /\d+(?:\.\d+)?|[-+*/^()]/g;

const evaluateTokens = (tokens: string[]): number => {
  let position = 0;
  const readNumber = (): number => {
    const token = tokens[position];
    position += 1;
    if (token === "(") {
      const value = readSum();
      position += 1;
      return value;
    }
    return Number(token);
  };
  const readPower = (): number => {
    const base = readNumber();
    if (tokens[position] === "^") {
      position += 1;
      return base ** readNumber();
    }
    return base;
  };
  const readProduct = (): number => {
    let value = readPower();
    while (tokens[position] === "*" || tokens[position] === "/") {
      const operator = tokens[position];
      position += 1;
      const next = readPower();
      value = operator === "*" ? value * next : value / next;
    }
    return value;
  };
  const readSum = (): number => {
    let value = readProduct();
    while (tokens[position] === "+" || tokens[position] === "-") {
      const operator = tokens[position];
      position += 1;
      const next = readProduct();
      value = operator === "+" ? value + next : value - next;
    }
    return value;
  };
  return readSum();
};

const evaluateExpression = (prompt: string): number => {
  const written = prompt
    .replace(/ =$/, "")
    .replaceAll(/(?<=\d),(?=\d{3})/g, "")
    .replaceAll(/(\d+) (\d+)\/(\d+)/g, "($1+$2/$3)")
    .replaceAll(/(\d+)% of (\d+)/g, "($1/100*$2)")
    .replaceAll("²", "^2")
    .replaceAll("³", "^3")
    .replaceAll("×", "*")
    .replaceAll("÷", "/")
    .replaceAll("−", "-");
  return evaluateTokens(written.match(tokenShape) ?? []);
};

const findGreatestCommonFactor = (first: number, second: number): number =>
  second === 0 ? first : findGreatestCommonFactor(second, first % second);

const fractionTypes: readonly ArithmeticQuestionType[] = [
  "adding-fractions",
  "subtracting-fractions",
  "multiplying-fractions",
  "dividing-fractions",
];

describe("the Arithmetic paper", () => {
  it("plans 12 questions, each from a list of question types", () => {
    expect(arithmeticPaperPlan).toHaveLength(12);
  });

  it.each(seeds)(
    "asks 12 different question types in every paper (seed %i)",
    (seed) => {
      const { questions } = buildArithmeticCheckPaper(buildSeededRandom(seed));
      const questionTypes = questions.map(({ questionType }) => questionType);

      expect(new Set(questionTypes).size).toBe(12);
      arithmeticPaperPlan.forEach((slot, index) => {
        expect(slot).toContain(questionTypes[index]);
      });
    },
  );

  describe.each(arithmeticQuestionTypes)("%s", (questionType) => {
    const questions = seeds.map((seed) =>
      buildArithmeticQuestion(questionType, buildSeededRandom(seed)),
    );

    it("gives the right answer to the calculation it shows", () => {
      for (const { prompt, acceptedAnswers } of questions) {
        const expected = evaluateExpression(prompt);
        for (const acceptedAnswer of acceptedAnswers) {
          expect(parseCheckNumber(acceptedAnswer), prompt).toBeCloseTo(
            expected,
            9,
          );
        }
      }
    });

    it("asks for a positive answer of no more than 3 decimal places", () => {
      for (const { prompt, acceptedAnswers } of questions) {
        const [answer] = acceptedAnswers;

        expect(parseCheckNumber(answer), prompt).toBeGreaterThan(0);
        expect(answer, prompt).toMatch(
          /^\d+(?:\.\d{1,3})?$|^(?:\d+ )?\d+\/\d+$/,
        );
      }
    });

    it("keys each question by what it asks", () => {
      for (const { key, prompt } of questions) {
        expect(key).toBe(`${questionType}:${prompt.replace(/ =$/, "")}`);
      }
    });
  });

  describe.each(fractionTypes)("%s", (questionType) => {
    const questions = seeds.map((seed) =>
      buildArithmeticQuestion(questionType, buildSeededRandom(seed)),
    );

    it("lists its fraction answer in its simplest form", () => {
      for (const { acceptedAnswers } of questions) {
        for (const answer of acceptedAnswers) {
          const fraction = /(\d+)\/(\d+)$/.exec(answer);
          if (fraction !== null) {
            const [, numerator, denominator] = fraction;

            expect(
              findGreatestCommonFactor(Number(numerator), Number(denominator)),
              answer,
            ).toBe(1);
          }
        }
      }
    });

    it("accepts an equivalent fraction, and refuses one that is a little out", () => {
      for (const question of questions) {
        const value = parseCheckNumber(question.acceptedAnswers[0]) ?? 0;
        const doubled = `${String(Math.round(value * 48))}/48`;

        if (Number.isInteger(value * 48)) {
          expect(isCheckAnswerRight(question, doubled), doubled).toBe(true);
        }
        expect(isCheckAnswerRight(question, String(value + 0.01))).toBe(false);
      }
    });
  });

  it("writes fractions as mixed numbers, whole numbers or proper fractions", () => {
    expect(formatFraction({ numerator: 7, denominator: 4 })).toBe("1 3/4");
    expect(formatFraction({ numerator: 8, denominator: 4 })).toBe("2");
    expect(formatFraction({ numerator: 3, denominator: 4 })).toBe("3/4");
  });

  it("accepts a mixed-number answer typed as an improper fraction", () => {
    const question = {
      answerShape: "number" as const,
      acceptedAnswers: ["1 3/4", "7/4"],
    };

    expect(isCheckAnswerRight(question, "7/4")).toBe(true);
    expect(isCheckAnswerRight(question, "1 3/4")).toBe(true);
    expect(isCheckAnswerRight(question, "1.75")).toBe(true);
    expect(isCheckAnswerRight(question, "3/4")).toBe(false);
  });
});
