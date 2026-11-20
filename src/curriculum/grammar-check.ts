import {
  buildAuthoredCheckQuestion,
  buildCheckQuestion,
  parseAuthoredCheckQuestions,
  pickMixedItems,
  type AuthoredCheckQuestion,
} from "./check-questions.js";
import { checkFormats, type CheckPaper, type CheckQuestion } from "./checks.js";
import { englishGames, type EnglishGameType } from "./english-games.js";
import {
  gapMark,
  type EnglishPrompt,
  type EnglishQuestion,
} from "./english-questions.js";
import grammarCheckQuestionFile from "./grammar-check.questions.json" with { type: "json" };
import { shuffleValues } from "./music-game.js";
import type { YearGroup } from "./skills.js";

export const grammarQuestionTypes = [
  "punctuation",
  "word-classes",
  "subject-and-object",
  "standard-english",
  "formal-english",
  "clauses",
  "cohesion",
  "apostrophes",
  "vocabulary",
  "sentence-types",
  "verb-tenses",
  "active-and-passive",
] as const;

export type GrammarQuestionType = (typeof grammarQuestionTypes)[number];

export const grammarQuestionTypeNames: Record<GrammarQuestionType, string> = {
  punctuation: "Punctuation",
  "word-classes": "Word classes",
  "subject-and-object": "Subject and object",
  "standard-english": "Standard English",
  "formal-english": "Formal English",
  clauses: "Clauses and conjunctions",
  cohesion: "Linking ideas",
  apostrophes: "Apostrophes and contractions",
  vocabulary: "Vocabulary",
  "sentence-types": "Sentence types",
  "verb-tenses": "Verb tenses",
  "active-and-passive": "Active and passive voice",
};

interface ReusedGrammarBank {
  gameType: EnglishGameType;
  yearGroup: YearGroup;
  questionType: GrammarQuestionType;
  ask: string;
}

const reusedGrammarBanks: readonly ReusedGrammarBank[] = [
  {
    gameType: "punctuation-stones",
    yearGroup: 4,
    questionType: "punctuation",
    ask: "Which punctuation mark should go in the gap? Tick one.",
  },
  {
    gameType: "punctuation-stones",
    yearGroup: 5,
    questionType: "punctuation",
    ask: "Which punctuation mark should go in the gap? Tick one.",
  },
  {
    gameType: "punctuation-stones",
    yearGroup: 6,
    questionType: "punctuation",
    ask: "Which punctuation mark should go in the gap? Tick one.",
  },
  {
    gameType: "word-detectives",
    yearGroup: 4,
    questionType: "word-classes",
    ask: "Tick one.",
  },
  {
    gameType: "word-detectives",
    yearGroup: 5,
    questionType: "word-classes",
    ask: "Tick one.",
  },
  {
    gameType: "word-detectives",
    yearGroup: 6,
    questionType: "subject-and-object",
    ask: "Tick one.",
  },
  {
    gameType: "one-or-many",
    yearGroup: 4,
    questionType: "standard-english",
    ask: "Which word completes the sentence in Standard English? Tick one.",
  },
  {
    gameType: "one-or-many",
    yearGroup: 5,
    questionType: "standard-english",
    ask: "Which verb completes the sentence correctly? Tick one.",
  },
  {
    gameType: "one-or-many",
    yearGroup: 6,
    questionType: "formal-english",
    ask: "Which word completes the sentence in formal English? Tick one.",
  },
  {
    gameType: "bridge-builder",
    yearGroup: 4,
    questionType: "clauses",
    ask: "Which conjunction completes the sentence? Tick one.",
  },
  {
    gameType: "bridge-builder",
    yearGroup: 5,
    questionType: "clauses",
    ask: "Which word should start the relative clause? Tick one.",
  },
  {
    gameType: "bridge-builder",
    yearGroup: 6,
    questionType: "cohesion",
    ask: "Which adverbial best links the two sentences? Tick one.",
  },
  {
    gameType: "word-squeeze",
    yearGroup: 5,
    questionType: "apostrophes",
    ask: "Which is the correct contraction of these words? Tick one.",
  },
  {
    gameType: "word-squeeze",
    yearGroup: 6,
    questionType: "formal-english",
    ask: "How should this be written out in full for formal writing? Tick one.",
  },
  {
    gameType: "word-lanterns",
    yearGroup: 6,
    questionType: "vocabulary",
    ask: "Which is the most formal word for this? Tick one.",
  },
];

const findIndefiniteArticle = (word: string): string =>
  /^[aeiou]/.test(word) ? "an" : "a";

