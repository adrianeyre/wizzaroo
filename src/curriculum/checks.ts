import type { Subject } from "./skills.js";

export const checkGameTypes = [
  "phonics-screening-check",
  "times-tables-check",
  "arithmetic-check",
  "reasoning-check",
  "grammar-check",
  "spelling-check",
  "reading-check",
] as const;

export type CheckGameType = (typeof checkGameTypes)[number];

export const isCheckGameType = (value: unknown): value is CheckGameType =>
  checkGameTypes.some((gameType) => gameType === value);

export type CheckClock =
  | { kind: "per-question"; secondsPerQuestion: number; pauseSeconds: number }
  | { kind: "whole-paper"; seconds: number }
  | { kind: "none" };

export interface CheckFormat {
  gameType: CheckGameType;
  subject: Subject;
  title: string;
  paperName: string;
  instruction: string;
  questionCount: number;
  warmUpCount: number;
  clock: CheckClock;
  isParentMarked: boolean;
  needsConnection: boolean;
}

export const checkWays = ["practice", "timed"] as const;

export type CheckWay = (typeof checkWays)[number];

export interface CheckAnswerTiming {
  checkWay: CheckWay;
  millisecondsTaken: number;
}

export const checkAnswerShapes = [
  "number",
  "words",
  "choice",
  "read-aloud",
] as const;

export type CheckAnswerShape = (typeof checkAnswerShapes)[number];

export interface CheckQuestion {
  key: string;
  skillId: string;
  questionType: string;
  prompt: string;
  passage: string | undefined;
  spokenWord: string | undefined;
  answerShape: CheckAnswerShape;
  choices: string[];
  acceptedAnswers: string[];
  soundNote?: string;
}

export interface CheckPaper {
  passageTitle: string | undefined;
  passage: string | undefined;
  questions: CheckQuestion[];
}

export interface CheckOutcome {
  key: string;
  questionType: string;
  skillId: string;
  isRight: boolean;
  isInTime: boolean;
  millisecondsTaken: number;
}

export interface CheckResult {
  checkGameType: CheckGameType;
  isClockOff: boolean;
  outcomes: CheckOutcome[];
}

export interface CheckAttempt extends CheckResult {
  finishedAt: string;
  localDate: string;
  score: number;
  questionCount: number;
}

export interface QuestionTypeScore {
  questionType: string;
  score: number;
  questionCount: number;
}

const secondsPerMinute = 60;

export const checkFormats: Record<CheckGameType, CheckFormat> = {
  "phonics-screening-check": {
    gameType: "phonics-screening-check",
    subject: "phonics",
    title: "Phonics check",
    paperName: "Phonics Screening Check",
    instruction:
      "Read each word out loud. Some are real words and some are alien words.",
    questionCount: 20,
    warmUpCount: 0,
    clock: { kind: "none" },
    isParentMarked: true,
    needsConnection: false,
  },
  "times-tables-check": {
    gameType: "times-tables-check",
    subject: "maths",
    title: "Times tables check",
    paperName: "Multiplication Tables Check",
    instruction:
      "Type the answer to each times table question, then press Enter or tap the tick.",
    questionCount: 25,
    warmUpCount: 3,
    clock: { kind: "per-question", secondsPerQuestion: 6, pauseSeconds: 3 },
    isParentMarked: false,
    needsConnection: false,
  },
  "arithmetic-check": {
    gameType: "arithmetic-check",
    subject: "maths",
    title: "Arithmetic paper",
    paperName: "SATs Maths: Arithmetic",
    instruction: "Work out each calculation and type your answer.",
    questionCount: 12,
    warmUpCount: 0,
    clock: { kind: "whole-paper", seconds: 10 * secondsPerMinute },
    isParentMarked: false,
    needsConnection: false,
  },
  "reasoning-check": {
    gameType: "reasoning-check",
    subject: "maths",
    title: "Reasoning paper",
    paperName: "SATs Maths: Reasoning",
    instruction:
      "Read each problem carefully, then type or choose your answer.",
    questionCount: 8,
    warmUpCount: 0,
    clock: { kind: "whole-paper", seconds: 10 * secondsPerMinute },
    isParentMarked: false,
    needsConnection: false,
  },
  "grammar-check": {
    gameType: "grammar-check",
    subject: "english",
    title: "Grammar paper",
    paperName: "SATs English: Grammar and punctuation",
    instruction: "Read each question, then choose or type your answer.",
    questionCount: 12,
    warmUpCount: 0,
    clock: { kind: "whole-paper", seconds: 10 * secondsPerMinute },
    isParentMarked: false,
    needsConnection: false,
  },
  "spelling-check": {
    gameType: "spelling-check",
    subject: "english",
    title: "Spelling paper",
    paperName: "SATs English: Spelling",
    instruction:
      "Listen to each word and the sentence it is in, then type the missing word.",
    questionCount: 10,
    warmUpCount: 0,
    clock: { kind: "whole-paper", seconds: 8 * secondsPerMinute },
    isParentMarked: false,
    needsConnection: true,
  },
  "reading-check": {
    gameType: "reading-check",
    subject: "english",
    title: "Reading paper",
    paperName: "SATs English: Reading",
    instruction: "Read the text, then answer the questions about it.",
    questionCount: 8,
    warmUpCount: 0,
    clock: { kind: "whole-paper", seconds: 12 * secondsPerMinute },
    isParentMarked: false,
    needsConnection: false,
  },
};

