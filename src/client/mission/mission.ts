import {
  buildCapitalLetterQuestions,
  listCapitalLetters,
  type CapitalLetterDifficulty,
} from "../../curriculum/capital-letters.js";
import type { AdditionQuestion } from "../../curriculum/adding-to-20.js";
import type { BlockMeasureQuestion } from "../../curriculum/block-measures.js";
import type { HeightExtreme } from "../../curriculum/comparing-heights.js";
import type { CountingInStepsQuestion } from "../../curriculum/counting-in-steps.js";
import type { ChartPicture } from "../../curriculum/chart-tower.js";
import type { SharePicture } from "../../curriculum/fair-shares.js";
import type { FractionQuestion } from "../../curriculum/fractions.js";
import type {
  HistoryEvent,
  HistoryPlayStyle,
  HistoryQuest,
  HistoryQuizQuest,
  HistorySortQuest,
} from "../../curriculum/history-quests.js";
import {
  findComputingGame,
  isComputingGameType,
  type ComputingGameType,
} from "../../curriculum/computing-games.js";
import type {
  ComputingDifficulty,
  ComputingQuestion,
  ComputingScene,
} from "../../curriculum/computing-scenes.js";
import {
  getEnglishGameYear,
  type EnglishGameType,
} from "../../curriculum/english-games.js";
import type { EnglishPrompt } from "../../curriculum/english-questions.js";
import {
  buildMastery,
  type MasteryState,
  type PracticeDay,
} from "../../curriculum/mastery.js";
import type { MeasuringHeightQuestion } from "../../curriculum/measuring-height.js";
import type {
  MoreAndLessQuestion,
  TemperatureQuestion,
} from "../../curriculum/more-and-less.js";
import type { NumberBondQuestion } from "../../curriculum/number-bonds.js";
import type { OneMoreOneLessQuestion } from "../../curriculum/one-more-one-less.js";
import {
  orderPhonicsSkills,
  type PhonicsGrapheme,
  type PhonicsProgramme,
} from "../../curriculum/phonics-programmes.js";
import {
  splitTiles,
  type PhonicsGame,
} from "../../curriculum/phonics-games.js";
import type { PhonicsSound } from "../../curriculum/phonics-sounds.js";
import type { PlaceValueColumn } from "../../curriculum/place-value.js";
import type { ShapeProperty } from "../../curriculum/shape-properties.js";
import type { Shape3d } from "../../curriculum/shapes-3d.js";
import type { TakingAwayQuestion } from "../../curriculum/taking-away-within-20.js";
import type { MapPicture } from "../../curriculum/treasure-map.js";
import type { ClockQuestion } from "../../curriculum/telling-the-time.js";
import { formatNumber } from "../../curriculum/number-format.js";
import type {
  LabGame,
  LabModel,
  LabQuestion,
  LabStation,
} from "../../curriculum/lab-games.js";
import type {
  GeographyGame,
  GeographyShow,
} from "../../curriculum/geography.js";
import type {
  PhonicsSkill,
  Skill,
  YearGroup,
} from "../../curriculum/skills.js";
import type { MusicPrompt } from "../../curriculum/music-prompts.js";
import {
  findMusicGame,
  type MusicGameType,
} from "../../curriculum/music-games.js";
import type {
  MusicDifficulty,
  MusicGame,
} from "../../curriculum/music-game.js";
import type { QuestionGameType } from "../../curriculum/world-map.js";

