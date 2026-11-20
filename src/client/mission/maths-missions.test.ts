import { describe, expect, it } from "vitest";
import { skills, yearGroups } from "../../curriculum/skills.js";
import { worldMap } from "../../curriculum/world-map.js";
import {
  buildMathsExtraMission,
  buildMathsMission,
  findMathsExtraLevel,
  mathsExtraGameTypes,
  mathsGameTypes,
  mathsSkillIds,
} from "./maths-missions.js";
import { findMissionWords } from "./mission-text.js";
import {
  answerQuestion,
  choicesPerQuestion,
  getCurrentQuestion,
  questionsPerActivity,
  startMission,
  type Mission,
} from "./mission.js";

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

const playWholeMission = (mission: Mission) => {
  let progress = startMission(0);
  let answered = 0;
  while (!progress.isFinished) {
    const { question } = getCurrentQuestion(mission, progress);
    const outcome = answerQuestion(mission, progress, question.answer, 1000);
    progress = outcome.progress;
    answered += 1;
  }
  return answered;
};

const everyGame = mathsGameTypes.flatMap((gameType) =>
  yearGroups.map((level) => ({ gameType, level })),
);

describe("the sixty Maths games", () => {
  it("has ten Maths games for each of Years 1 to 6, each on its own Skill for that Year", () => {
    expect(everyGame).toHaveLength(60);
    const skillIds = everyGame.map(
      ({ gameType, level }) => mathsSkillIds[gameType][level],
    );
    expect(new Set(skillIds).size).toBe(60);
    for (const { gameType, level } of everyGame) {
      const skill = skills.find(
        ({ id }) => id === mathsSkillIds[gameType][level],
      );
      expect(skill?.subject).toBe("maths");
      expect(skill?.yearGroup).toBe(level);
    }
  });

  it.each(everyGame)(
    "builds 3 Activities of 5 fair Questions for $gameType in Year $level",
    ({ gameType, level }) => {
      const mission = buildMathsMission(gameType, {
        random: buildSeededRandom(level * 31 + gameType.length),
        buildId: buildCountingIds(),
        level,
      });

      expect(mission.activities).toHaveLength(3);
      for (const activity of mission.activities) {
        expect(activity.skillId).toBe(mathsSkillIds[gameType][level]);
        expect(activity.questions).toHaveLength(questionsPerActivity);
        for (const { choices, answer } of activity.questions) {
          expect(choices).toHaveLength(choicesPerQuestion);
          expect(new Set(choices).size).toBe(choicesPerQuestion);
          expect(choices).toContain(answer);
        }
      }
      expect(playWholeMission(mission)).toBe(15);
      expect(findMissionWords(gameType, level).title).not.toBe("");
    },
  );

  it("puts all ten Maths games in Bubble Bay, in the order they unlock", () => {
    const [bay] = worldMap.regions;
    expect(bay.games.map(({ gameType }) => gameType)).toEqual([
      ...mathsGameTypes,
    ]);
  });
});

describe("what each Year is asked", () => {
  const buildFirstQuestion = (
    gameType: (typeof mathsGameTypes)[number],
    level: (typeof yearGroups)[number],
  ) =>
    buildMathsMission(gameType, {
      random: buildSeededRandom(7),
      buildId: buildCountingIds(),
      level,
    }).activities[0].questions[0];

  it("moves popping bubbles from bonds to 10, through times tables, to the order of operations", () => {
    expect(buildFirstQuestion("popping-bubbles", 1).prompt.kind).toBe(
      "number-bond",
    );
    expect(buildFirstQuestion("popping-bubbles", 3).prompt.kind).toBe(
      "missing-number",
    );
    const yearSix = buildFirstQuestion("popping-bubbles", 6).prompt;
    expect(
      yearSix.kind === "missing-number" && /[+×]/.test(yearSix.sentence),
    ).toBe(true);
  });

  it("reads the clock to the hour in Year 1, with Roman numerals in Year 3 and as a duration in Year 6", () => {
    const yearThree = buildFirstQuestion("ship-clock", 3).prompt;
    expect(yearThree.kind === "clock" && yearThree.clock.dial).toBe("roman");
    const yearSix = buildFirstQuestion("ship-clock", 6).prompt;
    expect(yearSix.kind === "clock" && yearSix.clock.ask.kind).toBe("until");
  });

  it("finds 3-D shapes in Year 1 and their nets in Year 6", () => {
    expect(buildFirstQuestion("shape-hunt", 1).prompt.kind).toBe("shape");
    expect(buildFirstQuestion("shape-hunt", 4).prompt.kind).toBe(
      "polygon-clue",
    );
    expect(buildFirstQuestion("shape-hunt", 6).prompt.kind).toBe("net");
  });

  it("measures by comparing in Year 1, with rulers in Years 2 and 3, and by perimeter, area and volume after", () => {
    expect(buildFirstQuestion("coral-heights", 1).prompt.kind).toBe(
      "height-extreme",
    );
    expect(buildFirstQuestion("coral-heights", 3).answer).toMatch(/ mm$/);
    expect(buildFirstQuestion("coral-heights", 5).answer).toMatch(/ cm²$/);
    expect(buildFirstQuestion("coral-heights", 6).answer).toMatch(/ cm³$/);
  });
});

