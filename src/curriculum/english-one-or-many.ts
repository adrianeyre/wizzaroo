import {
  buildClueQuestion,
  buildSentenceGapQuestion,
  type EnglishGameContent,
  type EnglishQuestion,
} from "./english-questions.js";

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
];
const nounsWithConsonantBeforeY = [
  "baby",
  "puppy",
  "lady",
  "party",
  "city",
  "story",
  "berry",
  "fly",
  "family",
  "pony",
  "cherry",
  "spy",
];
const nounsWithVowelBeforeY = [
  "day",
  "toy",
  "key",
  "boy",
  "monkey",
  "tray",
  "donkey",
];

const buildEndingQuestion = (
  noun: string,
  ending: "s" | "es",
): EnglishQuestion =>
  buildClueQuestion(noun, ending, [ending === "s" ? "es" : "s"]);

const buildConsonantYQuestion = (noun: string): EnglishQuestion => {
  const stem = noun.slice(0, -1);
  return buildClueQuestion(noun, `${stem}ies`, [
    `${noun}s`,
    `${noun}es`,
    `${stem}is`,
  ]);
};

const buildVowelYQuestion = (noun: string): EnglishQuestion => {
  const stem = noun.slice(0, -1);
  return buildClueQuestion(noun, `${noun}s`, [
    `${stem}ies`,
    `${noun}es`,
    `${stem}is`,
  ]);
};

