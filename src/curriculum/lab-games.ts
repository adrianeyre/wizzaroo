import {
  findRepeat,
  InvalidCurriculumFileError,
  isNonEmptyList,
  kebabCaseShape,
  readFields,
} from "./curriculum-file.js";
import scienceYearOneGames from "./science-games.year-1.json" with { type: "json" };
import scienceYearTwoGames from "./science-games.year-2.json" with { type: "json" };
import scienceYearThreeGames from "./science-games.year-3.json" with { type: "json" };
import scienceYearFourGames from "./science-games.year-4.json" with { type: "json" };
import scienceYearFiveGames from "./science-games.year-5.json" with { type: "json" };
import scienceYearSixGames from "./science-games.year-6.json" with { type: "json" };
import { subjectLabGameFiles } from "./lab-game-files.js";
import { isSubject, subjectNames, subjects, type Subject } from "./subjects.js";
import { isYearGroup, type YearGroup } from "./year-groups.js";

export const labStations = [
  "sort",
  "odd-one-out",
  "true-false",
  "fill-gap",
  "sequence",
  "mystery",
  "predict",
  "vocabulary",
  "compare",
  "investigate",
] as const;

export type LabStation = (typeof labStations)[number];

export const generalLabStations: readonly LabStation[] = [
  "sort",
  "odd-one-out",
  "true-false",
  "sequence",
  "mystery",
  "compare",
];

export const labProps = [
  "flower",
  "seedling",
  "tree",
  "leaf",
  "egg",
  "tooth",
  "heart",
  "magnifier",
  "microscope",
  "magnet",
  "bulb",
  "battery",
  "planet",
  "sun",
  "moon",
  "ice-cube",
  "water-drop",
  "rock",
  "prism",
  "tuning-fork",
  "thermometer",
  "beaker",
  "cloud",
  "fossil",
  "dna",
  "snowflake",
] as const;

export type LabProp = (typeof labProps)[number];

export interface LabQuestion {
  ask: string;
  answer: string;
  distractors: string[];
}

export interface LabGame {
  id: string;
  subject: Subject;
  skillId: string;
  isOwnSkill: boolean;
  title: string;
  yearGroup: YearGroup;
  station: LabStation;
  prop: LabProp;
  skillName: string;
  strand: string;
  statutoryRequirement: string;
  instruction: string;
  hint: string;
  questions: LabQuestion[];
}

export interface LabSkillFile {
  id: string;
  name: string;
  subject: Subject;
  yearGroup: YearGroup;
  strand: string;
  prerequisites: string[];
}

const scienceYearFileFields = ["yearGroup", "games"];
const subjectYearFileFields = ["subject", "yearGroup", "games"];
const gameFields = [
  "id",
  "title",
  "station",
  "prop",
  "skillName",
  "strand",
  "statutoryRequirement",
  "instruction",
  "hint",
  "questions",
  "skillId",
];
const questionFields = ["ask", "answer", "distractors"];

export const longestChoiceCharacters = 20;
export const longestAskCharacters = 100;
export const longestTitleCharacters = 22;
export const fewestQuestionsPerGame = 6;
const trueFalseChoices = ["True", "False"];
const distractorsPerQuestion = 3;

const isLabStation = (value: unknown): value is LabStation =>
  labStations.some((station) => station === value);

const isLabProp = (value: unknown): value is LabProp =>
  labProps.some((prop) => prop === value);

const readText = (
  value: unknown,
  describedAs: string,
  longestCharacters = Number.MAX_SAFE_INTEGER,
): string => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new InvalidCurriculumFileError(`${describedAs} can't be empty`);
  }
  if (value.length > longestCharacters) {
    throw new InvalidCurriculumFileError(
      `${describedAs} must be ${String(longestCharacters)} characters or fewer`,
    );
  }
  return value;
};

const readChoice = (value: unknown, describedAs: string): string =>
  readText(value, describedAs, longestChoiceCharacters);

const parseDistractors = (
  distractors: unknown,
  describedAs: string,
): string[] => {
  if (!isNonEmptyList(distractors)) {
    throw new InvalidCurriculumFileError(`${describedAs} needs distractors`);
  }
  return distractors.map((distractor) =>
    readChoice(distractor, `A distractor in ${describedAs}`),
  );
};

const assertTrueFalseQuestion = (
  { answer, distractors }: LabQuestion,
  describedAs: string,
) => {
  const choices = [answer, ...distractors];
  if (
    choices.length !== trueFalseChoices.length ||
    !trueFalseChoices.every((choice) => choices.includes(choice))
  ) {
    throw new InvalidCurriculumFileError(
      `${describedAs} is a true-or-false question, so it needs True and False as its only choices`,
    );
  }
};