export type QuestionPrompt =
  | { kind: "number-bond"; numberBond: NumberBondQuestion }
  | { kind: "sound"; sound: PhonicsSound }
  | { kind: "count"; count: number }
  | { kind: "one-more-one-less"; oneMoreOneLess: OneMoreOneLessQuestion }
  | { kind: "shape"; shape: Shape3d }
  | { kind: "shape-property"; property: ShapeProperty; count: number }
  | { kind: "capital-letter"; smallLetter: string }
  | { kind: "computing"; ask: string; scene: ComputingScene; hint?: string }
  | { kind: "addition"; addition: AdditionQuestion }
  | { kind: "taking-away"; takingAway: TakingAwayQuestion }
  | { kind: "sequence"; sequence: CountingInStepsQuestion }
  | { kind: "height-extreme"; extreme: HeightExtreme }
  | { kind: "height-measure"; measure: MeasuringHeightQuestion }
  | { kind: "fraction"; fraction: FractionQuestion }
  | { kind: "clock"; clock: ClockQuestion }
  | { kind: "missing-number"; sentence: string }
  | { kind: "place-value"; columns: PlaceValueColumn[] }
  | { kind: "more-or-less"; moreOrLess: MoreAndLessQuestion }
  | { kind: "temperature"; temperature: TemperatureQuestion }
  | { kind: "polygon-clue"; clue: string }
  | { kind: "net"; shape: Shape3d }
  | { kind: "block-measure"; block: BlockMeasureQuestion }
  | { kind: "fair-share"; ask: string; picture: SharePicture }
  | { kind: "treasure-map"; ask: string; picture: MapPicture }
  | { kind: "chart"; ask: string; picture: ChartPicture }
  | { kind: "english"; english: EnglishPrompt }
  | { kind: "phonics-word"; ask: string; text: string }
  | {
      kind: "lab";
      station: LabStation;
      /** The question's own model, or the Game's prop when it names none. */
      prop: LabModel;
      ask: string;
    }
  | { kind: "music"; music: MusicPrompt }
  | { kind: "geography"; ask: string; show: GeographyShow }
  | {
      kind: "history";
      play: HistoryPlayStyle;
      ask: string;
      fact: string;
      hint: string;
      placedEvents: PlacedHistoryEvent[];
    };

export interface PlacedHistoryEvent {
  label: string;
  date: string;
}

export const letterMatchSkillId = "english.capital-letters";

export interface MissionQuestion {
  prompt: QuestionPrompt;
  choices: string[];
  answer: string;
}

export interface MissionActivity {
  id: string;
  skillId: string;
  gameType: QuestionGameType;
  questions: MissionQuestion[];
}

export interface Mission {
  gameType: QuestionGameType;
  phonicsGame: PhonicsGame | undefined;
  geographyGame: GeographyGame | undefined;
  englishYear: YearGroup | undefined;
  labGame: LabGame | undefined;
  historyQuest: HistoryQuest | undefined;
  activities: MissionActivity[];
}

export interface MissionProgress {
  activityIndex: number;
  questionIndex: number;
  wrongChoices: string[];
  activityStartedAt: number;
  isFinished: boolean;
}

export interface AnsweredQuestion {
  activityId: string;
  skillId: string;
  isRightFirstTime: boolean;
  wrongAnswerCount: number;
}

export interface FinishedActivity {
  activityId: string;
  skillId: string;
  secondsSpent: number;
}

export type AnswerOutcome =
  | { kind: "wrong"; progress: MissionProgress }
  | {
      kind: "right";
      progress: MissionProgress;
      answeredQuestion: AnsweredQuestion;
      finishedActivity: FinishedActivity | undefined;
    };

export interface MissionParts {
  random: () => number;
  buildId: () => string;
}

export interface ListenAndPickMissionParts extends MissionParts {
  phonicsProgramme: PhonicsProgramme;
  skills: readonly Skill[];
  practiceDays: readonly PracticeDay[];
  recordedSounds: ReadonlySet<PhonicsSound>;
  today: string;
}

export const choicesPerQuestion = 4;
export const questionsPerActivity = 5;
export const listenAndPickActivityCount = 3;
export const englishActivityCount = 3;
export const labActivityCount = 3;
export const capitalLetterActivityDifficulties: readonly CapitalLetterDifficulty[] =
  [1, 2, 2];
export const computingActivityDifficulties: readonly ComputingDifficulty[] = [
  1, 2, 3,
];

const millisecondsPerSecond = 1000;

export const shuffle = <Value>(
  values: readonly Value[],
  random: () => number,
): Value[] => {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
};

