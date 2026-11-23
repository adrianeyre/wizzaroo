import { describe, expect, it } from "vitest";
import {
  buildPracticeDays,
  type PracticeEvent,
} from "../../curriculum/mastery.js";
import {
  computingGames,
  findComputingGameYear,
} from "../../curriculum/computing-games.js";
import { geographyGames } from "../../curriculum/geography-games.js";
import { phonicsGames } from "../../curriculum/phonics-games.js";
import voiceOverLines from "../voice-over/voice-over-lines.json" with { type: "json" };
import { phonicsProgrammes } from "../../curriculum/phonics-programmes.js";
import {
  phonicsSounds,
  type PhonicsSound,
} from "../../curriculum/phonics-sounds.js";
import { historyQuests } from "../../curriculum/history-quests.js";
import {
  englishGames,
  englishGameTypes,
} from "../../curriculum/english-games.js";
import { labGames, type LabStation } from "../../curriculum/lab-games.js";
import { skills, yearGroups } from "../../curriculum/skills.js";
import {
  answerQuestion,
  buildComputingMission,
  buildEnglishMission,
  buildLetterMatchMission,
  buildListenAndPickMission,
  listListenAndPickSkills,
  buildGeographyGameMission,
  buildPhonicsGameMission,
  buildLabMission,
  buildHistoryQuestMission,
  firstTimelineAsk,
  historyQuestActivityCount,
  nextTimelineAsk,
  choicesPerQuestion,
  describeNumberBond,
  describeOneMoreOneLess,
  describePhonicsWord,
  findShownPart,
  geographyGameActivityCount,
  getChoicePositions,
  getChoiceSizePixels,
  getComputingKeySizePixels,
  getCurrentQuestion,
  promptScreenPosition,
  questionsPerActivity,
  labActivityCount,
  startMission,
  type Mission,
  type MissionParts,
  type MissionProgress,
  type MissionQuestion,
} from "./mission.js";
import { buildMathsMission, type MathsGameType } from "./maths-missions.js";

const buildYearOneMission =
  (gameType: MathsGameType) =>
  (missionParts: MissionParts): Mission =>
    buildMathsMission(gameType, { ...missionParts, level: 1 });

const buildNumberBondsMission = buildYearOneMission("popping-bubbles");
const buildFishCountMission = buildYearOneMission("fish-count");
const buildTenFramesMission = buildYearOneMission("ten-frames");
const buildShapeHuntMission = buildYearOneMission("shape-hunt");

const buildSeededRandom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
};

const buildCountingIds = () => {
  let count = 0;
  return () => {
    count += 1;
    return `activity-${String(count)}`;
  };
};

const findProgramme = (id: string) => {
  const phonicsProgramme = phonicsProgrammes.find(
    (candidate) => candidate.id === id,
  );
  if (phonicsProgramme === undefined) {
    throw new Error(`there is no Phonics Programme "${id}"`);
  }
  return phonicsProgramme;
};

const everySound = new Set<PhonicsSound>(phonicsSounds);

const buildPhonicsMission = (
  phonicsProgrammeId: string,
  practiceEvents: PracticeEvent[] = [],
  recordedSounds: ReadonlySet<PhonicsSound> = everySound,
) =>
  buildListenAndPickMission({
    phonicsProgramme: findProgramme(phonicsProgrammeId),
    skills,
    practiceDays: buildPracticeDays(practiceEvents),
    recordedSounds,
    today: "2026-11-20",
    random: buildSeededRandom(7),
    buildId: buildCountingIds(),
  });

const playWholeMission = (mission: Mission) => {
  let progress: MissionProgress = startMission(0);
  let now = 0;
  const outcomes = [];
  while (!progress.isFinished) {
    now += 10_000;
    const { question } = getCurrentQuestion(mission, progress);
    const outcome = answerQuestion(mission, progress, question.answer, now);
    outcomes.push(outcome);
    progress = outcome.progress;
  }
  return outcomes;
};

const masterSound = (skillId: string): PracticeEvent[] =>
  ["2026-11-14", "2026-11-15", "2026-11-16"].map((localDate) => ({
    kind: "question-answered",
    skillId,
    localDate,
    isRightFirstTime: true,
  }));

