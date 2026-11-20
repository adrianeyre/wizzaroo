import {
  findRepeat,
  InvalidCurriculumFileError,
  isNonEmptyList,
  kebabCaseShape,
  readFields,
} from "./curriculum-file.js";
import {
  historyQuestFiles,
  skills,
  type Skill,
  type YearGroup,
} from "./skills.js";

export const historyPlayStyles = ["quiz", "sort", "timeline"] as const;
export type HistoryPlayStyle = (typeof historyPlayStyles)[number];

export const historyScenes = [
  "attic-toybox",
  "old-kitchen",
  "victorian-classroom",
  "seaside-pier",
  "country-road",
  "night-street",
  "stormy-lighthouse",
  "hospital-ward",
  "castle-courtyard",
  "museum-hall",
  "burning-london",
  "moon-surface",
  "kitty-hawk-dunes",
  "parliament-cellar",
  "stone-age-cave",
  "skara-brae",
  "stonehenge-plain",
  "iron-age-hillfort",
  "egypt-desert",
  "egypt-tomb",
  "roman-fort",
  "hadrians-wall",
  "roman-town",
  "greek-temple",
  "olympia-stadium",
  "sutton-hoo",
  "saxon-village",
  "viking-fjord",
  "maya-jungle",
  "victorian-street",
  "baghdad-city",
  "benin-court",
  "sumer-ziggurat",
  "indus-city",
  "shang-palace",
  "ww2-airfield",
  "blitz-london",
] as const;
export type HistoryScene = (typeof historyScenes)[number];

export const historyChoiceProps = [
  "basket",
  "wooden-crate",
  "book",
  "treasure-chest",
  "stone-tablet",
  "lantern",
  "scroll",
  "shield",
  "gold-coin",
  "clay-pot",
  "torch",
  "dig-mound",
] as const;
export type HistoryChoiceProp = (typeof historyChoiceProps)[number];

export interface HistoryQuizQuestion {
  ask: string;
  answer: string;
  wrong: string[];
  fact: string;
}

export interface HistorySortQuestion {
  ask: string;
  answer: string;
  fact: string;
}

export interface HistoryEvent {
  label: string;
  date: string;
  order: number;
  fact: string;
}

interface HistoryQuestBasics {
  id: string;
  title: string;
  skillId: string;
  yearGroup: YearGroup;
  story: string;
  instruction: string;
  hint: string;
  scene: HistoryScene;
  choiceProp: HistoryChoiceProp;
}

export interface HistoryQuizQuest extends HistoryQuestBasics {
  play: "quiz";
  questions: HistoryQuizQuestion[];
}

export interface HistorySortQuest extends HistoryQuestBasics {
  play: "sort";
  bins: string[];
  questions: HistorySortQuestion[];
}

export interface HistoryTimelineQuest extends HistoryQuestBasics {
  play: "timeline";
  events: HistoryEvent[];
}

export type HistoryQuest =
  HistoryQuizQuest | HistorySortQuest | HistoryTimelineQuest;

export const fewestHistoryQuestions = 10;
export const fewestTimelineEvents = 8;
export const longestChoiceLength = 24;
export const wrongAnswersPerQuestion = 3;
const fewestBins = 2;
const mostBins = 4;

const questFields = [
  "id",
  "title",
  "skill",
  "story",
  "instruction",
  "hint",
  "scene",
  "play",
  "choiceProp",
  "bins",
  "questions",
  "events",
];
const quizQuestionFields = ["ask", "answer", "wrong", "fact"];
const sortQuestionFields = ["ask", "answer", "fact"];
const eventFields = ["label", "date", "order", "fact"];

const isOneOf = <Value extends string>(
  values: readonly Value[],
  value: unknown,
): value is Value => values.some((candidate) => candidate === value);

const readText = (value: unknown, describedAs: string): string => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new InvalidCurriculumFileError(`${describedAs} can't be empty`);
  }
  return value;
};

const readChoiceText = (value: unknown, describedAs: string): string => {
  const text = readText(value, describedAs);
  if (text.length > longestChoiceLength) {
    throw new InvalidCurriculumFileError(
      `${describedAs} "${text}" is longer than ${String(longestChoiceLength)} characters, too long for a button`,
    );
  }
  return text;
};

const readList = (value: unknown, describedAs: string): unknown[] => {
  if (!isNonEmptyList(value)) {
    throw new InvalidCurriculumFileError(`${describedAs} needs a list`);
  }
  return value;
};