const fractionShape = /^(?:(\d+)\s+)?(\d+)\s*\/\s*(\d+)$/;
const decimalShape = /^-?(?:\d+(?:\.\d*)?|\.\d+)$/;

export const parseCheckNumber = (text: string): number | undefined => {
  const trimmed = text.trim().replace(/^£\s*/, "");
  const grouped = trimmed.includes("/")
    ? trimmed
    : trimmed.replaceAll(/(?<=\d) (?=\d{3}\b)/g, "");
  const cleaned = grouped
    .replaceAll(/(?<=\d),(?=\d{3}\b)/g, "")
    .replaceAll("−", "-")
    .replace(/%$/, "")
    .trim();
  const fraction = fractionShape.exec(cleaned);
  if (fraction !== null) {
    const [, whole = "0", numerator, denominator] = fraction;
    const denominatorValue = Number(denominator);
    return denominatorValue === 0
      ? undefined
      : Number(whole) + Number(numerator) / denominatorValue;
  }
  return decimalShape.test(cleaned) ? Number(cleaned) : undefined;
};

const numberTolerance = 1e-9;

export const normaliseCheckWords = (text: string): string =>
  text
    .trim()
    .toLowerCase()
    .replaceAll(/[‘’]/g, "'")
    .replaceAll(/[“”]/g, '"')
    .replaceAll(/\s+/g, " ")
    .replace(/[.!]$/, "");

export const isCheckAnswerRight = (
  {
    answerShape,
    acceptedAnswers,
  }: Pick<CheckQuestion, "answerShape" | "acceptedAnswers">,
  givenAnswer: string,
): boolean => {
  if (answerShape === "number") {
    const given = parseCheckNumber(givenAnswer);
    return (
      given !== undefined &&
      acceptedAnswers.some((accepted) => {
        const acceptedValue = parseCheckNumber(accepted);
        return (
          acceptedValue !== undefined &&
          Math.abs(acceptedValue - given) < numberTolerance
        );
      })
    );
  }
  if (answerShape === "choice") {
    return acceptedAnswers.includes(givenAnswer);
  }
  const given = normaliseCheckWords(givenAnswer);
  return acceptedAnswers.some(
    (accepted) => normaliseCheckWords(accepted) === given,
  );
};

export const isOutcomeScored = ({ isRight, isInTime }: CheckOutcome) =>
  isRight && isInTime;

export const countCheckScore = (outcomes: readonly CheckOutcome[]): number =>
  outcomes.filter(isOutcomeScored).length;

export const buildQuestionTypeScores = (
  outcomes: readonly CheckOutcome[],
): QuestionTypeScore[] => {
  const scores = new Map<string, QuestionTypeScore>();
  for (const outcome of outcomes) {
    const score = scores.get(outcome.questionType) ?? {
      questionType: outcome.questionType,
      score: 0,
      questionCount: 0,
    };
    scores.set(outcome.questionType, {
      ...score,
      score: score.score + (isOutcomeScored(outcome) ? 1 : 0),
      questionCount: score.questionCount + 1,
    });
  }
  return [...scores.values()];
};

/**
 * No one reads a question and gives its right answer, or has a Parent mark it right, in less time than this. A
 * question the clock ran out on is wrong and may be counted as taking no time at all.
 */
export const quickestRightCheckAnswerMilliseconds = 200;

/**
 * Whether a finished Check could really have happened: no more outcomes than its paper asks, and no right answer
 * quicker than anyone could give one (#324).
 */
export const isCheckResultPossible = ({
  checkGameType,
  outcomes,
}: Pick<CheckResult, "checkGameType" | "outcomes">): boolean =>
  outcomes.length <= checkFormats[checkGameType].questionCount &&
  outcomes.every(
    ({ isRight, millisecondsTaken }) =>
      !isRight || millisecondsTaken >= quickestRightCheckAnswerMilliseconds,
  );

export interface FinishedCheck {
  result: CheckResult;
  finishedAt: string;
  localDate: string;
}

export const buildCheckHistory = (
  finishedChecks: readonly FinishedCheck[],
): CheckAttempt[] =>
  finishedChecks
    .map(({ result, finishedAt, localDate }): CheckAttempt => ({
      ...result,
      finishedAt,
      localDate,
      score: countCheckScore(result.outcomes),
      questionCount: result.outcomes.length,
    }))
    .toSorted((first, second) =>
      second.finishedAt.localeCompare(first.finishedAt),
    );

export const findLatestCheckAttempt = (
  checkHistory: readonly CheckAttempt[],
): CheckAttempt | undefined => checkHistory.at(0);

export const listFactsToPractise = (
  outcomes: readonly CheckOutcome[],
): string[] =>
  outcomes.filter((outcome) => !isOutcomeScored(outcome)).map(({ key }) => key);