const everyExtraGame = mathsExtraGameTypes.flatMap((gameType) =>
  yearGroups.flatMap((level) => {
    const extraLevel = findMathsExtraLevel(gameType, level);
    return extraLevel === undefined
      ? []
      : [{ gameType, level, skillId: extraLevel.skillId }];
  }),
);

describe("the fair shares, treasure map and chart tower Maths games", () => {
  it("plays each Skill the National Curriculum coverage names, in the Year it belongs to", () => {
    expect(
      everyExtraGame.map(
        ({ gameType, level, skillId }) =>
          `${gameType} ${String(level)} ${skillId}`,
      ),
    ).toEqual([
      "fair-shares 1 maths.multiply-and-divide-with-objects",
      "fair-shares 2 maths.times-tables-2-5-10",
      "fair-shares 6 maths.ratio-and-scale",
      "treasure-map 1 maths.position-and-turns",
      "treasure-map 2 maths.clockwise-turns",
      "treasure-map 4 maths.coordinates-first-quadrant",
      "treasure-map 5 maths.reflection-and-translation",
      "treasure-map 6 maths.coordinates-four-quadrants",
      "chart-tower 2 maths.tally-charts-and-pictograms",
      "chart-tower 3 maths.bar-charts-and-tables",
      "chart-tower 4 maths.line-graphs",
      "chart-tower 5 maths.tables-and-timetables",
      "chart-tower 6 maths.pie-charts-and-mean",
    ]);
    for (const { level, skillId } of everyExtraGame) {
      const skill = skills.find(({ id }) => id === skillId);
      expect(skill?.subject).toBe("maths");
      expect(skill?.yearGroup).toBe(level);
    }
  });

  it.each(everyExtraGame)(
    "builds 3 Activities of 5 fair Questions for $gameType in Year $level",
    ({ gameType, level, skillId }) => {
      const mission = buildMathsExtraMission(gameType, {
        random: buildSeededRandom(level * 17 + gameType.length),
        buildId: buildCountingIds(),
        level,
      });
      if (mission === undefined) {
        throw new Error(`${gameType} should play in Year ${String(level)}`);
      }

      expect(mission.activities).toHaveLength(3);
      for (const activity of mission.activities) {
        expect(activity.skillId).toBe(skillId);
        expect(activity.questions).toHaveLength(questionsPerActivity);
        for (const { choices, answer } of activity.questions) {
          expect(choices).toHaveLength(choicesPerQuestion);
          expect(new Set(choices).size).toBe(choicesPerQuestion);
          expect(choices).toContain(answer);
        }
      }
      expect(playWholeMission(mission)).toBe(15);
      expect(findMissionWords(gameType, level).title).not.toBe("");
    },
  );

  it("has no Mission for a Year whose programme of study the game does not cover", () => {
    expect(findMathsExtraLevel("chart-tower", 1)).toBeUndefined();
    expect(
      buildMathsExtraMission("fair-shares", {
        random: buildSeededRandom(3),
        buildId: buildCountingIds(),
        level: 4,
      }),
    ).toBeUndefined();
  });

  it("puts each game in the Maths Region of every Island whose Year it plays, always unlocked as an extra Game", () => {
    for (const island of worldMap.islands) {
      const mathsRegion = worldMap.regions.find(
        ({ islandId, subject }) =>
          islandId === island.id && subject === "maths",
      );
      const expected = mathsExtraGameTypes.filter(
        (gameType) =>
          findMathsExtraLevel(gameType, island.yearGroup) !== undefined,
      );
      expect(
        mathsRegion?.extraGames
          .map(({ gameType }) => gameType)
          .filter((gameType) => gameType !== "science-lab"),
      ).toEqual(expected);
      expect(mathsRegion?.games).toHaveLength(10);
    }
  });
});