export const buildChoices = (
  answer: string,
  distractorPool: readonly string[],
  random: () => number,
): string[] => {
  const distractors = shuffle(
    [...new Set(distractorPool)].filter((candidate) => candidate !== answer),
    random,
  ).slice(0, choicesPerQuestion - 1);
  return shuffle([answer, ...distractors], random);
};

export const buildLetterMatchMission = ({
  random,
  buildId,
}: MissionParts): Mission => ({
  gameType: "letter-match",
  phonicsGame: undefined,
  geographyGame: undefined,
  englishYear: undefined,
  labGame: undefined,
  historyQuest: undefined,
  activities: capitalLetterActivityDifficulties.map((difficulty) => ({
    id: buildId(),
    skillId: letterMatchSkillId,
    gameType: "letter-match",
    questions: shuffle(buildCapitalLetterQuestions(difficulty), random)
      .slice(0, questionsPerActivity)
      .map(({ smallLetter, capitalLetter }) => ({
        prompt: { kind: "capital-letter", smallLetter },
        choices: buildChoices(capitalLetter, listCapitalLetters(), random),
        answer: capitalLetter,
      })),
  })),
});

const repeatedQuestionAttempts = 6;

const isSameQuestion = (
  first: MissionQuestion | undefined,
  second: MissionQuestion,
) =>
  first?.answer === second.answer &&
  JSON.stringify(first.prompt) === JSON.stringify(second.prompt);

const buildMusicQuestion = (
  game: MusicGame,
  difficulty: MusicDifficulty,
  random: () => number,
): MissionQuestion => {
  const { prompt, choices, answer } = game.buildQuestion(difficulty, random);
  return {
    prompt: { kind: "music", music: prompt },
    choices: game.hasFixedChoiceOrder ? choices : shuffle(choices, random),
    answer,
  };
};

const buildFreshMusicQuestion = (
  game: MusicGame,
  difficulty: MusicDifficulty,
  random: () => number,
  previous: MissionQuestion | undefined,
): MissionQuestion => {
  let question = buildMusicQuestion(game, difficulty, random);
  for (
    let attempt = 1;
    attempt < repeatedQuestionAttempts && isSameQuestion(previous, question);
    attempt++
  ) {
    question = buildMusicQuestion(game, difficulty, random);
  }
  return question;
};

export const buildMusicMission = (
  gameType: MusicGameType,
  { random, buildId }: MissionParts,
): Mission => {
  const game = findMusicGame(gameType);
  return {
    gameType,
    phonicsGame: undefined,
    englishYear: undefined,
    labGame: undefined,
    geographyGame: undefined,
    historyQuest: undefined,
    activities: game.activityDifficulties.map((difficulty) => {
      const questions: MissionQuestion[] = [];
      for (let index = 0; index < questionsPerActivity; index++) {
        questions.push(
          buildFreshMusicQuestion(game, difficulty, random, questions.at(-1)),
        );
      }
      return { id: buildId(), skillId: game.skillId, gameType, questions };
    }),
  };
};

const buildComputingMissionQuestion = (
  { ask, scene, hint, answer, distractors }: ComputingQuestion,
  random: () => number,
): MissionQuestion => ({
  prompt: { kind: "computing", ask, scene, hint },
  choices: buildChoices(answer, distractors, random),
  answer,
});

const listComputingQuestionsPerActivity = (
  gameType: ComputingGameType,
  random: () => number,
): ComputingQuestion[][] => {
  const { questions } = findComputingGame(gameType);
  if (questions.kind === "generated") {
    return computingActivityDifficulties.map((difficulty) =>
      shuffle(questions.generate(difficulty, random), random).slice(
        0,
        questionsPerActivity,
      ),
    );
  }
  const dealt = shuffle(questions.questions, random);
  return computingActivityDifficulties.map((_, activityIndex) =>
    Array.from(
      { length: questionsPerActivity },
      (_unused, questionIndex) =>
        dealt[
          (activityIndex * questionsPerActivity + questionIndex) % dealt.length
        ],
    ),
  );
};