const refuseRepeats = (values: readonly string[], describedAs: string) => {
  const repeat = findRepeat(values);
  if (repeat !== undefined) {
    throw new InvalidCurriculumFileError(
      `${describedAs} has "${repeat}" twice`,
    );
  }
};

const refuseTooFew = (count: number, fewest: number, describedAs: string) => {
  if (count < fewest) {
    throw new InvalidCurriculumFileError(
      `${describedAs} needs at least ${String(fewest)}, so a Mission never repeats one`,
    );
  }
};

const parseQuizQuestion = (
  questionFile: unknown,
  questId: string,
): HistoryQuizQuestion => {
  const describedAs = `A question in History quest "${questId}"`;
  const fields = readFields(questionFile, quizQuestionFields, describedAs);
  const answer = readChoiceText(
    fields.get("answer"),
    `${describedAs}'s answer`,
  );
  const wrong = readList(
    fields.get("wrong"),
    `${describedAs}'s wrong answers`,
  ).map((wrongAnswer) =>
    readChoiceText(wrongAnswer, `${describedAs}'s wrong answer`),
  );
  if (wrong.length !== wrongAnswersPerQuestion) {
    throw new InvalidCurriculumFileError(
      `${describedAs} needs exactly ${String(wrongAnswersPerQuestion)} wrong answers`,
    );
  }
  refuseRepeats([answer, ...wrong], describedAs);
  return {
    ask: readText(fields.get("ask"), `${describedAs}'s ask`),
    answer,
    wrong,
    fact: readText(fields.get("fact"), `${describedAs}'s fact`),
  };
};

const parseSortQuestion = (
  questionFile: unknown,
  questId: string,
  bins: readonly string[],
): HistorySortQuestion => {
  const describedAs = `A question in History quest "${questId}"`;
  const fields = readFields(questionFile, sortQuestionFields, describedAs);
  const answer = fields.get("answer");
  if (!isOneOf(bins, answer)) {
    throw new InvalidCurriculumFileError(
      `${describedAs} needs its answer to be one of ${bins.join(", ")}`,
    );
  }
  return {
    ask: readText(fields.get("ask"), `${describedAs}'s ask`),
    answer,
    fact: readText(fields.get("fact"), `${describedAs}'s fact`),
  };
};

const parseEvent = (eventFile: unknown, questId: string): HistoryEvent => {
  const describedAs = `An event in History quest "${questId}"`;
  const fields = readFields(eventFile, eventFields, describedAs);
  const order = fields.get("order");
  if (typeof order !== "number" || !Number.isFinite(order)) {
    throw new InvalidCurriculumFileError(
      `${describedAs} needs an order to sort it by, as a number`,
    );
  }
  return {
    label: readChoiceText(fields.get("label"), `${describedAs}'s label`),
    date: readText(fields.get("date"), `${describedAs}'s date`),
    order,
    fact: readText(fields.get("fact"), `${describedAs}'s fact`),
  };
};

const parseBins = (binsFile: unknown, questId: string): string[] => {
  const describedAs = `History quest "${questId}"`;
  const bins = readList(binsFile, `${describedAs}'s bins`).map((bin) =>
    readChoiceText(bin, `${describedAs}'s bin`),
  );
  if (bins.length < fewestBins || bins.length > mostBins) {
    throw new InvalidCurriculumFileError(
      `${describedAs} needs from ${String(fewestBins)} to ${String(mostBins)} bins`,
    );
  }
  refuseRepeats(bins, `${describedAs}'s bins`);
  return bins;
};

const findSkillId = (skillFile: unknown, questId: string): string => {
  const fields = readFields(
    skillFile,
    ["id", "name", "subject", "yearGroup", "strand", "prerequisites"],
    `The Skill of History quest "${questId}"`,
  );
  return readText(fields.get("id"), `The Skill of History quest "${questId}"`);
};

const findQuestSkill = (
  skillId: string,
  questId: string,
  knownSkills: readonly Skill[],
): Skill => {
  const skill = knownSkills.find(({ id }) => id === skillId);
  if (skill?.subject !== "history") {
    throw new InvalidCurriculumFileError(
      `History quest "${questId}" needs a History Skill, and "${skillId}" isn't one`,
    );
  }
  return skill;
};

