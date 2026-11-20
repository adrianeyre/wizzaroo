import type { YearGroup } from "../../curriculum/skills.js";
import { shuffle } from "./shuffle.js";

export interface RingSortRing {
  id: string;
  label: string;
  rule: string;
}

export interface RingSortCard {
  id: string;
  ringId: string;
  before: string;
  word: string;
  after: string;
  sortedText: string;
  explanation: string;
  family: string;
}

export interface RingSortPuzzle {
  rings: readonly RingSortRing[];
  cards: readonly RingSortCard[];
}

interface RingSortContent {
  rings: readonly RingSortRing[];
  cards: readonly RingSortCard[];
}

export const ringSortCardCounts: Record<YearGroup, number> = {
  1: 8,
  2: 8,
  3: 10,
  4: 10,
  5: 10,
  6: 10,
};

export const maximumRingCount = 4;

const quote = (word: string) => `“${word}”`;

export const splitStarredSentence = (
  sentence: string,
): { before: string; word: string; after: string } => {
  const match = /^([^*]*)\*([^*]+)\*([^*]*)$/.exec(sentence);
  if (match === null) {
    throw new Error(`No starred word in "${sentence}"`);
  }
  const [, before, word, after] = match;
  return { before, word, after };
};

// Year 1: adding -s or -es to make plurals.

const nounsTakingS = [
  "cat",
  "dog",
  "hat",
  "book",
  "tree",
  "frog",
  "ship",
  "egg",
  "duck",
  "star",
  "kite",
  "bell",
  "rock",
  "cup",
  "pen",
  "car",
  "drum",
  "seal",
];

const nounsTakingEs = [
  "fox",
  "box",
  "bus",
  "dish",
  "wish",
  "kiss",
  "church",
  "bench",
  "glass",
  "dress",
  "lunch",
  "match",
  "brush",
  "peach",
  "torch",
  "waltz",
];

export const esEndings = ["ch", "sh", "ss", "s", "x", "z"] as const;

export const findEsEnding = (noun: string): string | undefined =>
  esEndings.find((ending) => noun.endsWith(ending));

const pluralContent: RingSortContent = {
  rings: [
    {
      id: "s",
      label: "add -s",
      rule: "Most words just add -s, like cats.",
    },
    {
      id: "es",
      label: "add -es",
      rule: "Words ending in s, ss, x, z, ch or sh add -es, like foxes.",
    },
  ],
  cards: [
    ...nounsTakingS.map((noun) => ({
      id: `plural-${noun}`,
      ringId: "s",
      before: "",
      word: noun,
      after: "",
      sortedText: `${noun}s`,
      explanation: `Most words just add -s: ${noun}s.`,
      family: noun,
    })),
    ...nounsTakingEs.map((noun) => ({
      id: `plural-${noun}`,
      ringId: "es",
      before: "",
      word: noun,
      after: "",
      sortedText: `${noun}es`,
      explanation: `Words ending in ${findEsEnding(noun) ?? "s"} add -es: ${noun}es.`,
      family: noun,
    })),
  ],
};

// Year 2: finding nouns, verbs, adjectives and adverbs.

type WordClass = "noun" | "verb" | "adjective" | "adverb";

const wordClassSentences: Record<WordClass, readonly string[]> = {
  noun: [
    "The hungry *fox* ran into the wood.",
    "A tiny *bird* sang sweetly.",
    "The old *owl* hooted loudly.",
    "We ate *cake* at the party.",
    "The *clown* waved to us.",
    "A *lion* roared in the ring.",
    "My *drum* is very loud.",
  ],
  verb: [
    "The frog *jumped* into the pond.",
    "Grandma *baked* a delicious cake.",
    "The juggler *dropped* a ball.",
    "The children *sang* a song.",
    "A seal *clapped* its flippers.",
    "The acrobat *swung* on the trapeze.",
    "We *painted* a big picture.",
  ],
  adjective: [
    "The *fluffy* cat slept on the rug.",
    "A *shiny* key opened the door.",
    "Tom wore a *woolly* hat.",
    "The *tall* giraffe ate leaves.",
    "A *noisy* crowd cheered.",
    "We saw a *funny* clown.",
    "The *red* balloon floated away.",
  ],
  adverb: [
    "The snail moved *slowly*.",
    "The tiger roared *loudly*.",
    "She whispered *quietly*.",
    "The acrobat landed *safely*.",
    "The robin sang *sweetly*.",
    "Sam ran *quickly* to the tent.",
    "The puppy played *happily*.",
  ],
};

