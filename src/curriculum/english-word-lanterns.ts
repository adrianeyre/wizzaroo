import {
  buildWordLinkQuestion,
  type EnglishGameContent,
  type EnglishQuestion,
  type WordLink,
} from "./english-questions.js";

const rhymeFamilies = [
  ["cat", "hat", "mat", "bat"],
  ["dog", "log", "frog", "fog"],
  ["pen", "hen", "ten", "men"],
  ["bug", "rug", "mug", "jug"],
  ["pig", "wig", "dig", "big"],
  ["top", "hop", "mop", "shop"],
  ["pin", "bin", "tin", "fin"],
  ["bed", "red", "fed", "shed"],
  ["sun", "bun", "run", "fun"],
  ["cake", "lake", "snake", "bake"],
  ["king", "ring", "sing", "wing"],
  ["bell", "shell", "well", "smell"],
  ["rain", "train", "chain", "brain"],
  ["boat", "coat", "goat", "float"],
];

const buildRhymeQuestions = (): EnglishQuestion[] =>
  rhymeFamilies.flatMap((family) => {
    const slips = rhymeFamilies
      .filter((otherFamily) => otherFamily !== family)
      .flat();
    return family.map((word, index) =>
      buildWordLinkQuestion(
        word,
        "rhymes-with",
        family[(index + 1) % family.length],
        slips,
      ),
    );
  });

type WordLinkRow = [word: string, answer: string, slips: string[]];

const buildWordLinkQuestions = (
  link: WordLink,
  rows: readonly WordLinkRow[],
): EnglishQuestion[] =>
  rows.map(([word, answer, slips]) =>
    buildWordLinkQuestion(word, link, answer, slips),
  );

const differentlySpeltRhymes: WordLinkRow[] = [
  ["rain", "plane", ["rail", "ran", "plan"]],
  ["night", "kite", ["knit", "nice", "net"]],
  ["boat", "note", ["bat", "nut", "book"]],
  ["blue", "shoe", ["blow", "show", "bell"]],
  ["tree", "sea", ["try", "set", "tray"]],
  ["cake", "break", ["cap", "back", "bark"]],
  ["bear", "chair", ["beard", "chain", "bean"]],
  ["light", "white", ["lit", "wit", "lift"]],
  ["snow", "go", ["now", "snug", "gate"]],
  ["moon", "tune", ["moan", "ton", "mean"]],
  ["day", "weigh", ["dye", "wait", "dog"]],
  ["coat", "wrote", ["cot", "rot", "cut"]],
  ["feet", "heat", ["fit", "hat", "hut"]],
  ["door", "four", ["dear", "fur", "deer"]],
  ["fair", "pear", ["fire", "peer", "far"]],
  ["bird", "word", ["bard", "wood", "bud"]],
  ["hole", "bowl", ["hall", "howl", "ball"]],
  ["phone", "groan", ["fun", "grin", "gone"]],
  ["cry", "pie", ["cow", "pit", "play"]],
];

const wordFamilies: WordLinkRow[] = [
  ["help", "helpful", ["hello", "helmet", "yelp"]],
  ["solve", "solution", ["solid", "salute", "sole"]],
  ["teach", "teacher", ["peach", "beach", "team"]],
  ["play", "playful", ["plate", "plan", "clay"]],
  ["kind", "kindness", ["kite", "find", "kitten"]],
  ["friend", "friendship", ["fridge", "fried", "frond"]],
  ["happy", "happiness", ["hippo", "nappy", "harp"]],
  ["care", "careful", ["car", "carrot", "scare"]],
  ["sign", "signal", ["sing", "sight", "sigh"]],
  ["child", "childhood", ["chill", "chilli", "mild"]],
  ["paint", "painter", ["pain", "point", "saint"]],
  ["move", "movement", ["mouse", "cove", "mole"]],
  ["dark", "darkness", ["dart", "bark", "dare"]],
  ["write", "writer", ["white", "wrist", "kite"]],
  ["sleep", "sleepy", ["sheep", "slip", "steep"]],
  ["build", "builder", ["guild", "bold", "bull"]],
  ["rain", "rainy", ["train", "brain", "rail"]],
];

const nounSynonyms: WordLinkRow[] = [
  ["house", "home", ["horse", "mouse", "hose"]],
  ["boy", "lad", ["toy", "girl", "bag"]],
  ["present", "gift", ["past", "party", "card"]],
  ["road", "street", ["river", "rock", "roof"]],
  ["shop", "store", ["ship", "stone", "shoe"]],
  ["child", "youngster", ["chain", "grown-up", "teacher"]],
  ["rubbish", "litter", ["rabbit", "ladder", "letter"]],
  ["trip", "journey", ["trap", "jelly", "tripod"]],
  ["noise", "racket", ["nose", "rocket", "noon"]],
  ["friend", "pal", ["enemy", "pan", "pale"]],
  ["prize", "award", ["price", "prism", "sword"]],
  ["dog", "hound", ["dot", "round", "hand"]],
  ["sea", "ocean", ["seat", "open", "oven"]],
  ["picture", "image", ["pitcher", "pirate", "igloo"]],
  ["story", "tale", ["storm", "tail", "table"]],
  ["fear", "fright", ["feather", "flight", "bright"]],
  ["start", "beginning", ["star", "ending", "bagging"]],
];

