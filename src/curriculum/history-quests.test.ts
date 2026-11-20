import { describe, expect, it } from "vitest";
import {
  fewestHistoryQuestions,
  historyQuests,
  longestChoiceLength,
  parseHistoryQuests,
} from "./history-quests.js";
import { parseSkills, skills, yearGroups } from "./skills.js";

const greatFireSkill = {
  id: "history.great-fire-of-london",
  name: "The Great Fire of London",
  subject: "history",
  yearGroup: 2,
  strand: "events-beyond-living-memory",
  prerequisites: [],
};

const knownSkills = parseSkills([greatFireSkill]);

const quizQuestion = (index: number) => ({
  ask: `Question ${String(index)}?`,
  answer: "A bakery",
  wrong: ["A church", "A ship", "A palace"],
  fact: "It began on Pudding Lane.",
});

const quizQuest = {
  id: "pudding-lane-blaze",
  title: "Pudding Lane Blaze",
  skill: greatFireSkill,
  story: "Sparks are flying on Pudding Lane!",
  instruction: "Read each question, then tap the right pot.",
  hint: "Think about what the houses were made of.",
  scene: "burning-london",
  play: "quiz",
  choiceProp: "clay-pot",
  questions: Array.from({ length: fewestHistoryQuestions }, (_, index) =>
    quizQuestion(index),
  ),
};

const sortQuest = {
  ...quizQuest,
  play: "sort",
  bins: ["In 1666", "Today"],
  questions: Array.from({ length: fewestHistoryQuestions }, (_, index) => ({
    ask: `Thing ${String(index)}`,
    answer: index % 2 === 0 ? "In 1666" : "Today",
    fact: "A fact.",
  })),
};

const timelineQuest = {
  ...Object.fromEntries(
    Object.entries(quizQuest).filter(([field]) => field !== "questions"),
  ),
  play: "timeline",
  events: Array.from({ length: 8 }, (_, index) => ({
    label: `Event ${String(index)}`,
    date: String(1600 + index * 10),
    order: 1600 + index * 10,
    fact: "A fact.",
  })),
};

const parseOne = (quest: unknown) =>
  parseHistoryQuests([{ quests: [quest] }], knownSkills);

describe("historyQuests", () => {
  it("holds ten History quests for every Year Group from 1 to 6", () => {
    for (const yearGroup of yearGroups) {
      expect(
        historyQuests.filter((quest) => quest.yearGroup === yearGroup),
      ).toHaveLength(10);
    }
  });

  it("gives every quest its own History Skill, from the same Year Group", () => {
    const skillIds = historyQuests.map(({ skillId }) => skillId);

    expect(new Set(skillIds).size).toBe(historyQuests.length);
    for (const quest of historyQuests) {
      expect(skills.find(({ id }) => id === quest.skillId)).toMatchObject({
        subject: "history",
        yearGroup: quest.yearGroup,
      });
    }
  });

  it("keeps every answer short enough to fit on a button", () => {
    const choices = historyQuests.flatMap((quest) => {
      switch (quest.play) {
        case "quiz":
          return quest.questions.flatMap(({ answer, wrong }) => [
            answer,
            ...wrong,
          ]);
        case "sort":
          return quest.bins;
        case "timeline":
          return quest.events.map(({ label }) => label);
      }
    });

    for (const choice of choices) {
      expect(choice.length).toBeLessThanOrEqual(longestChoiceLength);
    }
  });

  it("uses all three ways to play: quiz, sort and timeline", () => {
    expect(new Set(historyQuests.map(({ play }) => play))).toEqual(
      new Set(["quiz", "sort", "timeline"]),
    );
  });
});

describe("parseHistoryQuests", () => {
  it("reads a quiz quest, taking its Year Group from its Skill", () => {
    expect(parseOne(quizQuest)[0]).toMatchObject({
      id: "pudding-lane-blaze",
      skillId: "history.great-fire-of-london",
      yearGroup: 2,
      play: "quiz",
    });
  });

  it("reads a sort quest and a timeline quest", () => {
    expect(parseOne(sortQuest)[0]).toMatchObject({
      play: "sort",
      bins: ["In 1666", "Today"],
    });
    expect(parseOne(timelineQuest)[0]).toMatchObject({ play: "timeline" });
  });

  it.each([
    [
      "a quest with no Skill the curriculum knows",
      { ...quizQuest, skill: { ...greatFireSkill, id: "history.unknown" } },
      "needs a History Skill",
    ],
    [
      "a scene it can't draw",
      { ...quizQuest, scene: "mars-base" },
      "needs a scene",
    ],
    [
      "a choice prop it can't draw",
      { ...quizQuest, choiceProp: "sword" },
      "needs a choice prop",
    ],
    [
      "too few questions for a Mission",
      { ...quizQuest, questions: quizQuest.questions.slice(1) },
      "needs at least 10",
    ],
    [
      "a question with two wrong answers",
      {
        ...quizQuest,
        questions: [
          { ...quizQuestion(0), wrong: ["A church", "A ship"] },
          ...quizQuest.questions.slice(1),
        ],
      },
      "exactly 3 wrong answers",
    ],
    [
      "a wrong answer that is the answer",
      {
        ...quizQuest,
        questions: [
          { ...quizQuestion(0), wrong: ["A bakery", "A ship", "A palace"] },
          ...quizQuest.questions.slice(1),
        ],
      },
      'has "A bakery" twice',
    ],
    [
      "an answer too long for a button",
      {
        ...quizQuest,
        questions: [
          {
            ...quizQuestion(0),
            answer: "A very long answer that will not fit",
          },
          ...quizQuest.questions.slice(1),
        ],
      },
      "too long for a button",
    ],
    [
      "a sort answer that isn't a bin",
      {
        ...sortQuest,
        questions: [
          { ask: "X", answer: "Tomorrow", fact: "A fact." },
          ...sortQuest.questions.slice(1),
        ],
      },
      "needs its answer to be one of",
    ],
    [
      "a bin nothing is sorted into",
      { ...sortQuest, bins: ["In 1666", "Today", "In 3000"] },
      'nothing to sort into "In 3000"',
    ],
    [
      "two timeline events at the same moment",
      {
        ...timelineQuest,
        events: [
          ...timelineQuest.events,
          { ...timelineQuest.events[0], label: "Same time" },
        ],
      },
      "timeline order",
    ],
    [
      "a quiz quest with bins",
      { ...quizQuest, bins: ["A", "B"] },
      "which has no bins",
    ],
  ])("refuses %s", (_, quest, message) => {
    expect(() => parseOne(quest)).toThrow(message);
  });

  it("refuses two quests with the same ID", () => {
    expect(() =>
      parseHistoryQuests([{ quests: [quizQuest, quizQuest] }], knownSkills),
    ).toThrow('has "pudding-lane-blaze" twice');
  });
});
