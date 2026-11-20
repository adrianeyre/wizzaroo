import {
  findRepeat,
  InvalidCurriculumFileError,
  isNonEmptyList,
  kebabCaseShape,
  readFields,
} from "./curriculum-file.js";
import { isYearGroup, phonicsGameFiles, type YearGroup } from "./skills.js";

export const phonicsGameScenes = [
  "crystal-tiles",
  "stone-tablet",
  "lantern",
  "geode",
  "minecart",
  "crystal-orb",
  "rune-ring",
  "gem-chest",
  "open-book",
  "obelisk",
] as const;

export type PhonicsGameScene = (typeof phonicsGameScenes)[number];

export const phonicsChoiceProps = [
  "gem",
  "shard",
  "runestone",
  "orb",
  "cluster",
  "diamond",
] as const;

export type PhonicsChoiceProp = (typeof phonicsChoiceProps)[number];

export interface PhonicsGameQuestion {
  prompt: string;
  answer: string;
  distractors: string[];
}

export interface PhonicsGame {
  id: string;
  title: string;
  yearGroup: YearGroup;
  skillId: string;
  skillName: string;
  strand: string;
  curriculumObjective: string;
  scene: PhonicsGameScene;
  choiceProp: PhonicsChoiceProp;
  ask: string;
  instruction: string;
  hint: string;
  questions: PhonicsGameQuestion[];
}

export const tileSeparator = "|";
export const largestChoiceLength = 14;
export const fewestQuestionsPerGame = 12;
const fewestTiles = 2;
const mostTiles = 5;
const longestTile = 5;
const longestWidePrompt = 44;
const longestCompactPrompt = 18;
const mostDistractors = 3;

const wideScenes: readonly PhonicsGameScene[] = [
  "stone-tablet",
  "open-book",
  "gem-chest",
  "minecart",
];

const phonicsGameFileFields = ["yearGroup", "games"];
const phonicsGameFields = [
  "id",
  "title",
  "skillId",
  "skillName",
  "strand",
  "curriculumObjective",
  "scene",
  "choiceProp",
  "ask",
  "instruction",
  "hint",
  "questions",
];
const questionFields = ["prompt", "answer", "distractors"];

const isPhonicsGameScene = (value: unknown): value is PhonicsGameScene =>
  phonicsGameScenes.some((scene) => scene === value);

const isPhonicsChoiceProp = (value: unknown): value is PhonicsChoiceProp =>
  phonicsChoiceProps.some((choiceProp) => choiceProp === value);

const readText = (value: unknown, describedAs: string): string => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new InvalidCurriculumFileError(`${describedAs} can't be empty`);
  }
  return value;
};

export const isWideScene = (scene: PhonicsGameScene): boolean =>
  wideScenes.includes(scene);

export const splitTiles = (prompt: string): string[] =>
  prompt.split(tileSeparator);

const findPromptProblem = (
  prompt: string,
  scene: PhonicsGameScene,
): string | undefined => {
  if (scene === "crystal-tiles") {
    const tiles = splitTiles(prompt);
    return tiles.length < fewestTiles ||
      tiles.length > mostTiles ||
      tiles.some((tile) => tile === "" || tile.length > longestTile)
      ? `needs ${String(fewestTiles)} to ${String(mostTiles)} tiles split by "${tileSeparator}", each up to ${String(longestTile)} letters`
      : undefined;
  }
  const longest = isWideScene(scene) ? longestWidePrompt : longestCompactPrompt;
  return prompt.length > longest
    ? `is longer than the ${String(longest)} characters a ${scene} can show`
    : undefined;
};

const parseQuestion = (
  questionEntry: unknown,
  gameId: string,
  scene: PhonicsGameScene,
): PhonicsGameQuestion => {
  const describedAs = `A question in Phonics game "${gameId}"`;
  const fields = readFields(questionEntry, questionFields, describedAs);
  const prompt = readText(fields.get("prompt"), describedAs);
  const answer = readText(fields.get("answer"), `${describedAs}'s answer`);
  const distractors = fields.get("distractors");
  const promptProblem = findPromptProblem(prompt, scene);
  if (promptProblem !== undefined) {
    throw new InvalidCurriculumFileError(
      `The prompt "${prompt}" in Phonics game "${gameId}" ${promptProblem}`,
    );
  }
  if (
    !isNonEmptyList(distractors) ||
    distractors.length > mostDistractors ||
    !distractors.every((distractor) => typeof distractor === "string")
  ) {
    throw new InvalidCurriculumFileError(
      `The prompt "${prompt}" in Phonics game "${gameId}" needs 1 to ${String(mostDistractors)} distractors`,
    );
  }
  const choices = [answer, ...distractors];
  if (findRepeat(choices) !== undefined) {
    throw new InvalidCurriculumFileError(
      `The prompt "${prompt}" in Phonics game "${gameId}" offers the same choice twice`,
    );
  }
  if (choices.some((choice) => choice.length > largestChoiceLength)) {
    throw new InvalidCurriculumFileError(
      `The prompt "${prompt}" in Phonics game "${gameId}" has a choice longer than ${String(largestChoiceLength)} characters`,
    );
  }
  return { prompt, answer, distractors };
};

