import { InvalidCurriculumFileError } from "./curriculum-file.js";
import {
  buildSequenceQuestion,
  gapMark,
  type EnglishGameContent,
  type EnglishQuestion,
} from "./english-questions.js";

const alphabet = Array.from("abcdefghijklmnopqrstuvwxyz");
const shownLetterCount = 3;
const slipReach = 4;

const listLetterSlips = (
  answerIndex: number,
  shown: readonly string[],
): string[] =>
  alphabet.filter(
    (letter, index) =>
      index !== answerIndex &&
      Math.abs(index - answerIndex) <= slipReach &&
      !shown.includes(letter),
  );

const buildNextLetterQuestion = (answerIndex: number): EnglishQuestion => {
  const shown = alphabet.slice(answerIndex - shownLetterCount, answerIndex);
  return buildSequenceQuestion(
    [...shown, gapMark],
    alphabet[answerIndex],
    listLetterSlips(answerIndex, shown),
  );
};

const buildMiddleLetterQuestion = (answerIndex: number): EnglishQuestion => {
  const shown = [alphabet[answerIndex - 1], alphabet[answerIndex + 1]];
  return buildSequenceQuestion(
    [shown[0], gapMark, shown[1]],
    alphabet[answerIndex],
    listLetterSlips(answerIndex, shown),
  );
};

const listIndexesBetween = (first: number, last: number): number[] =>
  Array.from({ length: last - first + 1 }, (_, offset) => first + offset);

interface AdjectiveForms {
  base: string;
  comparative: string;
  superlative: string;
  comparativeSlips: string[];
  superlativeSlips: string[];
}

const adjectiveForms: AdjectiveForms[] = [
  {
    base: "big",
    comparative: "bigger",
    superlative: "biggest",
    comparativeSlips: ["biger", "biggor", "more big"],
    superlativeSlips: ["bigest", "biggist", "most big"],
  },
  {
    base: "hot",
    comparative: "hotter",
    superlative: "hottest",
    comparativeSlips: ["hoter", "hotier", "more hot"],
    superlativeSlips: ["hotest", "hottist", "most hot"],
  },
  {
    base: "wet",
    comparative: "wetter",
    superlative: "wettest",
    comparativeSlips: ["weter", "wettor", "more wet"],
    superlativeSlips: ["wetest", "wettist", "most wet"],
  },
  {
    base: "thin",
    comparative: "thinner",
    superlative: "thinnest",
    comparativeSlips: ["thiner", "thinnor", "more thin"],
    superlativeSlips: ["thinest", "thinnist", "most thin"],
  },
  {
    base: "sad",
    comparative: "sadder",
    superlative: "saddest",
    comparativeSlips: ["sader", "saddor", "more sad"],
    superlativeSlips: ["sadest", "saddust", "most sad"],
  },
  {
    base: "happy",
    comparative: "happier",
    superlative: "happiest",
    comparativeSlips: ["happyer", "happiar", "happyier"],
    superlativeSlips: ["happyest", "happiist", "happyiest"],
  },
  {
    base: "funny",
    comparative: "funnier",
    superlative: "funniest",
    comparativeSlips: ["funnyer", "funier", "funnyier"],
    superlativeSlips: ["funnyest", "funiest", "funnist"],
  },
  {
    base: "easy",
    comparative: "easier",
    superlative: "easiest",
    comparativeSlips: ["easyer", "easer", "easyier"],
    superlativeSlips: ["easyest", "easest", "easiist"],
  },
  {
    base: "shiny",
    comparative: "shinier",
    superlative: "shiniest",
    comparativeSlips: ["shinyer", "shinnier", "shinyier"],
    superlativeSlips: ["shinyest", "shinniest", "shiniist"],
  },
  {
    base: "nice",
    comparative: "nicer",
    superlative: "nicest",
    comparativeSlips: ["niceer", "nicor", "nicier"],
    superlativeSlips: ["niceest", "nicist", "niciest"],
  },
  {
    base: "late",
    comparative: "later",
    superlative: "latest",
    comparativeSlips: ["lateer", "latier", "latr"],
    superlativeSlips: ["lateest", "latist", "lattest"],
  },
  {
    base: "large",
    comparative: "larger",
    superlative: "largest",
    comparativeSlips: ["largeer", "largor", "more large"],
    superlativeSlips: ["largeest", "largist", "most large"],
  },
  {
    base: "tall",
    comparative: "taller",
    superlative: "tallest",
    comparativeSlips: ["taler", "tallor", "tallier"],
    superlativeSlips: ["talest", "tallist", "tallost"],
  },
  {
    base: "fast",
    comparative: "faster",
    superlative: "fastest",
    comparativeSlips: ["fastter", "fastor", "fastier"],
    superlativeSlips: ["fasttest", "fastist", "fastiest"],
  },
];