const wordClassReasons: Record<WordClass, string> = {
  noun: "is a noun: it names a person, place or thing.",
  verb: "is a verb: it is an action.",
  adjective: "is an adjective: it describes a noun.",
  adverb: "is an adverb: it tells us how something happens.",
};

const wordClassContent: RingSortContent = {
  rings: [
    {
      id: "noun",
      label: "noun",
      rule: "A noun names a person, place or thing.",
    },
    { id: "verb", label: "verb", rule: "A verb is an action or doing word." },
    {
      id: "adjective",
      label: "adjective",
      rule: "An adjective describes a noun.",
    },
    {
      id: "adverb",
      label: "adverb",
      rule: "An adverb tells us how something happens, like slowly.",
    },
  ],
  cards: (["noun", "verb", "adjective", "adverb"] as const).flatMap(
    (wordClass) =>
      wordClassSentences[wordClass].map((sentence) => {
        const parts = splitStarredSentence(sentence);
        return {
          id: `class-${parts.word}`,
          ringId: wordClass,
          ...parts,
          sortedText: parts.word,
          explanation: `${quote(parts.word)} ${wordClassReasons[wordClass]}`,
          family: parts.word,
        };
      }),
  ),
};

// Year 3: choosing a or an.

type ArticleSound = "vowel" | "silent-h" | "consonant" | "you";

const articlePhrases: readonly (readonly [string, ArticleSound])[] = [
  ["apple", "vowel"],
  ["elephant", "vowel"],
  ["umbrella", "vowel"],
  ["octopus", "vowel"],
  ["egg", "vowel"],
  ["artist", "vowel"],
  ["igloo", "vowel"],
  ["orange", "vowel"],
  ["owl", "vowel"],
  ["insect", "vowel"],
  ["envelope", "vowel"],
  ["acrobat", "vowel"],
  ["ice cream", "vowel"],
  ["hour", "silent-h"],
  ["honest answer", "silent-h"],
  ["dog", "consonant"],
  ["horse", "consonant"],
  ["house", "consonant"],
  ["pencil", "consonant"],
  ["banana", "consonant"],
  ["clown", "consonant"],
  ["tiger", "consonant"],
  ["ladder", "consonant"],
  ["juggler", "consonant"],
  ["trumpet", "consonant"],
  ["unicorn", "you"],
  ["uniform", "you"],
  ["useful tip", "you"],
  ["unicycle", "you"],
];

export const articleFor = (sound: ArticleSound): "a" | "an" =>
  sound === "vowel" || sound === "silent-h" ? "an" : "a";

const articleReasons: Record<ArticleSound, (word: string) => string> = {
  vowel: (word) => `${quote(word)} starts with a vowel sound, so we say`,
  "silent-h": (word) =>
    `The h in ${quote(word)} is silent, so it starts with a vowel sound:`,
  consonant: (word) =>
    `${quote(word)} starts with a consonant sound, so we say`,
  you: (word) => `${quote(word)} starts with a “you” sound, so we say`,
};

export const listArticlePhrases = () => articlePhrases;

const articleContent: RingSortContent = {
  rings: [
    {
      id: "a",
      label: "a",
      rule: "Use a before a consonant sound, like a dog or a unicorn.",
    },
    {
      id: "an",
      label: "an",
      rule: "Use an before a vowel sound, like an apple or an hour.",
    },
  ],
  cards: articlePhrases.map(([phrase, sound]) => {
    const [word, ...rest] = phrase.split(" ");
    const article = articleFor(sound);
    const sortedText = `${article} ${phrase}`;
    return {
      id: `article-${phrase}`,
      ringId: article,
      before: "___ ",
      word,
      after: rest.length === 0 ? "" : ` ${rest.join(" ")}`,
      sortedText,
      explanation: `${articleReasons[sound](word)} ${sortedText}.`,
      family: phrase,
    };
  }),
};

