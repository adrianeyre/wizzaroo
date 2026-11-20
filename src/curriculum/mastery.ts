import type { Skill } from "./skills.js";

export type PracticeEvent =
  | {
      kind: "question-answered";
      skillId: string;
      localDate: string;
      isRightFirstTime: boolean;
    }
  | {
      kind: "activity-finished";
      skillId: string;
      localDate: string;
      secondsSpent: number;
    };

export interface PracticeDay {
  skillId: string;
  localDate: string;
  questionCount: number;
  rightFirstTimeCount: number;
  secondsSpent: number;
}

export const masteryStates = [
  "not-started",
  "learning",
  "mastered",
  "due-for-review",
] as const;

export type MasteryState = (typeof masteryStates)[number];

export interface SkillMastery {
  skillId: string;
  state: MasteryState;
  percentCorrect: number | null;
  timeSpentSeconds: number;
  goodDayCount: number;
  goodDaysNeeded: number;
  reviewIntervalDays: number | null;
  nextReviewDate: string | null;
}

interface ReviewSchedule {
  intervalDays: number;
  nextReviewDate: string;
}

export const firstReviewIntervalDays = 7;
export const reviewIntervalGrowth = 2;

const localDateLength = "2026-01-31".length;

const localDateShape = /^\d{4}-\d{2}-\d{2}$/;

export const isLocalDate = (value: unknown): value is string =>
  typeof value === "string" &&
  localDateShape.test(value) &&
  !Number.isNaN(Date.parse(value));

export const isMasteryState = (value: unknown): value is MasteryState =>
  masteryStates.some((state) => state === value);

export const getLocalDate = (moment: Date): string => {
  const month = String(moment.getMonth() + 1).padStart(2, "0");
  const day = String(moment.getDate()).padStart(2, "0");
  return `${String(moment.getFullYear())}-${month}-${day}`;
};

export const addDaysToLocalDate = (localDate: string, days: number): string => {
  const moment = new Date(`${localDate}T00:00:00Z`);
  moment.setUTCDate(moment.getUTCDate() + days);
  return moment.toISOString().slice(0, localDateLength);
};

// Dates all have the one shape, so comparing them as strings orders them by day. localeCompare is slow, and most pairs
// share a Skill, so it orders only Skills (pen test F4, #319).
const compareLocalDates = (first: string, second: string): number =>
  first < second ? -1 : first > second ? 1 : 0;

const comparePracticeDays = (first: PracticeDay, second: PracticeDay) =>
  first.skillId === second.skillId
    ? compareLocalDates(first.localDate, second.localDate)
    : first.skillId.localeCompare(second.skillId);

export const combinePracticeDays = (
  practiceDays: readonly PracticeDay[],
): PracticeDay[] => {
  const combined = new Map<string, PracticeDay>();
  for (const practiceDay of practiceDays) {
    const key = `${practiceDay.skillId} ${practiceDay.localDate}`;
    const sameDay = combined.get(key);
    combined.set(
      key,
      sameDay === undefined
        ? { ...practiceDay }
        : {
            ...sameDay,
            questionCount: sameDay.questionCount + practiceDay.questionCount,
            rightFirstTimeCount:
              sameDay.rightFirstTimeCount + practiceDay.rightFirstTimeCount,
            secondsSpent: sameDay.secondsSpent + practiceDay.secondsSpent,
          },
    );
  }
  return [...combined.values()].toSorted(comparePracticeDays);
};

export const buildPracticeDay = (practiceEvent: PracticeEvent): PracticeDay => {
  const { skillId, localDate } = practiceEvent;
  if (practiceEvent.kind === "activity-finished") {
    return {
      skillId,
      localDate,
      questionCount: 0,
      rightFirstTimeCount: 0,
      secondsSpent: practiceEvent.secondsSpent,
    };
  }
  return {
    skillId,
    localDate,
    questionCount: 1,
    rightFirstTimeCount: practiceEvent.isRightFirstTime ? 1 : 0,
    secondsSpent: 0,
  };
};

export const buildPracticeDays = (
  practiceEvents: readonly PracticeEvent[],
): PracticeDay[] => combinePracticeDays(practiceEvents.map(buildPracticeDay));

/** Whether a Skill's practice on one day counts towards Mastery: some questions, and enough of them right first time. */
export const isGoodDay = (
  {
    questionCount,
    rightFirstTimeCount,
  }: Pick<PracticeDay, "questionCount" | "rightFirstTimeCount">,
  percentCorrect: number,
): boolean =>
  questionCount > 0 &&
  rightFirstTimeCount * 100 >= percentCorrect * questionCount;

const sumPracticeDays = (
  practiceDays: readonly PracticeDay[],
  field: "questionCount" | "rightFirstTimeCount" | "secondsSpent",
) => practiceDays.reduce((total, practiceDay) => total + practiceDay[field], 0);

const buildReviewSchedule = (
  intervalDays: number,
  fromDate: string,
): ReviewSchedule => ({
  intervalDays,
  nextReviewDate: addDaysToLocalDate(fromDate, intervalDays),
});

