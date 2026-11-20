export const nationalCurriculumUrl =
  "https://www.gov.uk/government/collections/national-curriculum";

export interface SubjectWithoutGames {
  name: string;
  reason: string;
  programmeOfStudyUrl: string;
}

export const subjectsWithoutGames: readonly SubjectWithoutGames[] = [
  {
    name: "Physical education",
    reason:
      "Every part of it is done by moving, so it's taught at school and at home, not by a Game.",
    programmeOfStudyUrl:
      "https://www.gov.uk/government/publications/national-curriculum-in-england-physical-education-programmes-of-study",
  },
];