// Year 4: prefixes in-, il-, im-, ir- and inter-.

type Prefix = "in" | "il" | "im" | "ir" | "inter";

export const prefixRoots: Record<Prefix, readonly string[]> = {
  in: [
    "correct",
    "visible",
    "complete",
    "accurate",
    "edible",
    "expensive",
    "credible",
    "definite",
    "secure",
    "sincere",
    "capable",
  ],
  il: ["legal", "legible", "logical", "literate"],
  im: [
    "possible",
    "polite",
    "patient",
    "mature",
    "perfect",
    "mortal",
    "probable",
    "practical",
    "mobile",
  ],
  ir: [
    "regular",
    "responsible",
    "relevant",
    "replaceable",
    "reversible",
    "resistible",
  ],
  inter: [
    "national",
    "act",
    "city",
    "change",
    "galactic",
    "connected",
    "continental",
  ],
};

const prefixReasons: Record<Prefix, (root: string, word: string) => string> = {
  in: (root, word) =>
    `${quote(root)} doesn't start with l, m, p or r, so it takes in-: ${word}.`,
  il: (root, word) => `${quote(root)} starts with l, so it takes il-: ${word}.`,
  im: (root, word) =>
    `${quote(root)} starts with ${root.charAt(0)}, so it takes im-: ${word}.`,
  ir: (root, word) => `${quote(root)} starts with r, so it takes ir-: ${word}.`,
  inter: (_root, word) => `inter- means between or among: ${word}.`,
};

const prefixContent: RingSortContent = {
  rings: [
    {
      id: "in",
      label: "in-",
      rule: "in- means not, and goes before most letters, like incorrect.",
    },
    {
      id: "il",
      label: "il-",
      rule: "il- means not, and goes before words starting with l, like illegal.",
    },
    {
      id: "im",
      label: "im-",
      rule: "im- means not, and goes before words starting with m or p, like impossible.",
    },
    {
      id: "ir",
      label: "ir-",
      rule: "ir- means not, and goes before words starting with r, like irregular.",
    },
    {
      id: "inter",
      label: "inter-",
      rule: "inter- means between or among, like international.",
    },
  ],
  cards: (["in", "il", "im", "ir", "inter"] as const).flatMap((prefix) =>
    prefixRoots[prefix].map((root) => {
      const word = `${prefix}${root}`;
      return {
        id: `prefix-${root}`,
        ringId: prefix,
        before: "",
        word: root,
        after: "",
        sortedText: word,
        explanation: prefixReasons[prefix](root, word),
        family: root,
      };
    }),
  ),
};

// Year 5: spotting modal verbs and relative pronouns.

export const modalVerbs = [
  "can",
  "could",
  "may",
  "might",
  "must",
  "shall",
  "should",
  "will",
  "would",
];

export const relativePronouns = ["who", "which", "whose", "where", "that"];

const modalSentences = [
  "You *should* wear a helmet.",
  "We *might* go to the circus.",
  "Birds *can* fly very high.",
  "You *must* wash your hands.",
  "I *will* finish it later.",
  "It *could* snow tomorrow.",
  "Tom *may* join us at lunch.",
  "We *shall* see the show tonight.",
  "I *would* like a toffee apple.",
];

const relativeSentences: readonly (readonly [string, string])[] = [
  ["The boy *who* lives next door is kind.", "the boy"],
  ["I found the key *which* I had lost.", "the key"],
  ["That is the girl *whose* cat is lost.", "the girl"],
  ["This is the shop *where* Mum works.", "the shop"],
  ["The dog *that* can swim is Rex.", "the dog"],
  ["The clown, *who* was tired, sat down.", "the clown"],
  ["The tent, *which* was striped, was huge.", "the tent"],
  ["I met the man *whose* dog does tricks.", "the man"],
];