const parsePlay = (
  fields: Map<string, unknown>,
  questId: string,
):
  | Pick<HistoryQuizQuest, "play" | "questions">
  | Pick<HistorySortQuest, "play" | "bins" | "questions">
  | Pick<HistoryTimelineQuest, "play" | "events"> => {
  const play = fields.get("play");
  const describedAs = `History quest "${questId}"`;
  const playFields = {
    quiz: ["questions"],
    sort: ["bins", "questions"],
    timeline: ["events"],
  };
  if (!isOneOf(historyPlayStyles, play)) {
    throw new InvalidCurriculumFileError(
      `${describedAs} needs a play style, one of ${historyPlayStyles.join(", ")}`,
    );
  }
  const strayField = ["bins", "questions", "events"].find(
    (field) => fields.has(field) && !playFields[play].includes(field),
  );
  if (strayField !== undefined) {
    throw new InvalidCurriculumFileError(
      `${describedAs} is a ${play} quest, which has no ${strayField}`,
    );
  }
  if (play === "timeline") {
    const events = readList(
      fields.get("events"),
      `${describedAs}'s events`,
    ).map((eventFile) => parseEvent(eventFile, questId));
    refuseTooFew(
      events.length,
      fewestTimelineEvents,
      `${describedAs}'s timeline`,
    );
    refuseRepeats(
      events.map(({ label }) => label),
      `${describedAs}'s timeline`,
    );
    refuseRepeats(
      events.map(({ order }) => String(order)),
      `${describedAs}'s timeline order`,
    );
    return { play, events };
  }
  const questionFiles = readList(
    fields.get("questions"),
    `${describedAs}'s questions`,
  );
  refuseTooFew(
    questionFiles.length,
    fewestHistoryQuestions,
    `${describedAs}'s questions`,
  );
  if (play === "quiz") {
    const questions = questionFiles.map((questionFile) =>
      parseQuizQuestion(questionFile, questId),
    );
    refuseRepeats(
      questions.map(({ ask }) => ask),
      `${describedAs}'s questions`,
    );
    return { play, questions };
  }
  const bins = parseBins(fields.get("bins"), questId);
  const questions = questionFiles.map((questionFile) =>
    parseSortQuestion(questionFile, questId, bins),
  );
  refuseRepeats(
    questions.map(({ ask }) => ask),
    `${describedAs}'s questions`,
  );
  const emptyBin = bins.find(
    (bin) => !questions.some(({ answer }) => answer === bin),
  );
  if (emptyBin !== undefined) {
    throw new InvalidCurriculumFileError(
      `${describedAs} has nothing to sort into "${emptyBin}"`,
    );
  }
  return { play, bins, questions };
};

const parseHistoryQuest = (
  questFile: unknown,
  knownSkills: readonly Skill[],
): HistoryQuest => {
  const fields = readFields(questFile, questFields, "A History quest");
  const id = fields.get("id");
  if (typeof id !== "string" || !kebabCaseShape.test(id)) {
    throw new InvalidCurriculumFileError(
      'A History quest needs an ID shaped like "pudding-lane-blaze"',
    );
  }
  const describedAs = `History quest "${id}"`;
  const scene = fields.get("scene");
  const choiceProp = fields.get("choiceProp");
  if (!isOneOf(historyScenes, scene)) {
    throw new InvalidCurriculumFileError(
      `${describedAs} needs a scene, one of ${historyScenes.join(", ")}`,
    );
  }
  if (!isOneOf(historyChoiceProps, choiceProp)) {
    throw new InvalidCurriculumFileError(
      `${describedAs} needs a choice prop, one of ${historyChoiceProps.join(", ")}`,
    );
  }
  const skill = findQuestSkill(
    findSkillId(fields.get("skill"), id),
    id,
    knownSkills,
  );
  return {
    id,
    title: readText(fields.get("title"), `The title of ${describedAs}`),
    skillId: skill.id,
    yearGroup: skill.yearGroup,
    story: readText(fields.get("story"), `The story of ${describedAs}`),
    instruction: readText(
      fields.get("instruction"),
      `The instruction of ${describedAs}`,
    ),
    hint: readText(fields.get("hint"), `The hint of ${describedAs}`),
    scene,
    choiceProp,
    ...parsePlay(fields, id),
  };
};

export const parseHistoryQuests = (
  questListFiles: readonly unknown[],
  knownSkills: readonly Skill[],
): HistoryQuest[] => {
  const quests = questListFiles.flatMap((questListFile) => {
    const fields = readFields(
      questListFile,
      ["quests"],
      "A History quest file",
    );
    return readList(fields.get("quests"), "A History quest file").map(
      (questFile) => parseHistoryQuest(questFile, knownSkills),
    );
  });
  refuseRepeats(
    quests.map(({ id }) => id),
    "The History quests",
  );
  return quests;
};

export const historyQuests = parseHistoryQuests(historyQuestFiles, skills);