describe("buildNumberBondsMission", () => {
  const mission = buildNumberBondsMission({
    random: buildSeededRandom(1),
    buildId: buildCountingIds(),
  });

  it("is 3 Activities of popping bubbles on number bonds to 10", () => {
    expect(mission.gameType).toBe("popping-bubbles");
    expect(mission.activities).toHaveLength(3);
    for (const activity of mission.activities) {
      expect(activity.skillId).toBe("maths.number-bonds-10");
      expect(activity.questions).toHaveLength(questionsPerActivity);
    }
  });

  it("offers bubbles that include the one number that makes 10, and no number twice", () => {
    for (const { questions } of mission.activities) {
      for (const { prompt, choices, answer } of questions) {
        expect(choices).toHaveLength(choicesPerQuestion);
        expect(new Set(choices).size).toBe(choicesPerQuestion);
        expect(choices).toContain(answer);
        if (prompt.kind !== "number-bond") {
          throw new Error("a bubbles Question shows a number bond");
        }
        expect(findShownPart(prompt.numberBond) + Number(answer)).toBe(10);
      }
    }
  });

  it("never asks the same Question twice in one Activity", () => {
    for (const { questions } of mission.activities) {
      const shown = questions.map(({ prompt }) =>
        prompt.kind === "number-bond" ? describeNumberBond(prompt) : "",
      );
      expect(new Set(shown).size).toBe(shown.length);
    }
  });
});

describe("answerQuestion", () => {
  const mission = buildNumberBondsMission({
    random: buildSeededRandom(2),
    buildId: buildCountingIds(),
  });

  it("asks the Questions in order, Activity by Activity, and finishes after the last", () => {
    const outcomes = playWholeMission(mission);

    expect(outcomes).toHaveLength(3 * questionsPerActivity);
    expect(outcomes.every(({ kind }) => kind === "right")).toBe(true);
    expect(outcomes.at(-1)?.progress.isFinished).toBe(true);
    expect(
      outcomes.map((outcome) =>
        outcome.kind === "right" ? outcome.answeredQuestion.activityId : "",
      ),
    ).toEqual([
      ...Array<string>(questionsPerActivity).fill("activity-1"),
      ...Array<string>(questionsPerActivity).fill("activity-2"),
      ...Array<string>(questionsPerActivity).fill("activity-3"),
    ]);
  });

  it("finishes each Activity after its last Question, with the time it took", () => {
    const finished = playWholeMission(mission).flatMap((outcome) =>
      outcome.kind === "right" && outcome.finishedActivity !== undefined
        ? [outcome.finishedActivity]
        : [],
    );

    expect(finished).toEqual([
      {
        activityId: "activity-1",
        skillId: "maths.number-bonds-10",
        secondsSpent: 50,
      },
      {
        activityId: "activity-2",
        skillId: "maths.number-bonds-10",
        secondsSpent: 50,
      },
      {
        activityId: "activity-3",
        skillId: "maths.number-bonds-10",
        secondsSpent: 50,
      },
    ]);
  });

  it("answers a wrong bubble with a retry on the same Question, taking that bubble away", () => {
    const progress = startMission(0);
    const { question } = getCurrentQuestion(mission, progress);
    const wrongChoice = question.choices.find(
      (choice) => choice !== question.answer,
    );
    if (wrongChoice === undefined) {
      throw new Error("the Question has no wrong bubble");
    }

    const outcome = answerQuestion(mission, progress, wrongChoice, 1000);

    expect(outcome.kind).toBe("wrong");
    expect(outcome.progress.questionIndex).toBe(0);
    const retry = getCurrentQuestion(mission, outcome.progress);
    expect(retry.question).toBe(question);
    expect(retry.remainingChoices).not.toContain(wrongChoice);
    expect(retry.remainingChoices).toContain(question.answer);
  });

  it("always leads to the right answer, however many wrong answers come first, and records how many there were", () => {
    let progress = startMission(0);
    const { question } = getCurrentQuestion(mission, progress);
    for (const choice of question.choices.filter(
      (candidate) => candidate !== question.answer,
    )) {
      progress = answerQuestion(mission, progress, choice, 0).progress;
    }

    expect(getCurrentQuestion(mission, progress).remainingChoices).toEqual([
      question.answer,
    ]);
    const outcome = answerQuestion(mission, progress, question.answer, 0);
    expect(outcome.kind === "right" && outcome.answeredQuestion).toEqual({
      activityId: "activity-1",
      skillId: "maths.number-bonds-10",
      isRightFirstTime: false,
      wrongAnswerCount: choicesPerQuestion - 1,
    });
    expect(outcome.progress.questionIndex).toBe(1);
  });

  it("counts a right answer first time as right first time", () => {
    const progress = startMission(0);
    const { question } = getCurrentQuestion(mission, progress);

    const outcome = answerQuestion(mission, progress, question.answer, 0);

    expect(outcome.kind === "right" && outcome.answeredQuestion).toMatchObject({
      isRightFirstTime: true,
      wrongAnswerCount: 0,
    });
  });
});