const assertChoiceQuestion = (
  { answer, distractors }: LabQuestion,
  describedAs: string,
) => {
  if (distractors.length !== distractorsPerQuestion) {
    throw new InvalidCurriculumFileError(
      `${describedAs} needs exactly ${String(distractorsPerQuestion)} distractors`,
    );
  }
  const repeatedChoice = findRepeat([answer, ...distractors]);
  if (repeatedChoice !== undefined) {
    throw new InvalidCurriculumFileError(
      `${describedAs} offers "${repeatedChoice}" twice`,
    );
  }
};

const parseQuestion = (
  questionFile: unknown,
  station: LabStation,
  describedAs: string,
): LabQuestion => {
  const fields = readFields(questionFile, questionFields, describedAs);
  const question = {
    ask: readText(
      fields.get("ask"),
      `The ask of ${describedAs}`,
      longestAskCharacters,
    ),
    answer: readChoice(fields.get("answer"), `The answer of ${describedAs}`),
    distractors: parseDistractors(fields.get("distractors"), describedAs),
  };
  if (station === "true-false") {
    assertTrueFalseQuestion(question, describedAs);
  } else {
    assertChoiceQuestion(question, describedAs);
  }
  return question;
};

const parseQuestions = (
  questionFiles: unknown,
  station: LabStation,
  gameId: string,
): LabQuestion[] => {
  if (
    !Array.isArray(questionFiles) ||
    questionFiles.length < fewestQuestionsPerGame
  ) {
    throw new InvalidCurriculumFileError(
      `lab game "${gameId}" needs at least ${String(fewestQuestionsPerGame)} questions`,
    );
  }
  const questions = questionFiles.map((questionFile, index) =>
    parseQuestion(
      questionFile,
      station,
      `question ${String(index + 1)} of lab game "${gameId}"`,
    ),
  );
  const repeatedAsk = findRepeat(questions.map(({ ask }) => ask));
  if (repeatedAsk !== undefined) {
    throw new InvalidCurriculumFileError(
      `lab game "${gameId}" asks "${repeatedAsk}" twice`,
    );
  }
  return questions;
};

interface LabYear {
  subject: Subject;
  yearGroup: YearGroup;
}

const findAllowedStations = (subject: Subject): readonly LabStation[] =>
  subject === "science" ? labStations : generalLabStations;

const readGameSkillId = (
  value: unknown,
  { subject, id }: { subject: Subject; id: string },
): { skillId: string; isOwnSkill: boolean } => {
  if (value === undefined) {
    return { skillId: `${subject}.${id}`, isOwnSkill: true };
  }
  if (typeof value !== "string" || !value.startsWith(`${subject}.`)) {
    throw new InvalidCurriculumFileError(
      `Lab game "${id}" can only play a ${subjectNames[subject]} Skill`,
    );
  }
  return { skillId: value, isOwnSkill: false };
};

const parseGame = (
  gameFile: unknown,
  { subject, yearGroup }: LabYear,
): LabGame => {
  const describedAs = `A ${subjectNames[subject]} lab game`;
  const fields = readFields(gameFile, gameFields, describedAs);
  const id = fields.get("id");
  if (typeof id !== "string" || !kebabCaseShape.test(id)) {
    throw new InvalidCurriculumFileError(
      `${describedAs} needs an ID shaped like "first-animal-groups"`,
    );
  }
  const station = fields.get("station");
  const allowedStations = findAllowedStations(subject);
  if (
    !isLabStation(station) ||
    !allowedStations.some((allowed) => allowed === station)
  ) {
    throw new InvalidCurriculumFileError(
      `Lab game "${id}" needs a station, one of ${allowedStations.join(", ")}`,
    );
  }
  const prop = fields.get("prop");
  if (!isLabProp(prop)) {
    throw new InvalidCurriculumFileError(
      `Lab game "${id}" needs a prop, one of ${labProps.join(", ")}`,
    );
  }
  const strand = fields.get("strand");
  if (typeof strand !== "string" || !kebabCaseShape.test(strand)) {
    throw new InvalidCurriculumFileError(
      `Lab game "${id}" needs a strand shaped like "living-things-and-their-habitats"`,
    );
  }
  return {
    id,
    subject,
    ...readGameSkillId(fields.get("skillId"), { subject, id }),
    title: readText(
      fields.get("title"),
      `The title of lab game "${id}"`,
      longestTitleCharacters,
    ),
    yearGroup,
    station,
    prop,
    skillName: readText(
      fields.get("skillName"),
      `The Skill name of lab game "${id}"`,
    ),
    strand,
    statutoryRequirement: readText(
      fields.get("statutoryRequirement"),
      `The statutory requirement of lab game "${id}"`,
    ),
    instruction: readText(
      fields.get("instruction"),
      `The instruction of lab game "${id}"`,
    ),
    hint: readText(fields.get("hint"), `The hint of lab game "${id}"`),
    questions: parseQuestions(fields.get("questions"), station, id),
  };
};