export const buildComputingMission = (
  gameType: ComputingGameType,
  { random, buildId }: MissionParts,
): Mission => {
  const { skillId } = findComputingGame(gameType);
  return {
    gameType,
    phonicsGame: undefined,
    englishYear: undefined,
    labGame: undefined,
    geographyGame: undefined,
    historyQuest: undefined,
    activities: listComputingQuestionsPerActivity(gameType, random).map(
      (questions) => ({
        id: buildId(),
        skillId,
        gameType,
        questions: questions.map((question) =>
          buildComputingMissionQuestion(question, random),
        ),
      }),
    ),
  };
};

export const buildEnglishMission = (
  gameType: EnglishGameType,
  yearGroup: YearGroup,
  { random, buildId }: MissionParts,
): Mission => {
  const { skillId, questions } = getEnglishGameYear(gameType, yearGroup);
  return {
    gameType,
    phonicsGame: undefined,
    englishYear: yearGroup,
    labGame: undefined,
    geographyGame: undefined,
    historyQuest: undefined,
    activities: Array.from({ length: englishActivityCount }, () => ({
      id: buildId(),
      skillId,
      gameType,
      questions: shuffle(questions, random)
        .slice(0, questionsPerActivity)
        .map(({ prompt, answer, slips }) => ({
          prompt: { kind: "english", english: prompt },
          choices: buildChoices(answer, slips, random),
          answer,
        })),
    })),
  };
};
const buildLabChoices = (
  {
    station,
    answer,
    distractors,
  }: LabQuestion & {
    station: LabStation;
  },
  random: () => number,
): string[] =>
  station === "true-false"
    ? ["True", "False"]
    : shuffle([answer, ...distractors], random);

const buildLabActivity = (
  game: LabGame,
  { random, buildId }: MissionParts,
): MissionActivity => ({
  id: buildId(),
  skillId: game.skillId,
  gameType: "science-lab",
  questions: shuffle(game.questions, random)
    .slice(0, questionsPerActivity)
    .map((question) => ({
      prompt: {
        kind: "lab",
        station: game.station,
        prop: question.model ?? game.prop,
        ask: question.ask,
      },
      choices: buildLabChoices({ ...question, station: game.station }, random),
      answer: question.answer,
    })),
});

export const buildLabMission = (
  labGame: LabGame,
  missionParts: MissionParts,
): Mission => ({
  gameType: "science-lab",
  phonicsGame: undefined,
  englishYear: undefined,
  labGame,
  geographyGame: undefined,
  historyQuest: undefined,
  activities: Array.from({ length: labActivityCount }, () =>
    buildLabActivity(labGame, missionParts),
  ),
});

const listSingleSoundGraphemes = ({
  soundOrder,
}: PhonicsProgramme): PhonicsGrapheme[] =>
  soundOrder
    .flatMap(({ graphemes }) => graphemes)
    .filter(({ sounds }) => sounds.length === 1);

const findGraphemeFor = (
  sound: PhonicsSound,
  graphemesInOrder: readonly PhonicsGrapheme[],
): string | undefined =>
  graphemesInOrder.find(({ sounds }) => sounds[0] === sound)?.grapheme;

export const listListenAndPickSkills = ({
  phonicsProgramme,
  skills,
  recordedSounds,
}: Pick<
  ListenAndPickMissionParts,
  "phonicsProgramme" | "skills" | "recordedSounds"
>): PhonicsSkill[] => {
  const graphemesInOrder = listSingleSoundGraphemes(phonicsProgramme);
  return orderPhonicsSkills(phonicsProgramme, skills).filter(
    ({ sounds }) =>
      sounds.length === 1 &&
      recordedSounds.has(sounds[0]) &&
      findGraphemeFor(sounds[0], graphemesInOrder) !== undefined,
  );
};

const listenAndPickPriority: Record<MasteryState, number> = {
  "due-for-review": 0,
  learning: 1,
  "not-started": 1,
  mastered: 2,
};

