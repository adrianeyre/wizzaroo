import { buildCheckQuestion, readCheckText } from "./check-questions.js";
import { checkFormats, type CheckPaper, type CheckQuestion } from "./checks.js";
import {
  findRepeat,
  InvalidCurriculumFileError,
  isNonEmptyList,
  readFields,
} from "./curriculum-file.js";
import { gapMark } from "./english-questions.js";
import { shuffleValues } from "./music-game.js";
import spellingCheckWordFile from "./spelling-check.words.json" with { type: "json" };

export const spellingQuestionTypes = [
  "word-list",
  "suffixes",
  "homophones",
] as const;

export type SpellingQuestionType = (typeof spellingQuestionTypes)[number];

export const spellingQuestionTypeNames: Record<SpellingQuestionType, string> = {
  "word-list": "Years 5 and 6 word list",
  suffixes: "Suffixes and endings",
  homophones: "Homophones",
};

const spellingQuestionTypeBySkillId: Record<string, SpellingQuestionType> = {
  "english.word-list-upper-key-stage-2": "word-list",
  "english.suffixes-able-ible-cious-cial": "suffixes",
  "english.suffixes-fer-ant-ance-ent-ence": "suffixes",
  "english.homophones-advice-to-guessed": "homophones",
  "english.homophones-heard-to-wary": "homophones",
};

export interface SpellingCheckWord {
  word: string;
  sentence: string;
  skillId: string;
  questionType: SpellingQuestionType;
}

const spellingCheckWordFields = ["word", "sentence", "skillId"];
const spellingWordShape = /^[a-z]+$/;

const findSpellingQuestionType = (
  skillId: string,
): SpellingQuestionType | undefined =>
  Object.hasOwn(spellingQuestionTypeBySkillId, skillId)
    ? spellingQuestionTypeBySkillId[skillId]
    : undefined;

const countWholeWord = (sentence: string, word: string): number =>
  sentence.match(new RegExp(String.raw`\b${word}\b`, "g"))?.length ?? 0;

const parseSpellingCheckWord = (entry: unknown): SpellingCheckWord => {
  const fields = readFields(
    entry,
    spellingCheckWordFields,
    "A Spelling paper word",
  );
  const word = fields.get("word");
  if (typeof word !== "string" || !spellingWordShape.test(word)) {
    throw new InvalidCurriculumFileError(
      "A Spelling paper word needs to be written in small letters only",
    );
  }
  const sentence = readCheckText(
    fields.get("sentence"),
    `The sentence for "${word}"`,
  );
  const skillId = readCheckText(
    fields.get("skillId"),
    `The Skill ID for "${word}"`,
  );
  const questionType = findSpellingQuestionType(skillId);
  if (questionType === undefined) {
    throw new InvalidCurriculumFileError(
      `"${word}" plays "${skillId}", which isn't a Spelling paper Skill`,
    );
  }
  if (countWholeWord(sentence, word) !== 1) {
    throw new InvalidCurriculumFileError(
      `The sentence for "${word}" needs the word in it exactly once`,
    );
  }
  if (!/[.?!]$/.test(sentence)) {
    throw new InvalidCurriculumFileError(
      `The sentence for "${word}" needs to end with . ? or !`,
    );
  }
  return { word, sentence, skillId, questionType };
};

export const parseSpellingCheckWords = (
  entries: unknown,
): SpellingCheckWord[] => {
  if (!isNonEmptyList(entries)) {
    throw new InvalidCurriculumFileError("The Spelling paper needs words");
  }
  const words = entries.map(parseSpellingCheckWord);
  const repeatedWord = findRepeat(words.map(({ word }) => word));
  if (repeatedWord !== undefined) {
    throw new InvalidCurriculumFileError(
      `The Spelling paper has "${repeatedWord}" twice`,
    );
  }
  return words;
};

export const spellingCheckWords: readonly SpellingCheckWord[] =
  parseSpellingCheckWords(spellingCheckWordFile);

export const buildSpellingCheckSpokenWord = (word: string): string =>
  `spelling-check.${word}`;

export const buildSpellingCheckLine = (word: string): string => {
  const spellingWord = spellingCheckWords.find(
    (candidate) => candidate.word === word,
  );
  if (spellingWord === undefined) {
    throw new RangeError(`"${word}" isn't on the Spelling paper`);
  }
  return `The word is ${word}. ${spellingWord.sentence} The word is ${word}.`;
};

export const buildSpellingCheckQuestion = ({
  word,
  sentence,
  skillId,
  questionType,
}: SpellingCheckWord): CheckQuestion =>
  buildCheckQuestion({
    key: word,
    skillId,
    questionType,
    prompt: sentence.replace(new RegExp(String.raw`\b${word}\b`), gapMark),
    spokenWord: buildSpellingCheckSpokenWord(word),
    answerShape: "words",
    acceptedAnswers: [word],
  });

export const buildSpellingCheckPaper = (random: () => number): CheckPaper => ({
  passageTitle: undefined,
  passage: undefined,
  questions: shuffleValues(spellingCheckWords, random)
    .slice(0, checkFormats["spelling-check"].questionCount)
    .map(buildSpellingCheckQuestion),
});