const punctuationAfterGap = /^[,.;:!?)’”]/;

export const describeGrammarGap = ({
  before,
  after,
}: {
  before: string;
  after: string;
}): string => {
  const shownBefore = before === "" ? "" : `${before} `;
  const shownAfter =
    after === "" || punctuationAfterGap.test(after) ? after : ` ${after}`;
  return `${shownBefore}${gapMark}${shownAfter}`;
};

export const describeGrammarPrompt = (
  prompt: EnglishPrompt,
  ask: string,
): string => {
  switch (prompt.kind) {
    case "sentence-gap": {
      return `${ask}\n${describeGrammarGap(prompt)}`;
    }
    case "word-class": {
      const isOneOfAKind =
        prompt.wordClass === "subject" || prompt.wordClass === "object";
      const article = isOneOfAKind
        ? "the"
        : findIndefiniteArticle(prompt.wordClass);
      return `Which word in this sentence is ${article} ${prompt.wordClass}? ${ask}\n${prompt.sentence}`;
    }
    case "clue": {
      return `${ask}\n${prompt.clue}`;
    }
    case "word-link": {
      return `${ask}\n${prompt.word}`;
    }
    case "word-sum": {
      return `${ask}\n${prompt.parts.join(" + ")}`;
    }
    case "sequence": {
      return `${ask}\n${prompt.items.join(", ")}`;
    }
    case "passage": {
      return `${prompt.question} ${ask}\n${prompt.paragraphs.join("\n")}`;
    }
    case "story-plan": {
      return `${ask}\n${prompt.task}\n${prompt.steps.join(", ")}`;
    }
  }
};

interface ReusedGrammarQuestion {
  bank: ReusedGrammarBank;
  skillId: string;
  position: number;
  question: EnglishQuestion;
}

const listReusedGrammarQuestions = (): ReusedGrammarQuestion[] =>
  reusedGrammarBanks.flatMap((bank) => {
    const { skillId, questions } = englishGames[bank.gameType][bank.yearGroup];
    return questions.map((question, position) => ({
      bank,
      skillId,
      position,
      question,
    }));
  });

export const reusedGrammarQuestions = listReusedGrammarQuestions();

export const parseGrammarCheckQuestions = (
  entries: unknown,
): AuthoredCheckQuestion[] =>
  parseAuthoredCheckQuestions(
    entries,
    "the grammar paper",
    grammarQuestionTypes,
  );

export const grammarCheckQuestions = parseGrammarCheckQuestions(
  grammarCheckQuestionFile,
);

type GrammarQuestionSource =
  | { kind: "reused"; reused: ReusedGrammarQuestion }
  | { kind: "authored"; authored: AuthoredCheckQuestion };

const grammarQuestionSources: readonly GrammarQuestionSource[] = [
  ...reusedGrammarQuestions.map((reused): GrammarQuestionSource => ({
    kind: "reused",
    reused,
  })),
  ...grammarCheckQuestions.map((authored): GrammarQuestionSource => ({
    kind: "authored",
    authored,
  })),
];

const findSourceQuestionType = (source: GrammarQuestionSource): string =>
  source.kind === "reused"
    ? source.reused.bank.questionType
    : source.authored.questionType;

export const buildReusedGrammarQuestion = (
  { bank, skillId, position, question }: ReusedGrammarQuestion,
  random: () => number,
): CheckQuestion =>
  buildCheckQuestion({
    key: `${skillId}:${String(position)}`,
    skillId,
    questionType: bank.questionType,
    prompt: describeGrammarPrompt(question.prompt, bank.ask),
    answerShape: "choice",
    choices: shuffleValues([question.answer, ...question.slips], random),
    acceptedAnswers: [question.answer],
  });

const buildGrammarQuestion = (
  source: GrammarQuestionSource,
  random: () => number,
): CheckQuestion => {
  if (source.kind === "reused") {
    return buildReusedGrammarQuestion(source.reused, random);
  }
  const question = buildAuthoredCheckQuestion(source.authored);
  return {
    ...question,
    key: `grammar:${source.authored.id}`,
    choices: shuffleValues(question.choices, random),
  };
};

export const buildGrammarCheckPaper = (random: () => number): CheckPaper => ({
  passageTitle: undefined,
  passage: undefined,
  questions: pickMixedItems(
    grammarQuestionSources,
    findSourceQuestionType,
    checkFormats["grammar-check"].questionCount,
    random,
  ).map((source) => buildGrammarQuestion(source, random)),
});
