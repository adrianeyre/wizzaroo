import { buildCheckQuestion } from "./check-questions.js";
import { checkFormats, type CheckPaper, type CheckQuestion } from "./checks.js";
import {
  findRepeat,
  InvalidCurriculumFileError,
  readFields,
} from "./curriculum-file.js";
import { shuffleValues } from "./music-game.js";
import type { PhonicsProgramme } from "./phonics-programmes.js";
import phonicsScreeningCheckWordFile from "./phonics-screening-check.words.json" with { type: "json" };

export const phonicsCheckSkillId = "phonics.read-real-and-alien-words";

export const phonicsCheckQuestionTypes = ["alien-word", "real-word"] as const;

export type PhonicsCheckQuestionType =
  (typeof phonicsCheckQuestionTypes)[number];

export const phonicsCheckQuestionTypeNames: Record<
  PhonicsCheckQuestionType,
  string
> = {
  "alien-word": "Alien words",
  "real-word": "Real words",
};

export const realWordChoice = "Real word";
export const alienWordChoice = "Alien word";

const choiceByQuestionType: Record<PhonicsCheckQuestionType, string> = {
  "alien-word": alienWordChoice,
  "real-word": realWordChoice,
};

export const alienWordsPerPaper = 10;
export const practiceQuestionCount = 10;
export const fewestWordsOfEachKind = 40;

const phonicsWordShape = /^[a-z]{2,6}$/;

export interface PhonicsCheckWords {
  realWords: string[];
  alienWords: string[];
}

const parseWordList = (value: unknown, describedAs: string): string[] => {
  if (
    !Array.isArray(value) ||
    value.length < fewestWordsOfEachKind ||
    !value.every(
      (word) => typeof word === "string" && phonicsWordShape.test(word),
    )
  ) {
    throw new InvalidCurriculumFileError(
      `The Phonics check needs at least ${String(fewestWordsOfEachKind)} ${describedAs}, each 2 to 6 small letters`,
    );
  }
  const words = value.filter((word) => typeof word === "string");
  const repeatedWord = findRepeat(words);
  if (repeatedWord !== undefined) {
    throw new InvalidCurriculumFileError(
      `The Phonics check lists "${repeatedWord}" twice`,
    );
  }
  return words;
};

export const parsePhonicsCheckWords = (file: unknown): PhonicsCheckWords => {
  const fields = readFields(
    file,
    ["realWords", "alienWords"],
    "The Phonics check words file",
  );
  const realWords = parseWordList(fields.get("realWords"), "real words");
  const alienWords = parseWordList(fields.get("alienWords"), "alien words");
  const sharedWord = alienWords.find((word) => realWords.includes(word));
  if (sharedWord !== undefined) {
    throw new InvalidCurriculumFileError(
      `The Phonics check lists "${sharedWord}" as both a real word and an alien word`,
    );
  }
  return { realWords, alienWords };
};

export const phonicsCheckWords = parsePhonicsCheckWords(
  phonicsScreeningCheckWordFile,
);

export interface PhonicsWordSounds {
  graphemes: string[];
  stageTerm: string;
}

interface GraphemeStage {
  grapheme: string;
  stageIndex: number;
}

interface SoundedPart {
  grapheme: string;
  length: number;
  splitVowelAt: number | undefined;
  stageIndex: number;
}

const splitDigraphMark = "-";

const listProgrammeGraphemes = ({
  soundOrder,
}: PhonicsProgramme): GraphemeStage[] =>
  soundOrder.flatMap(({ graphemes }, stageIndex) =>
    graphemes.map(({ grapheme }) => ({ grapheme, stageIndex })),
  );

const listPartsAt = (
  word: string,
  position: number,
  graphemes: readonly GraphemeStage[],
): SoundedPart[] =>
  graphemes.flatMap(({ grapheme, stageIndex }): SoundedPart[] => {
    if (grapheme.includes(splitDigraphMark)) {
      const [vowel, ending] = grapheme.split(splitDigraphMark);
      const isSplit =
        word[position] === vowel &&
        position + 2 === word.length - 1 &&
        word.endsWith(ending);
      return isSplit
        ? [{ grapheme, length: 1, splitVowelAt: word.length - 1, stageIndex }]
        : [];
    }
    return word.startsWith(grapheme, position)
      ? [
          {
            grapheme,
            length: grapheme.length,
            splitVowelAt: undefined,
            stageIndex,
          },
        ]
      : [];
  });

interface Segmentation {
  graphemes: string[];
  latestStage: number;
}

