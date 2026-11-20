import { buildCheckQuestion } from "./check-questions.js";
import { checkFormats, type CheckPaper, type CheckQuestion } from "./checks.js";
import { pickOne, pickWholeNumber, shuffleValues } from "./music-game.js";
import { formatNumber } from "./number-format.js";

export const arithmeticQuestionTypes = [
  "column-addition",
  "column-subtraction",
  "short-multiplication",
  "long-multiplication",
  "short-division",
  "long-division",
  "adding-fractions",
  "subtracting-fractions",
  "multiplying-fractions",
  "dividing-fractions",
  "decimal-addition",
  "decimal-subtraction",
  "multiplying-by-10-100-1000",
  "percentage-of-amount",
  "order-of-operations",
  "squares-and-cubes",
] as const;

export type ArithmeticQuestionType = (typeof arithmeticQuestionTypes)[number];

export const arithmeticQuestionTypeNames: Record<
  ArithmeticQuestionType,
  string
> = {
  "column-addition": "Column addition",
  "column-subtraction": "Column subtraction",
  "short-multiplication": "Short multiplication",
  "long-multiplication": "Long multiplication",
  "short-division": "Short division",
  "long-division": "Long division",
  "adding-fractions": "Adding fractions",
  "subtracting-fractions": "Subtracting fractions",
  "multiplying-fractions": "Multiplying fractions",
  "dividing-fractions": "Dividing fractions",
  "decimal-addition": "Adding decimals",
  "decimal-subtraction": "Subtracting decimals",
  "multiplying-by-10-100-1000": "Multiplying and dividing by 10, 100 and 1,000",
  "percentage-of-amount": "Percentages of amounts",
  "order-of-operations": "Order of operations",
  "squares-and-cubes": "Squares and cubes",
};

export const arithmeticSkillIds: Record<ArithmeticQuestionType, string> = {
  "column-addition": "maths.add-large-numbers",
  "column-subtraction": "maths.subtract-large-numbers",
  "short-multiplication": "maths.multiply-large-numbers",
  "long-multiplication": "maths.multiply-large-numbers",
  "short-division": "maths.divide-large-numbers",
  "long-division": "maths.divide-large-numbers",
  "adding-fractions": "maths.add-subtract-fractions",
  "subtracting-fractions": "maths.add-subtract-fractions",
  "multiplying-fractions": "maths.multiply-divide-fractions",
  "dividing-fractions": "maths.multiply-divide-fractions",
  "decimal-addition": "maths.add-decimals",
  "decimal-subtraction": "maths.subtract-decimals",
  "multiplying-by-10-100-1000": "maths.multiply-divide-by-10-100-1000",
  "percentage-of-amount": "maths.percentages-of-amounts",
  "order-of-operations": "maths.order-of-operations",
  "squares-and-cubes": "maths.squares-cubes-and-powers-of-ten",
};

export interface ArithmeticSum {
  expression: string;
  answers: string[];
}

interface Fraction {
  numerator: number;
  denominator: number;
}

const fractionDenominators: readonly number[] = [2, 3, 4, 5, 6, 8, 9, 10, 12];
const longDivisors: readonly number[] = [
  12, 13, 14, 15, 16, 17, 18, 19, 21, 23, 24, 25, 26, 27, 28, 32, 34, 35, 36,
];
const percentages: readonly number[] = [
  1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 75, 90,
];
const powersOfTen: readonly number[] = [10, 100, 1000];
const mostDecimalPlacesShown = 2;
const mostAnswerDecimalPlaces = 3;

const findGreatestCommonFactor = (first: number, second: number): number =>
  second === 0 ? first : findGreatestCommonFactor(second, first % second);

const simplifyFraction = ({ numerator, denominator }: Fraction): Fraction => {
  const factor = findGreatestCommonFactor(numerator, denominator);
  return { numerator: numerator / factor, denominator: denominator / factor };
};

const addFractions = (first: Fraction, second: Fraction): Fraction =>
  simplifyFraction({
    numerator:
      first.numerator * second.denominator +
      second.numerator * first.denominator,
    denominator: first.denominator * second.denominator,
  });

const subtractFractions = (first: Fraction, second: Fraction): Fraction =>
  addFractions(first, {
    numerator: -second.numerator,
    denominator: second.denominator,
  });

const multiplyFractions = (first: Fraction, second: Fraction): Fraction =>
  simplifyFraction({
    numerator: first.numerator * second.numerator,
    denominator: first.denominator * second.denominator,
  });

const findFractionValue = ({ numerator, denominator }: Fraction): number =>
  numerator / denominator;

export const formatFraction = ({
  numerator,
  denominator,
}: Fraction): string => {
  const whole = Math.floor(numerator / denominator);
  const remainder = numerator - whole * denominator;
  if (remainder === 0) {
    return String(whole);
  }
  const fractionPart = `${String(remainder)}/${String(denominator)}`;
  return whole === 0 ? fractionPart : `${String(whole)} ${fractionPart}`;
};

