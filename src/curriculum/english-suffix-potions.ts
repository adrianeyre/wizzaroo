import {
  buildWordSumQuestion,
  type EnglishGameContent,
} from "./english-questions.js";

export const suffixPotions: EnglishGameContent = {
  1: {
    skillId: "english.suffixes-ing-ed-er-est",
    ask: "Add the ending. Which spelling is right?",
    hint: "For these words, just add the ending and keep the word the same.",
    questions: [
      buildWordSumQuestion(["hunt", "ing"], "hunting", [
        "huntting",
        "hunteing",
        "huntin",
      ]),
      buildWordSumQuestion(["jump", "ed"], "jumped", [
        "jumpt",
        "jumpped",
        "jumpd",
      ]),
      buildWordSumQuestion(["quick", "er"], "quicker", [
        "quickker",
        "quikker",
        "quickor",
      ]),
      buildWordSumQuestion(["fast", "est"], "fastest", [
        "fastist",
        "fasttest",
        "fastst",
      ]),
      buildWordSumQuestion(["buzz", "ing"], "buzzing", [
        "buzing",
        "buzzzing",
        "buzzeing",
      ]),
      buildWordSumQuestion(["help", "ed"], "helped", [
        "helpt",
        "helpped",
        "helpd",
      ]),
      buildWordSumQuestion(["play", "ing"], "playing", [
        "plaing",
        "playying",
        "playin",
      ]),
      buildWordSumQuestion(["long", "er"], "longer", [
        "longger",
        "longor",
        "lonnger",
      ]),
      buildWordSumQuestion(["old", "est"], "oldest", [
        "oldist",
        "olddest",
        "oldst",
      ]),
      buildWordSumQuestion(["sing", "ing"], "singing", [
        "singging",
        "singin",
        "singeing",
      ]),
      buildWordSumQuestion(["fish", "ed"], "fished", [
        "fisht",
        "fishhed",
        "fishd",
      ]),
      buildWordSumQuestion(["cold", "er"], "colder", [
        "coldder",
        "coldor",
        "colda",
      ]),
      buildWordSumQuestion(["small", "est"], "smallest", [
        "smalest",
        "smallist",
        "smallst",
      ]),
      buildWordSumQuestion(["rest", "ing"], "resting", [
        "restting",
        "resteing",
        "restin",
      ]),
      buildWordSumQuestion(["thick", "est"], "thickest", [
        "thikest",
        "thickist",
        "thickst",
      ]),
    ],
  },
  2: {
    skillId: "english.suffix-spelling-rules",
    ask: "Add the suffix. Which spelling is right?",
    hint: "Drop a final e, double a short vowel's last letter, or change y to i.",
    questions: [
      buildWordSumQuestion(["hike", "ing"], "hiking", [
        "hikeing",
        "hikking",
        "hikying",
      ]),
      buildWordSumQuestion(["pat", "ing"], "patting", [
        "pating",
        "pateing",
        "pattin",
      ]),
      buildWordSumQuestion(["big", "est"], "biggest", [
        "bigest",
        "biggist",
        "bigiest",
      ]),
      buildWordSumQuestion(["cry", "ed"], "cried", ["cryed", "cryd", "creid"]),
      buildWordSumQuestion(["happy", "er"], "happier", [
        "happyer",
        "happer",
        "happiar",
      ]),
      buildWordSumQuestion(["copy", "es"], "copies", [
        "copys",
        "copyes",
        "copis",
      ]),
      buildWordSumQuestion(["enjoy", "ment"], "enjoyment", [
        "enjoiment",
        "enjoyement",
        "enjoymint",
      ]),
      buildWordSumQuestion(["sad", "ness"], "sadness", [
        "sadnes",
        "saddness",
        "sadniss",
      ]),
      buildWordSumQuestion(["care", "ful"], "careful", [
        "carefull",
        "carful",
        "carefel",
      ]),
      buildWordSumQuestion(["hope", "less"], "hopeless", [
        "hopless",
        "hopeles",
        "hopeliss",
      ]),
      buildWordSumQuestion(["bad", "ly"], "badly", [
        "baddly",
        "badley",
        "badlly",
      ]),
      buildWordSumQuestion(["shine", "y"], "shiny", [
        "shiney",
        "shinie",
        "shinnie",
      ]),
      buildWordSumQuestion(["run", "er"], "runner", [
        "runer",
        "runnor",
        "runnar",
      ]),
      buildWordSumQuestion(["late", "est"], "latest", [
        "lateest",
        "lattest",
        "latist",
      ]),
      buildWordSumQuestion(["hurry", "ed"], "hurried", [
        "hurryed",
        "huried",
        "hurrid",
      ]),
      buildWordSumQuestion(["merry", "ment"], "merriment", [
        "merryment",
        "merrimint",
        "merement",
      ]),
      buildWordSumQuestion(["happy", "ness"], "happiness", [
        "happyness",
        "happiniss",
        "hapiness",
      ]),
      buildWordSumQuestion(["hop", "ed"], "hopped", ["hoped", "hopt", "hopd"]),
    ],
  },
  3: {
    skillId: "english.suffixes-ly-ation-and-doubling",
    ask: "Add the suffix. Which spelling is right?",
    hint: "Double the last letter only when the end of the word is stressed, like beGIN.",
    questions: [
      buildWordSumQuestion(["happy", "ly"], "happily", [
        "happyly",
        "happaly",
        "happly",
      ]),
      buildWordSumQuestion(["gentle", "ly"], "gently", [
        "gentlely",
        "gentley",
        "gentily",
      ]),
      buildWordSumQuestion(["basic", "ly"], "basically", [
        "basicly",
        "basicaly",
        "basiclly",
      ]),
      buildWordSumQuestion(["inform", "ation"], "information", [
        "informition",
        "infomation",
        "informasion",
      ]),
      buildWordSumQuestion(["admire", "ation"], "admiration", [
        "admireation",
        "admiretion",
        "admirasion",
      ]),
      buildWordSumQuestion(["prepare", "ation"], "preparation", [
        "prepareation",
        "preperation",
        "prepairation",
      ]),
      buildWordSumQuestion(["begin", "ing"], "beginning", [
        "begining",
        "beginnig",
        "beginneing",
      ]),
      buildWordSumQuestion(["forget", "ing"], "forgetting", [
        "forgeting",
        "forgettin",
        "forgetteing",
      ]),
      buildWordSumQuestion(["regret", "ing"], "regretting", [
        "regreting",
        "regretin",
        "reggretting",
      ]),
      buildWordSumQuestion(["admit", "ed"], "admitted", [
        "admited",
        "addmitted",
        "admittid",
      ]),
      buildWordSumQuestion(["garden", "ing"], "gardening", [
        "gardenning",
        "gardining",
        "gardenin",
      ]),
      buildWordSumQuestion(["limit", "ed"], "limited", [
        "limitted",
        "limmited",
        "limitid",
      ]),
      buildWordSumQuestion(["visit", "ed"], "visited", [
        "visitted",
        "vissited",
        "visitid",
      ]),
      buildWordSumQuestion(["target", "ed"], "targeted", [
        "targetted",
        "targited",
        "targetid",
      ]),
      buildWordSumQuestion(["usual", "ly"], "usually", [
        "usualy",
        "usully",
        "usualley",
      ]),
      buildWordSumQuestion(["frantic", "ly"], "frantically", [
        "franticly",
        "franticaly",
        "frantickly",
      ]),
      buildWordSumQuestion(["sudden", "ly"], "suddenly", [
        "suddenley",
        "sudenly",
        "suddently",
      ]),
    ],
  },
  4: {
    skillId: "english.suffixes-ous-tion-sion-cian",
    ask: "Add the ending. Which spelling is right?",
    hint: "Look at how the root ends: t gives -tion, d gives -sion, ss gives -ssion and c gives -cian.",
    questions: [
      buildWordSumQuestion(["poison", "ous"], "poisonous", [
        "poisonus",
        "poisonious",
        "poisenous",
      ]),
      buildWordSumQuestion(["danger", "ous"], "dangerous", [
        "dangerus",
        "dangeros",
        "dangerious",
      ]),
      buildWordSumQuestion(["mountain", "ous"], "mountainous", [
        "mountanous",
        "mountainus",
        "mountainious",
      ]),
      buildWordSumQuestion(["fame", "ous"], "famous", [
        "fameous",
        "famus",
        "famious",
      ]),
      buildWordSumQuestion(["courage", "ous"], "courageous", [
        "couragous",
        "courageus",
        "curageous",
      ]),
      buildWordSumQuestion(["outrage", "ous"], "outrageous", [
        "outragous",
        "outrageus",
        "outragious",
      ]),
      buildWordSumQuestion(["vary", "ous"], "various", [
        "varyous",
        "varius",
        "variouse",
      ]),
      buildWordSumQuestion(["humour", "ous"], "humorous", [
        "humourous",
        "humerous",
        "humorus",
      ]),
      buildWordSumQuestion(["invent", "ion"], "invention", [
        "invension",
        "inventsion",
        "invenshun",
      ]),
      buildWordSumQuestion(["expand", "sion"], "expansion", [
        "expandsion",
        "expantion",
        "expanssion",
      ]),
      buildWordSumQuestion(["extend", "sion"], "extension", [
        "extention",
        "extendsion",
        "extenssion",
      ]),
      buildWordSumQuestion(["comprehend", "sion"], "comprehension", [
        "comprehention",
        "comprehendsion",
        "comprehenssion",
      ]),
      buildWordSumQuestion(["discuss", "ion"], "discussion", [
        "discusion",
        "discustion",
        "discusssion",
      ]),
      buildWordSumQuestion(["express", "ion"], "expression", [
        "expresion",
        "expretion",
        "expressian",
      ]),
      buildWordSumQuestion(["music", "ian"], "musician", [
        "musicion",
        "musition",
        "musicain",
      ]),
      buildWordSumQuestion(["magic", "ian"], "magician", [
        "magicion",
        "magition",
        "magishan",
      ]),
      buildWordSumQuestion(["electric", "ian"], "electrician", [
        "electricion",
        "electrition",
        "electricain",
      ]),
    ],
  },
  5: {
    skillId: "english.suffixes-able-ible-cious-cial",
    ask: "Add the ending. Which spelling is right?",
    hint: "Keep the e after a soft c or g, as in noticeable and changeable.",
    questions: [
      buildWordSumQuestion(["adore", "able"], "adorable", [
        "adoreable",
        "adorible",
        "adorabel",
      ]),
      buildWordSumQuestion(["rely", "able"], "reliable", [
        "relyable",
        "relible",
        "reliabel",
      ]),
      buildWordSumQuestion(["change", "able"], "changeable", [
        "changable",
        "changible",
        "changeible",
      ]),
      buildWordSumQuestion(["notice", "able"], "noticeable", [
        "noticable",
        "noticible",
        "noticeible",
      ]),
      buildWordSumQuestion(["depend", "able"], "dependable", [
        "dependible",
        "dependeble",
        "dependabel",
      ]),
      buildWordSumQuestion(["comfort", "able"], "comfortable", [
        "comfortible",
        "comfterble",
        "comfortabel",
      ]),
      buildWordSumQuestion(["sense", "ible"], "sensible", [
        "senseible",
        "sensable",
        "sensibel",
      ]),
      buildWordSumQuestion(["reverse", "ible"], "reversible", [
        "reverseible",
        "reversable",
        "reversibel",
      ]),
      buildWordSumQuestion(["consider", "ably"], "considerably", [
        "considerbly",
        "considerebly",
        "consideribly",
      ]),
      buildWordSumQuestion(["reason", "ably"], "reasonably", [
        "reasonibly",
        "reasonbly",
        "reasonabley",
      ]),
      buildWordSumQuestion(["grace", "ious"], "gracious", [
        "graceous",
        "grasious",
        "gracous",
      ]),
      buildWordSumQuestion(["space", "ious"], "spacious", [
        "spaceous",
        "spatious",
        "spacous",
      ]),
      buildWordSumQuestion(["ambition", "ous"], "ambitious", [
        "ambicious",
        "ambitionous",
        "ambitous",
      ]),
      buildWordSumQuestion(["caution", "ous"], "cautious", [
        "caucious",
        "cautionous",
        "cautous",
      ]),
      buildWordSumQuestion(["office", "ial"], "official", [
        "offical",
        "officeal",
        "offitial",
      ]),
      buildWordSumQuestion(["face", "ial"], "facial", [
        "faceial",
        "fatial",
        "facal",
      ]),
      buildWordSumQuestion(["part", "ial"], "partial", [
        "parcial",
        "partail",
        "partiel",
      ]),
    ],
  },
  6: {
    skillId: "english.suffixes-fer-ant-ance-ent-ence",
    ask: "Add the ending. Which spelling is right?",
    hint: "Double the r when fer is still stressed, as in preferred, but not in preference.",
    questions: [
      buildWordSumQuestion(["refer", "ing"], "referring", [
        "refering",
        "reffering",
        "referrring",
      ]),
      buildWordSumQuestion(["prefer", "ed"], "preferred", [
        "prefered",
        "preferd",
        "preferrd",
      ]),
      buildWordSumQuestion(["transfer", "ing"], "transferring", [
        "transfering",
        "transferrring",
        "transferreing",
      ]),
      buildWordSumQuestion(["refer", "al"], "referral", [
        "referal",
        "refferal",
        "referrel",
      ]),
      buildWordSumQuestion(["prefer", "ence"], "preference", [
        "preferrence",
        "preferance",
        "prefference",
      ]),
      buildWordSumQuestion(["refer", "ence"], "reference", [
        "referrence",
        "referance",
        "refrence",
      ]),
      buildWordSumQuestion(["infer", "ence"], "inference", [
        "inferrence",
        "inferance",
        "infference",
      ]),
      buildWordSumQuestion(["confer", "ence"], "conference", [
        "conferrence",
        "conferance",
        "confrence",
      ]),
      buildWordSumQuestion(["observe", "ant"], "observant", [
        "observent",
        "observeant",
        "observint",
      ]),
      buildWordSumQuestion(["hesitate", "ant"], "hesitant", [
        "hesitent",
        "hesitateant",
        "hesitint",
      ]),
      buildWordSumQuestion(["tolerate", "ant"], "tolerant", [
        "tolerent",
        "tolarant",
        "tolerateant",
      ]),
      buildWordSumQuestion(["expect", "ant"], "expectant", [
        "expectent",
        "expectint",
        "expecktant",
      ]),
      buildWordSumQuestion(["assist", "ance"], "assistance", [
        "assistence",
        "asistance",
        "assistanse",
      ]),
      buildWordSumQuestion(["innocent", "ence"], "innocence", [
        "innocense",
        "innocance",
        "inocence",
      ]),
      buildWordSumQuestion(["obedient", "ence"], "obedience", [
        "obediance",
        "obedeince",
        "obediense",
      ]),
      buildWordSumQuestion(["confident", "ence"], "confidence", [
        "confidance",
        "confidense",
        "confedence",
      ]),
      buildWordSumQuestion(["decent", "ency"], "decency", [
        "decensy",
        "decancy",
        "decentcy",
      ]),
      buildWordSumQuestion(["frequent", "ency"], "frequency", [
        "frequancy",
        "frequensy",
        "frequentcy",
      ]),
    ],
  },
};