// A day that isn't good changes neither the count nor the schedule, so the schedule is a fold over the good days alone,
// oldest first. The server's replay keeps each Skill's good days apart and folds over them without the rest (pen test F4, #319).
const followGoodDays = (
  goodDates: readonly string[],
  goodDateCount: number,
  separateDays: number,
): ReviewSchedule | undefined => {
  let schedule: ReviewSchedule | undefined;
  for (let index = 0; index < goodDateCount; index += 1) {
    const localDate = goodDates[index];
    if (schedule === undefined) {
      schedule =
        index + 1 >= separateDays
          ? buildReviewSchedule(firstReviewIntervalDays, localDate)
          : undefined;
    } else if (localDate >= schedule.nextReviewDate) {
      schedule = buildReviewSchedule(
        schedule.intervalDays * reviewIntervalGrowth,
        localDate,
      );
    }
  }
  return schedule;
};

const followReviewSchedule = (
  skillDays: readonly PracticeDay[],
  { percentCorrect, separateDays }: Skill["masteryRule"],
) => {
  const goodDates = skillDays
    .filter((practiceDay) => isGoodDay(practiceDay, percentCorrect))
    .map(({ localDate }) => localDate);
  return {
    goodDayCount: goodDates.length,
    schedule: followGoodDays(goodDates, goodDates.length, separateDays),
  };
};

const decideMasteryState = (
  questionCount: number,
  schedule: ReviewSchedule | undefined,
  today: string,
): MasteryState => {
  if (questionCount === 0) {
    return "not-started";
  }
  if (schedule === undefined) {
    return "learning";
  }
  return today >= schedule.nextReviewDate ? "due-for-review" : "mastered";
};

/**
 * A Skill's Mastery state from its good days alone, oldest first, of which the first goodDateCount are counted, and
 * whether it has any questions answered. The same as buildSkillMastery's state for the days those came from.
 */
export const findMasteryStateFromGoodDays = (
  goodDates: readonly string[],
  goodDateCount: number,
  hasQuestions: boolean,
  { separateDays }: Skill["masteryRule"],
  today: string,
): MasteryState =>
  decideMasteryState(
    hasQuestions ? 1 : 0,
    followGoodDays(goodDates, goodDateCount, separateDays),
    today,
  );

export const isMasteredState = (state: MasteryState): boolean =>
  state === "mastered" || state === "due-for-review";

export const buildSkillMastery = (
  skill: Skill,
  practiceDays: readonly PracticeDay[],
  today: string,
): SkillMastery => {
  const skillDays = combinePracticeDays(
    practiceDays.filter(({ skillId }) => skillId === skill.id),
  );
  const questionCount = sumPracticeDays(skillDays, "questionCount");
  const rightFirstTimeCount = sumPracticeDays(skillDays, "rightFirstTimeCount");
  const { goodDayCount, schedule } = followReviewSchedule(
    skillDays,
    skill.masteryRule,
  );

  return {
    skillId: skill.id,
    state: decideMasteryState(questionCount, schedule, today),
    percentCorrect:
      questionCount === 0
        ? null
        : Math.round((rightFirstTimeCount * 100) / questionCount),
    timeSpentSeconds: sumPracticeDays(skillDays, "secondsSpent"),
    goodDayCount,
    goodDaysNeeded: skill.masteryRule.separateDays,
    reviewIntervalDays: schedule?.intervalDays ?? null,
    nextReviewDate: schedule?.nextReviewDate ?? null,
  };
};

export const buildMastery = (
  skills: readonly Skill[],
  practiceDays: readonly PracticeDay[],
  today: string,
): SkillMastery[] => {
  const practisedSkillIds = new Set(practiceDays.map(({ skillId }) => skillId));
  return skills
    .filter(({ id }) => practisedSkillIds.has(id))
    .map((skill) => buildSkillMastery(skill, practiceDays, today));
};

export type DailyPractice = Omit<PracticeDay, "skillId">;

export const recentPracticeDayCount = 14;

export const buildDailyPractice = (
  practiceDays: readonly PracticeDay[],
  today: string,
  dayCount: number,
): DailyPractice[] =>
  Array.from({ length: dayCount }, (_, index) => {
    const localDate = addDaysToLocalDate(today, index + 1 - dayCount);
    const sameDay = practiceDays.filter(
      (practiceDay) => practiceDay.localDate === localDate,
    );
    return {
      localDate,
      questionCount: sumPracticeDays(sameDay, "questionCount"),
      rightFirstTimeCount: sumPracticeDays(sameDay, "rightFirstTimeCount"),
      secondsSpent: sumPracticeDays(sameDay, "secondsSpent"),
    };
  });

export const weakSpotPercentCorrect = 70;
export const mostWeakSpots = 3;

/** The Skills a Child is still learning and gets right first time least often, weakest first. */
export const findWeakSpots = (mastery: readonly SkillMastery[]): string[] =>
  mastery
    .filter(
      (
        skillMastery,
      ): skillMastery is SkillMastery & { percentCorrect: number } =>
        !isMasteredState(skillMastery.state) &&
        skillMastery.percentCorrect !== null &&
        skillMastery.percentCorrect < weakSpotPercentCorrect,
    )
    .toSorted((first, second) => first.percentCorrect - second.percentCorrect)
    .slice(0, mostWeakSpots)
    .map(({ skillId }) => skillId);