const listFractionAnswers = (fraction: Fraction): string[] => {
  const simplest = simplifyFraction(fraction);
  if (simplest.denominator === 1) {
    return [String(simplest.numerator)];
  }
  const improper = `${String(simplest.numerator)}/${String(simplest.denominator)}`;
  return [...new Set([formatFraction(simplest), improper])];
};

const pickProperFraction = (random: () => number): Fraction => {
  const denominator = pickOne(fractionDenominators, random);
  const numerators = Array.from(
    { length: denominator - 1 },
    (_, index) => index + 1,
  ).filter(
    (numerator) => findGreatestCommonFactor(numerator, denominator) === 1,
  );
  return { numerator: pickOne(numerators, random), denominator };
};

const pickTwoProperFractions = (random: () => number): [Fraction, Fraction] => {
  const first = pickProperFraction(random);
  const second = pickProperFraction(random);
  return second.denominator === first.denominator
    ? [first, { numerator: 1, denominator: first.denominator * 2 }]
    : [first, second];
};

const addWholes = (fraction: Fraction, wholes: number): Fraction => ({
  numerator: fraction.numerator + wholes * fraction.denominator,
  denominator: fraction.denominator,
});

const pickFractionPair = (random: () => number): [Fraction, Fraction] => {
  const [first, second] = pickTwoProperFractions(random);
  return random() < 0.5
    ? [first, second]
    : [
        addWholes(first, pickWholeNumber(1, 4, random)),
        addWholes(second, pickWholeNumber(0, 2, random)),
      ];
};

const formatOperand = (value: number): string => formatNumber(value);

const formatScaledNumber = (scaled: number, decimalPlaces: number): string => {
  const digits = String(scaled).padStart(decimalPlaces + 1, "0");
  const whole = digits.slice(0, digits.length - decimalPlaces);
  const decimals = digits
    .slice(digits.length - decimalPlaces)
    .replace(/0+$/, "");
  const wholeShown = formatNumber(Number(whole));
  return decimals === "" ? wholeShown : `${wholeShown}.${decimals}`;
};

const findDecimalPlaces = (power: number): number =>
  Math.round(Math.log10(power));

const buildColumnAddition = (random: () => number): ArithmeticSum => {
  const first = pickWholeNumber(10_000, 89_999, random);
  const second = pickWholeNumber(1000, 9999, random);
  return {
    expression: `${formatOperand(first)} + ${formatOperand(second)}`,
    answers: [String(first + second)],
  };
};

const buildColumnSubtraction = (random: () => number): ArithmeticSum => {
  const first = pickWholeNumber(20_000, 99_999, random);
  const second = pickWholeNumber(1000, 19_999, random);
  return {
    expression: `${formatOperand(first)} − ${formatOperand(second)}`,
    answers: [String(first - second)],
  };
};

const buildShortMultiplication = (random: () => number): ArithmeticSum => {
  const first = pickWholeNumber(1000, 9999, random);
  const second = pickWholeNumber(3, 9, random);
  return {
    expression: `${formatOperand(first)} × ${String(second)}`,
    answers: [String(first * second)],
  };
};

const buildLongMultiplication = (random: () => number): ArithmeticSum => {
  const first = pickWholeNumber(120, 4999, random);
  const tens = pickWholeNumber(1, 8, random);
  const ones = pickWholeNumber(1, 9, random);
  const second = tens * 10 + ones;
  return {
    expression: `${formatOperand(first)} × ${String(second)}`,
    answers: [String(first * second)],
  };
};

const buildShortDivision = (random: () => number): ArithmeticSum => {
  const divisor = pickWholeNumber(3, 9, random);
  const quotient = pickWholeNumber(120, 1999, random);
  return {
    expression: `${formatOperand(divisor * quotient)} ÷ ${String(divisor)}`,
    answers: [String(quotient)],
  };
};

const buildLongDivision = (random: () => number): ArithmeticSum => {
  const divisor = pickOne(longDivisors, random);
  const quotient = pickWholeNumber(24, 299, random);
  return {
    expression: `${formatOperand(divisor * quotient)} ÷ ${String(divisor)}`,
    answers: [String(quotient)],
  };
};

const buildAddingFractions = (random: () => number): ArithmeticSum => {
  const [first, second] = pickFractionPair(random);
  return {
    expression: `${formatFraction(first)} + ${formatFraction(second)}`,
    answers: listFractionAnswers(addFractions(first, second)),
  };
};