const chooseListenAndPickSkills = (
  missionParts: ListenAndPickMissionParts,
): PhonicsSkill[] => {
  const playableSkills = listListenAndPickSkills(missionParts);
  const stateBySkillId = new Map(
    buildMastery(
      playableSkills,
      missionParts.practiceDays,
      missionParts.today,
    ).map(({ skillId, state }) => [skillId, state]),
  );
  const findPriority = ({ id }: PhonicsSkill) =>
    listenAndPickPriority[stateBySkillId.get(id) ?? "not-started"];
  return playableSkills
    .toSorted((first, second) => findPriority(first) - findPriority(second))
    .slice(0, listenAndPickActivityCount);
};

// Every spelling the programme teaches for a sound, under any entry: a wrong letter tile must be none of them, or the
// Child would have two right answers.
const listSpellingsOf = (
  sound: PhonicsSound,
  { soundOrder }: PhonicsProgramme,
): Set<string> =>
  new Set(
    soundOrder
      .flatMap(({ graphemes }) => graphemes)
      .filter(({ sounds }) => sounds.includes(sound))
      .map(({ grapheme }) => grapheme),
  );

const buildListenAndPickActivity = (
  skill: PhonicsSkill,
  phonicsProgramme: PhonicsProgramme,
  graphemesInOrder: readonly PhonicsGrapheme[],
  { random, buildId }: MissionParts,
): MissionActivity => {
  const [sound] = skill.sounds;
  const answer = findGraphemeFor(sound, graphemesInOrder) ?? "";
  const answerPosition = graphemesInOrder.findIndex(
    ({ grapheme }) => grapheme === answer,
  );
  const spellings = listSpellingsOf(sound, phonicsProgramme);
  const otherGraphemes = graphemesInOrder
    .map(({ grapheme }) => grapheme)
    .filter((grapheme) => !spellings.has(grapheme));
  const taughtSoFar = graphemesInOrder
    .slice(0, answerPosition + choicesPerQuestion)
    .map(({ grapheme }) => grapheme)
    .filter((grapheme) => !spellings.has(grapheme));
  const distractorPool =
    taughtSoFar.length >= choicesPerQuestion - 1 ? taughtSoFar : otherGraphemes;

  return {
    id: buildId(),
    skillId: skill.id,
    gameType: "listen-and-pick",
    questions: Array.from({ length: questionsPerActivity }, () => ({
      prompt: { kind: "sound", sound },
      choices: buildChoices(answer, distractorPool, random),
      answer,
    })),
  };
};

export const buildListenAndPickMission = (
  missionParts: ListenAndPickMissionParts,
): Mission | undefined => {
  const chosenSkills = chooseListenAndPickSkills(missionParts);
  if (chosenSkills.length === 0) {
    return undefined;
  }
  const graphemesInOrder = listSingleSoundGraphemes(
    missionParts.phonicsProgramme,
  );
  return {
    gameType: "listen-and-pick",
    phonicsGame: undefined,
    geographyGame: undefined,
    englishYear: undefined,
    labGame: undefined,
    historyQuest: undefined,
    activities: chosenSkills.map((skill) =>
      buildListenAndPickActivity(
        skill,
        missionParts.phonicsProgramme,
        graphemesInOrder,
        missionParts,
      ),
    ),
  };
};

export const phonicsGameActivityCount = 3;

const buildPhonicsGameActivity = (
  phonicsGame: PhonicsGame,
  { random, buildId }: MissionParts,
): MissionActivity => ({
  id: buildId(),
  skillId: phonicsGame.skillId,
  gameType: "phonics-games",
  questions: shuffle(phonicsGame.questions, random)
    .slice(0, questionsPerActivity)
    .map(({ prompt, answer, distractors }) => ({
      prompt: { kind: "phonics-word", ask: phonicsGame.ask, text: prompt },
      choices: shuffle([answer, ...distractors], random),
      answer,
    })),
});

export const buildPhonicsGameMission = (
  phonicsGame: PhonicsGame,
  missionParts: MissionParts,
): Mission => ({
  gameType: "phonics-games",
  phonicsGame,
  geographyGame: undefined,
  englishYear: undefined,
  labGame: undefined,
  historyQuest: undefined,
  activities: Array.from({ length: phonicsGameActivityCount }, () =>
    buildPhonicsGameActivity(phonicsGame, missionParts),
  ),
});

