import {
  buildAuthoredCheckQuestion,
  parseAuthoredCheckQuestions,
  pickMixedItems,
  readCheckText,
  type AuthoredCheckQuestion,
} from "./check-questions.js";
import { checkFormats, type CheckPaper } from "./checks.js";
import {
  findRepeat,
  InvalidCurriculumFileError,
  isNonEmptyList,
  kebabCaseShape,
  readFields,
} from "./curriculum-file.js";
import { pickOne } from "./music-game.js";
import readingCheckPassageFile from "./reading-check.passages.json" with { type: "json" };

export const readingQuestionTypes = [
  "retrieval",
  "inference",
  "vocabulary",
  "sequencing",
  "summarising",
] as const;

export type ReadingQuestionType = (typeof readingQuestionTypes)[number];

export const readingQuestionTypeNames: Record<ReadingQuestionType, string> = {
  retrieval: "Finding information",
  inference: "Inference",
  vocabulary: "Word meanings",
  sequencing: "Order of events",
  summarising: "Summarising",
};

export const readingPassageForms = [
  "fiction",
  "non-fiction",
  "poetry",
] as const;

export type ReadingPassageForm = (typeof readingPassageForms)[number];

export interface ReadingPassage {
  id: string;
  title: string;
  form: ReadingPassageForm;
  text: string;
  questions: AuthoredCheckQuestion[];
}

export const fewestPassageWords = 250;
export const mostPassageWords = 450;
export const fewestPassageQuestions = 10;

const readingPassageFields = ["id", "title", "form", "text", "questions"];

const isReadingPassageForm = (value: unknown): value is ReadingPassageForm =>
  readingPassageForms.some((form) => form === value);

export const countPassageWords = (text: string): number =>
  text.split(/\s+/).filter((word) => /[a-z0-9]/i.test(word)).length;

const parseReadingPassage = (entry: unknown): ReadingPassage => {
  const fields = readFields(entry, readingPassageFields, "A Reading passage");
  const id = fields.get("id");
  if (typeof id !== "string" || !kebabCaseShape.test(id)) {
    throw new InvalidCurriculumFileError(
      'A Reading passage needs an ID shaped like "the-storm-bell"',
    );
  }
  const form = fields.get("form");
  if (!isReadingPassageForm(form)) {
    throw new InvalidCurriculumFileError(
      `Reading passage "${id}" needs a form, one of ${readingPassageForms.join(", ")}`,
    );
  }
  const text = readCheckText(fields.get("text"), `The text of "${id}"`);
  const wordCount = countPassageWords(text);
  if (wordCount < fewestPassageWords || wordCount > mostPassageWords) {
    throw new InvalidCurriculumFileError(
      `Reading passage "${id}" has ${String(wordCount)} words; it needs ${String(fewestPassageWords)} to ${String(mostPassageWords)}`,
    );
  }
  const questions = parseAuthoredCheckQuestions(
    fields.get("questions"),
    `Reading passage "${id}"`,
    readingQuestionTypes,
  );
  if (questions.length < fewestPassageQuestions) {
    throw new InvalidCurriculumFileError(
      `Reading passage "${id}" needs at least ${String(fewestPassageQuestions)} questions`,
    );
  }
  return {
    id,
    title: readCheckText(fields.get("title"), `The title of "${id}"`),
    form,
    text,
    questions,
  };
};

export const parseReadingPassages = (entries: unknown): ReadingPassage[] => {
  if (!isNonEmptyList(entries)) {
    throw new InvalidCurriculumFileError("The Reading paper needs passages");
  }
  const passages = entries.map(parseReadingPassage);
  const repeatedId = findRepeat(passages.map(({ id }) => id));
  if (repeatedId !== undefined) {
    throw new InvalidCurriculumFileError(
      `Two Reading passages have the ID "${repeatedId}"`,
    );
  }
  return passages;
};

export const readingPassages = parseReadingPassages(readingCheckPassageFile);

export const buildReadingPassagePaper = (
  passage: ReadingPassage,
  random: () => number,
): CheckPaper => {
  const picked = new Set(
    pickMixedItems(
      passage.questions,
      ({ questionType }) => questionType,
      checkFormats["reading-check"].questionCount,
      random,
    ),
  );
  return {
    passageTitle: passage.title,
    passage: passage.text,
    questions: passage.questions
      .filter((question) => picked.has(question))
      .map((question) => ({
        ...buildAuthoredCheckQuestion(question),
        key: `${passage.id}:${question.id}`,
      })),
  };
};

export const buildReadingCheckPaper = (random: () => number): CheckPaper =>
  buildReadingPassagePaper(pickOne(readingPassages, random), random);