const buildSubtractingFractions = (random: () => number): ArithmeticSum => {
  const [first, second] = pickFractionPair(random);
  const [larger, smaller] =
    findFractionValue(first) > findFractionValue(second)
      ? [first, second]
      : [addWholes(second, 1), first];
  return {
    expression: `${formatFraction(larger)} − ${formatFraction(smaller)}`,
    answers: listFractionAnswers(subtractFractions(larger, smaller)),
  };
};

const buildMultiplyingFractions = (random: () => number): ArithmeticSum => {
  const [first, second] = pickTwoProperFractions(random);
  if (random() < 0.5) {
    return {
      expression: `${formatFraction(first)} × ${formatFraction(second)}`,
      answers: listFractionAnswers(multiplyFractions(first, second)),
    };
  }
  const whole = first.denominator * pickWholeNumber(2, 9, random);
  return {
    expression: `${formatFraction(first)} × ${String(whole)}`,
    answers: listFractionAnswers(
      multiplyFractions(first, { numerator: whole, denominator: 1 }),
    ),
  };
};

const buildDividingFractions = (random: () => number): ArithmeticSum => {
  const fraction = pickProperFraction(random);
  const divisor = pickWholeNumber(2, 6, random);
  return {
    expression: `${formatFraction(fraction)} ÷ ${String(divisor)}`,
    answers: listFractionAnswers(
      multiplyFractions(fraction, { numerator: 1, denominator: divisor }),
    ),
  };
};

const buildDecimalAddition = (random: () => number): ArithmeticSum => {
  const first = pickWholeNumber(100, 999, random) * 10;
  const second = pickWholeNumber(101, 999, random);
  return {
    expression: `${formatScaledNumber(first, 2)} + ${formatScaledNumber(second, 2)}`,
    answers: [formatScaledNumber(first + second, 2).replaceAll(",", "")],
  };
};

const buildDecimalSubtraction = (random: () => number): ArithmeticSum => {
  const first =
    random() < 0.5
      ? pickWholeNumber(10, 60, random) * 100
      : pickWholeNumber(200, 999, random) * 10;
  const second = pickWholeNumber(101, first - 1, random);
  return {
    expression: `${formatScaledNumber(first, 2)} − ${formatScaledNumber(second, 2)}`,
    answers: [formatScaledNumber(first - second, 2).replaceAll(",", "")],
  };
};

const buildMultiplyingByPowersOfTen = (random: () => number): ArithmeticSum => {
  const digits = pickWholeNumber(11, 999, random);
  const significant = digits % 10 === 0 ? digits + 1 : digits;
  const power = pickOne(powersOfTen, random);
  const powerPlaces = findDecimalPlaces(power);
  const isMultiplying = random() < 0.5;
  const decimalPlaces = pickWholeNumber(
    0,
    isMultiplying
      ? mostDecimalPlacesShown
      : Math.min(mostDecimalPlacesShown, mostAnswerDecimalPlaces - powerPlaces),
    random,
  );
  const shown = formatScaledNumber(significant, decimalPlaces);
  if (isMultiplying) {
    const resultPlaces = Math.max(decimalPlaces - powerPlaces, 0);
    const resultScaled =
      significant * 10 ** Math.max(powerPlaces - decimalPlaces, 0);
    return {
      expression: `${shown} × ${formatOperand(power)}`,
      answers: [
        formatScaledNumber(resultScaled, resultPlaces).replaceAll(",", ""),
      ],
    };
  }
  return {
    expression: `${shown} ÷ ${formatOperand(power)}`,
    answers: [
      formatScaledNumber(significant, decimalPlaces + powerPlaces).replaceAll(
        ",",
        "",
      ),
    ],
  };
};

const buildPercentageOfAmount = (random: () => number): ArithmeticSum => {
  const percentage = pickOne(percentages, random);
  const amount =
    percentage === 1
      ? pickWholeNumber(2, 9, random) * 100
      : pickWholeNumber(3, 49, random) * 20;
  return {
    expression: `${String(percentage)}% of ${formatOperand(amount)}`,
    answers: [String((percentage * amount) / 100)],
  };
};

const orderOfOperationsBuilders: readonly ((
  random: () => number,
) => ArithmeticSum)[] = [
  (random) => {
    const first = pickWholeNumber(10, 99, random);
    const second = pickWholeNumber(3, 12, random);
    const third = pickWholeNumber(3, 12, random);
    return {
      expression: `${String(first)} + ${String(second)} × ${String(third)}`,
      answers: [String(first + second * third)],
    };
  },
  (random) => {
    const second = pickWholeNumber(2, 9, random);
    const third = pickWholeNumber(2, 9, random);
    const first = second * third + pickWholeNumber(1, 60, random);
    return {
      expression: `${String(first)} − ${String(second)} × ${String(third)}`,
      answers: [String(first - second * third)],
    };
  },
  (random) => {
    const first = pickWholeNumber(10, 40, random);
    const second = pickWholeNumber(5, 30, random);
    const third = pickWholeNumber(2, 9, random);
    return {
      expression: `(${String(first)} + ${String(second)}) × ${String(third)}`,
      answers: [String((first + second) * third)],
    };
  },
  (random) => {
    const divisor = pickWholeNumber(2, 9, random);
    const quotient = pickWholeNumber(3, 12, random);
    const added = pickWholeNumber(5, 50, random);
    return {
      expression: `${String(divisor * quotient)} ÷ ${String(divisor)} + ${String(added)}`,
      answers: [String(quotient + added)],
    };
  },
  (random) => {
    const first = pickWholeNumber(2, 9, random);
    const taken = pickWholeNumber(1, 10, random);
    const from = taken + pickWholeNumber(2, 12, random);
    return {
      expression: `${String(first)} × (${String(from)} − ${String(taken)})`,
      answers: [String(first * (from - taken))],
    };
  },
];

