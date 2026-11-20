import {
  buildClueQuestion,
  buildWordSumQuestion,
  type EnglishGameContent,
  type EnglishQuestion,
} from "./english-questions.js";

const buildContractionQuestions = (
  contractions: Record<string, string>,
): EnglishQuestion[] => {
  const shortForms = Object.values(contractions);
  return Object.entries(contractions).map(([words, answer]) =>
    buildClueQuestion(
      words,
      answer,
      shortForms.filter((shortForm) => shortForm !== answer),
    ),
  );
};

const buildPluralPossessiveQuestion = (
  belonging: string,
  singular: string,
  plural: string,
): EnglishQuestion =>
  buildClueQuestion(
    `the ${belonging} belonging to the ${plural}`,
    `${plural}'`,
    [`${singular}'s`, plural, `${plural}'s`],
  );

const buildIrregularPluralPossessiveQuestion = (
  belonging: string,
  singular: string,
  plural: string,
): EnglishQuestion =>
  buildClueQuestion(
    `the ${belonging} belonging to the ${plural}`,
    `${plural}'s`,
    [`${plural}'`, `${plural}s'`, `${singular}'s`],
  );

export const wordSqueeze: EnglishGameContent = {
  1: {
    skillId: "english.compound-words",
    ask: "Join the two words. Which word is it?",
    hint: "Say the two words one after the other, then write them with no gap.",
    questions: [
      buildWordSumQuestion(["foot", "ball"], "football", [
        "footpath",
        "snowball",
        "handball",
      ]),
      buildWordSumQuestion(["sun", "flower"], "sunflower", [
        "sunshine",
        "wildflower",
        "sunset",
      ]),
      buildWordSumQuestion(["rain", "bow"], "rainbow", [
        "raincoat",
        "elbow",
        "rainfall",
      ]),
      buildWordSumQuestion(["bed", "room"], "bedroom", [
        "bedtime",
        "classroom",
        "bathroom",
      ]),
      buildWordSumQuestion(["tooth", "brush"], "toothbrush", [
        "toothpaste",
        "hairbrush",
        "paintbrush",
      ]),
      buildWordSumQuestion(["play", "ground"], "playground", [
        "playtime",
        "background",
        "underground",
      ]),
      buildWordSumQuestion(["snow", "man"], "snowman", [
        "snowball",
        "postman",
        "snowflake",
      ]),
      buildWordSumQuestion(["lady", "bird"], "ladybird", [
        "blackbird",
        "bluebird",
        "songbird",
      ]),
      buildWordSumQuestion(["farm", "yard"], "farmyard", [
        "farmhouse",
        "backyard",
        "shipyard",
      ]),
      buildWordSumQuestion(["cup", "cake"], "cupcake", [
        "cupboard",
        "pancake",
        "teacake",
      ]),
      buildWordSumQuestion(["door", "bell"], "doorbell", [
        "doorway",
        "bluebell",
        "doormat",
      ]),
      buildWordSumQuestion(["butter", "fly"], "butterfly", [
        "buttercup",
        "dragonfly",
        "housefly",
      ]),
      buildWordSumQuestion(["sand", "castle"], "sandcastle", [
        "sandpit",
        "sandwich",
        "sandpaper",
      ]),
      buildWordSumQuestion(["star", "fish"], "starfish", [
        "starlight",
        "goldfish",
        "jellyfish",
      ]),
      buildWordSumQuestion(["hand", "bag"], "handbag", [
        "handshake",
        "schoolbag",
        "handball",
      ]),
      buildWordSumQuestion(["moon", "light"], "moonlight", [
        "moonbeam",
        "sunlight",
        "starlight",
      ]),
    ],
  },
  2: {
    skillId: "english.contractions",
    ask: "Squeeze the two words into one.",
    hint: "The apostrophe goes where the missing letters were.",
    questions: [
      ...buildContractionQuestions({
        "do not": "don't",
        "does not": "doesn't",
        "did not": "didn't",
        cannot: "can't",
        "could not": "couldn't",
        "is not": "isn't",
        "was not": "wasn't",
        "has not": "hasn't",
      }),
      ...buildContractionQuestions({
        "I am": "I'm",
        "I will": "I'll",
        "I have": "I've",
        "it is": "it's",
        "you are": "you're",
        "we are": "we're",
        "they are": "they're",
        "she is": "she's",
        "let us": "let's",
      }),
    ],
  },
  3: {
    skillId: "english.plural-possessive-apostrophes",
    ask: "Who owns it? Pick the right spelling.",
    hint: "When the owners already end in s, just add an apostrophe after the s.",
    questions: [
      buildPluralPossessiveQuestion("coats", "girl", "girls"),
      buildPluralPossessiveQuestion("football", "boy", "boys"),
      buildPluralPossessiveQuestion("nests", "bird", "birds"),
      buildPluralPossessiveQuestion("tails", "cat", "cats"),
      buildPluralPossessiveQuestion("bones", "dog", "dogs"),
      buildPluralPossessiveQuestion("den", "fox", "foxes"),
      buildPluralPossessiveQuestion("toys", "puppy", "puppies"),
      buildPluralPossessiveQuestion("shells", "crab", "crabs"),
      buildPluralPossessiveQuestion("garden", "neighbour", "neighbours"),
      buildPluralPossessiveQuestion("books", "pupil", "pupils"),
      buildPluralPossessiveQuestion("hats", "clown", "clowns"),
      buildPluralPossessiveQuestion("eggs", "hen", "hens"),
      buildPluralPossessiveQuestion("staffroom", "teacher", "teachers"),
      buildPluralPossessiveQuestion("stripes", "zebra", "zebras"),
    ],
  },
  4: {
    skillId: "english.irregular-plural-possessives",
    ask: "Which spelling matches the words?",
    hint: "A plural without s, like children, takes 's; a plain plural needs no apostrophe.",
    questions: [
      buildIrregularPluralPossessiveQuestion("toys", "child", "children"),
      buildIrregularPluralPossessiveQuestion("coats", "man", "men"),
      buildIrregularPluralPossessiveQuestion("bags", "woman", "women"),
      buildIrregularPluralPossessiveQuestion("ideas", "person", "people"),
      buildIrregularPluralPossessiveQuestion("tails", "mouse", "mice"),
      buildIrregularPluralPossessiveQuestion("nests", "goose", "geese"),
      buildClueQuestion("more than one child", "children", [
        "child's",
        "children's",
        "childs",
      ]),
      buildClueQuestion("more than one cat", "cats", [
        "cat's",
        "cats'",
        "cats's",
      ]),
      buildClueQuestion("the bowl belonging to the cat", "cat's", [
        "cats",
        "cats'",
        "cats's",
      ]),
      buildClueQuestion("the bowls belonging to the cats", "cats'", [
        "cat's",
        "cats",
        "cats's",
      ]),
      buildClueQuestion("more than one tree", "trees", [
        "tree's",
        "trees'",
        "trees's",
      ]),
      buildClueQuestion("the branches belonging to the tree", "tree's", [
        "trees",
        "trees'",
        "trees's",
      ]),
      buildClueQuestion("more than one baby", "babies", [
        "baby's",
        "babies'",
        "babys",
      ]),
      buildClueQuestion("the cot belonging to the baby", "baby's", [
        "babies",
        "babies'",
        "babys'",
      ]),
      buildClueQuestion("the cots belonging to the babies", "babies'", [
        "baby's",
        "babies",
        "babies's",
      ]),
    ],
  },
  5: {
    skillId: "english.modal-verb-contractions",
    ask: "Squeeze the words into one.",
    hint: "Have shortens to 've, and not shortens to n't, so never write should of.",
    questions: [
      buildClueQuestion("should have", "should've", [
        "should of",
        "shouldn't",
        "could've",
      ]),
      buildClueQuestion("would have", "would've", [
        "would of",
        "wouldn't",
        "should've",
      ]),
      buildClueQuestion("could have", "could've", [
        "could of",
        "couldn't",
        "would've",
      ]),
      buildClueQuestion("might have", "might've", [
        "might of",
        "mightn't",
        "must've",
      ]),
      buildClueQuestion("must have", "must've", [
        "must of",
        "mustn't",
        "might've",
      ]),
      buildClueQuestion("would not", "wouldn't", [
        "won't",
        "would'nt",
        "couldn't",
      ]),
      buildClueQuestion("should not", "shouldn't", [
        "should'nt",
        "shoudn't",
        "shan't",
      ]),
      buildClueQuestion("could not", "couldn't", [
        "could'nt",
        "can't",
        "wouldn't",
      ]),
      buildClueQuestion("shall not", "shan't", [
        "shalln't",
        "shall'nt",
        "shouldn't",
      ]),
      buildClueQuestion("will not", "won't", [
        "willn't",
        "will'nt",
        "wouldn't",
      ]),
      buildClueQuestion("must not", "mustn't", [
        "must'nt",
        "musn't",
        "mightn't",
      ]),
      buildClueQuestion("it will", "it'll", ["it'd", "its'll", "it's"]),
      buildClueQuestion("she would", "she'd", ["she'll", "she's", "shed"]),
    ],
  },
  6: {
    skillId: "english.formal-expanded-contractions",
    ask: "Write it out in full for formal writing.",
    hint: "Put back the letters the apostrophe stands for, like won't for will not.",
    questions: [
      buildClueQuestion("won't", "will not", [
        "would not",
        "want not",
        "was not",
      ]),
      buildClueQuestion("shan't", "shall not", [
        "should not",
        "shall we",
        "shall now",
      ]),
      buildClueQuestion("can't", "cannot", [
        "could not",
        "can now",
        "came not",
      ]),
      buildClueQuestion("mustn't", "must not", [
        "might not",
        "must now",
        "may not",
      ]),
      buildClueQuestion("couldn't", "could not", [
        "would not",
        "should not",
        "could now",
      ]),
      buildClueQuestion("wouldn't", "would not", [
        "will not",
        "should not",
        "could not",
      ]),
      buildClueQuestion("should've", "should have", [
        "shall have",
        "should not",
        "could have",
      ]),
      buildClueQuestion("doesn't", "does not", [
        "did not",
        "do not",
        "does now",
      ]),
      buildClueQuestion("haven't", "have not", [
        "had not",
        "has not",
        "have now",
      ]),
      buildClueQuestion("aren't", "are not", ["were not", "is not", "am not"]),
      buildClueQuestion("they're", "they are", [
        "there are",
        "they were",
        "they have",
      ]),
      buildClueQuestion("we've", "we have", ["we are", "we had", "we will"]),
      buildClueQuestion("you'll", "you will", [
        "you would",
        "you all",
        "you well",
      ]),
      buildClueQuestion("they'll", "they will", [
        "they would",
        "they all",
        "they tell",
      ]),
      buildClueQuestion("you're", "you are", [
        "you were",
        "you have",
        "you will",
      ]),
      buildClueQuestion("I'm", "I am", ["I was", "I may", "I will"]),
    ],
  },
};