describe("buildListenAndPickMission", () => {
  const listSounds = (mission: Mission | undefined) =>
    mission?.activities.map(({ skillId }) => skillId);

  it("offers two Children on different Phonics Programmes the sounds in their own programme's order", () => {
    expect(listSounds(buildPhonicsMission("little-wandle"))).toEqual([
      "phonics.sound-s",
      "phonics.sound-a",
      "phonics.sound-t",
    ]);
    expect(listSounds(buildPhonicsMission("read-write-inc"))).toEqual([
      "phonics.sound-m",
      "phonics.sound-a",
      "phonics.sound-s",
    ]);
  });

  it("moves on past the sounds a Child has Mastered", () => {
    const mission = buildPhonicsMission("little-wandle", [
      ...masterSound("phonics.sound-s"),
      ...masterSound("phonics.sound-a"),
    ]);

    expect(listSounds(mission)).toEqual([
      "phonics.sound-t",
      "phonics.sound-p",
      "phonics.sound-i",
    ]);
  });

  it("offers only the sounds that have a recording", () => {
    const mission = buildPhonicsMission(
      "read-write-inc",
      [],
      new Set<PhonicsSound>(["s", "t"]),
    );

    expect(listSounds(mission)).toEqual(["phonics.sound-s", "phonics.sound-t"]);
  });

  it("offers no Mission while no sound has a recording", () => {
    expect(buildPhonicsMission("little-wandle", [], new Set())).toBeUndefined();
  });

  it("asks the Child to pick the programme's letters for the sound they hear, among other letters it teaches", () => {
    const mission = buildPhonicsMission("little-wandle");
    const firstActivity = mission?.activities[0];

    expect(firstActivity?.gameType).toBe("listen-and-pick");
    for (const { prompt, choices, answer } of firstActivity?.questions ?? []) {
      expect(prompt).toEqual({ kind: "sound", sound: "s" });
      expect(answer).toBe("s");
      expect(choices).toHaveLength(choicesPerQuestion);
      expect(new Set(choices).size).toBe(choicesPerQuestion);
      expect(choices).toContain("s");
    }
  });

  it.each(phonicsProgrammes.map(({ id }) => id))(
    "never offers a wrong letter tile that %s also teaches for the sound played",
    (phonicsProgrammeId) => {
      const phonicsProgramme = findProgramme(phonicsProgrammeId);
      const graphemes = phonicsProgramme.soundOrder.flatMap(
        (stage) => stage.graphemes,
      );
      const playableSounds = listListenAndPickSkills({
        phonicsProgramme,
        skills,
        recordedSounds: everySound,
      }).map(({ sounds }) => sounds[0]);

      for (const sound of playableSounds) {
        const spellings = new Set(
          graphemes
            .filter(({ sounds }) => sounds.includes(sound))
            .map(({ grapheme }) => grapheme),
        );
        const mission = buildPhonicsMission(
          phonicsProgrammeId,
          [],
          new Set([sound]),
        );
        for (const { choices, answer } of mission?.activities[0]?.questions ??
          []) {
          const wrongSpellings = choices.filter(
            (choice) => choice !== answer && spellings.has(choice),
          );
          expect({ sound, wrongSpellings }).toEqual({
            sound,
            wrongSpellings: [],
          });
          expect(choices).toHaveLength(choicesPerQuestion);
        }
      }
    },
  );
});

describe("describeNumberBond", () => {
  it("shows the number sentence with a question mark for the blank", () => {
    expect(
      describeNumberBond({
        numberBond: {
          sentence: { left: 3, operator: "+", right: 7, result: 10 },
          blank: "right",
          answer: 7,
        },
      }),
    ).toBe("3 + ? = 10");
    expect(
      describeNumberBond({
        numberBond: {
          sentence: { left: 3, operator: "+", right: 7, result: 10 },
          blank: "left",
          answer: 3,
        },
      }),
    ).toBe("? + 7 = 10");
  });
});