const buildOrderOfOperations = (random: () => number): ArithmeticSum =>
  pickOne(orderOfOperationsBuilders, random)(random);

const buildSquaresAndCubes = (random: () => number): ArithmeticSum => {
  const shape = pickWholeNumber(0, 2, random);
  if (shape === 0) {
    const base = pickWholeNumber(4, 15, random);
    return { expression: `${String(base)}²`, answers: [String(base ** 2)] };
  }
  if (shape === 1) {
    const base = pickWholeNumber(2, 6, random);
    return { expression: `${String(base)}³`, answers: [String(base ** 3)] };
  }
  const squared = pickWholeNumber(2, 12, random);
  const cubed = pickWholeNumber(2, 5, random);
  return {
    expression: `${String(squared)}² + ${String(cubed)}³`,
    answers: [String(squared ** 2 + cubed ** 3)],
  };
};

const arithmeticSumBuilders: Record<
  ArithmeticQuestionType,
  (random: () => number) => ArithmeticSum
> = {
  "column-addition": buildColumnAddition,
  "column-subtraction": buildColumnSubtraction,
  "short-multiplication": buildShortMultiplication,
  "long-multiplication": buildLongMultiplication,
  "short-division": buildShortDivision,
  "long-division": buildLongDivision,
  "adding-fractions": buildAddingFractions,
  "subtracting-fractions": buildSubtractingFractions,
  "multiplying-fractions": buildMultiplyingFractions,
  "dividing-fractions": buildDividingFractions,
  "decimal-addition": buildDecimalAddition,
  "decimal-subtraction": buildDecimalSubtraction,
  "multiplying-by-10-100-1000": buildMultiplyingByPowersOfTen,
  "percentage-of-amount": buildPercentageOfAmount,
  "order-of-operations": buildOrderOfOperations,
  "squares-and-cubes": buildSquaresAndCubes,
};

export const buildArithmeticSum = (
  questionType: ArithmeticQuestionType,
  random: () => number,
): ArithmeticSum => arithmeticSumBuilders[questionType](random);

export const arithmeticPaperPlan: readonly (readonly ArithmeticQuestionType[])[] =
  [
    ["column-addition", "column-subtraction"],
    ["squares-and-cubes", "multiplying-by-10-100-1000"],
    ["decimal-addition", "decimal-subtraction"],
    ["short-multiplication"],
    ["order-of-operations"],
    ["short-division"],
    ["percentage-of-amount"],
    ["adding-fractions", "subtracting-fractions"],
    [
      "column-addition",
      "column-subtraction",
      "squares-and-cubes",
      "multiplying-by-10-100-1000",
    ],
    ["long-multiplication"],
    ["multiplying-fractions", "dividing-fractions"],
    ["long-division"],
  ];

const pickPaperQuestionTypes = (
  random: () => number,
): ArithmeticQuestionType[] => {
  const picked: ArithmeticQuestionType[] = [];
  for (const slot of arithmeticPaperPlan) {
    const unused = slot.filter(
      (questionType) => !picked.includes(questionType),
    );
    const [questionType] = shuffleValues(unused, random);
    picked.push(questionType);
  }
  return picked;
};

export const buildArithmeticQuestion = (
  questionType: ArithmeticQuestionType,
  random: () => number,
): CheckQuestion => {
  const { expression, answers } = buildArithmeticSum(questionType, random);
  return buildCheckQuestion({
    key: `${questionType}:${expression}`,
    skillId: arithmeticSkillIds[questionType],
    questionType,
    prompt: `${expression} =`,
    answerShape: "number",
    acceptedAnswers: answers,
  });
};

export const buildArithmeticCheckPaper = (
  random: () => number,
): CheckPaper => ({
  passageTitle: undefined,
  passage: undefined,
  questions: pickPaperQuestionTypes(random)
    .slice(0, checkFormats["arithmetic-check"].questionCount)
    .map((questionType) => buildArithmeticQuestion(questionType, random)),
});
