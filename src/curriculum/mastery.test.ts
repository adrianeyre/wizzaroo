import { describe, expect, it } from "vitest";
import {
  buildDailyPractice,
  buildMastery,
  buildPracticeDays,
  buildSkillMastery,
  addDaysToLocalDate,
  combinePracticeDays,
  firstReviewIntervalDays,
  getLocalDate,
  isLocalDate,
  findWeakSpots,
  type SkillMastery,
  type PracticeEvent,
} from "./mastery.js";
import type { Skill } from "./skills.js";
import { skills } from "./skills.js";

const numberBonds10: Skill = {
  id: "maths.number-bonds-10",
  name: "Number bonds to 10",
  subject: "maths",
  yearGroup: 1,
  strand: "addition-and-subtraction",
  prerequisites: [],
  masteryRule: { percentCorrect: 80, separateDays: 3 },
};

const answerQuestions = (
  localDate: string,
  rightFirstTimeCount: number,
  questionCount: number,
  skillId = numberBonds10.id,
): PracticeEvent[] =>
  Array.from({ length: questionCount }, (_, index) => ({
    kind: "question-answered",
    skillId,
    localDate,
    isRightFirstTime: index < rightFirstTimeCount,
  }));

const finishActivity = (
  localDate: string,
  secondsSpent: number,
): PracticeEvent => ({
  kind: "activity-finished",
  skillId: numberBonds10.id,
  localDate,
  secondsSpent,
});

const buildNumberBondsMastery = (
  practiceEvents: PracticeEvent[],
  today = "2026-11-20",
) => buildSkillMastery(numberBonds10, buildPracticeDays(practiceEvents), today);