const neitherSentences: readonly (readonly [string, string])[] = [
  [
    "*Who* is juggling the plates?",
    "Here it asks a question, so it is not a relative pronoun.",
  ],
  [
    "*Which* hat is yours?",
    "Here it asks a question, so it is not a relative pronoun.",
  ],
  [
    "*That* tent is enormous.",
    "Here it points to the tent and starts no clause, so it is not a relative pronoun.",
  ],
  ["The acrobat *jumped* high.", "It is a verb, but not a modal verb."],
  ["The seal *wants* a fish.", "It is a verb, but not a modal verb."],
  ["The lion *is* asleep.", "It is a verb, but not a modal verb."],
  ["*She* waved to the crowd.", "It is a pronoun, but not a relative pronoun."],
  ["*They* clapped loudly.", "It is a pronoun, but not a relative pronoun."],
];

const modalContent: RingSortContent = {
  rings: [
    {
      id: "modal",
      label: "modal verb",
      rule: "A modal verb shows how likely or needed something is: can, could, may, might, must, shall, should, will and would.",
    },
    {
      id: "relative",
      label: "relative pronoun",
      rule: "A relative pronoun starts a clause that tells us more about a noun: who, which, whose, where and that.",
    },
    {
      id: "neither",
      label: "neither",
      rule: "Neither: the word is not a modal verb, and it does not start a clause about a noun.",
    },
  ],
  cards: [
    ...modalSentences.map((sentence, index) => {
      const parts = splitStarredSentence(sentence);
      return {
        id: `modal-${String(index)}`,
        ringId: "modal",
        ...parts,
        sortedText: parts.word,
        explanation: `${quote(parts.word)} is a modal verb: it shows how likely or needed something is.`,
        family: `modal-${String(index)}`,
      };
    }),
    ...relativeSentences.map(([sentence, noun], index) => {
      const parts = splitStarredSentence(sentence);
      return {
        id: `relative-${String(index)}`,
        ringId: "relative",
        ...parts,
        sortedText: parts.word,
        explanation: `${quote(parts.word)} is a relative pronoun: it starts a clause about ${noun}.`,
        family: `relative-${String(index)}`,
      };
    }),
    ...neitherSentences.map(([sentence, reason], index) => {
      const parts = splitStarredSentence(sentence);
      return {
        id: `neither-${String(index)}`,
        ringId: "neither",
        ...parts,
        sortedText: parts.word,
        explanation: `${quote(parts.word)} is neither. ${reason}`,
        family: `neither-${String(index)}`,
      };
    }),
  ],
};

// Year 6: formal words for everyday words.

export const formalPairs: readonly (readonly [string, string, string])[] = [
  ["find out", "discover", "Scientists hope to ___ how comets move."],
  ["ask for", "request", "You may ___ a seat near the ring."],
  ["go in", "enter", "Please ___ through the main tent door."],
  ["help", "assist", "The clowns will ___ the magician."],
  ["get", "obtain", "Visitors must ___ a ticket first."],
  ["need", "require", "All performers ___ a costume."],
  ["try", "attempt", "The acrobat will ___ a triple somersault."],
  ["enough", "sufficient", "There is ___ popcorn for everyone."],
  ["buy", "purchase", "You can ___ programmes at the gate."],
  ["tell", "inform", "Please ___ the ringmaster if you are late."],
  ["start", "commence", "The show will ___ at seven o'clock."],
  ["end", "conclude", "The parade will ___ with fireworks."],
  ["show", "demonstrate", "The juggler will ___ a new trick."],
  ["give", "provide", "We ___ blankets for the ponies."],
  ["leave", "depart", "The circus train will ___ at noon."],
  ["answer", "respond", "Please ___ by Friday."],
  ["think about", "consider", "We will ___ your idea carefully."],
  ["about", "approximately", "The tent holds ___ five hundred people."],
  ["check", "verify", "Please ___ your seat number."],
  ["carry on", "continue", "The band will ___ playing."],
  ["put off", "postpone", "We had to ___ the show because of rain."],
];

const fillGap = (template: string, word: string) => {
  const [before, after] = template.split("___");
  return { before, word, after };
};

