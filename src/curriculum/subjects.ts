export const subjects = [
  "maths",
  "phonics",
  "english",
  "science",
  "music",
  "geography",
  "history",
  "computing",
  "art",
  "design",
  "languages",
] as const;
export type Subject = (typeof subjects)[number];

export const subjectNames: Record<Subject, string> = {
  maths: "Maths",
  phonics: "Phonics",
  english: "English",
  science: "Science",
  music: "Music",
  geography: "Geography",
  history: "History",
  computing: "Computing",
  art: "Art and design",
  design: "Design and technology",
  languages: "Languages",
};

export const isSubject = (value: unknown): value is Subject =>
  subjects.some((subject) => subject === value);