const shuffleWithSeed = <Value>(values: Value[], seed: number): Value[] => {
  const shuffled = [...values];
  let state = seed;
  for (let index = shuffled.length - 1; index > 0; index--) {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    const swapIndex = state % (index + 1);
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
};

describe("buildSkillMastery", () => {
  it("leaves a Skill Not started until a Child answers a Question on it", () => {
    expect(buildNumberBondsMastery([])).toEqual({
      skillId: numberBonds10.id,
      state: "not-started",
      percentCorrect: null,
      timeSpentSeconds: 0,
      goodDayCount: 0,
      goodDaysNeeded: 3,
      reviewIntervalDays: null,
      nextReviewDate: null,
    });
  });

  it("makes a Skill Mastered after 80% on 3 separate days", () => {
    const mastery = buildNumberBondsMastery([
      ...answerQuestions("2026-11-14", 8, 10),
      ...answerQuestions("2026-11-15", 9, 10),
      ...answerQuestions("2026-11-17", 10, 10),
    ]);

    expect(mastery.state).toBe("mastered");
    expect(mastery.goodDayCount).toBe(3);
    expect(mastery.percentCorrect).toBe(90);
  });

  it("keeps a Skill Learning after 80% three times in one day", () => {
    const mastery = buildNumberBondsMastery([
      ...answerQuestions("2026-11-14", 8, 10),
      ...answerQuestions("2026-11-14", 9, 10),
      ...answerQuestions("2026-11-14", 10, 10),
    ]);

    expect(mastery.state).toBe("learning");
    expect(mastery.goodDayCount).toBe(1);
  });

  it("never counts a day below 80% towards Mastery", () => {
    const mastery = buildNumberBondsMastery([
      ...answerQuestions("2026-11-14", 8, 10),
      ...answerQuestions("2026-11-15", 7, 10),
      ...answerQuestions("2026-11-16", 8, 10),
    ]);

    expect(mastery.state).toBe("learning");
    expect(mastery.goodDayCount).toBe(2);
  });

  it("follows the Skill's own mastery rule", () => {
    const strictSkill: Skill = {
      ...numberBonds10,
      masteryRule: { percentCorrect: 100, separateDays: 1 },
    };

    const mastery = (rightFirstTimeCount: number) =>
      buildSkillMastery(
        strictSkill,
        buildPracticeDays(
          answerQuestions("2026-11-14", rightFirstTimeCount, 5),
        ),
        "2026-11-14",
      ).state;

    expect(mastery(4)).toBe("learning");
    expect(mastery(5)).toBe("mastered");
  });

  const masteredOnNovember3 = [
    ...answerQuestions("2026-11-01", 9, 10),
    ...answerQuestions("2026-11-02", 9, 10),
    ...answerQuestions("2026-11-03", 9, 10),
  ];

  it(`makes a Mastered Skill Due for review ${String(firstReviewIntervalDays)} days after it became Mastered`, () => {
    expect(
      buildNumberBondsMastery(masteredOnNovember3, "2026-11-09"),
    ).toMatchObject({
      state: "mastered",
      reviewIntervalDays: 7,
      nextReviewDate: "2026-11-10",
    });
    expect(
      buildNumberBondsMastery(masteredOnNovember3, "2026-11-10").state,
    ).toBe("due-for-review");
  });

  it("doubles the time before the next Review after each good Review", () => {
    const afterFirstReview = [
      ...masteredOnNovember3,
      ...answerQuestions("2026-11-10", 9, 10),
    ];
    const afterSecondReview = [
      ...afterFirstReview,
      ...answerQuestions("2026-11-24", 10, 10),
    ];

    expect(
      buildNumberBondsMastery(afterFirstReview, "2026-11-23"),
    ).toMatchObject({
      state: "mastered",
      reviewIntervalDays: 14,
      nextReviewDate: "2026-11-24",
    });
    expect(buildNumberBondsMastery(afterFirstReview, "2026-11-24").state).toBe(
      "due-for-review",
    );
    expect(
      buildNumberBondsMastery(afterSecondReview, "2026-12-21"),
    ).toMatchObject({
      state: "mastered",
      reviewIntervalDays: 28,
      nextReviewDate: "2026-12-22",
    });
  });

  it("keeps a Skill Due for review after a poor Review, without growing the interval, until a good one", () => {
    const afterPoorReview = [
      ...masteredOnNovember3,
      ...answerQuestions("2026-11-12", 3, 10),
    ];

    expect(
      buildNumberBondsMastery(afterPoorReview, "2026-11-13"),
    ).toMatchObject({
      state: "due-for-review",
      reviewIntervalDays: 7,
      nextReviewDate: "2026-11-10",
    });
    expect(
      buildNumberBondsMastery(
        [...afterPoorReview, ...answerQuestions("2026-11-13", 9, 10)],
        "2026-11-13",
      ),
    ).toMatchObject({
      state: "mastered",
      reviewIntervalDays: 14,
      nextReviewDate: "2026-11-27",
    });
  });

  it("leaves the Review schedule alone when a Child practises a Mastered Skill before it is Due for review", () => {
    const mastery = buildNumberBondsMastery(
      [...masteredOnNovember3, ...answerQuestions("2026-11-06", 10, 10)],
      "2026-11-10",
    );

    expect(mastery).toMatchObject({
      state: "due-for-review",
      reviewIntervalDays: 7,
      nextReviewDate: "2026-11-10",
    });
  });

  it("adds up the time spent on every Activity on the Skill", () => {
    const mastery = buildNumberBondsMastery([
      ...answerQuestions("2026-11-14", 1, 1),
      finishActivity("2026-11-14", 95),
      finishActivity("2026-11-15", 120),
    ]);

    expect(mastery.timeSpentSeconds).toBe(215);
  });

  it("always gives the same Mastery when the same events are replayed, in any order", () => {
    const practice = [
      ...answerQuestions("2026-11-14", 8, 10),
      ...answerQuestions("2026-11-15", 6, 10),
      ...answerQuestions("2026-11-16", 9, 10),
      ...answerQuestions("2026-11-16", 2, 4, "phonics.sound-s"),
      finishActivity("2026-11-14", 300),
      finishActivity("2026-11-16", 240),
    ];

    const replays = [1, 2, 3, 4, 5].map((seed) =>
      buildMastery(
        skills,
        buildPracticeDays(shuffleWithSeed(practice, seed)),
        "2026-11-20",
      ),
    );

    for (const replay of replays) {
      expect(replay).toEqual(replays[0]);
    }
    expect(replays[0].map(({ skillId }) => skillId)).toEqual([
      "maths.number-bonds-10",
      "phonics.sound-s",
    ]);
  });
});

describe("combinePracticeDays", () => {
  it("adds together practice on the same Skill and day, as from two Family Devices", () => {
    const fromKitchenTablet = buildPracticeDays(
      answerQuestions("2026-11-14", 4, 5),
    );
    const fromLaptop = buildPracticeDays(answerQuestions("2026-11-14", 3, 5));

    expect(combinePracticeDays([...fromKitchenTablet, ...fromLaptop])).toEqual([
      {
        skillId: numberBonds10.id,
        localDate: "2026-11-14",
        questionCount: 10,
        rightFirstTimeCount: 7,
        secondsSpent: 0,
      },
    ]);
  });
});

describe("addDaysToLocalDate", () => {
  it("counts whole calendar days, across months, years and the clocks changing", () => {
    expect(addDaysToLocalDate("2026-10-24", 7)).toBe("2026-10-31");
    expect(addDaysToLocalDate("2026-12-25", 14)).toBe("2027-01-08");
    expect(addDaysToLocalDate("2027-03-27", 1)).toBe("2027-03-28");
  });
});

describe("getLocalDate", () => {
  it("names the day by the device's own calendar", () => {
    expect(getLocalDate(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(isLocalDate("2026-01-05")).toBe(true);
    expect(isLocalDate("2026-1-5")).toBe(false);
    expect(isLocalDate("2026-13-45")).toBe(false);
  });
});

describe("buildDailyPractice", () => {
  it("adds up every Skill's practice for each of the last days, ending today, with a quiet day as zero", () => {
    const practiceDays = buildPracticeDays([
      ...answerQuestions("2026-11-12", 4, 5),
      ...answerQuestions("2026-11-14", 2, 3),
      ...answerQuestions("2026-11-14", 1, 1, "phonics.sound-m"),
      finishActivity("2026-11-14", 90),
      ...answerQuestions("2026-11-01", 5, 5),
    ]);

    expect(buildDailyPractice(practiceDays, "2026-11-14", 3)).toEqual([
      {
        localDate: "2026-11-12",
        questionCount: 5,
        rightFirstTimeCount: 4,
        secondsSpent: 0,
      },
      {
        localDate: "2026-11-13",
        questionCount: 0,
        rightFirstTimeCount: 0,
        secondsSpent: 0,
      },
      {
        localDate: "2026-11-14",
        questionCount: 4,
        rightFirstTimeCount: 3,
        secondsSpent: 90,
      },
    ]);
  });
});

describe("findWeakSpots", () => {
  const skillMastery = (
    skillId: string,
    state: SkillMastery["state"],
    percentCorrect: number | null,
  ): SkillMastery => ({
    skillId,
    state,
    percentCorrect,
    timeSpentSeconds: 60,
    goodDayCount: 0,
    goodDaysNeeded: 3,
    reviewIntervalDays: null,
    nextReviewDate: null,
  });

  it("lists the Skills still being learnt below 70% right first time, weakest first, at most three", () => {
    expect(
      findWeakSpots([
        skillMastery("a", "learning", 65),
        skillMastery("b", "learning", 20),
        skillMastery("c", "mastered", 10),
        skillMastery("d", "learning", 90),
        skillMastery("e", "learning", null),
        skillMastery("f", "learning", 40),
        skillMastery("g", "learning", 69),
      ]),
    ).toEqual(["b", "f", "a"]);
  });
});
