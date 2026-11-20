import type { YearGroup } from "./skills.js";

export const numberFactSkillIds = [
  "maths.number-bonds-10",
  "maths.add-subtract-facts-to-20",
  "maths.times-tables-3-4-8",
  "maths.times-tables-to-12",
  "maths.multiply-divide-by-10-100-1000",
  "maths.order-of-operations",
] as const;

export type NumberFactSkillId = (typeof numberFactSkillIds)[number];

export const numberFactSkillByYear: Record<YearGroup, NumberFactSkillId> = {
  1: "maths.number-bonds-10",
  2: "maths.add-subtract-facts-to-20",
  3: "maths.times-tables-3-4-8",
  4: "maths.times-tables-to-12",
  5: "maths.multiply-divide-by-10-100-1000",
  6: "maths.order-of-operations",
};

export const smallestFactAnswer = 1;
export const largestFactAnswer = 9;

const listWholeNumbers = (smallest: number, largest: number): number[] =>
  Array.from(
    { length: Math.max(0, largest - smallest + 1) },
    (_, offset) => smallest + offset,
  );

const listBondFacts = (answer: number): string[] => [
  ...listWholeNumbers(1, answer - 1).map(
    (left) => `${String(left)} + ${String(answer - left)}`,
  ),
  ...listWholeNumbers(answer + 1, 10).map(
    (whole) => `${String(whole)} − ${String(whole - answer)}`,
  ),
];

const listFactsTo20 = (answer: number): string[] =>
  listWholeNumbers(11, 20).map(
    (whole) => `${String(whole)} − ${String(whole - answer)}`,
  );

const listTimesTableFacts = (
  answer: number,
  tables: readonly number[],
): string[] => [
  ...tables.map((table) => `${String(table * answer)} ÷ ${String(table)}`),
  ...tables.flatMap((table) =>
    answer % table === 0 && answer > table
      ? [`${String(table)} × ${String(answer / table)}`]
      : [],
  ),
];

const listPlaceValueFacts = (answer: number): string[] => [
  `${String(answer * 10)} ÷ 10`,
  `${String(answer * 100)} ÷ 100`,
  `${String(answer * 1000)} ÷ 1000`,
  `0.${String(answer)} × 10`,
  `0.0${String(answer)} × 100`,
];

const smallFactors = listWholeNumbers(2, 5);

const listOrderOfOperationsFacts = (answer: number): string[] =>
  smallFactors.flatMap((left) =>
    smallFactors.flatMap((right) => {
      const product = left * right;
      const facts: string[] = [];
      if (product < answer) {
        facts.push(
          `${String(answer - product)} + ${String(left)} × ${String(right)}`,
        );
      }
      if (product > answer) {
        facts.push(
          `${String(left)} × ${String(right)} − ${String(product - answer)}`,
        );
      }
      if (right <= 3 && answer * right > left) {
        facts.push(
          `(${String(answer * right - left)} + ${String(left)}) ÷ ${String(right)}`,
        );
      }
      return facts;
    }),
  );

const factListers: Record<NumberFactSkillId, (answer: number) => string[]> = {
  "maths.number-bonds-10": listBondFacts,
  "maths.add-subtract-facts-to-20": listFactsTo20,
  "maths.times-tables-3-4-8": (answer) =>
    listTimesTableFacts(answer, [3, 4, 8]),
  "maths.times-tables-to-12": (answer) =>
    listTimesTableFacts(answer, [6, 7, 9, 11, 12]),
  "maths.multiply-divide-by-10-100-1000": listPlaceValueFacts,
  "maths.order-of-operations": listOrderOfOperationsFacts,
};

export const listNumberFacts = (
  skillId: NumberFactSkillId,
  answer: number,
): string[] => factListers[skillId](answer);

export const buildNumberFact = (
  skillId: NumberFactSkillId,
  answer: number,
  random: () => number,
): string => {
  const facts = listNumberFacts(skillId, answer);
  return facts[Math.floor(random() * facts.length)];
};
