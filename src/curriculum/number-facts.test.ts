import { describe, expect, it } from "vitest";
import {
  buildNumberFact,
  largestFactAnswer,
  listNumberFacts,
  numberFactSkillByYear,
  numberFactSkillIds,
  smallestFactAnswer,
} from "./number-facts.js";
import { skills, yearGroups } from "./skills.js";

const evaluateFact = (fact: string): number => {
  const tokens = fact.match(/\d+(?:\.\d+)?|[+−×÷()]/g) ?? [];
  let position = 0;
  const readNumber = (): number => {
    const token = tokens[position++];
    if (token === "(") {
      const inside = readSum();
      position++;
      return inside;
    }
    return Number(token);
  };
  const readProduct = (): number => {
    let value = readNumber();
    while (tokens[position] === "×" || tokens[position] === "÷") {
      const operator = tokens[position++];
      const next = readNumber();
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

const answers = Array.from(
  { length: largestFactAnswer - smallestFactAnswer + 1 },
  (_, offset) => smallestFactAnswer + offset,
);

describe("listNumberFacts", () => {
  it.each(numberFactSkillIds)(
    "gives %s at least one fact for every answer from 1 to 9, each one worth exactly that answer",
    (skillId) => {
      for (const answer of answers) {
        const facts = listNumberFacts(skillId, answer);

        expect(facts.length).toBeGreaterThan(0);
        for (const fact of facts) {
          expect(evaluateFact(fact)).toBeCloseTo(answer, 10);
        }
      }
    },
  );

  it("keeps Year 1 facts within 10, as number bonds", () => {
    for (const answer of answers) {
      for (const fact of listNumberFacts("maths.number-bonds-10", answer)) {
        const numbers = fact.match(/\d+/g)?.map(Number) ?? [];

        expect(Math.max(...numbers)).toBeLessThanOrEqual(10);
      }
    }
  });

  it("asks Year 2 to subtract from a number between 11 and 20", () => {
    expect(listNumberFacts("maths.add-subtract-facts-to-20", 7)).toContain(
      "15 − 8",
    );
  });

  it("only uses the 3, 4 and 8 times tables in Year 3", () => {
    for (const answer of answers) {
      for (const fact of listNumberFacts("maths.times-tables-3-4-8", answer)) {
        expect(fact).toMatch(/[÷×] [348]$|^[348] ×/);
      }
    }
  });

  it("needs the order of operations in Year 6, so working left to right gives the wrong answer", () => {
    const facts = listNumberFacts("maths.order-of-operations", 7);

    expect(facts).toContain("1 + 2 × 3");
    expect(facts.some((fact) => fact.startsWith("("))).toBe(true);
  });
});

describe("buildNumberFact", () => {
  it("picks one of the listed facts", () => {
    expect(buildNumberFact("maths.times-tables-to-12", 4, () => 0)).toBe(
      "24 ÷ 6",
    );
  });
});

describe("numberFactSkillByYear", () => {
  it("gives each Year Group a Maths Skill from its own year of the National Curriculum", () => {
    for (const yearGroup of yearGroups) {
      const skill = skills.find(
        ({ id }) => id === numberFactSkillByYear[yearGroup],
      );

      expect(skill?.subject).toBe("maths");
      expect(skill?.yearGroup).toBe(yearGroup);
    }
  });
});