export const geographyGameActivityCount = 2;

const buildGeographyGameActivity = (
  geographyGame: GeographyGame,
  questions: GeographyGame["questions"],
  { random, buildId }: MissionParts,
): MissionActivity => ({
  id: buildId(),
  skillId: geographyGame.skillId,
  gameType: "geography-games",
  questions: questions.map(({ ask, show, answer, wrongAnswers }) => ({
    prompt: { kind: "geography", ask, show },
    choices: shuffle(
      [
        answer,
        ...shuffle(wrongAnswers, random).slice(0, choicesPerQuestion - 1),
      ],
      random,
    ),
    answer,
  })),
});

export const buildGeographyGameMission = (
  geographyGame: GeographyGame,
  missionParts: MissionParts,
): Mission => {
  const shuffledQuestions = shuffle(
    geographyGame.questions,
    missionParts.random,
  );
  return {
    gameType: "geography-games",
    phonicsGame: undefined,
    englishYear: undefined,
    labGame: undefined,
    geographyGame,
    historyQuest: undefined,
    activities: Array.from(
      { length: geographyGameActivityCount },
      (_, activityIndex) =>
        buildGeographyGameActivity(
          geographyGame,
          shuffledQuestions.slice(
            activityIndex * questionsPerActivity,
            (activityIndex + 1) * questionsPerActivity,
          ),
          missionParts,
        ),
    ),
  };
};

export const historyQuestActivityCount = 2;
export const timelineEventsPerActivity = questionsPerActivity + 1;
export const firstTimelineAsk = "Which came first?";
export const nextTimelineAsk = "Which came next?";

const buildHistoryPrompt = (
  { play, hint }: HistoryQuest,
  ask: string,
  fact: string,
  placedEvents: PlacedHistoryEvent[] = [],
): QuestionPrompt => ({ kind: "history", play, ask, fact, hint, placedEvents });

const buildTimelineQuestions = (
  quest: HistoryQuest,
  events: readonly HistoryEvent[],
  random: () => number,
): MissionQuestion[] => {
  const chosenEvents = shuffle(events, random)
    .slice(0, timelineEventsPerActivity)
    .toSorted((first, second) => first.order - second.order);
  return chosenEvents.slice(0, questionsPerActivity).map((event, position) => {
    const laterEvents = chosenEvents.slice(position + 1);
    const choices = shuffle(
      [event, ...shuffle(laterEvents, random).slice(0, choicesPerQuestion - 1)],
      random,
    ).map(({ label }) => label);
    return {
      prompt: buildHistoryPrompt(
        quest,
        position === 0 ? firstTimelineAsk : nextTimelineAsk,
        event.fact,
        chosenEvents
          .slice(0, position)
          .map(({ label, date }) => ({ label, date })),
      ),
      choices,
      answer: event.label,
    };
  });
};

const buildAskedQuestions = (
  quest: HistoryQuizQuest | HistorySortQuest,
  random: () => number,
): MissionQuestion[] => {
  switch (quest.play) {
    case "quiz":
      return quest.questions.map(({ ask, answer, wrong, fact }) => ({
        prompt: buildHistoryPrompt(quest, ask, fact),
        choices: shuffle([answer, ...wrong], random),
        answer,
      }));
    case "sort":
      return quest.questions.map(({ ask, answer, fact }) => ({
        prompt: buildHistoryPrompt(quest, ask, fact),
        choices: [...quest.bins],
        answer,
      }));
  }
};

const buildHistoryActivityQuestions = (
  quest: HistoryQuest,
  random: () => number,
): MissionQuestion[][] => {
  if (quest.play === "timeline") {
    return Array.from({ length: historyQuestActivityCount }, () =>
      buildTimelineQuestions(quest, quest.events, random),
    );
  }
  const asked = shuffle(buildAskedQuestions(quest, random), random);
  return Array.from({ length: historyQuestActivityCount }, (_, index) =>
    asked.slice(
      index * questionsPerActivity,
      (index + 1) * questionsPerActivity,
    ),
  );
};