const readGameFiles = (value: unknown, describedAs: string): unknown[] => {
  if (!isNonEmptyList(value)) {
    throw new InvalidCurriculumFileError(`${describedAs} needs games`);
  }
  return value;
};

const readYearGroup = (value: unknown, describedAs: string): YearGroup => {
  if (!isYearGroup(value)) {
    throw new InvalidCurriculumFileError(
      `${describedAs} needs a Year Group from 1 to 6`,
    );
  }
  return value;
};

interface ScienceYear {
  yearGroup: YearGroup;
  games: LabGame[];
}

const parseScienceYearFile = (yearFile: unknown): ScienceYear => {
  const fields = readFields(
    yearFile,
    scienceYearFileFields,
    "A Science games file",
  );
  const yearGroup = readYearGroup(
    fields.get("yearGroup"),
    "A Science games file",
  );
  const labYear = { subject: "science" as const, yearGroup };
  const games = readGameFiles(
    fields.get("games"),
    `The Year ${String(yearGroup)} Science games file`,
  ).map((gameFile) => parseGame(gameFile, labYear));
  const missingStation = labStations.find(
    (station) => games.filter((game) => game.station === station).length !== 1,
  );
  if (missingStation !== undefined) {
    throw new InvalidCurriculumFileError(
      `Year ${String(yearGroup)} needs exactly one Science game at the "${missingStation}" station`,
    );
  }
  return { yearGroup, games };
};

const parseSubjectYearFile = (yearFile: unknown): LabGame[] => {
  const fields = readFields(
    yearFile,
    subjectYearFileFields,
    "A lab games file",
  );
  const subject = fields.get("subject");
  if (!isSubject(subject)) {
    throw new InvalidCurriculumFileError(
      `A lab games file needs a Subject, one of ${subjects.join(", ")}`,
    );
  }
  const yearGroup = readYearGroup(fields.get("yearGroup"), "A lab games file");
  const labYear = { subject, yearGroup };
  return readGameFiles(
    fields.get("games"),
    `The Year ${String(yearGroup)} ${subjectNames[subject]} lab games file`,
  ).map((gameFile) => parseGame(gameFile, labYear));
};

export const parseLabGames = (
  scienceYearFiles: readonly unknown[],
  subjectYearFiles: readonly unknown[] = [],
): LabGame[] => {
  const scienceYears = scienceYearFiles.map(parseScienceYearFile);
  const repeatedYear = findRepeat(
    scienceYears.map(({ yearGroup }) => yearGroup),
  );
  if (repeatedYear !== undefined) {
    throw new InvalidCurriculumFileError(
      `Two Science games files are for Year ${String(repeatedYear)}`,
    );
  }
  const games = [
    ...scienceYears.flatMap((scienceYear) => scienceYear.games),
    ...subjectYearFiles.flatMap(parseSubjectYearFile),
  ];
  const repeatedId = findRepeat(games.map(({ id }) => id));
  if (repeatedId !== undefined) {
    throw new InvalidCurriculumFileError(
      `Two lab games have the ID "${repeatedId}"`,
    );
  }
  const repeatedSkillId = findRepeat(games.map(({ skillId }) => skillId));
  if (repeatedSkillId !== undefined) {
    throw new InvalidCurriculumFileError(
      `Two lab games play the Skill "${repeatedSkillId}"`,
    );
  }
  return games;
};

export const labGames = parseLabGames(
  [
    scienceYearOneGames,
    scienceYearTwoGames,
    scienceYearThreeGames,
    scienceYearFourGames,
    scienceYearFiveGames,
    scienceYearSixGames,
  ],
  subjectLabGameFiles,
);

export const buildLabSkillFiles = (games: readonly LabGame[]): LabSkillFile[] =>
  games
    .filter(({ isOwnSkill }) => isOwnSkill)
    .map(({ skillId, skillName, subject, yearGroup, strand }) => ({
      id: skillId,
      name: skillName,
      subject,
      yearGroup,
      strand,
      prerequisites: [],
    }));

export const findLabGame = (
  gameId: string,
  games: readonly LabGame[] = labGames,
): LabGame | undefined => games.find(({ id }) => id === gameId);
