export const numberBondDifficulties = [1, 2, 3] as const;
export type NumberBondDifficulty = (typeof numberBondDifficulties)[number];

export interface NumberSentence {
  left: number;
  operator: "+" | "-";
  right: number;
  result: number;
}

export interface NumberBondQuestion {
  sentence: NumberSentence;
  blank: keyof Omit<NumberSentence, "operator">;
  answer: number;
}

export type BondTotal = 10 | 20;

const listWholeNumbers = (smallest: number, largest: number): number[] =>
  Array.from(
    { length: largest - smallest + 1 },
    (_, offset) => smallest + offset,
  );

const buildAddition = (part: number, bondTotal: BondTotal): NumberSentence => ({
  left: part,
  operator: "+",
  right: bondTotal - part,
  result: bondTotal,
});

const buildSubtraction = (
  part: number,
  bondTotal: BondTotal,
): NumberSentence => ({
  left: bondTotal,
  operator: "-",
  right: part,
  result: bondTotal - part,
});

const buildQuestion = (
  sentence: NumberSentence,
  blank: NumberBondQuestion["blank"],
): NumberBondQuestion => ({ sentence, blank, answer: sentence[blank] });

export const buildNumberBondQuestions = (
  difficulty: NumberBondDifficulty,
  bondTotal: BondTotal = 10,
): NumberBondQuestion[] => {
  const everyPart = listWholeNumbers(0, bondTotal);

  switch (difficulty) {
    case 1:
      return listWholeNumbers(1, bondTotal - 1).map((part) =>
        buildQuestion(buildAddition(part, bondTotal), "right"),
      );
    case 2:
      return everyPart.flatMap((part) => [
        buildQuestion(buildAddition(part, bondTotal), "right"),
        buildQuestion(buildAddition(part, bondTotal), "left"),
      ]);
    case 3:
      return [
        ...buildNumberBondQuestions(2, bondTotal),
        ...everyPart.flatMap((part) => [
          buildQuestion(buildSubtraction(part, bondTotal), "result"),
          buildQuestion(buildSubtraction(part, bondTotal), "right"),
        ]),
      ];
  }
};

export const generateNumberBondQuestion = (
  difficulty: NumberBondDifficulty,
  random: () => number,
): NumberBondQuestion => {
  const questions = buildNumberBondQuestions(difficulty);
  return questions[Math.floor(random() * questions.length)];
};