export const buildHistoryQuestMission = (
  historyQuest: HistoryQuest,
  { random, buildId }: MissionParts,
): Mission => ({
  gameType: "history-quest",
  phonicsGame: undefined,
  englishYear: undefined,
  labGame: undefined,
  historyQuest,
  geographyGame: undefined,
  activities: buildHistoryActivityQuestions(historyQuest, random).map(
    (questions) => ({
      id: buildId(),
      skillId: historyQuest.skillId,
      gameType: "history-quest",
      questions,
    }),
  ),
});

export const startMission = (now: number): MissionProgress => ({
  activityIndex: 0,
  questionIndex: 0,
  wrongChoices: [],
  activityStartedAt: now,
  isFinished: false,
});

export interface CurrentQuestion {
  activity: MissionActivity;
  question: MissionQuestion;
  remainingChoices: string[];
}

export const getCurrentQuestion = (
  mission: Mission,
  { activityIndex, questionIndex, wrongChoices }: MissionProgress,
): CurrentQuestion => {
  const activity = mission.activities[activityIndex];
  const question = activity.questions[questionIndex];
  return {
    activity,
    question,
    remainingChoices: question.choices.filter(
      (choice) => !wrongChoices.includes(choice),
    ),
  };
};

const moveOnFrom = (
  mission: Mission,
  progress: MissionProgress,
  now: number,
): { progress: MissionProgress; isActivityFinished: boolean } => {
  const activity = mission.activities[progress.activityIndex];
  if (progress.questionIndex + 1 < activity.questions.length) {
    return {
      progress: {
        ...progress,
        questionIndex: progress.questionIndex + 1,
        wrongChoices: [],
      },
      isActivityFinished: false,
    };
  }
  const isFinished = progress.activityIndex + 1 >= mission.activities.length;
  return {
    progress: {
      activityIndex: isFinished
        ? progress.activityIndex
        : progress.activityIndex + 1,
      questionIndex: isFinished ? progress.questionIndex : 0,
      wrongChoices: [],
      activityStartedAt: now,
      isFinished,
    },
    isActivityFinished: true,
  };
};

export const answerQuestion = (
  mission: Mission,
  progress: MissionProgress,
  choice: string,
  now: number,
): AnswerOutcome => {
  const { activity, question, remainingChoices } = getCurrentQuestion(
    mission,
    progress,
  );
  if (choice !== question.answer) {
    return {
      kind: "wrong",
      progress: remainingChoices.includes(choice)
        ? { ...progress, wrongChoices: [...progress.wrongChoices, choice] }
        : progress,
    };
  }

  const wrongAnswerCount = progress.wrongChoices.length;
  const next = moveOnFrom(mission, progress, now);
  return {
    kind: "right",
    progress: next.progress,
    answeredQuestion: {
      activityId: activity.id,
      skillId: activity.skillId,
      isRightFirstTime: wrongAnswerCount === 0,
      wrongAnswerCount,
    },
    finishedActivity: next.isActivityFinished
      ? {
          activityId: activity.id,
          skillId: activity.skillId,
          secondsSpent: Math.max(
            0,
            Math.round(
              (now - progress.activityStartedAt) / millisecondsPerSecond,
            ),
          ),
        }
      : undefined,
  };
};

const stepWords: Record<OneMoreOneLessQuestion["step"], string> = {
  "one-more": "One more",
  "one-less": "One less",
  "ten-more": "Ten more",
  "ten-less": "Ten less",
};

export const describeAddition = ({
  addition: { first, second },
}: {
  addition: AdditionQuestion;
}): string => `${formatNumber(first)} + ${formatNumber(second)} = ?`;

export const describeTakingAway = ({
  takingAway: { start, takenAway },
}: {
  takingAway: TakingAwayQuestion;
}): string => `${formatNumber(start)} − ${formatNumber(takenAway)} = ?`;

