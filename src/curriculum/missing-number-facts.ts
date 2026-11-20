import { listWholeNumbers } from "./counting-to-20.js";
import { formatNumber, roundToThousandths } from "./number-format.js";

export const numberFactDifficulties = [1, 2, 3] as const;
export type NumberFactDifficulty = (typeof numberFactDifficulties)[number];
export type NumberFactYear = 3 | 4 | 5 | 6;

export interface MissingNumberQuestion {
  sentence: string;
  answer: number;
  slips: number[];
}

const factors = listWholeNumbers(1, 12);

const buildQuestion = (
  sentence: string,
  answer: number,
  slips: readonly number[],
): MissingNumberQuestion => ({
  sentence,
  answer: roundToThousandths(answer),
  slips: [...new Set(slips.map(roundToThousandths))].filter(
    (slip) => slip !== roundToThousandths(answer) && slip > 0,
  ),
});

const buildTableFacts = (table: number): MissingNumberQuestion[] =>
  factors.flatMap((factor) => {
    const product = table * factor;
    return [
      buildQuestion(`${String(factor)} × ${String(table)} = ?`, product, [
        product + table,
        product - table,
        product + 1,
        (factor + 1) * (table + 1),
      ]),
      buildQuestion(`${String(table)} × ? = ${String(product)}`, factor, [
        factor + 1,
        factor - 1,
        product - table,
        factor + 2,
        factor + 3,
      ]),
    ];
  });

const buildDivisionFacts = (table: number): MissingNumberQuestion[] =>
  factors.map((factor) =>
    buildQuestion(`${String(table * factor)} ÷ ${String(table)} = ?`, factor, [
      factor + 1,
      factor - 1,
      table,
      factor + 2,
      factor + 3,
    ]),
  );

const buildSquareFacts = () =>
  factors.map((number) =>
    buildQuestion(`${String(number)}² = ?`, number * number, [
      number * 2,
      (number + 1) ** 2,
      (number - 1) ** 2,
      number * number + number,
      number * number + 2,
    ]),
  );

const buildCubeFacts = () =>
  listWholeNumbers(1, 5).map((number) =>
    buildQuestion(`${String(number)}³ = ?`, number ** 3, [
      number * 3,
      number ** 2,
      (number + 1) ** 3,
      number ** 3 + number,
    ]),
  );

const isThousandths = (value: number) =>
  value >= 0.001 && Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-9;

const buildPowerOfTenFacts = () =>
  [4.7, 36, 0.58, 125, 2.5, 7.04, 63, 0.9].flatMap((number) =>
    [10, 100, 1000].flatMap((power) => {
      const shownNumber = formatNumber(number);
      const shownPower = formatNumber(power);
      const multiplied = number * power;
      const divided = number / power;
      return [
        ...(isThousandths(multiplied)
          ? [
              buildQuestion(`${shownNumber} × ${shownPower} = ?`, multiplied, [
                multiplied * 10,
                multiplied / 10,
                number + power,
              ]),
            ]
          : []),
        ...(isThousandths(divided)
          ? [
              buildQuestion(`${shownNumber} ÷ ${shownPower} = ?`, divided, [
                divided / 10,
                divided * 10,
                number * power,
              ]),
            ]
          : []),
      ];
    }),
  );

const orderTriples: readonly [number, number, number][] = [
  [3, 4, 5],
  [2, 6, 3],
  [10, 2, 4],
  [5, 3, 6],
  [8, 2, 7],
  [4, 5, 2],
  [6, 3, 8],
  [9, 4, 2],
];

const buildOrderOfOperations = (withBrackets: boolean) =>
  orderTriples.map(([first, second, third]) =>
    withBrackets
      ? buildQuestion(
          `(${String(first)} + ${String(second)}) × ${String(third)} = ?`,
          (first + second) * third,
          [
            first + second * third,
            first * second + third,
            (first + second) * third + third,
          ],
        )
      : buildQuestion(
          `${String(first)} + ${String(second)} × ${String(third)} = ?`,
          first + second * third,
          [
            (first + second) * third,
            first * second + third,
            first + second + third,
          ],
        ),
  );

const buildTakeAwayDivision = () =>
  orderTriples.map(([first, second, third]) => {
    const dividend = second * third;
    const start = first + dividend;
    return buildQuestion(
      `${String(start + 10)} − ${String(dividend)} ÷ ${String(third)} = ?`,
      start + 10 - second,
      [
        (start + 10 - dividend) / third,
        start + 10 - dividend,
        start + 10 - third,
      ],
    );
  });

export const buildNumberFactQuestions = (
  year: NumberFactYear,
  difficulty: NumberFactDifficulty,
): MissingNumberQuestion[] => {
  const plans: Record<
    NumberFactYear,
    Record<NumberFactDifficulty, () => MissingNumberQuestion[]>
  > = {
    3: {
      1: () => [...buildTableFacts(3), ...buildTableFacts(4)],
      2: () => buildTableFacts(8),
      3: () => [3, 4, 8].flatMap(buildDivisionFacts),
    },
    4: {
      1: () => [...buildTableFacts(6), ...buildTableFacts(7)],
      2: () => [9, 11, 12].flatMap(buildTableFacts),
      3: () => [6, 7, 9, 12].flatMap(buildDivisionFacts),
    },
    5: {
      1: buildSquareFacts,
      2: buildCubeFacts,
      3: buildPowerOfTenFacts,
    },
    6: {
      1: () => buildOrderOfOperations(false),
      2: () => buildOrderOfOperations(true),
      3: buildTakeAwayDivision,
    },
  };
  return plans[year][difficulty]();
};
