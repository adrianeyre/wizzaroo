import { eq, inArray, max, sql } from "drizzle-orm";
import {
  buildDailyPractice,
  buildMastery,
  findWeakSpots,
  getLocalDate,
  recentPracticeDayCount,
  type DailyPractice,
  type SkillMastery,
} from "../../curriculum/mastery.js";
import type { CharacterLoadout } from "../../curriculum/catalogue.js";
import type { CheckAttempt } from "../../curriculum/checks.js";
import {
  buildChildLimits,
  type TeacherLocks,
} from "../../curriculum/island-access.js";
import {
  findChildRewards,
  type RegionProgress,
} from "../../curriculum/rewards.js";
import { skills } from "../../curriculum/skills.js";
import {
  findHomeYearGroup,
  type YearGroup,
} from "../../curriculum/year-groups.js";
import type { ReachDatabase } from "../reach.js";
import { findChildSchoolYear } from "../reach-rules.js";
import {
  characters,
  childTeacherLocks,
  children,
  playEvents,
  schools,
  type ChildLimits,
} from "../schema.js";
import { loadCheckHistories } from "./check-histories.js";
import { loadFamilyRewards } from "./family-rewards.js";

export interface Child {
  id: string;
  familyId: string;
  nickname: string;
  birthMonth: number | null;
  birthYear: number | null;
  yearGroupAdjustment: -1 | 0 | 1;
  schoolYear: number | null;
  yearGroup: YearGroup | null;
  schoolId: string;
  schoolName: string | null;
  characterName: string | null;
  phonicsProgrammeId: string | null;
  hasPicturePassword: boolean;
  classmateVisitsAllowed: boolean;
  /** Whether the Admin has approved Classmate visits at the Child's School; until then the Child's own switch does nothing. */
  classmateVisitsApproved: boolean;
}

export interface ChildProgress extends Child {
  /** How the Child's Character is dressed now, or null before they've made one. */
  loadout: CharacterLoadout | null;
  timeSpentSeconds: number;
  lastPlayedAt: Date | null;
  mastery: SkillMastery[];
  weakSkillIds: string[];
  dailyPractice: DailyPractice[];
  stars: number;
  regionProgress: RegionProgress[];
  limits: ChildLimits;
  checkHistory: CheckAttempt[];
}

const childColumns = {
  id: children.id,
  familyId: children.familyId,
  nickname: children.nickname,
  birthMonth: children.birthMonth,
  birthYear: children.birthYear,
  yearGroupAdjustment: children.yearGroupAdjustment,
  schoolId: children.schoolId,
  schoolName: schools.name,
  characterName: characters.name,
  phonicsProgrammeId: children.phonicsProgrammeId,
  hasPicturePassword: children.hasPicturePassword,
  classmateVisitsAllowed: children.classmateVisitsAllowed,
  classmateVisitsApproved: schools.classmateVisitsApproved,
};

interface LoadedChild {
  child: Child;
  syncedLimits: Partial<ChildLimits>;
  teacherLocks: Partial<TeacherLocks> | null;
}

const loadChildren = async (
  database: Pick<ReachDatabase, "select">,
  childIds: string[],
  moment: Date,
): Promise<LoadedChild[]> => {
  if (childIds.length === 0) {
    return [];
  }
  const childRows = await database
    .select({
      child: childColumns,
      syncedLimits: children.syncedLimits,
      teacherLocks: childTeacherLocks.locks,
    })
    .from(children)
    .innerJoin(schools, eq(schools.id, children.schoolId))
    .leftJoin(characters, eq(characters.childId, children.id))
    .leftJoin(childTeacherLocks, eq(childTeacherLocks.childId, children.id))
    .where(inArray(children.id, childIds))
    .orderBy(children.createdAt, children.id);
  return childRows.map(({ child, syncedLimits, teacherLocks }) => {
    const schoolYear = findChildSchoolYear(child, moment);
    return {
      child: {
        ...child,
        schoolYear,
        yearGroup: schoolYear === null ? null : findHomeYearGroup(schoolYear),
      },
      syncedLimits,
      teacherLocks,
    };
  });
};

export const loadChild = async (
  database: Pick<ReachDatabase, "select">,
  childId: string,
  moment: Date,
): Promise<Child> => {
  const [{ child }] = await loadChildren(database, [childId], moment);
  return child;
};

interface PlaySummary {
  timeSpentSeconds: number;
  lastPlayedAt: Date | null;
}

/** The most of one Session that counts as time spent: a device's clock can make a Session any length (#325). */
export const longestCountedSessionSeconds = 24 * 60 * 60;