describe("the choices' layout", () => {
  it("keeps every touch target at least 48 pixels, even on the smallest landscape phone", () => {
    expect(getChoiceSizePixels(280)).toBeGreaterThanOrEqual(48);
    expect(getChoiceSizePixels(320)).toBeGreaterThanOrEqual(48);
    expect(getChoiceSizePixels(1200)).toBeLessThanOrEqual(150);
  });

  it("spreads the choices across the screen without overlapping on a phone in landscape", () => {
    const [first, second] = getChoicePositions(
      choicesPerQuestion,
      "popping-bubbles",
    );
    const phoneWidth = 568;
    const phoneHeight = 320;
    const gapPixels = ((second.x - first.x) / 2) * phoneWidth;

    expect(gapPixels).toBeGreaterThan(getChoiceSizePixels(phoneHeight));
  });
});

const buildSeededParts = (seed: number): MissionParts => ({
  random: buildSeededRandom(seed),
  buildId: buildCountingIds(),
});

const listQuestions = (mission: Mission): MissionQuestion[] =>
  mission.activities.flatMap(({ questions }) => questions);

describe.each([
  {
    gameType: "fish-count",
    skillId: "maths.count-objects-to-20",
    buildMission: buildFishCountMission,
  },
  {
    gameType: "ten-frames",
    skillId: "maths.one-more-one-less",
    buildMission: buildTenFramesMission,
  },
  {
    gameType: "shape-hunt",
    skillId: "maths.name-3d-shapes",
    buildMission: buildShapeHuntMission,
  },
  {
    gameType: "letter-match",
    skillId: "english.capital-letters",
    buildMission: buildLetterMatchMission,
  },
])("the $gameType Mission", ({ gameType, skillId, buildMission }) => {
  const mission = buildMission(buildSeededParts(3));

  it(`is 3 Activities of ${gameType} on the Skill ${skillId}`, () => {
    expect(mission.gameType).toBe(gameType);
    expect(mission.activities).toHaveLength(3);
    for (const activity of mission.activities) {
      expect(activity.gameType).toBe(gameType);
      expect(activity.skillId).toBe(skillId);
      expect(activity.questions).toHaveLength(questionsPerActivity);
    }
    expect(skills.map(({ id }) => id)).toContain(skillId);
  });

  it("offers four different choices, one of them the answer", () => {
    for (const { choices, answer } of listQuestions(mission)) {
      expect(choices).toHaveLength(choicesPerQuestion);
      expect(new Set(choices).size).toBe(choicesPerQuestion);
      expect(choices).toContain(answer);
    }
  });

  it("can be played to the end by answering every Question", () => {
    expect(playWholeMission(mission).at(-1)?.progress.isFinished).toBe(true);
  });
});

describe("buildFishCountMission", () => {
  const questions = listQuestions(buildFishCountMission(buildSeededParts(4)));

  it("asks how many fish there are, with counts a Child might slip to as the other choices", () => {
    for (const { prompt, choices, answer } of questions) {
      if (prompt.kind !== "count") {
        throw new Error("a fish-count Question shows a count");
      }
      expect(answer).toBe(String(prompt.count));
      for (const choice of choices) {
        expect(Math.abs(Number(choice) - prompt.count)).toBeLessThanOrEqual(3);
      }
    }
  });

  it("counts up to 10 in the first Activity and up to 20 by the last", () => {
    const findCounts = (activityIndex: number) =>
      questions
        .slice(
          activityIndex * questionsPerActivity,
          (activityIndex + 1) * questionsPerActivity,
        )
        .map(({ answer }) => Number(answer));

    expect(Math.max(...findCounts(0))).toBeLessThanOrEqual(10);
    expect(Math.min(...findCounts(2))).toBeGreaterThan(10);
  });
});

describe("buildTenFramesMission", () => {
  it("asks for one more or one less than the counters shown", () => {
    for (const { prompt, answer } of listQuestions(
      buildTenFramesMission(buildSeededParts(5)),
    )) {
      if (prompt.kind !== "one-more-one-less") {
        throw new Error("a ten-frames Question shows a one more or one less");
      }
      const { start, step } = prompt.oneMoreOneLess;
      expect(Number(answer)).toBe(step === "one-more" ? start + 1 : start - 1);
    }
  });

  it("says the question the way a Year 1 class does", () => {
    expect(
      describeOneMoreOneLess({
        oneMoreOneLess: { start: 7, step: "one-more", answer: 8 },
      }),
    ).toBe("One more than 7 is ?");
    expect(
      describeOneMoreOneLess({
        oneMoreOneLess: { start: 12, step: "one-less", answer: 11 },
      }),
    ).toBe("One less than 12 is ?");
  });
});