const segmentFrom = (
  word: string,
  position: number,
  skipAt: number | undefined,
  graphemes: readonly GraphemeStage[],
): Segmentation | undefined => {
  if (position >= word.length) {
    return { graphemes: [], latestStage: -1 };
  }
  if (position === skipAt) {
    return segmentFrom(word, position + 1, undefined, graphemes);
  }
  const candidates = listPartsAt(word, position, graphemes).flatMap((part) => {
    if (part.splitVowelAt !== undefined && skipAt !== undefined) {
      return [];
    }
    const rest = segmentFrom(
      word,
      position + part.length,
      part.splitVowelAt ?? skipAt,
      graphemes,
    );
    return rest === undefined
      ? []
      : [
          {
            graphemes: [part.grapheme, ...rest.graphemes],
            latestStage: Math.max(part.stageIndex, rest.latestStage),
          },
        ];
  });
  return candidates
    .toSorted(
      (first, second) =>
        first.graphemes.length - second.graphemes.length ||
        first.latestStage - second.latestStage,
    )
    .at(0);
};

export const findPhonicsWordSounds = (
  word: string,
  phonicsProgramme: PhonicsProgramme,
): PhonicsWordSounds | undefined => {
  const segmentation = segmentFrom(
    word,
    0,
    undefined,
    listProgrammeGraphemes(phonicsProgramme),
  );
  const stage =
    segmentation === undefined
      ? undefined
      : phonicsProgramme.soundOrder.at(segmentation.latestStage);
  return segmentation === undefined || stage === undefined
    ? undefined
    : { graphemes: segmentation.graphemes, stageTerm: stage.term };
};

export const describePhonicsWordSounds = (
  { graphemes, stageTerm }: PhonicsWordSounds,
  { name }: PhonicsProgramme,
): string =>
  `Sounds: ${graphemes.join(" · ")} (taught by ${stageTerm} in ${name})`;

const listProgrammeWords = (
  words: readonly string[],
  phonicsProgramme: PhonicsProgramme | undefined,
): string[] =>
  phonicsProgramme === undefined
    ? [...words]
    : words.filter(
        (word) => findPhonicsWordSounds(word, phonicsProgramme) !== undefined,
      );

interface PhonicsCheckWord {
  word: string;
  questionType: PhonicsCheckQuestionType;
}

const pickPhonicsWords = (
  words: readonly string[],
  questionType: PhonicsCheckQuestionType,
  count: number,
  random: () => number,
  phonicsProgramme: PhonicsProgramme | undefined,
): PhonicsCheckWord[] =>
  shuffleValues(listProgrammeWords(words, phonicsProgramme), random)
    .slice(0, count)
    .map((word) => ({ word, questionType }));

const findSoundNote = (
  word: string,
  phonicsProgramme: PhonicsProgramme | undefined,
): string | undefined => {
  const sounds =
    phonicsProgramme === undefined
      ? undefined
      : findPhonicsWordSounds(word, phonicsProgramme);
  return sounds === undefined || phonicsProgramme === undefined
    ? undefined
    : describePhonicsWordSounds(sounds, phonicsProgramme);
};

export const buildPhonicsScreeningCheckPaper = (
  random: () => number,
  phonicsProgramme?: PhonicsProgramme,
): CheckPaper => {
  const realWordCount =
    checkFormats["phonics-screening-check"].questionCount - alienWordsPerPaper;
  return {
    passageTitle: undefined,
    passage: undefined,
    questions: [
      ...pickPhonicsWords(
        phonicsCheckWords.alienWords,
        "alien-word",
        alienWordsPerPaper,
        random,
        phonicsProgramme,
      ),
      ...pickPhonicsWords(
        phonicsCheckWords.realWords,
        "real-word",
        realWordCount,
        random,
        phonicsProgramme,
      ),
    ].map(({ word, questionType }): CheckQuestion => ({
      ...buildCheckQuestion({
        key: word,
        skillId: phonicsCheckSkillId,
        questionType,
        prompt: word,
        answerShape: "read-aloud",
        acceptedAnswers: [word],
      }),
      soundNote: findSoundNote(word, phonicsProgramme),
    })),
  };
};

const buildRealOrAlienQuestion = ({
  word,
  questionType,
}: PhonicsCheckWord): CheckQuestion =>
  buildCheckQuestion({
    key: word,
    skillId: phonicsCheckSkillId,
    questionType,
    prompt: word,
    answerShape: "choice",
    choices: [realWordChoice, alienWordChoice],
    acceptedAnswers: [choiceByQuestionType[questionType]],
  });

export const buildPhonicsCheckPracticePaper = (
  random: () => number,
  phonicsProgramme?: PhonicsProgramme,
): CheckPaper => {
  const alienWordCount = practiceQuestionCount / 2;
  return {
    passageTitle: undefined,
    passage: undefined,
    questions: shuffleValues(
      [
        ...pickPhonicsWords(
          phonicsCheckWords.alienWords,
          "alien-word",
          alienWordCount,
          random,
          phonicsProgramme,
        ),
        ...pickPhonicsWords(
          phonicsCheckWords.realWords,
          "real-word",
          practiceQuestionCount - alienWordCount,
          random,
          phonicsProgramme,
        ),
      ],
      random,
    ).map(buildRealOrAlienQuestion),
  };
};
