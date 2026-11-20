import {
  curriculumPoints,
  type CurriculumPoint,
  type CurriculumProgramme,
} from "./curriculum-points.js";
import { isMasteredState, type SkillMastery } from "./mastery.js";
import {
  skills,
  subjects,
  type Skill,
  type Subject,
  type YearGroup,
} from "./skills.js";

export const pointStatuses = [
  "needs-help",
  "not-started",
  "learning",
  "complete",
] as const;

export type PointStatus = (typeof pointStatuses)[number];

export interface SkillCoverage {
  skill: Skill;
  mastery: SkillMastery | undefined;
  percentComplete: number;
  isTricky: boolean;
}

export interface PointCoverage {
  point: CurriculumPoint;
  percentComplete: number;
  status: PointStatus;
  skills: SkillCoverage[];
}

export interface SubjectCoverage {
  subject: Subject;
  programme: CurriculumProgramme;
  programmeOfStudyUrl: string;
  percentComplete: number;
  points: PointCoverage[];
}

const percentWhole = 100;

const getAverage = (values: readonly number[]): number =>
  values.length === 0
    ? 0
    : Math.round(
        values.reduce((total, value) => total + value, 0) / values.length,
      );

const getSkillPercentComplete = (mastery: SkillMastery | undefined): number => {
  if (mastery === undefined || mastery.state === "not-started") {
    return 0;
  }
  if (isMasteredState(mastery.state)) {
    return percentWhole;
  }
  return mastery.goodDaysNeeded === 0
    ? 0
    : Math.min(
        percentWhole - 1,
        Math.floor(
          (mastery.goodDayCount * percentWhole) / mastery.goodDaysNeeded,
        ),
      );
};

const isPractised = ({ mastery }: SkillCoverage): boolean =>
  mastery !== undefined && mastery.state !== "not-started";

export const buildSkillCoverage = (
  skill: Skill,
  mastery: SkillMastery | undefined,
): SkillCoverage => ({
  skill,
  mastery,
  percentComplete: getSkillPercentComplete(mastery),
  isTricky:
    mastery?.state === "learning" &&
    mastery.percentCorrect !== null &&
    mastery.percentCorrect < skill.masteryRule.percentCorrect,
});

const decidePointStatus = (
  skillCoverage: readonly SkillCoverage[],
): PointStatus => {
  if (
    skillCoverage.every(
      ({ percentComplete }) => percentComplete === percentWhole,
    )
  ) {
    return "complete";
  }
  if (skillCoverage.some(({ isTricky }) => isTricky)) {
    return "needs-help";
  }
  return skillCoverage.some(isPractised) ? "learning" : "not-started";
};

const buildPointCoverage = (
  point: CurriculumPoint,
  mastery: readonly SkillMastery[],
  knownSkills: readonly Skill[],
): PointCoverage => {
  const skillCoverage = point.skillIds.flatMap((skillId) => {
    const skill = knownSkills.find(({ id }) => id === skillId);
    return skill === undefined
      ? []
      : [
          buildSkillCoverage(
            skill,
            mastery.find((skillMastery) => skillMastery.skillId === skillId),
          ),
        ];
  });
  return {
    point,
    percentComplete: getAverage(
      skillCoverage.map(({ percentComplete }) => percentComplete),
    ),
    status: decidePointStatus(skillCoverage),
    skills: skillCoverage,
  };
};

export const isGapStatus = (status: PointStatus): boolean =>
  status === "needs-help" || status === "not-started";

export const listCurriculumYears = (
  points: readonly CurriculumPoint[] = curriculumPoints,
): YearGroup[] =>
  [...new Set(points.map(({ yearGroup }) => yearGroup))].toSorted(
    (first, second) => first - second,
  );

export const buildYearCoverage = (
  yearGroup: YearGroup,
  mastery: readonly SkillMastery[],
  points: readonly CurriculumPoint[] = curriculumPoints,
  knownSkills: readonly Skill[] = skills,
): SubjectCoverage[] =>
  subjects.flatMap((subject) => {
    const subjectPoints = points.filter(
      (point) => point.subject === subject && point.yearGroup === yearGroup,
    );
    const firstPoint = subjectPoints.at(0);
    if (firstPoint === undefined) {
      return [];
    }
    const pointCoverage = subjectPoints.map((point) =>
      buildPointCoverage(point, mastery, knownSkills),
    );
    return [
      {
        subject,
        programme: firstPoint.programme,
        programmeOfStudyUrl: firstPoint.programmeOfStudyUrl,
        percentComplete: getAverage(
          pointCoverage.map(({ percentComplete }) => percentComplete),
        ),
        points: pointCoverage,
      },
    ];
  });
