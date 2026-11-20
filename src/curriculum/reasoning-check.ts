import {
  buildAuthoredCheckQuestion,
  parseAuthoredCheckQuestions,
  pickMixedItems,
  type AuthoredCheckQuestion,
} from "./check-questions.js";
import { checkFormats, type CheckPaper } from "./checks.js";
import reasoningCheckQuestionFile from "./reasoning-check.questions.json" with { type: "json" };

export const reasoningQuestionTypes = [
  "number",
  "measures",
  "geometry",
  "statistics",
  "ratio",
  "algebra",
] as const;

export type ReasoningQuestionType = (typeof reasoningQuestionTypes)[number];

export const reasoningQuestionTypeNames: Record<ReasoningQuestionType, string> =
  {
    number: "Number and calculation",
    measures: "Measures",
    geometry: "Geometry",
    statistics: "Statistics",
    ratio: "Ratio and percentages",
    algebra: "Algebra",
  };

export const parseReasoningCheckQuestions = (
  entries: unknown,
): AuthoredCheckQuestion[] =>
  parseAuthoredCheckQuestions(
    entries,
    "the reasoning paper",
    reasoningQuestionTypes,
  );

export const reasoningCheckQuestions = parseReasoningCheckQuestions(
  reasoningCheckQuestionFile,
);

export const buildReasoningCheckPaper = (random: () => number): CheckPaper => ({
  passageTitle: undefined,
  passage: undefined,
  questions: pickMixedItems(
    reasoningCheckQuestions,
    ({ questionType }) => questionType,
    checkFormats["reasoning-check"].questionCount,
    random,
  ).map(buildAuthoredCheckQuestion),
});
