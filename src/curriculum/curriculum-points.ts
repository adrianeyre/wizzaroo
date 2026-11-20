import {
  findRepeat,
  InvalidCurriculumFileError,
  isNonEmptyList,
  kebabCaseShape,
  readFields,
} from "./curriculum-file.js";
import artPoints from "./curriculum-points.art.json" with { type: "json" };
import computingPoints from "./curriculum-points.computing.json" with { type: "json" };
import designPoints from "./curriculum-points.design.json" with { type: "json" };
import englishPoints from "./curriculum-points.english.json" with { type: "json" };
import geographyPoints from "./curriculum-points.geography.json" with { type: "json" };
import historyPoints from "./curriculum-points.history.json" with { type: "json" };
import languagesPoints from "./curriculum-points.languages.json" with { type: "json" };
import mathsPoints from "./curriculum-points.maths.json" with { type: "json" };
import musicPoints from "./curriculum-points.music.json" with { type: "json" };
import phonicsPoints from "./curriculum-points.phonics.json" with { type: "json" };
import sciencePoints from "./curriculum-points.science.json" with { type: "json" };
import {
  isSubject,
  isYearGroup,
  skills,
  subjects,
  type Skill,
  type Subject,
  type YearGroup,
} from "./skills.js";

export const curriculumProgrammes = ["year", "key-stage"] as const;

export type CurriculumProgramme = (typeof curriculumProgrammes)[number];

export interface CurriculumPoint {
  id: string;
  subject: Subject;
  yearGroup: YearGroup;
  programme: CurriculumProgramme;
  programmeOfStudyUrl: string;
  heading: string;
  summary: string;
  skillIds: string[];
}

const subjectFieldNames = [
  "subject",
  "programme",
  "programmeOfStudyUrl",
  "years",
];
const programmeOfStudyUrlStart = "https://www.gov.uk/";
const yearFieldNames = ["yearGroup", "points"];
const pointFieldNames = ["id", "heading", "summary", "skillIds"];

const isCurriculumProgramme = (value: unknown): value is CurriculumProgramme =>
  curriculumProgrammes.some((programme) => programme === value);

const readPointText = (value: unknown, describedAs: string): string => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new InvalidCurriculumFileError(`${describedAs} needs some words`);
  }
  return value;
};

const readPointSkillIds = (
  value: unknown,
  pointName: string,
  knownSkills: readonly Skill[],
  subject: Subject,
  yearGroup: YearGroup,
): string[] => {
  if (
    !isNonEmptyList(value) ||
    !value.every((skillId) => typeof skillId === "string")
  ) {
    throw new InvalidCurriculumFileError(
      `${pointName} needs a list of the Skills that teach it`,
    );
  }
  const repeatedSkillId = findRepeat(value);
  if (repeatedSkillId !== undefined) {
    throw new InvalidCurriculumFileError(
      `${pointName} lists the Skill "${repeatedSkillId}" twice`,
    );
  }
  for (const skillId of value) {
    const skill = knownSkills.find(({ id }) => id === skillId);
    if (skill === undefined) {
      throw new InvalidCurriculumFileError(
        `${pointName} lists "${skillId}", which isn't a Skill`,
      );
    }
    if (skill.subject !== subject || skill.yearGroup !== yearGroup) {
      throw new InvalidCurriculumFileError(
        `${pointName} lists "${skillId}", which is ${skill.subject} in Year ${String(skill.yearGroup)}`,
      );
    }
  }
  return value;
};

interface PointYear {
  subject: Subject;
  yearGroup: YearGroup;
  programme: CurriculumProgramme;
  programmeOfStudyUrl: string;
}

const parsePoint = (
  pointFile: unknown,
  { subject, yearGroup, programme, programmeOfStudyUrl }: PointYear,
  knownSkills: readonly Skill[],
): CurriculumPoint => {
  const yearName = `${subject} in Year ${String(yearGroup)}`;
  const fields = readFields(
    pointFile,
    pointFieldNames,
    `A Curriculum Point for ${yearName}`,
  );
  const id = fields.get("id");
  if (typeof id !== "string" || !kebabCaseShape.test(id)) {
    throw new InvalidCurriculumFileError(
      `A Curriculum Point for ${yearName} needs an ID shaped like "number-and-place-value"`,
    );
  }
  const pointName = `Curriculum Point "${id}" for ${yearName}`;
  return {
    id,
    subject,
    yearGroup,
    programme,
    programmeOfStudyUrl,
    heading: readPointText(
      fields.get("heading"),
      `The heading of ${pointName}`,
    ),
    summary: readPointText(
      fields.get("summary"),
      `The summary of ${pointName}`,
    ),
    skillIds: readPointSkillIds(
      fields.get("skillIds"),
      pointName,
      knownSkills,
      subject,
      yearGroup,
    ),
  };
};