const sharedRoots: WordLinkRow[] = [
  ["telephone", "television", ["telling", "tea", "elephant"]],
  ["microscope", "microphone", ["mirror", "mice", "scooter"]],
  ["aquarium", "aquatic", ["acrobat", "quarry", "area"]],
  ["bicycle", "biplane", ["bison", "bingo", "bird"]],
  ["autograph", "automatic", ["author", "autumn", "octopus"]],
  ["transport", "transfer", ["train", "trumpet", "tangle"]],
  ["submarine", "subway", ["sugar", "summer", "sunflower"]],
  ["octopus", "octagon", ["ostrich", "oval", "pocket"]],
  ["photograph", "paragraph", ["paradise", "giraffe", "phone"]],
  ["triangle", "tricycle", ["trick", "tree", "angel"]],
  ["centimetre", "century", ["cinema", "entrance", "metal"]],
  ["thermometer", "thermal", ["theatre", "thunder", "mother"]],
  ["export", "import", ["expert", "imp", "pottery"]],
  ["manuscript", "manual", ["mansion", "mango", "scrap"]],
  ["biology", "geology", ["biscuit", "jelly", "gem"]],
  ["audience", "audible", ["auntie", "daisy", "dancer"]],
  ["visible", "vision", ["village", "vinegar", "vest"]],
  ["spectator", "inspector", ["spaghetti", "sector", "speck"]],
  ["portable", "porter", ["pork", "party", "potato"]],
];

const formalWords: WordLinkRow[] = [
  ["find out", "discover", ["dismiss", "wander", "forget"]],
  ["ask for", "request", ["reject", "return", "receive"]],
  ["go in", "enter", ["exit", "depart", "remain"]],
  ["help", "assist", ["resist", "insist", "prevent"]],
  ["get", "obtain", ["obey", "contain", "discard"]],
  ["need", "require", ["reply", "refuse", "retire"]],
  ["try", "attempt", ["attend", "attach", "abandon"]],
  ["enough", "sufficient", ["efficient", "excessive", "scarce"]],
  ["buy", "purchase", ["pursue", "persuade", "dispose"]],
  ["tell", "inform", ["ignore", "conform", "perform"]],
  ["start", "commence", ["conclude", "commend", "comment"]],
  ["end", "conclude", ["include", "continue", "commence"]],
  ["show", "demonstrate", ["conceal", "hesitate", "decorate"]],
  ["give", "provide", ["prevent", "divide", "withhold"]],
  ["leave", "depart", ["arrive", "depend", "remain"]],
  ["answer", "respond", ["request", "resign", "enquire"]],
  ["think about", "consider", ["confirm", "conceal", "deny"]],
  ["about", "approximately", ["exactly", "apparently", "appropriately"]],
  ["check", "verify", ["vary", "modify", "ignore"]],
];

export const wordLanterns: EnglishGameContent = {
  1: {
    skillId: "english.rhyming-words",
    ask: "Which word rhymes?",
    hint: "Say both words out loud. Do they end with the same sound?",
    questions: buildRhymeQuestions(),
  },
  2: {
    skillId: "english.rhymes-with-different-spellings",
    ask: "Which word rhymes?",
    hint: "Say them out loud. A rhyme can be spelt with different letters.",
    questions: buildWordLinkQuestions("rhymes-with", differentlySpeltRhymes),
  },
  3: {
    skillId: "english.word-families",
    ask: "Which word is in the same family?",
    hint: "Find the word built from the same root, even if its ending changes.",
    questions: buildWordLinkQuestions("same-family-as", wordFamilies),
  },
  4: {
    skillId: "english.synonym-nouns",
    ask: "Which word means the same?",
    hint: "Try swapping it into a sentence. Does it still mean the same?",
    questions: buildWordLinkQuestions("same-meaning-as", nounSynonyms),
  },
  5: {
    skillId: "english.greek-and-latin-roots",
    ask: "Which word shares the same root?",
    hint: "Find the root part both words share, like tele, micro or aqua.",
    questions: buildWordLinkQuestions("same-root-as", sharedRoots),
  },
  6: {
    skillId: "english.formal-vocabulary",
    ask: "Which is the formal word?",
    hint: "Pick the word you would use in a letter to the head teacher.",
    questions: buildWordLinkQuestions("formal-word-for", formalWords),
  },
};