const parsePhonicsGame = (
  phonicsGameEntry: unknown,
  yearGroup: YearGroup,
): PhonicsGame => {
  const fields = readFields(
    phonicsGameEntry,
    phonicsGameFields,
    `A Year ${String(yearGroup)} Phonics game`,
  );
  const id = fields.get("id");
  if (typeof id !== "string" || !kebabCaseShape.test(id)) {
    throw new InvalidCurriculumFileError(
      'A Phonics game needs an ID shaped like "crystal-blend"',
    );
  }
  const scene = fields.get("scene");
  const choiceProp = fields.get("choiceProp");
  const questionEntries = fields.get("questions");
  if (!isPhonicsGameScene(scene)) {
    throw new InvalidCurriculumFileError(
      `Phonics game "${id}" needs a scene, one of ${phonicsGameScenes.join(", ")}`,
    );
  }
  if (!isPhonicsChoiceProp(choiceProp)) {
    throw new InvalidCurriculumFileError(
      `Phonics game "${id}" needs a choice prop, one of ${phonicsChoiceProps.join(", ")}`,
    );
  }
  if (
    !Array.isArray(questionEntries) ||
    questionEntries.length < fewestQuestionsPerGame
  ) {
    throw new InvalidCurriculumFileError(
      `Phonics game "${id}" needs at least ${String(fewestQuestionsPerGame)} questions`,
    );
  }
  const questions = questionEntries.map((questionEntry) =>
    parseQuestion(questionEntry, id, scene),
  );
  const repeatedPrompt = findRepeat(questions.map(({ prompt }) => prompt));
  if (repeatedPrompt !== undefined) {
    throw new InvalidCurriculumFileError(
      `Phonics game "${id}" asks "${repeatedPrompt}" twice`,
    );
  }
  const describe = (field: string) => `The ${field} of Phonics game "${id}"`;
  return {
    id,
    title: readText(fields.get("title"), describe("title")),
    yearGroup,
    skillId: readText(fields.get("skillId"), describe("Skill ID")),
    skillName: readText(fields.get("skillName"), describe("Skill name")),
    strand: readText(fields.get("strand"), describe("strand")),
    curriculumObjective: readText(
      fields.get("curriculumObjective"),
      describe("curriculum objective"),
    ),
    scene,
    choiceProp,
    ask: readText(fields.get("ask"), describe("question")),
    instruction: readText(fields.get("instruction"), describe("instruction")),
    hint: readText(fields.get("hint"), describe("hint")),
    questions,
  };
};

const parsePhonicsGameFile = (phonicsGameFile: unknown): PhonicsGame[] => {
  const fields = readFields(
    phonicsGameFile,
    phonicsGameFileFields,
    "A Phonics games file",
  );
  const yearGroup = fields.get("yearGroup");
  const gameEntries = fields.get("games");
  if (!isYearGroup(yearGroup)) {
    throw new InvalidCurriculumFileError(
      "A Phonics games file needs a Year Group from 1 to 6",
    );
  }
  if (!isNonEmptyList(gameEntries)) {
    throw new InvalidCurriculumFileError(
      `The Year ${String(yearGroup)} Phonics games file needs games`,
    );
  }
  const games = gameEntries.map((gameEntry) =>
    parsePhonicsGame(gameEntry, yearGroup),
  );
  const repeatedScene = findRepeat(games.map(({ scene }) => scene));
  if (repeatedScene !== undefined) {
    throw new InvalidCurriculumFileError(
      `Two Year ${String(yearGroup)} Phonics games are set in the ${repeatedScene}; each needs its own scene`,
    );
  }
  return games;
};

export const parsePhonicsGames = (
  phonicsGameFileContents: readonly unknown[],
): PhonicsGame[] => {
  const games = phonicsGameFileContents.flatMap(parsePhonicsGameFile);
  for (const field of ["id", "title", "skillId"] as const) {
    const repeated = findRepeat(games.map((game) => game[field]));
    if (repeated !== undefined) {
      throw new InvalidCurriculumFileError(
        `Two Phonics games share the ${field} "${repeated}"`,
      );
    }
  }
  return games;
};

export const phonicsGames = parsePhonicsGames(phonicsGameFiles);
