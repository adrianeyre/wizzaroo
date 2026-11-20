import {
  checkAnswerShapes,
  parseCheckNumber,
  type CheckAnswerShape,
  type CheckQuestion,
} from "./checks.js";
import {
  findRepeat,
  InvalidCurriculumFileError,
  isNonEmptyList,
  kebabCaseShape,
  readFields,
} from "./curriculum-file.js";
import { shuffleValues } from "./music-game.js";
import { skills } from "./skills.js";

export interface CheckQuestionDraft {
  key: string;
  skillId: string;
  questionType: string;
  prompt: string;
  answerShape: CheckAnswerShape;
  acceptedAnswers: string[];
  choices?: string[];
  passage?: string;
  spokenWord?: string;
}

export const buildCheckQuestion = ({
  choices = [],
  passage,
  spokenWord,
  ...draft
}: CheckQuestionDraft): CheckQuestion => ({
  ...draft,
  passage,
  spokenWord,
  choices,
});

export const pickMixedItems = <Item>(
  items: readonly Item[],
  findItemType: (item: Item) => string,
  count: number,
  random: () => number,
): Item[] => {
  const itemsByType = new Map<string, Item[]>();
  for (const item of shuffleValues(items, random)) {
    const itemType = findItemType(item);
    itemsByType.set(itemType, [...(itemsByType.get(itemType) ?? []), item]);
  }
  const queues = [...itemsByType.values()];
  const picked: Item[] = [];
  for (let round = 0; picked.length < count; round++) {
    const roundItems = queues.flatMap((queue) =>
      round < queue.length ? [queue[round]] : [],
    );
    if (roundItems.length === 0) {
      break;
    }
    picked.push(...roundItems.slice(0, count - picked.length));
  }
  return picked;
};

export const isSkillId = (skillId: string): boolean =>
  skills.some(({ id }) => id === skillId);

export interface AuthoredCheckQuestion {
  id: string;
  questionType: string;
  skillId: string;
  prompt: string;
  answerShape: CheckAnswerShape;
  choices: string[];
  answers: string[];
}

const authoredQuestionFields = [
  "id",
  "questionType",
  "skillId",
  "prompt",
  "answerShape",
  "choices",
  "answers",
];

const fewestChoices = 2;

const isCheckAnswerShape = (value: unknown): value is CheckAnswerShape =>
  checkAnswerShapes.some((answerShape) => answerShape === value);

const isTextList = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.every((text) => typeof text === "string" && text.trim() !== "");

export const readCheckText = (value: unknown, describedAs: string): string => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new InvalidCurriculumFileError(`${describedAs} can't be empty`);
  }
  return value;
};

const findAnswerProblem = (
  answerShape: CheckAnswerShape,
  choices: readonly string[],
  answers: readonly string[],
): string | undefined => {
  if (answers.length === 0) {
    return "needs at least one answer";
  }
  if (answerShape === "choice") {
    if (choices.length < fewestChoices) {
      return `needs at least ${String(fewestChoices)} choices`;
    }
    if (findRepeat(choices) !== undefined) {
      return "offers the same choice twice";
    }
    return answers.every((answer) => choices.includes(answer))
      ? undefined
      : "has an answer that isn't one of its choices";
  }
  if (choices.length > 0) {
    return "has choices but isn't a choice question";
  }
  if (answerShape === "number") {
    return answers.every((answer) => parseCheckNumber(answer) !== undefined)
      ? undefined
      : "has an answer that isn't a number";
  }
  return answerShape === "words" ? undefined : `can't be ${answerShape}`;
};

const parseAuthoredCheckQuestion = (
  entry: unknown,
  describedAs: string,
  questionTypes: readonly string[],
): AuthoredCheckQuestion => {
  const fields = readFields(entry, authoredQuestionFields, describedAs);
  const id = fields.get("id");
  if (typeof id !== "string" || !kebabCaseShape.test(id)) {
    throw new InvalidCurriculumFileError(
      `${describedAs} needs an ID shaped like "share-the-sweets"`,
    );
  }
  const describe = (field: string) => `The ${field} of "${id}"`;
  const questionType = fields.get("questionType");
  if (
    typeof questionType !== "string" ||
    !questionTypes.includes(questionType)
  ) {
    throw new InvalidCurriculumFileError(
      `"${id}" needs a question type, one of ${questionTypes.join(", ")}`,
    );
  }
  const skillId = readCheckText(fields.get("skillId"), describe("Skill ID"));
  if (!isSkillId(skillId)) {
    throw new InvalidCurriculumFileError(
      `"${id}" plays "${skillId}", which isn't a Skill`,
    );
  }
  const answerShape = fields.get("answerShape");
  if (!isCheckAnswerShape(answerShape)) {
    throw new InvalidCurriculumFileError(
      `"${id}" needs an answer shape, one of ${checkAnswerShapes.join(", ")}`,
    );
  }
  const choices = fields.get("choices") ?? [];
  const answers = fields.get("answers");
  if (!isTextList(choices) || !isTextList(answers)) {
    throw new InvalidCurriculumFileError(
      `"${id}" needs its choices and answers as lists of words`,
    );
  }
  const answerProblem = findAnswerProblem(answerShape, choices, answers);
  if (answerProblem !== undefined) {
    throw new InvalidCurriculumFileError(`"${id}" ${answerProblem}`);
  }
  return {
    id,
    questionType,
    skillId,
    prompt: readCheckText(fields.get("prompt"), describe("prompt")),
    answerShape,
    choices,
    answers,
  };
};

export const parseAuthoredCheckQuestions = (
  entries: unknown,
  describedAs: string,
  questionTypes: readonly string[],
): AuthoredCheckQuestion[] => {
  if (!isNonEmptyList(entries)) {
    throw new InvalidCurriculumFileError(`${describedAs} needs questions`);
  }
  const questions = entries.map((entry) =>
    parseAuthoredCheckQuestion(
      entry,
      `A question in ${describedAs}`,
      questionTypes,
    ),
  );
  const repeatedId = findRepeat(questions.map(({ id }) => id));
  if (repeatedId !== undefined) {
    throw new InvalidCurriculumFileError(
      `${describedAs} has two questions with the ID "${repeatedId}"`,
    );
  }
  return questions;
};

export const buildAuthoredCheckQuestion = ({
  id,
  questionType,
  skillId,
  prompt,
  answerShape,
  choices,
  answers,
}: AuthoredCheckQuestion): CheckQuestion =>
  buildCheckQuestion({
    key: id,
    skillId,
    questionType,
    prompt,
    answerShape,
    choices,
    acceptedAnswers: answers,
  });