describe("buildShapeHuntMission", () => {
  it("asks for a different 3-D shape each time within an Activity, offering only shape names", () => {
    const mission = buildShapeHuntMission(buildSeededParts(6));
    for (const { questions } of mission.activities) {
      const asked = questions.map(({ answer }) => answer);
      expect(new Set(asked).size).toBe(asked.length);
      for (const { prompt, choices, answer } of questions) {
        expect(prompt).toEqual({ kind: "shape", shape: answer });
        for (const choice of choices) {
          expect([
            "cube",
            "cuboid",
            "pyramid",
            "sphere",
            "cylinder",
            "cone",
          ]).toContain(choice);
        }
      }
    }
  });
});

describe("buildLetterMatchMission", () => {
  it("shows a small letter and asks for its capital among other capitals", () => {
    for (const { prompt, choices, answer } of listQuestions(
      buildLetterMatchMission(buildSeededParts(8)),
    )) {
      if (prompt.kind !== "capital-letter") {
        throw new Error("a letter-match Question shows a small letter");
      }
      expect(answer).toBe(prompt.smallLetter.toUpperCase());
      for (const choice of choices) {
        expect(choice).toMatch(/^[A-Z]$/);
      }
    }
  });

  it("starts with letters whose capital is the same shape", () => {
    const [firstActivity] = buildLetterMatchMission(
      buildSeededParts(9),
    ).activities;
    for (const { answer } of firstActivity.questions) {
      expect(Array.from("CIKOPSUVWXZ")).toContain(answer);
    }
  });
});

describe("buildPhonicsGameMission", () => {
  it("plays three Activities of five of the game's own questions, each on the game's Skill", () => {
    for (const phonicsGame of phonicsGames) {
      const mission = buildPhonicsGameMission(
        phonicsGame,
        buildSeededParts(11),
      );

      expect(mission.gameType).toBe("phonics-games");
      expect(mission.phonicsGame).toBe(phonicsGame);
      expect(mission.activities).toHaveLength(3);
      for (const { skillId, questions } of mission.activities) {
        expect(skillId).toBe(phonicsGame.skillId);
        expect(questions).toHaveLength(questionsPerActivity);
        expect(
          new Set(
            questions.map(
              ({ answer, prompt }) => `${answer}${JSON.stringify(prompt)}`,
            ),
          ).size,
        ).toBe(questionsPerActivity);
      }
    }
  });

  it("offers the right answer and the game's distractors, and asks the game's question about the prompt", () => {
    const [phonicsGame] = phonicsGames;
    for (const { prompt, choices, answer } of listQuestions(
      buildPhonicsGameMission(phonicsGame, buildSeededParts(12)),
    )) {
      const source = phonicsGame.questions.find(
        (question) =>
          prompt.kind === "phonics-word" && question.prompt === prompt.text,
      );
      expect(prompt).toMatchObject({
        kind: "phonics-word",
        ask: phonicsGame.ask,
      });
      expect(source?.answer).toBe(answer);
      expect(choices.toSorted()).toEqual(
        [answer, ...(source?.distractors ?? [])].toSorted(),
      );
    }
  });
});

const findQuestOfPlay = (play: "quiz" | "sort" | "timeline") => {
  const quest = historyQuests.find((candidate) => candidate.play === play);
  if (quest === undefined) {
    throw new Error(`there is no History ${play} quest`);
  }
  return quest;
};

