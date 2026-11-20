import { InvalidCurriculumFileError } from "./curriculum-file.js";
import type { YearGroup } from "./skills.js";

export const gapMark = "___";

export const wordLinks = [
  "rhymes-with",
  "opposite-of",
  "same-family-as",
  "same-meaning-as",
  "same-root-as",
  "formal-word-for",
] as const;

export type WordLink = (typeof wordLinks)[number];

export const wordClasses = [
  "capital letter",
  "noun",
  "verb",
  "adjective",
  "adverb",
  "preposition",
  "conjunction",
  "determiner",
  "pronoun",
  "modal verb",
  "relative pronoun",
  "subject",
  "object",
] as const;

export type WordClass = (typeof wordClasses)[number];

export type EnglishPrompt =
  | { kind: "sequence"; items: string[] }
  | { kind: "word-link"; word: string; link: WordLink }
  | { kind: "clue"; clue: string }
  | { kind: "word-sum"; parts: string[] }
  | { kind: "sentence-gap"; before: string; after: string }
  | { kind: "word-class"; sentence: string; wordClass: WordClass }
  | {
      kind: "passage";
      title: string;
      paragraphs: string[];
      question: string;
    }
  | { kind: "story-plan"; task: string; steps: string[] };

export interface StoryPassage {
  title: string;
  paragraphs: string[];
}

export interface EnglishQuestion {
  prompt: EnglishPrompt;
  answer: string;
  slips: string[];
}

export interface EnglishGameYear {
  skillId: string;
  ask: string;
  hint: string;
  questions: EnglishQuestion[];
}

export type EnglishGameContent = Record<YearGroup, EnglishGameYear>;

const capitalise = (word: string): string =>
  `${word.charAt(0).toUpperCase()}${word.slice(1)}`;

export const buildSentenceGapQuestion = (
  sentence: string,
  answer: string,
  slips: readonly string[],
): EnglishQuestion => {
  const parts = sentence.split(gapMark);
  if (parts.length !== 2) {
    throw new InvalidCurriculumFileError(
      `"${sentence}" needs exactly one ${gapMark} gap`,
    );
  }
  const [before, after] = parts;
  const startsSentence = before.trim() === "";
  const fitToGap = (word: string) => (startsSentence ? capitalise(word) : word);
  return {
    prompt: {
      kind: "sentence-gap",
      before: before.trimEnd(),
      after: after.trimStart(),
    },
    answer: fitToGap(answer),
    slips: slips.map(fitToGap),
  };
};

export const buildClueQuestion = (
  clue: string,
  answer: string,
  slips: readonly string[],
): EnglishQuestion => ({
  prompt: { kind: "clue", clue },
  answer,
  slips: [...slips],
});

export const buildWordSumQuestion = (
  parts: readonly string[],
  answer: string,
  slips: readonly string[],
): EnglishQuestion => ({
  prompt: { kind: "word-sum", parts: [...parts] },
  answer,
  slips: [...slips],
});

export const buildWordLinkQuestion = (
  word: string,
  link: WordLink,
  answer: string,
  slips: readonly string[],
): EnglishQuestion => ({
  prompt: { kind: "word-link", word, link },
  answer,
  slips: [...slips],
});

export const buildWordClassQuestion = (
  sentence: string,
  wordClass: WordClass,
  answer: string,
  slips: readonly string[],
): EnglishQuestion => ({
  prompt: { kind: "word-class", sentence, wordClass },
  answer,
  slips: [...slips],
});

export const buildSequenceQuestion = (
  items: readonly string[],
  answer: string,
  slips: readonly string[],
): EnglishQuestion => ({
  prompt: { kind: "sequence", items: [...items] },
  answer,
  slips: [...slips],
});

export const buildPassageQuestion = (
  { title, paragraphs }: StoryPassage,
  question: string,
  answer: string,
  slips: readonly string[],
): EnglishQuestion => ({
  prompt: { kind: "passage", title, paragraphs: [...paragraphs], question },
  answer,
  slips: [...slips],
});

export const buildStoryPlanQuestion = (
  task: string,
  steps: readonly string[],
  answer: string,
  slips: readonly string[],
): EnglishQuestion => ({
  prompt: { kind: "story-plan", task, steps: [...steps] },
  answer,
  slips: [...slips],
});

export const describeSentenceGap = ({
  before,
  after,
}: {
  before: string;
  after: string;
}): string => [before, gapMark, after].filter((part) => part !== "").join(" ");