export const oneOrMany: EnglishGameContent = {
  1: {
    skillId: "english.plurals-s-es",
    ask: "To make it plural, add s or es?",
    hint: "Say the plural. If it adds an extra beat, like foxes, add es.",
    questions: [
      ...nounsTakingS.map((noun) => buildEndingQuestion(noun, "s")),
      ...nounsTakingEs.map((noun) => buildEndingQuestion(noun, "es")),
    ],
  },
  2: {
    skillId: "english.plurals-y-to-ies",
    ask: "Which is the right plural?",
    hint: "If a consonant comes before the y, change y to i and add es; after a vowel, just add s.",
    questions: [
      ...nounsWithConsonantBeforeY.map(buildConsonantYQuestion),
      ...nounsWithVowelBeforeY.map(buildVowelYQuestion),
    ],
  },
  3: {
    skillId: "english.a-or-an",
    ask: "Which word fits: a or an?",
    hint: "Use an before a vowel sound, like an apple or an hour, and a before other sounds.",
    questions: [
      buildSentenceGapQuestion("I ate ___ apple.", "an", ["a"]),
      buildSentenceGapQuestion("We saw ___ elephant at the zoo.", "an", ["a"]),
      buildSentenceGapQuestion("She has ___ umbrella.", "an", ["a"]),
      buildSentenceGapQuestion("He drew ___ octopus.", "an", ["a"]),
      buildSentenceGapQuestion("We waited for ___ hour.", "an", ["a"]),
      buildSentenceGapQuestion("That was ___ honest answer.", "an", ["a"]),
      buildSentenceGapQuestion("I found ___ egg in the nest.", "an", ["a"]),
      buildSentenceGapQuestion("My uncle is ___ artist.", "an", ["a"]),
      buildSentenceGapQuestion("I saw ___ dog in the park.", "a", ["an"]),
      buildSentenceGapQuestion("She rode ___ horse.", "a", ["an"]),
      buildSentenceGapQuestion("___ unicorn has one horn.", "a", ["an"]),
      buildSentenceGapQuestion("He wore ___ uniform to school.", "a", ["an"]),
      buildSentenceGapQuestion("We live in ___ house by the sea.", "a", ["an"]),
      buildSentenceGapQuestion("I need ___ pencil.", "a", ["an"]),
      buildSentenceGapQuestion("It was ___ useful tip.", "a", ["an"]),
      buildSentenceGapQuestion("She ate ___ banana.", "a", ["an"]),
    ],
  },
  4: {
    skillId: "english.standard-english-verb-forms",
    ask: "Which is Standard English?",
    hint: "In Standard English we say we were, I did and I have done, not we was or I done.",
    questions: [
      buildSentenceGapQuestion("We ___ late for school.", "were", ["was"]),
      buildSentenceGapQuestion("They ___ playing outside.", "were", ["was"]),
      buildSentenceGapQuestion("You ___ brilliant in the play.", "were", [
        "was",
      ]),
      buildSentenceGapQuestion("I ___ my homework last night.", "did", [
        "done",
      ]),
      buildSentenceGapQuestion("She ___ the washing-up after tea.", "did", [
        "done",
      ]),
      buildSentenceGapQuestion("I have ___ my best.", "done", ["did"]),
      buildSentenceGapQuestion("He ___ to the shop yesterday.", "went", [
        "gone",
      ]),
      buildSentenceGapQuestion("She has ___ home already.", "gone", ["went"]),
      buildSentenceGapQuestion("I ___ a fox in the garden.", "saw", ["seen"]),
      buildSentenceGapQuestion("We have ___ that film before.", "seen", [
        "saw",
      ]),
      buildSentenceGapQuestion("We ___ a song in assembly.", "sang", ["sung"]),
      buildSentenceGapQuestion("He ___ me the answer yesterday.", "gave", [
        "give",
      ]),
      buildSentenceGapQuestion("She ___ like spiders.", "doesn't", ["don't"]),
      buildSentenceGapQuestion("They haven't got ___ sweets.", "any", ["no"]),
      buildSentenceGapQuestion("I didn't do ___ wrong.", "anything", [
        "nothing",
      ]),
      buildSentenceGapQuestion("___ books are on my desk.", "those", ["them"]),
    ],
  },
  5: {
    skillId: "english.subject-verb-agreement",
    ask: "Which verb fits?",
    hint: "A singular subject needs a singular verb, and a plural subject needs a plural verb.",
    questions: [
      buildSentenceGapQuestion("The dog ___ at the postman.", "barks", [
        "bark",
      ]),
      buildSentenceGapQuestion("The dogs ___ at the postman.", "bark", [
        "barks",
      ]),
      buildSentenceGapQuestion("My friend ___ coming to tea.", "is", ["are"]),
      buildSentenceGapQuestion("My friends ___ coming to tea.", "are", ["is"]),
      buildSentenceGapQuestion("The box of crayons ___ on the shelf.", "is", [
        "are",
      ]),
      buildSentenceGapQuestion("The children ___ playing in the hall.", "are", [
        "is",
      ]),
      buildSentenceGapQuestion("The flowers in the pot ___ wilting.", "are", [
        "is",
      ]),
      buildSentenceGapQuestion("The leader of the scouts ___ kind.", "is", [
        "are",
      ]),
      buildSentenceGapQuestion("Tom and Ella ___ best friends.", "are", ["is"]),
      buildSentenceGapQuestion("My sister ___ the piano every day.", "plays", [
        "play",
      ]),
      buildSentenceGapQuestion("Bees ___ honey.", "make", ["makes"]),
      buildSentenceGapQuestion(
        "The man with two dogs ___ next door.",
        "lives",
        ["live"],
      ),
      buildSentenceGapQuestion("Everyone ___ a turn on the swing.", "gets", [
        "get",
      ]),
      buildSentenceGapQuestion("The cakes on the plate ___ for later.", "are", [
        "is",
      ]),
      buildSentenceGapQuestion("One of my teeth ___ wobbly.", "is", ["are"]),
      buildSentenceGapQuestion("The list of names ___ very long.", "is", [
        "are",
      ]),
    ],
  },
  6: {
    skillId: "english.subjunctive-and-formal-verbs",
    ask: "Which word fits formal English?",
    hint: "Formal writing uses the subjunctive, like if I were you or I insist that he be on time.",
    questions: [
      buildSentenceGapQuestion("If I ___ you, I would rest.", "were", ["was"]),
      buildSentenceGapQuestion("If she ___ taller, she could reach.", "were", [
        "was",
      ]),
      buildSentenceGapQuestion("If he ___ here, he would help.", "were", [
        "was",
      ]),
      buildSentenceGapQuestion("If it ___ sunny, we would swim.", "were", [
        "was",
      ]),
      buildSentenceGapQuestion("I would sing if I ___ braver.", "were", [
        "was",
      ]),
      buildSentenceGapQuestion("I wish it ___ the weekend.", "were", ["was"]),
      buildSentenceGapQuestion(
        "___ I to win, I would share the prize.",
        "were",
        ["was"],
      ),
      buildSentenceGapQuestion("I insist that he ___ on time.", "be", ["is"]),
      buildSentenceGapQuestion(
        "They asked that the door ___ kept shut.",
        "be",
        ["is"],
      ),
      buildSentenceGapQuestion("The teacher asks that we ___ quiet.", "be", [
        "are",
      ]),
      buildSentenceGapQuestion(
        "The rules require that she ___ a hat.",
        "wear",
        ["wears"],
      ),
      buildSentenceGapQuestion("I suggest that he ___ early.", "leave", [
        "leaves",
      ]),
      buildSentenceGapQuestion("It is vital that she ___ calm.", "stay", [
        "stays",
      ]),
      buildSentenceGapQuestion(
        "The doctor advised that he ___ in bed.",
        "rest",
        ["rests"],
      ),
      buildSentenceGapQuestion("Each of the players ___ a medal.", "has", [
        "have",
      ]),
    ],
  },
};