const formalContent: RingSortContent = {
  rings: [
    {
      id: "formal",
      label: "formal",
      rule: "Formal words suit letters, reports and speeches, like request.",
    },
    {
      id: "everyday",
      label: "everyday",
      rule: "Everyday words are the ones we say to friends, like ask for.",
    },
  ],
  cards: formalPairs.flatMap(([everyday, formal, template]) => [
    {
      id: `formal-${formal}`,
      ringId: "formal",
      ...fillGap(template, formal),
      sortedText: formal,
      explanation: `${quote(formal)} is formal. The everyday word is ${quote(everyday)}.`,
      family: formal,
    },
    {
      id: `everyday-${everyday}`,
      ringId: "everyday",
      ...fillGap(template, everyday),
      sortedText: everyday,
      explanation: `${quote(everyday)} is everyday. The formal word is ${quote(formal)}.`,
      family: formal,
    },
  ]),
};

const contentByYear: Record<YearGroup, RingSortContent> = {
  1: pluralContent,
  2: wordClassContent,
  3: articleContent,
  4: prefixContent,
  5: modalContent,
  6: formalContent,
};

export const listRingSortContent = (yearGroup: YearGroup): RingSortContent =>
  contentByYear[yearGroup];

// Year 4 has five prefixes: in- always plays, with three of the other four.
const pickRings = (
  rings: readonly RingSortRing[],
  random: () => number,
): RingSortRing[] => {
  if (rings.length <= maximumRingCount) {
    return [...rings];
  }
  const [first, ...others] = rings;
  const chosen = new Set(
    shuffle(others, random).slice(0, maximumRingCount - 1),
  );
  return [first, ...others.filter((ring) => chosen.has(ring))];
};

export const spreadCards = (
  ringCount: number,
  cardCount: number,
  random: () => number,
): number[] => {
  const base = Math.floor(cardCount / ringCount);
  const extra = new Set(
    shuffle(
      Array.from({ length: ringCount }, (_, index) => index),
      random,
    ).slice(0, cardCount % ringCount),
  );
  return Array.from(
    { length: ringCount },
    (_, index) => base + (extra.has(index) ? 1 : 0),
  );
};

export const buildRingSortPuzzle = (
  yearGroup: YearGroup,
  random: () => number,
): RingSortPuzzle => {
  const content = contentByYear[yearGroup];
  const rings = pickRings(content.rings, random);
  const counts = spreadCards(
    rings.length,
    ringSortCardCounts[yearGroup],
    random,
  );
  const usedFamilies = new Set<string>();
  const picked = rings.flatMap((ring, index) => {
    const pool = shuffle(
      content.cards.filter(({ ringId }) => ringId === ring.id),
      random,
    );
    const chosen: RingSortCard[] = [];
    for (const card of pool) {
      if (chosen.length >= counts[index]) {
        break;
      }
      if (!usedFamilies.has(card.family)) {
        usedFamilies.add(card.family);
        chosen.push(card);
      }
    }
    return chosen;
  });
  return { rings, cards: shuffle(picked, random) };
};

export const isRightRing = (card: RingSortCard, ringId: string): boolean =>
  card.ringId === ringId;

export const findRing = (
  rings: readonly RingSortRing[],
  ringId: string,
): RingSortRing | undefined => rings.find(({ id }) => id === ringId);

export const describeCardQuestion = (
  yearGroup: YearGroup,
  card: RingSortCard,
): string => {
  switch (yearGroup) {
    case 1:
      return `One ${card.word}, two…? Add -s or -es?`;
    case 2:
      return `What kind of word is ${quote(card.word)}?`;
    case 3:
      return `Does ${quote(card.word)} need a or an?`;
    case 4:
      return `Which prefix goes on ${quote(card.word)}?`;
    case 5:
      return `Is ${quote(card.word)} a modal verb, a relative pronoun or neither?`;
    case 6:
      return `Is ${quote(card.word)} formal or everyday?`;
  }
};

export const describeCard = (card: RingSortCard): string =>
  `${card.before}${card.word}${card.after}`.replace("___", "blank").trim();