/** The most time spent a Child can show, the largest number the answer's integer column holds. */
export const largestTimeSpentSeconds = 2_147_483_647;

/**
 * Time spent adds up each Session from its start to its end, each counting for no more than a day, summed as an
 * unbounded numeric so no number of Sessions overflows it, and capped before it becomes the answer's integer (#325).
 * Last played is when the latest Session ended.
 */
export const buildPlaySummariesQuery = (
  database: Pick<ReachDatabase, "select">,
  childIds: string[],
) => {
  const sessions = database
    .select({
      childId: playEvents.childId,
      startedAt:
        sql`min(${playEvents.happenedAt}) filter (where ${playEvents.type} = 'session-started')`.as(
          "started_at",
        ),
      endedAt:
        sql`max(${playEvents.happenedAt}) filter (where ${playEvents.type} = 'session-ended')`.as(
          "ended_at",
        ),
    })
    .from(playEvents)
    .where(inArray(playEvents.childId, childIds))
    .groupBy(playEvents.childId, sql`${playEvents.payload} ->> 'sessionId'`)
    .as("sessions");
  return database
    .select({
      childId: sessions.childId,
      timeSpentSeconds: sql<number>`least(coalesce(floor(sum(least(greatest(extract(epoch from ${sessions.endedAt} - ${sessions.startedAt})::numeric, 0), ${longestCountedSessionSeconds}::numeric))), 0), ${largestTimeSpentSeconds}::numeric)::integer`,
      lastPlayedAt: max(sql<Date>`${sessions.endedAt}`),
    })
    .from(sessions)
    .groupBy(sessions.childId);
};

const loadPlaySummaries = async (
  database: Pick<ReachDatabase, "select">,
  childIds: string[],
): Promise<Map<string, PlaySummary>> => {
  const summaries = await buildPlaySummariesQuery(database, childIds);
  return new Map(
    summaries.map(({ childId, timeSpentSeconds, lastPlayedAt }) => [
      childId,
      {
        timeSpentSeconds,
        lastPlayedAt: lastPlayedAt === null ? null : new Date(lastPlayedAt),
      },
    ]),
  );
};

/** Each Child's progress as their Parents see it, worked out from the events their Family Devices sent. */
export const loadChildProgress = async (
  database: ReachDatabase,
  childIds: string[],
  moment: Date,
): Promise<ChildProgress[]> => {
  const loadedChildren = await loadChildren(database, childIds, moment);
  if (loadedChildren.length === 0) {
    return [];
  }
  const playSummaries = await loadPlaySummaries(database, childIds);
  const checkHistories = await loadCheckHistories(database, childIds);
  const familyIds = [
    ...new Set(loadedChildren.map(({ child }) => child.familyId)),
  ];
  const rewardsByFamily = new Map(
    await Promise.all(
      familyIds.map(
        async (familyId) =>
          [familyId, await loadFamilyRewards(database, familyId)] as const,
      ),
    ),
  );
  const today = getLocalDate(moment);
  return loadedChildren.map(({ child, syncedLimits, teacherLocks }) => {
    const familyRewards = rewardsByFamily.get(child.familyId);
    if (familyRewards === undefined) {
      throw new Error("a loaded Child's Family has no rewards worked out");
    }
    const { practiceDays, stars, regionProgress, loadout } = findChildRewards(
      familyRewards,
      child.id,
    );
    const mastery = buildMastery(skills, practiceDays, today);
    const playSummary = playSummaries.get(child.id);
    return {
      ...child,
      loadout: child.characterName === null ? null : loadout,
      timeSpentSeconds: playSummary?.timeSpentSeconds ?? 0,
      lastPlayedAt: playSummary?.lastPlayedAt ?? null,
      mastery,
      weakSkillIds: findWeakSpots(mastery),
      dailyPractice: buildDailyPractice(
        practiceDays,
        today,
        recentPracticeDayCount,
      ),
      stars,
      regionProgress,
      limits: buildChildLimits(syncedLimits, teacherLocks ?? {}),
      checkHistory: checkHistories.get(child.id) ?? [],
    };
  });
};

export const loadFamilyChildIds = async (
  database: Pick<ReachDatabase, "select">,
  familyId: string,
): Promise<string[]> => {
  const familyChildren = await database
    .select({ id: children.id })
    .from(children)
    .where(eq(children.familyId, familyId))
    .orderBy(children.createdAt, children.id);
  return familyChildren.map(({ id }) => id);
};