describe("buildHistoryQuestMission", () => {
  it("plays two Activities of five questions on the quest's own Skill, never asking one twice", () => {
    for (const historyQuest of historyQuests.filter(
      ({ play }) => play !== "timeline",
    )) {
      const mission = buildHistoryQuestMission(
        historyQuest,
        buildSeededParts(21),
      );
      const asks = listQuestions(mission).map(({ prompt }) =>
        prompt.kind === "history" ? prompt.ask : "",
      );

      expect(mission).toMatchObject({
        gameType: "history-quest",
        historyQuest,
        phonicsGame: undefined,
      });
      expect(mission.activities).toHaveLength(historyQuestActivityCount);
      for (const { skillId, questions } of mission.activities) {
        expect(skillId).toBe(historyQuest.skillId);
        expect(questions).toHaveLength(questionsPerActivity);
      }
      expect(new Set(asks).size).toBe(asks.length);
    }
  });

  it("offers a quiz question's answer among its three wrong answers, and says its fact once answered", () => {
    const quest = findQuestOfPlay("quiz");
    for (const { prompt, choices, answer } of listQuestions(
      buildHistoryQuestMission(quest, buildSeededParts(22)),
    )) {
      const source =
        quest.play === "quiz"
          ? quest.questions.find(
              ({ ask }) => prompt.kind === "history" && ask === prompt.ask,
            )
          : undefined;
      expect(source?.answer).toBe(answer);
      expect(choices.toSorted()).toEqual(
        [answer, ...(source?.wrong ?? [])].toSorted(),
      );
      expect(prompt).toMatchObject({ kind: "history", fact: source?.fact });
    }
  });

  it("offers a sort quest's groups as the choices, always in the same order", () => {
    const quest = findQuestOfPlay("sort");
    for (const { choices, answer } of listQuestions(
      buildHistoryQuestMission(quest, buildSeededParts(23)),
    )) {
      expect(choices).toEqual(quest.play === "sort" ? quest.bins : []);
      expect(choices).toContain(answer);
    }
  });

  it("asks for the events of a timeline in order, hanging each one on the timeline once placed", () => {
    const quest = findQuestOfPlay("timeline");
    const events = quest.play === "timeline" ? quest.events : [];
    const findOrder = (label: string) =>
      events.find((event) => event.label === label)?.order ?? 0;
    const mission = buildHistoryQuestMission(quest, buildSeededParts(24));

    for (const { questions } of mission.activities) {
      const answers = questions.map(({ answer }) => answer);
      expect(answers.map(findOrder)).toEqual(
        answers.map(findOrder).toSorted((first, second) => first - second),
      );
      questions.forEach(({ prompt, choices, answer }, position) => {
        expect(prompt).toMatchObject({
          kind: "history",
          play: "timeline",
          ask: position === 0 ? firstTimelineAsk : nextTimelineAsk,
          placedEvents: answers.slice(0, position).map((label) => ({
            label,
            date: events.find((event) => event.label === label)?.date,
          })),
        });
        expect(choices).toContain(answer);
        expect(Math.min(...choices.map(findOrder))).toBe(findOrder(answer));
      });
    }
  });

  it("can be played to the end, answering every question right", () => {
    for (const play of ["quiz", "sort", "timeline"] as const) {
      const outcomes = playWholeMission(
        buildHistoryQuestMission(findQuestOfPlay(play), buildSeededParts(25)),
      );

      expect(outcomes).toHaveLength(
        historyQuestActivityCount * questionsPerActivity,
      );
      expect(outcomes.at(-1)?.progress.isFinished).toBe(true);
    }
  });
});

describe("describePhonicsWord", () => {
  it("reads sound tiles as separate sounds and a gap as a blank, for a screen reader", () => {
    expect(describePhonicsWord({ text: "sh|i|p" })).toBe("sh i p");
    expect(describePhonicsWord({ text: "I went ___ school." })).toBe(
      "I went blank school.",
    );
    expect(describePhonicsWord({ text: "bri___" })).toBe("briblank");
  });
});

describe("the low row of choices", () => {
  it("leaves the middle of the screen free for the fish, counters and letter block", () => {
    for (const gameType of [
      "fish-count",
      "ten-frames",
      "letter-match",
      "phonics-games",
    ] as const) {
      const [first] = getChoicePositions(choicesPerQuestion, gameType);
      expect(first.y).toBeLessThan(promptScreenPosition.y - 0.5);
    }
  });
});