const assertEverySkillHasAPoint = (
  points: readonly CurriculumPoint[],
  knownSkills: readonly Skill[],
  { subject, yearGroup }: Pick<PointYear, "subject" | "yearGroup">,
) => {
  const pointedSkillIds = new Set(points.flatMap(({ skillIds }) => skillIds));
  const skillWithoutPoint = knownSkills.find(
    (skill) =>
      skill.subject === subject &&
      skill.yearGroup === yearGroup &&
      !pointedSkillIds.has(skill.id),
  );
  if (skillWithoutPoint !== undefined) {
    throw new InvalidCurriculumFileError(
      `Skill "${skillWithoutPoint.id}" teaches no Curriculum Point for ${subject} in Year ${String(yearGroup)}`,
    );
  }
};

const parseSubjectPoints = (
  subjectFile: unknown,
  knownSkills: readonly Skill[],
): { subject: Subject; points: CurriculumPoint[] } => {
  const fields = readFields(
    subjectFile,
    subjectFieldNames,
    "A Curriculum Points file",
  );
  const subject = fields.get("subject");
  if (!isSubject(subject)) {
    throw new InvalidCurriculumFileError(
      `A Curriculum Points file needs a Subject, one of ${subjects.join(", ")}`,
    );
  }
  const programme = fields.get("programme");
  if (!isCurriculumProgramme(programme)) {
    throw new InvalidCurriculumFileError(
      `The ${subject} Curriculum Points need a programme, one of ${curriculumProgrammes.join(", ")}`,
    );
  }
  const programmeOfStudyUrl = fields.get("programmeOfStudyUrl");
  if (
    typeof programmeOfStudyUrl !== "string" ||
    !programmeOfStudyUrl.startsWith(programmeOfStudyUrlStart)
  ) {
    throw new InvalidCurriculumFileError(
      `The ${subject} Curriculum Points need a programmeOfStudyUrl on ${programmeOfStudyUrlStart}`,
    );
  }
  const yearFiles = fields.get("years");
  if (!isNonEmptyList(yearFiles)) {
    throw new InvalidCurriculumFileError(
      `The ${subject} Curriculum Points need at least one Year`,
    );
  }
  const years = yearFiles.map((yearFile) => {
    const yearFields = readFields(
      yearFile,
      yearFieldNames,
      `A Year of ${subject} Curriculum Points`,
    );
    const yearGroup = yearFields.get("yearGroup");
    if (!isYearGroup(yearGroup)) {
      throw new InvalidCurriculumFileError(
        `A Year of ${subject} Curriculum Points needs a Year Group from 1 to 6`,
      );
    }
    const pointFiles = yearFields.get("points");
    if (!isNonEmptyList(pointFiles)) {
      throw new InvalidCurriculumFileError(
        `${subject} in Year ${String(yearGroup)} needs at least one Curriculum Point`,
      );
    }
    const pointYear = { subject, yearGroup, programme, programmeOfStudyUrl };
    const points = pointFiles.map((pointFile) =>
      parsePoint(pointFile, pointYear, knownSkills),
    );
    const repeatedPointId = findRepeat(points.map(({ id }) => id));
    if (repeatedPointId !== undefined) {
      throw new InvalidCurriculumFileError(
        `${subject} in Year ${String(yearGroup)} has two Curriculum Points called "${repeatedPointId}"`,
      );
    }
    assertEverySkillHasAPoint(points, knownSkills, pointYear);
    return { yearGroup, points };
  });
  const repeatedYear = findRepeat(years.map(({ yearGroup }) => yearGroup));
  if (repeatedYear !== undefined) {
    throw new InvalidCurriculumFileError(
      `The ${subject} Curriculum Points list Year ${String(repeatedYear)} twice`,
    );
  }
  const missingYear = knownSkills.find(
    (skill) =>
      skill.subject === subject &&
      !years.some(({ yearGroup }) => yearGroup === skill.yearGroup),
  );
  if (missingYear !== undefined) {
    throw new InvalidCurriculumFileError(
      `The ${subject} Curriculum Points need Year ${String(missingYear.yearGroup)}, which has Skills`,
    );
  }
  return { subject, points: years.flatMap(({ points }) => points) };
};

export const parseCurriculumPoints = (
  subjectFiles: readonly unknown[],
  knownSkills: readonly Skill[],
): CurriculumPoint[] => {
  const subjectPoints = subjectFiles.map((subjectFile) =>
    parseSubjectPoints(subjectFile, knownSkills),
  );
  const repeatedSubject = findRepeat(
    subjectPoints.map(({ subject }) => subject),
  );
  if (repeatedSubject !== undefined) {
    throw new InvalidCurriculumFileError(
      `Two Curriculum Points files are for ${repeatedSubject}`,
    );
  }
  const subjectWithoutPoints = subjects.find(
    (subject) =>
      knownSkills.some((skill) => skill.subject === subject) &&
      !subjectPoints.some((points) => points.subject === subject),
  );
  if (subjectWithoutPoints !== undefined) {
    throw new InvalidCurriculumFileError(
      `${subjectWithoutPoints} has Skills but no Curriculum Points file`,
    );
  }
  return subjectPoints.flatMap(({ points }) => points);
};

export const curriculumPoints = parseCurriculumPoints(
  [
    mathsPoints,
    phonicsPoints,
    englishPoints,
    sciencePoints,
    musicPoints,
    geographyPoints,
    historyPoints,
    computingPoints,
    artPoints,
    designPoints,
    languagesPoints,
  ],
  skills,
);