export const describeSequence = ({
  sequence: { shown },
}: {
  sequence: CountingInStepsQuestion;
}): string => `${shown.map(formatNumber).join(", ")}, ?`;

export const describeMoreOrLess = ({
  moreOrLess: { start, change },
}: {
  moreOrLess: MoreAndLessQuestion;
}): string =>
  `${formatNumber(Math.abs(change))} ${change > 0 ? "more" : "less"} than ${formatNumber(start)} is ?`;

export const describeOneMoreOneLess = ({
  oneMoreOneLess: { start, step },
}: {
  oneMoreOneLess: OneMoreOneLessQuestion;
}): string => `${stepWords[step]} than ${String(start)} is ?`;

export const describePhonicsWord = ({ text }: { text: string }): string =>
  splitTiles(text).join(" ").replaceAll(/_+/g, "blank");

export const describeNumberBond = ({
  numberBond: { sentence, blank },
}: {
  numberBond: NumberBondQuestion;
}): string => {
  const show = (part: keyof Omit<typeof sentence, "operator">) =>
    part === blank ? "?" : String(sentence[part]);
  return `${show("left")} ${sentence.operator} ${show("right")} = ${show("result")}`;
};

export const findShownPart = ({
  sentence,
  blank,
}: NumberBondQuestion): number =>
  blank === "left" ? sentence.right : sentence.left;

const smallestChoicePixels = 64;
const largestChoicePixels = 150;
const choiceShareOfHeight = 0.22;

export const getChoiceSizePixels = (viewportHeight: number): number =>
  Math.round(
    Math.min(
      largestChoicePixels,
      Math.max(smallestChoicePixels, viewportHeight * choiceShareOfHeight),
    ),
  );

const choiceRowSpread = 0.62;
const middleChoiceRowHeight = -0.18;
const lowChoiceRowHeight = -0.56;
const lowestChoiceRowHeight = -0.74;

const computingChoiceRowHeight = -0.66;
const computingChoiceRowSpread = 0.66;

const middleChoiceRowGameTypes: readonly QuestionGameType[] = [
  "popping-bubbles",
  "listen-and-pick",
  "shape-hunt",
  "fraction-find",
];

const findChoiceRowHeight = (gameType: QuestionGameType): number => {
  if (gameType === "geography-games") {
    return lowestChoiceRowHeight;
  }
  return middleChoiceRowGameTypes.includes(gameType)
    ? middleChoiceRowHeight
    : lowChoiceRowHeight;
};

export interface ScreenPosition {
  x: number;
  y: number;
}

export const getChoicePositions = (
  choiceCount: number,
  gameType: QuestionGameType,
): ScreenPosition[] => {
  const isComputing = isComputingGameType(gameType);
  const spread = isComputing ? computingChoiceRowSpread : choiceRowSpread;
  const height = isComputing
    ? computingChoiceRowHeight
    : findChoiceRowHeight(gameType);
  return Array.from({ length: choiceCount }, (_, index) => ({
    x:
      choiceCount === 1
        ? 0
        : -spread + (2 * spread * index) / (choiceCount - 1),
    y: height,
  }));
};

export interface ChoiceSizePixels {
  width: number;
  height: number;
}

const smallestKeyHeightPixels = 52;
const largestKeyHeightPixels = 96;
const keyShareOfHeight = 0.15;
const keyWidthToHeight = 2.4;
const keyShareOfWidth = 0.21;

export const getComputingKeySizePixels = (
  viewportWidth: number,
  viewportHeight: number,
): ChoiceSizePixels => {
  const height = Math.round(
    Math.min(
      largestKeyHeightPixels,
      Math.max(smallestKeyHeightPixels, viewportHeight * keyShareOfHeight),
    ),
  );
  const width = Math.round(
    Math.min(height * keyWidthToHeight, viewportWidth * keyShareOfWidth),
  );
  return { width, height };
};

export const promptScreenPosition: ScreenPosition = { x: 0.1, y: 0.14 };
export const computingStageScreenPosition: ScreenPosition = {
  x: 0.12,
  y: 0.08,
};