describe("buildEnglishMission", () => {
  const everyGameYear = englishGameTypes.flatMap((gameType) =>
    yearGroups.map((yearGroup) => ({ gameType, yearGroup })),
  );

  it.each(everyGameYear)(
    "plays $gameType at Year $yearGroup as 3 Activities on that Year's own Skill",
    ({ gameType, yearGroup }) => {
      const mission = buildEnglishMission(
        gameType,
        yearGroup,
        buildSeededParts(yearGroup),
      );
      const { skillId } = englishGames[gameType][yearGroup];

      expect(mission.gameType).toBe(gameType);
      expect(mission.activities).toHaveLength(3);
      for (const activity of mission.activities) {
        expect(activity.skillId).toBe(skillId);
        expect(activity.questions).toHaveLength(questionsPerActivity);
        for (const { prompt, choices, answer } of activity.questions) {
          expect(prompt.kind).toBe("english");
          expect(choices).toContain(answer);
          expect(new Set(choices).size).toBe(choices.length);
          expect(choices.length).toBeLessThanOrEqual(choicesPerQuestion);
        }
      }
      expect(playWholeMission(mission).at(-1)?.progress.isFinished).toBe(true);
    },
  );

  it("asks a different question each time within an Activity", () => {
    const mission = buildEnglishMission(
      "sound-alikes",
      4,
      buildSeededParts(11),
    );
    for (const { questions } of mission.activities) {
      const prompts = questions.map(({ prompt }) => JSON.stringify(prompt));
      expect(new Set(prompts).size).toBe(prompts.length);
    }
  });

  it("keeps the English choices in the low row, under the prompt", () => {
    const [first] = getChoicePositions(choicesPerQuestion, "word-detectives");
    expect(first.y).toBeLessThan(promptScreenPosition.y - 0.5);
  });
});

describe("buildGeographyGameMission", () => {
  it.each(geographyGames.map((game) => [game.title, game] as const))(
    "plays %s as 2 Activities of 5 different questions on its own Skill",
    (_, game) => {
      const mission = buildGeographyGameMission(game, buildSeededParts(7));
      const questions = listQuestions(mission);

      expect(mission).toMatchObject({
        gameType: "geography-games",
        geographyGame: game,
        phonicsGame: undefined,
      });
      expect(mission.activities).toHaveLength(geographyGameActivityCount);
      for (const activity of mission.activities) {
        expect(activity.skillId).toBe(game.skillId);
        expect(activity.questions).toHaveLength(questionsPerActivity);
      }
      expect(
        new Set(
          questions.map(({ prompt }) =>
            prompt.kind === "geography"
              ? `${prompt.ask} ${JSON.stringify(prompt.show)}`
              : "",
          ),
        ).size,
      ).toBe(geographyGameActivityCount * questionsPerActivity);
      for (const { choices, answer, prompt } of questions) {
        expect(prompt.kind).toBe("geography");
        expect(choices).toHaveLength(choicesPerQuestion);
        expect(choices).toContain(answer);
        expect(new Set(choices).size).toBe(choicesPerQuestion);
      }
    },
  );

  it("can be played from start to celebration", () => {
    const [game] = geographyGames;

    const outcomes = playWholeMission(
      buildGeographyGameMission(game, buildSeededParts(3)),
    );

    expect(outcomes).toHaveLength(
      geographyGameActivityCount * questionsPerActivity,
    );
    expect(outcomes.at(-1)?.progress.isFinished).toBe(true);
  });
});

describe("buildLabMission", () => {
  const random = buildSeededRandom(11);
  const findGame = (station: LabStation) => {
    const game = labGames.find(
      (candidate) => candidate.yearGroup === 3 && candidate.station === station,
    );
    if (game === undefined) {
      throw new Error(`Year 3 has no Science game at the ${station} station`);
    }
    return game;
  };

  it("is 3 Activities on the game's own Science Skill, each asking its questions with its prop", () => {
    const game = findGame("sort");
    const mission = buildLabMission(game, {
      random,
      buildId: buildCountingIds(),
    });

    expect(mission.gameType).toBe("science-lab");
    expect(mission.labGame).toBe(game);
    expect(mission.activities).toHaveLength(labActivityCount);
    expect(skills.map(({ id }) => id)).toContain(game.skillId);
    for (const activity of mission.activities) {
      expect(activity.skillId).toBe(game.skillId);
      expect(activity.questions).toHaveLength(questionsPerActivity);
      expect(
        new Set(activity.questions.map(({ prompt }) => JSON.stringify(prompt)))
          .size,
      ).toBe(questionsPerActivity);
      for (const { prompt, choices, answer } of activity.questions) {
        expect(prompt).toMatchObject({
          kind: "lab",
          station: "sort",
          prop: game.prop,
        });
        expect(choices).toHaveLength(choicesPerQuestion);
        expect(choices).toContain(answer);
      }
    }
    expect(playWholeMission(mission).at(-1)?.progress.isFinished).toBe(true);
  });

  it("shows each question's own model, or the game's prop when the question names none", () => {
    const game = labGames.find(({ id }) => id === "second-habitat-homes");
    if (game === undefined) {
      throw new Error("Habitat Homes is missing");
    }
    const withoutModels = {
      ...game,
      questions: game.questions.map(({ ask, answer, distractors }) => ({
        ask,
        answer,
        distractors,
      })),
    };

    const shown = listQuestions(
      buildLabMission(game, { random, buildId: buildCountingIds() }),
    ).map(({ prompt }) => prompt);
    const fallback = listQuestions(
      buildLabMission(withoutModels, { random, buildId: buildCountingIds() }),
    ).map(({ prompt }) => prompt);

    expect(shown).toContainEqual(
      expect.objectContaining({ ask: "A jellyfish", prop: "jellyfish" }),
    );
    for (const prompt of fallback) {
      expect(prompt).toMatchObject({ kind: "lab", prop: game.prop });
    }
  });

  it("always offers True then False for a true-or-false game", () => {
    const mission = buildLabMission(findGame("true-false"), {
      random,
      buildId: buildCountingIds(),
    });

    for (const { choices, answer } of listQuestions(mission)) {
      expect(choices).toEqual(["True", "False"]);
      expect(choices).toContain(answer);
    }
  });

  it("puts the science choices in the low row, under the prop", () => {
    const [first] = getChoicePositions(choicesPerQuestion, "science-lab");

    expect(first.y).toBeLessThan(promptScreenPosition.y - 0.5);
  });
});

