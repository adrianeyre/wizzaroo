export const capitalLetterDifficulties = [1, 2] as const;
export type CapitalLetterDifficulty =
  (typeof capitalLetterDifficulties)[number];

export interface CapitalLetterQuestion {
  smallLetter: string;
  capitalLetter: string;
}

const lettersShapedLikeTheirCapital = Array.from("cikopsuvwxz");
const alphabet = Array.from("abcdefghijklmnopqrstuvwxyz");

const buildQuestion = (smallLetter: string): CapitalLetterQuestion => ({
  smallLetter,
  capitalLetter: smallLetter.toUpperCase(),
});

export const buildCapitalLetterQuestions = (
  difficulty: CapitalLetterDifficulty,
): CapitalLetterQuestion[] =>
  alphabet
    .filter(
      (letter) =>
        lettersShapedLikeTheirCapital.includes(letter) === (difficulty === 1),
    )
    .map(buildQuestion);

export const listCapitalLetters = (): string[] =>
  alphabet.map((letter) => letter.toUpperCase());
