import { describe, expect, it } from "vitest";
import { computingGames } from "../../curriculum/computing-games.js";
import { englishGameTypes } from "../../curriculum/english-games.js";
import { geographyGames } from "../../curriculum/geography-games.js";
import { historyQuests } from "../../curriculum/history-quests.js";
import { labGames } from "../../curriculum/lab-games.js";
import { musicGameTypes } from "../../curriculum/music-games.js";
import { phonicsGames } from "../../curriculum/phonics-games.js";
import { yearGroups } from "../../curriculum/skills.js";
import { toSpokenWords } from "../voice-over/spoken-words.js";
import {
  buildMathsExtraMission,
  buildMathsMission,
  mathsExtraGameTypes,
  mathsGameTypes,
} from "./maths-missions.js";
import {
  buildComputingMission,
  buildEnglishMission,
  buildGeographyGameMission,
  buildHistoryQuestMission,
  buildLabMission,
  buildMusicMission,
  buildPhonicsGameMission,
  type Mission,
  type MissionParts,
  type MissionQuestion,
} from "./mission.js";
import { describePartOfDay, describeQuestionAloud } from "./mission-text.js";

const buildParts = (): MissionParts => {
  let state = 7;
  let count = 0;
  return {
    random: () => {
      state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
      return state / 2_147_483_648;
    },
    buildId: () => `activity-${String((count += 1))}`,
  };
};

const listQuestions = (mission: Mission): MissionQuestion[] =>
  mission.activities.flatMap(({ questions }) => questions);

const everyMission = (): [string, Mission][] => [
  ...mathsGameTypes.flatMap((gameType) =>
    yearGroups.map((level): [string, Mission] => [
      `${gameType} at Year ${String(level)}`,
      buildMathsMission(gameType, { ...buildParts(), level }),
    ]),
  ),
  ...mathsExtraGameTypes.flatMap((gameType) =>
    yearGroups.flatMap((level): [string, Mission][] => {
      const mission = buildMathsExtraMission(gameType, {
        ...buildParts(),
        level,
      });
      return mission === undefined
        ? []
        : [[`${gameType} at Year ${String(level)}`, mission]];
    }),
  ),
  ...englishGameTypes.flatMap((gameType) =>
    yearGroups.map((yearGroup): [string, Mission] => [
      `${gameType} at Year ${String(yearGroup)}`,
      buildEnglishMission(gameType, yearGroup, buildParts()),
    ]),
  ),
  ...musicGameTypes.map((gameType): [string, Mission] => [
    gameType,
    buildMusicMission(gameType, buildParts()),
  ]),
  ...computingGames.map(({ gameType }): [string, Mission] => [
    gameType,
    buildComputingMission(gameType, buildParts()),
  ]),
  ...phonicsGames.map((game): [string, Mission] => [
    `phonics ${game.skillId}`,
    buildPhonicsGameMission(game, buildParts()),
  ]),
  ...labGames.map((game): [string, Mission] => [
    `lab ${game.skillId}`,
    buildLabMission(game, buildParts()),
  ]),
  ...geographyGames.map((game): [string, Mission] => [
    `geography ${game.title}`,
    buildGeographyGameMission(game, buildParts()),
  ]),
  ...historyQuests.map((quest): [string, Mission] => [
    `history ${quest.title}`,
    buildHistoryQuestMission(quest, buildParts()),
  ]),
];

describe("describeQuestionAloud", () => {
  it.each(everyMission())(
    "reads every question of %s out loud in words",
    (_, mission) => {
      for (const question of listQuestions(mission)) {
        const spoken = toSpokenWords(describeQuestionAloud(question) ?? "");
        expect(spoken).not.toBe("");
        expect(spoken).not.toMatch(/[+=×÷−_]|(^|\s)\?/);
      }
    },
  );

  it("reads a number sentence as it is said", () => {
    const question: MissionQuestion = {
      prompt: {
        kind: "number-bond",
        numberBond: {
          sentence: { left: 7, operator: "+", right: 3, result: 10 },
          blank: "right",
          answer: 3,
        },
      },
      choices: ["3"],
      answer: "3",
    };
    expect(toSpokenWords(describeQuestionAloud(question) ?? "")).toBe(
      "7 plus what equals 10",
    );
  });

  it("asks a Phonics question without reading out the word the Child reads", () => {
    const question: MissionQuestion = {
      prompt: {
        kind: "phonics-word",
        ask: "Which word do the sounds make?",
        text: "ch|i|p",
      },
      choices: ["chip"],
      answer: "chip",
    };
    expect(describeQuestionAloud(question)).toBe(
      "Which word do the sounds make?",
    );
  });

  it("leaves a sound to its own recording", () => {
    const question: MissionQuestion = {
      prompt: { kind: "sound", sound: "s" },
      choices: ["s"],
      answer: "s",
    };
    expect(describeQuestionAloud(question)).toBeUndefined();
  });
});

describe("describePartOfDay", () => {
  it("names the right part of the day for a 12-hour clock's hour", () => {
    expect(describePartOfDay(false, { hour: 12 })).toBe("after midnight");
    expect(describePartOfDay(false, { hour: 7 })).toBe("in the morning");
    expect(describePartOfDay(false, { hour: 11 })).toBe("in the morning");
    expect(describePartOfDay(true, { hour: 12 })).toBe("after midday");
    expect(describePartOfDay(true, { hour: 3 })).toBe("in the afternoon");
    expect(describePartOfDay(true, { hour: 5 })).toBe("in the afternoon");
    expect(describePartOfDay(true, { hour: 6 })).toBe("in the evening");
    expect(describePartOfDay(true, { hour: 9 })).toBe("in the evening");
    expect(describePartOfDay(true, { hour: 11 })).toBe("at night");
  });

  it("never calls an evening or night time the afternoon in a Ship's clock question", () => {
    const parts = buildParts();
    for (const level of [4, 5] as const) {
      for (let index = 0; index < 20; index += 1) {
        const mission = buildMathsMission("ship-clock", { ...parts, level });
        for (const question of mission.activities.flatMap(
          ({ questions }) => questions,
        )) {
          const { prompt, answer } = question;
          if (
            prompt.kind !== "clock" ||
            prompt.clock.ask.kind === "read" ||
            prompt.clock.ask.kind === "until"
          ) {
            continue;
          }
          const text = describeQuestionAloud(question) ?? "";
          const hourOfDay =
            (prompt.clock.time.hour % 12) +
            (prompt.clock.ask.isAfternoon ? 12 : 0);
          expect(text.includes("in the afternoon")).toBe(
            hourOfDay >= 13 && hourOfDay < 18,
          );
          if (prompt.clock.ask.kind === "twenty-four-hour") {
            expect(Number(answer.slice(0, 2))).toBe(hourOfDay);
          }
        }
      }
    }
  });
});