describe("buildComputingMission", () => {
  it.each(computingGames.map(({ gameType }) => gameType))(
    "builds %s as three Activities of five fair questions on its one Skill",
    (gameType) => {
      const { skillId } = computingGames.find(
        (game) => game.gameType === gameType,
      ) ?? { skillId: "" };
      const mission = buildComputingMission(gameType, {
        random: buildSeededRandom(11),
        buildId: buildCountingIds(),
      });

      expect(mission.gameType).toBe(gameType);
      expect(mission.activities).toHaveLength(3);
      for (const activity of mission.activities) {
        expect(activity.skillId).toBe(skillId);
        expect(activity.questions).toHaveLength(questionsPerActivity);
        for (const { prompt, choices, answer } of activity.questions) {
          expect(prompt.kind).toBe("computing");
          expect(choices).toHaveLength(choicesPerQuestion);
          expect(new Set(choices).size).toBe(choicesPerQuestion);
          expect(choices).toContain(answer);
        }
      }
      expect(playWholeMission(mission)).toHaveLength(3 * questionsPerActivity);
    },
  );

  it("deals a question bank across the Activities before repeating any of it", () => {
    const mission = buildComputingMission("tech-spotter", {
      random: buildSeededRandom(3),
      buildId: buildCountingIds(),
    });
    const asked = mission.activities
      .flatMap(({ questions }) => questions)
      .slice(0, 13)
      .map(({ prompt, answer }) => JSON.stringify([prompt, answer]));

    expect(new Set(asked).size).toBe(asked.length);
  });

  it("speaks each Year 1 and Year 2 Computing game's own instruction, and gives Years 3 to 6 one shared line to read along with", () => {
    const spokenLines = new Map<string, string>(Object.entries(voiceOverLines));

    for (const { gameType, instruction } of computingGames) {
      const yearGroup = findComputingGameYear(gameType) ?? 1;
      expect(spokenLines.get(`computing.${gameType}`), gameType).toBe(
        yearGroup <= 2 ? instruction : undefined,
      );
    }
    expect(spokenLines.has("computing.read-and-tap")).toBe(true);
    expect(spokenLines.has("computing.try-again")).toBe(true);
  });
});

describe("the keycap choices", () => {
  it("lays Computing choices along a low, wide row", () => {
    const [first, , , last] = getChoicePositions(4, "robot-steps");

    expect(first.y).toBeLessThan(-0.6);
    expect(last.x - first.x).toBeGreaterThan(1.2);
  });

  it("keeps keycaps at least 52 pixels tall, and narrow enough for four to fit side by side", () => {
    const small = getComputingKeySizePixels(640, 320);
    const large = getComputingKeySizePixels(1920, 1080);

    expect(small.height).toBe(52);
    expect(small.width * 4).toBeLessThan(640);
    expect(large.height).toBe(96);
    expect(large.width).toBeGreaterThan(large.height);
  });
});
