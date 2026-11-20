import {
  buildClueQuestion,
  type EnglishGameContent,
} from "./english-questions.js";

export const wordWorkshop: EnglishGameContent = {
  1: {
    skillId: "english.prefix-un",
    ask: "Which word means this?",
    hint: "Adding un- to the start of a word makes its opposite.",
    questions: [
      buildClueQuestion("not happy", "unhappy", [
        "happy",
        "happier",
        "happiest",
      ]),
      buildClueQuestion("not kind", "unkind", ["kind", "kinder", "kindest"]),
      buildClueQuestion("not fair", "unfair", ["fair", "fairer", "fairest"]),
      buildClueQuestion("not safe", "unsafe", ["safe", "safer", "safest"]),
      buildClueQuestion("not lucky", "unlucky", [
        "lucky",
        "luckier",
        "luckiest",
      ]),
      buildClueQuestion("not tidy", "untidy", ["tidy", "tidier", "tidiest"]),
      buildClueQuestion("not well", "unwell", ["well", "better", "best"]),
      buildClueQuestion("the opposite of lock", "unlock", [
        "lock",
        "locked",
        "locking",
      ]),
      buildClueQuestion("the opposite of pack", "unpack", [
        "pack",
        "packed",
        "packing",
      ]),
      buildClueQuestion("the opposite of tie", "untie", [
        "tie",
        "tied",
        "tying",
      ]),
      buildClueQuestion("the opposite of zip", "unzip", [
        "zip",
        "zipped",
        "zipping",
      ]),
      buildClueQuestion("the opposite of load", "unload", [
        "load",
        "loaded",
        "loading",
      ]),
      buildClueQuestion("the opposite of wrap", "unwrap", [
        "wrap",
        "wrapped",
        "wrapping",
      ]),
      buildClueQuestion("the opposite of fold", "unfold", [
        "fold",
        "folded",
        "folding",
      ]),
    ],
  },
  2: {
    skillId: "english.suffixes-ful-less-ness-ly",
    ask: "Which word means this?",
    hint: "-ful means full of, -less means without, -ness makes a naming word and -ly tells how.",
    questions: [
      buildClueQuestion("full of care", "careful", [
        "careless",
        "carefully",
        "caring",
      ]),
      buildClueQuestion("without care", "careless", [
        "careful",
        "carefully",
        "caring",
      ]),
      buildClueQuestion("full of hope", "hopeful", [
        "hopeless",
        "hopefully",
        "hoping",
      ]),
      buildClueQuestion("without hope", "hopeless", [
        "hopeful",
        "hopefully",
        "hoping",
      ]),
      buildClueQuestion("full of help", "helpful", [
        "helpless",
        "helper",
        "helping",
      ]),
      buildClueQuestion("without help", "helpless", [
        "helpful",
        "helper",
        "helping",
      ]),
      buildClueQuestion("full of pain", "painful", [
        "painless",
        "painfully",
        "pained",
      ]),
      buildClueQuestion("without pain", "painless", [
        "painful",
        "painfully",
        "pained",
      ]),
      buildClueQuestion("being kind", "kindness", [
        "kindly",
        "kinder",
        "unkind",
      ]),
      buildClueQuestion("in a kind way", "kindly", [
        "kindness",
        "kinder",
        "unkind",
      ]),
      buildClueQuestion("being sad", "sadness", ["sadly", "sadder", "saddest"]),
      buildClueQuestion("in a sad way", "sadly", [
        "sadness",
        "sadder",
        "saddest",
      ]),
      buildClueQuestion("being dark", "darkness", [
        "darker",
        "darkest",
        "darken",
      ]),
      buildClueQuestion("in a quick way", "quickly", [
        "quicker",
        "quickest",
        "quick",
      ]),
      buildClueQuestion("in a slow way", "slowly", [
        "slower",
        "slowest",
        "slow",
      ]),
    ],
  },
  3: {
    skillId: "english.prefixes-dis-mis-re-sub-super-anti-auto",
    ask: "Which word means this?",
    hint: "A prefix changes the meaning: dis- means not, mis- means wrongly, re- means again and sub- means under.",
    questions: [
      buildClueQuestion("not agree", "disagree", [
        "unagree",
        "misagree",
        "agreed",
      ]),
      buildClueQuestion("not honest", "dishonest", [
        "unhonest",
        "inhonest",
        "honesty",
      ]),
      buildClueQuestion("to not like something", "dislike", [
        "relike",
        "sublike",
        "liking",
      ]),
      buildClueQuestion("to behave badly", "misbehave", [
        "disbehave",
        "unbehave",
        "behaved",
      ]),
      buildClueQuestion("to spell wrongly", "misspell", [
        "disspell",
        "respell",
        "speller",
      ]),
      buildClueQuestion("to lead the wrong way", "mislead", [
        "dislead",
        "relead",
        "leader",
      ]),
      buildClueQuestion("to do again", "redo", ["undo", "outdo", "overdo"]),
      buildClueQuestion("to appear again", "reappear", [
        "disappear",
        "misappear",
        "appeared",
      ]),
      buildClueQuestion("to build again", "rebuild", [
        "unbuild",
        "misbuild",
        "builder",
      ]),
      buildClueQuestion("a boat that goes under the sea", "submarine", [
        "marine",
        "mariner",
        "ultramarine",
      ]),
      buildClueQuestion("a very big shop", "supermarket", [
        "submarket",
        "market",
        "minimarket",
      ]),
      buildClueQuestion("a hero with special powers", "superhero", [
        "subhero",
        "heroic",
        "heroes",
      ]),
      buildClueQuestion("the opposite way to a clock", "anticlockwise", [
        "clockwise",
        "reclockwise",
        "subclockwise",
      ]),
      buildClueQuestion("a liquid that stops water freezing", "antifreeze", [
        "freezer",
        "refreeze",
        "unfreeze",
      ]),
      buildClueQuestion("a famous person's signature", "autograph", [
        "paragraph",
        "photograph",
        "telegraph",
      ]),
      buildClueQuestion("a life story you write yourself", "autobiography", [
        "biography",
        "biographer",
        "biographic",
      ]),
    ],
  },
  4: {
    skillId: "english.prefixes-in-il-im-ir-inter",
    ask: "Which word means this?",
    hint: "Use il- before l, im- before m or p, ir- before r and in- before most other letters.",
    questions: [
      buildClueQuestion("not legal", "illegal", [
        "unlegal",
        "inlegal",
        "imlegal",
      ]),
      buildClueQuestion("not legible", "illegible", [
        "unlegible",
        "inlegible",
        "irlegible",
      ]),
      buildClueQuestion("not logical", "illogical", [
        "unlogical",
        "inlogical",
        "imlogical",
      ]),
      buildClueQuestion("not possible", "impossible", [
        "unpossible",
        "inpossible",
        "irpossible",
      ]),
      buildClueQuestion("not polite", "impolite", [
        "unpolite",
        "inpolite",
        "ilpolite",
      ]),
      buildClueQuestion("not patient", "impatient", [
        "unpatient",
        "irpatient",
        "ilpatient",
      ]),
      buildClueQuestion("not mature", "immature", [
        "unmature",
        "inmature",
        "irmature",
      ]),
      buildClueQuestion("not perfect", "imperfect", [
        "unperfect",
        "inperfect",
        "ilperfect",
      ]),
      buildClueQuestion("not regular", "irregular", [
        "unregular",
        "inregular",
        "imregular",
      ]),
      buildClueQuestion("not responsible", "irresponsible", [
        "unresponsible",
        "inresponsible",
        "imresponsible",
      ]),
      buildClueQuestion("not relevant", "irrelevant", [
        "unrelevant",
        "inrelevant",
        "ilrelevant",
      ]),
      buildClueQuestion("not correct", "incorrect", [
        "uncorrect",
        "imcorrect",
        "ircorrect",
      ]),
      buildClueQuestion("not active", "inactive", [
        "unactive",
        "imactive",
        "ilactive",
      ]),
      buildClueQuestion("not visible", "invisible", [
        "unvisible",
        "imvisible",
        "irvisible",
      ]),
      buildClueQuestion("between nations", "international", [
        "national",
        "nationality",
        "nationalise",
      ]),
      buildClueQuestion("to act with each other", "interact", [
        "react",
        "enact",
        "overact",
      ]),
      buildClueQuestion("joined to each other", "interconnected", [
        "connected",
        "disconnected",
        "reconnected",
      ]),
    ],
  },
  5: {
    skillId: "english.verb-suffixes-ate-ise-ify-en",
    ask: "Which verb means this?",
    hint: "The endings -ate, -ise, -ify and -en turn nouns and adjectives into verbs, like simplify and widen.",
    questions: [
      buildClueQuestion("to make simple", "simplify", [
        "simpler",
        "simply",
        "simplicity",
      ]),
      buildClueQuestion("to make clear", "clarify", [
        "clearer",
        "clearly",
        "clarity",
      ]),
      buildClueQuestion("to make pure", "purify", [
        "purer",
        "purely",
        "purity",
      ]),
      buildClueQuestion("to make solid", "solidify", [
        "solidly",
        "solidity",
        "solids",
      ]),
      buildClueQuestion("to fill with terror", "terrify", [
        "terror",
        "terrible",
        "terribly",
      ]),
      buildClueQuestion("to make wide", "widen", ["wider", "widely", "width"]),
      buildClueQuestion("to make dark", "darken", [
        "darker",
        "darkly",
        "darkness",
      ]),
      buildClueQuestion("to make short", "shorten", [
        "shorter",
        "shortly",
        "shortage",
      ]),
      buildClueQuestion("to make tight", "tighten", [
        "tighter",
        "tightly",
        "tightness",
      ]),
      buildClueQuestion("to make sharp", "sharpen", [
        "sharper",
        "sharply",
        "sharpness",
      ]),
      buildClueQuestion("to make modern", "modernise", [
        "modernity",
        "modernism",
        "modernly",
      ]),
      buildClueQuestion("to give a summary", "summarise", [
        "summary",
        "summaries",
        "summarily",
      ]),
      buildClueQuestion("to sort into categories", "categorise", [
        "category",
        "categories",
        "categorical",
      ]),
      buildClueQuestion("to say sorry", "apologise", [
        "apology",
        "apologies",
        "apologetic",
      ]),
      buildClueQuestion("to make active", "activate", [
        "activity",
        "actively",
        "activist",
      ]),
      buildClueQuestion("to give someone a motive", "motivate", [
        "motive",
        "motivation",
        "motivator",
      ]),
    ],
  },
  6: {
    skillId: "english.hyphens-after-prefixes",
    ask: "Which word means this?",
    hint: "A hyphen after a prefix can change the meaning, like re-cover (cover again) and recover (get better).",
    questions: [
      buildClueQuestion("to cover again", "re-cover", [
        "recover",
        "covered",
        "uncover",
      ]),
      buildClueQuestion("to sign again", "re-sign", [
        "resign",
        "signed",
        "design",
      ]),
      buildClueQuestion("to form again", "re-form", [
        "reform",
        "formed",
        "deform",
      ]),
      buildClueQuestion("to press again", "re-press", [
        "repress",
        "pressed",
        "impress",
      ]),
      buildClueQuestion("to sort again", "re-sort", [
        "resort",
        "sorted",
        "assort",
      ]),
      buildClueQuestion("to enter again", "re-enter", [
        "renter",
        "entered",
        "entrance",
      ]),
      buildClueQuestion("to elect again", "re-elect", [
        "select",
        "elected",
        "elector",
      ]),
      buildClueQuestion("to examine again", "re-examine", [
        "examine",
        "examiner",
        "examined",
      ]),
      buildClueQuestion("to work together", "co-operate", [
        "operate",
        "operator",
        "operated",
      ]),
      buildClueQuestion("to organise people to work together", "co-ordinate", [
        "subordinate",
        "inordinate",
        "ordinal",
      ]),
      buildClueQuestion("to own together", "co-own", [
        "owner",
        "disown",
        "owned",
      ]),
      buildClueQuestion("someone who writes a book with you", "co-author", [
        "authority",
        "authorise",
        "authored",
      ]),
      buildClueQuestion("someone who works with you", "co-worker", [
        "workshop",
        "worked",
        "workload",
      ]),
      buildClueQuestion("a captain who shares the job", "co-captain", [
        "captaincy",
        "captained",
        "captains",
      ]),
      buildClueQuestion("to edit again", "re-edit", [
        "edited",
        "editor",
        "edition",
      ]),
    ],
  },
};