const buildAdjectiveFormQuestions = ({
  base,
  comparative,
  superlative,
  comparativeSlips,
  superlativeSlips,
}: AdjectiveForms): EnglishQuestion[] => [
  buildSequenceQuestion(
    [base, gapMark, superlative],
    comparative,
    comparativeSlips,
  ),
  buildSequenceQuestion(
    [base, comparative, gapMark],
    superlative,
    superlativeSlips,
  ),
];

const dictionarySlipCount = 3;

const assertDictionaryOrder = (
  words: readonly string[],
  sortingLetterCount: number,
): void => {
  words.slice(1).forEach((word, index) => {
    const previousWord = words[index];
    const previousKey = previousWord.slice(0, sortingLetterCount);
    const key = word.slice(0, sortingLetterCount);
    if (key <= previousKey || word <= previousWord) {
      throw new InvalidCurriculumFileError(
        `"${word}" must sort after "${previousWord}" by its first ${String(sortingLetterCount)} letters`,
      );
    }
  });
};

const listNearestWordsOutside = (
  words: readonly string[],
  first: number,
  last: number,
): string[] =>
  words
    .map((word, index) => ({
      word,
      distance: index < first ? first - index : index - last,
    }))
    .filter(({ distance }) => distance > 0)
    .sort((left, right) => left.distance - right.distance)
    .slice(0, dictionarySlipCount)
    .map(({ word }) => word);

const buildDictionaryQuestions = (
  words: readonly string[],
  sortingLetterCount: number,
): EnglishQuestion[] => {
  assertDictionaryOrder(words, sortingLetterCount);
  const threeCarriageQuestions = listIndexesBetween(1, words.length - 2).map(
    (answerIndex) =>
      buildSequenceQuestion(
        [words[answerIndex - 1], gapMark, words[answerIndex + 1]],
        words[answerIndex],
        listNearestWordsOutside(words, answerIndex - 1, answerIndex + 1),
      ),
  );
  const fourCarriageQuestions = listIndexesBetween(2, words.length - 2)
    .filter((answerIndex) => answerIndex % 3 === 0)
    .map((answerIndex) =>
      buildSequenceQuestion(
        [
          words[answerIndex - 2],
          words[answerIndex - 1],
          gapMark,
          words[answerIndex + 1],
        ],
        words[answerIndex],
        listNearestWordsOutside(words, answerIndex - 2, answerIndex + 1),
      ),
    );
  return [...threeCarriageQuestions, ...fourCarriageQuestions];
};

const twoLetterWordLists = [
  [
    "sand",
    "seal",
    "ship",
    "sky",
    "slide",
    "smile",
    "snow",
    "spoon",
    "squirrel",
    "star",
    "sun",
    "swan",
  ],
  ["bag", "bed", "bird", "blue", "boat", "bread", "bus"],
  ["cake", "cherry", "circle", "clock", "coat", "crab", "cup"],
];

const threeLetterWordLists = [
  [
    "cabin",
    "cake",
    "calf",
    "camel",
    "candle",
    "cape",
    "car",
    "castle",
    "cat",
    "cave",
  ],
  ["stable", "step", "stick", "stone", "strong", "stuck", "sty"],
  [
    "paddle",
    "page",
    "paint",
    "palace",
    "pancake",
    "paper",
    "parrot",
    "path",
    "paw",
  ],
];

const fourLetterWordLists = [
  [
    "stable",
    "stack",
    "stadium",
    "stage",
    "stair",
    "stamp",
    "stand",
    "star",
    "station",
    "stay",
  ],
  ["place", "plain", "planet", "plaster", "plate", "play"],
  ["marble", "march", "margin", "market", "marsh", "marvel"],
  [
    "track",
    "trade",
    "traffic",
    "train",
    "tram",
    "transport",
    "trap",
    "travel",
    "tray",
  ],
];

const buildDictionaryQuestionsFromLists = (
  wordLists: readonly (readonly string[])[],
  sortingLetterCount: number,
): EnglishQuestion[] =>
  wordLists.flatMap((words) =>
    buildDictionaryQuestions(words, sortingLetterCount),
  );

