import {
  arithmeticQuestionTypeNames,
  arithmeticSkillIds,
  buildArithmeticCheckPaper,
} from "./arithmetic-check.js";
import type {
  CheckGameType,
  CheckPaper,
  CheckQuestion,
  CheckWay,
} from "./checks.js";
import type { PhonicsProgramme } from "./phonics-programmes.js";
import {
  buildGrammarCheckPaper,
  grammarCheckQuestions,
  grammarQuestionTypeNames,
  reusedGrammarQuestions,
} from "./grammar-check.js";
import {
  buildPhonicsCheckPracticePaper,
  buildPhonicsScreeningCheckPaper,
  phonicsCheckQuestionTypeNames,
  phonicsCheckSkillId,
} from "./phonics-screening-check.js";
import {
  buildReadingCheckPaper,
  readingPassages,
  readingQuestionTypeNames,
} from "./reading-check.js";
import {
  buildReasoningCheckPaper,
  reasoningCheckQuestions,
  reasoningQuestionTypeNames,
} from "./reasoning-check.js";
import {
  buildSpellingCheckPaper,
  spellingCheckWords,
  spellingQuestionTypeNames,
} from "./spelling-check.js";
import {
  buildTimesTablesCheckPaper,
  buildTimesTablesWarmUp,
  heavierTables,
  largestCheckedTable,
  smallestCheckedTable,
  timesTablesCheckSkillId,
} from "./times-tables-check.js";

export type CheckPaperBuilder = (
  random: () => number,
  phonicsProgramme?: PhonicsProgramme,
) => CheckPaper;

export const checkPaperBuilders: Record<CheckGameType, CheckPaperBuilder> = {
  "phonics-screening-check": buildPhonicsScreeningCheckPaper,
  "times-tables-check": buildTimesTablesCheckPaper,
  "arithmetic-check": buildArithmeticCheckPaper,
  "reasoning-check": buildReasoningCheckPaper,
  "grammar-check": buildGrammarCheckPaper,
  "spelling-check": buildSpellingCheckPaper,
  "reading-check": buildReadingCheckPaper,
};

export const checkPracticePaperBuilders: Partial<
  Record<CheckGameType, CheckPaperBuilder>
> = {
  "phonics-screening-check": buildPhonicsCheckPracticePaper,
};

export const buildCheckPaper = (
  gameType: CheckGameType,
  way: CheckWay,
  random: () => number,
  phonicsProgramme?: PhonicsProgramme,
): CheckPaper => {
  const practicePaperBuilder =
    way === "practice" ? checkPracticePaperBuilders[gameType] : undefined;
  return (practicePaperBuilder ?? checkPaperBuilders[gameType])(
    random,
    phonicsProgramme,
  );
};

export const buildCheckWarmUp = (
  gameType: CheckGameType,
  random: () => number,
): CheckQuestion[] =>
  gameType === "times-tables-check" ? buildTimesTablesWarmUp(random) : [];

const timesTablesQuestionTypeNames = Object.fromEntries<string>([
  ["warm-up", "Warm-up"],
  ...Array.from(
    { length: largestCheckedTable - smallestCheckedTable + 1 },
    (_, index): [string, string] => {
      const table = smallestCheckedTable + index;
      return [
        `${String(table)}-times-table`,
        `${String(table)} times table${heavierTables.includes(table) ? " (asked more)" : ""}`,
      ];
    },
  ),
]);

export const checkQuestionTypeNames: Record<
  CheckGameType,
  Record<string, string>
> = {
  "phonics-screening-check": phonicsCheckQuestionTypeNames,
  "times-tables-check": timesTablesQuestionTypeNames,
  "arithmetic-check": arithmeticQuestionTypeNames,
  "reasoning-check": reasoningQuestionTypeNames,
  "grammar-check": grammarQuestionTypeNames,
  "spelling-check": spellingQuestionTypeNames,
  "reading-check": readingQuestionTypeNames,
};

export const findCheckQuestionTypeName = (
  checkGameType: CheckGameType,
  questionType: string,
): string =>
  checkQuestionTypeNames[checkGameType][questionType] ?? questionType;

const listDistinctSkillIds = (
  sources: readonly { skillId: string }[],
): string[] => [...new Set(sources.map(({ skillId }) => skillId))];

export const checkSkillIds: Record<CheckGameType, readonly string[]> = {
  "phonics-screening-check": [phonicsCheckSkillId],
  "times-tables-check": [timesTablesCheckSkillId],
  "arithmetic-check": [...new Set(Object.values(arithmeticSkillIds))],
  "reasoning-check": listDistinctSkillIds(reasoningCheckQuestions),
  "grammar-check": listDistinctSkillIds([
    ...grammarCheckQuestions,
    ...reusedGrammarQuestions,
  ]),
  "spelling-check": listDistinctSkillIds(spellingCheckWords),
  "reading-check": listDistinctSkillIds(
    readingPassages.flatMap(({ questions }) => questions),
  ),
};