const adverbialQuestions: EnglishQuestion[] = [
  buildSequenceQuestion(["Firstly", gapMark, "Thirdly"], "Secondly", [
    "Fourthly",
    "Finally",
    "Lastly",
  ]),
  buildSequenceQuestion(["Secondly", gapMark, "Fourthly"], "Thirdly", [
    "Firstly",
    "Fifthly",
    "Finally",
  ]),
  buildSequenceQuestion(
    ["Firstly", "Secondly", gapMark, "Fourthly"],
    "Thirdly",
    ["Fifthly", "Sixthly", "Finally"],
  ),
  buildSequenceQuestion(["Thirdly", gapMark, "Fifthly"], "Fourthly", [
    "Firstly",
    "Secondly",
    "Sixthly",
  ]),
  buildSequenceQuestion(
    ["In the morning", gapMark, "In the evening"],
    "In the afternoon",
    ["At dawn", "At midnight", "The next morning"],
  ),
  buildSequenceQuestion(["At dawn", gapMark, "At dusk"], "At midday", [
    "At midnight",
    "Before dawn",
    "After dusk",
  ]),
  buildSequenceQuestion(
    ["At breakfast", gapMark, "At teatime"],
    "At lunchtime",
    ["At bedtime", "At midnight", "At dawn"],
  ),
  buildSequenceQuestion(["On Monday", gapMark, "On Wednesday"], "On Tuesday", [
    "On Friday",
    "On Sunday",
    "On Thursday",
  ]),
  buildSequenceQuestion(["In January", gapMark, "In March"], "In February", [
    "In April",
    "In May",
    "In December",
  ]),
  buildSequenceQuestion(["In spring", gapMark, "In autumn"], "In summer", [
    "In winter",
    "At Christmas",
    "At New Year",
  ]),
  buildSequenceQuestion(["Yesterday", gapMark, "Tomorrow"], "Today", [
    "Last week",
    "Next week",
    "Next year",
  ]),
  buildSequenceQuestion(["Last year", gapMark, "Next year"], "This year", [
    "Long ago",
    "In ten years",
    "Two years ago",
  ]),
  buildSequenceQuestion(
    ["Earlier today", gapMark, "Later today"],
    "Right now",
    ["Last week", "Next week", "Yesterday"],
  ),
  buildSequenceQuestion(
    ["At the start", gapMark, "At the end"],
    "In the middle",
    ["Before it began", "After it ended", "Long before"],
  ),
  buildSequenceQuestion(["In the past", gapMark, "In the future"], "Nowadays", [
    "Long ago",
    "In years to come",
    "Once upon a time",
  ]),
];

export const alphabetTrain: EnglishGameContent = {
  1: {
    skillId: "english.alphabet-order",
    ask: "Which letter goes in the empty carriage?",
    hint: "Sing the alphabet up to the letter before the gap.",
    questions: [
      ...listIndexesBetween(shownLetterCount, alphabet.length - 1).map(
        buildNextLetterQuestion,
      ),
      ...listIndexesBetween(1, alphabet.length - 2).map(
        buildMiddleLetterQuestion,
      ),
    ],
  },
  2: {
    skillId: "english.comparatives-and-superlatives-er-est",
    ask: "Which word goes in the empty carriage?",
    hint: "Check the ending: does the last letter double, or does y turn into i?",
    questions: adjectiveForms.flatMap(buildAdjectiveFormQuestions),
  },
  3: {
    skillId: "english.alphabetical-order-first-two-letters",
    ask: "Which word goes in the empty carriage?",
    hint: "They all start the same, so compare the second letters.",
    questions: buildDictionaryQuestionsFromLists(twoLetterWordLists, 2),
  },
  4: {
    skillId: "english.alphabetical-order-first-three-letters",
    ask: "Which word goes in the empty carriage?",
    hint: "The first two letters match, so compare the third letters.",
    questions: buildDictionaryQuestionsFromLists(threeLetterWordLists, 3),
  },
  5: {
    skillId: "english.alphabetical-order-first-four-letters",
    ask: "Which word goes in the empty carriage?",
    hint: "The first three letters match, so compare the fourth letters.",
    questions: buildDictionaryQuestionsFromLists(fourLetterWordLists, 4),
  },
  6: {
    skillId: "english.adverbials-of-time-and-number",
    ask: "Which words go in the empty carriage?",
    hint: "Read the carriages in order and think what comes in between.",
    questions: adverbialQuestions,
  },
};
