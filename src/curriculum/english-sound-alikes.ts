import {
  buildSentenceGapQuestion,
  type EnglishGameContent,
  type EnglishQuestion,
} from "./english-questions.js";

export const buildSoundAlikeQuestions = (
  words: readonly string[],
  sentences: Record<string, string>,
): EnglishQuestion[] =>
  Object.entries(sentences).map(([answer, sentence]) =>
    buildSentenceGapQuestion(
      sentence,
      answer,
      words.filter((word) => word !== answer),
    ),
  );

export const soundAlikes: EnglishGameContent = {
  1: {
    skillId: "english.spelling-ff-ll-ss-zz-ck-nk-tch",
    ask: "Which spelling is right?",
    hint: "Say the word slowly. Short words often end in ff, ll, ss, zz, ck, nk or tch.",
    questions: [
      buildSentenceGapQuestion("The ___ said tick tock.", "clock", [
        "clok",
        "clocc",
        "clokc",
      ]),
      buildSentenceGapQuestion("The cat jumped ___ the wall.", "off", [
        "of",
        "oph",
        "ov",
      ]),
      buildSentenceGapQuestion("The dragon let out a ___ of smoke.", "puff", [
        "puf",
        "pugh",
        "puph",
      ]),
      buildSentenceGapQuestion("We ran up the big green ___.", "hill", [
        "hil",
        "hile",
        "hyll",
      ]),
      buildSentenceGapQuestion("The school ___ rang at nine.", "bell", [
        "bel",
        "bele",
        "beal",
      ]),
      buildSentenceGapQuestion("Mum gave me a ___ goodnight.", "kiss", [
        "kis",
        "kiz",
        "kise",
      ]),
      buildSentenceGapQuestion("She wore a pink ___ to the party.", "dress", [
        "dres",
        "dresz",
        "drees",
      ]),
      buildSentenceGapQuestion("The bees ___ in the garden.", "buzz", [
        "buz",
        "buzs",
        "buzze",
      ]),
      buildSentenceGapQuestion("The lemonade went ___ in my cup.", "fizz", [
        "fiz",
        "fizs",
        "phiz",
      ]),
      buildSentenceGapQuestion("The ___ swam on the pond.", "duck", [
        "duk",
        "ducc",
        "dukc",
      ]),
      buildSentenceGapQuestion("I lost one blue ___.", "sock", [
        "sok",
        "socc",
        "sokc",
      ]),
      buildSentenceGapQuestion("Her shoes are bright ___.", "pink", [
        "pinc",
        "pinck",
        "pingk",
      ]),
      buildSentenceGapQuestion("Can I have a ___ of water?", "drink", [
        "drinc",
        "drinck",
        "dringk",
      ]),
      buildSentenceGapQuestion("I put a coin in my piggy ___.", "bank", [
        "banc",
        "banck",
        "bangk",
      ]),
      buildSentenceGapQuestion("Can you ___ the ball?", "catch", [
        "cach",
        "catsh",
        "kach",
      ]),
      buildSentenceGapQuestion("The ___ flew on her broom.", "witch", [
        "wich",
        "witsh",
        "wytch",
      ]),
    ],
  },
  2: {
    skillId: "english.homophones",
    ask: "Which spelling fits the sentence?",
    hint: "These words sound the same. Think about what the sentence means.",
    questions: [
      ...buildSoundAlikeQuestions(["see", "sea"], {
        see: "I can ___ a ship on the waves.",
        sea: "We swam in the ___ on holiday.",
      }),
      ...buildSoundAlikeQuestions(["hear", "here"], {
        hear: "Can you ___ the birds singing?",
        here: "Come over ___ and sit down.",
      }),
      ...buildSoundAlikeQuestions(["bear", "bare"], {
        bear: "The brown ___ ate the honey.",
        bare: "I walked on the sand in ___ feet.",
      }),
      ...buildSoundAlikeQuestions(["won", "one"], {
        won: "Our team ___ the race.",
        one: "I have ___ red balloon.",
      }),
      ...buildSoundAlikeQuestions(["sun", "son"], {
        sun: "The ___ is very hot today.",
        son: "Mr Jones has a ___ called Sam.",
      }),
      ...buildSoundAlikeQuestions(["blew", "blue"], {
        blew: "The wind ___ my hat away.",
        blue: "The sky is bright ___ today.",
      }),
      ...buildSoundAlikeQuestions(["night", "knight"], {
        night: "The owl hunts at ___.",
        knight: "The ___ rode a white horse.",
      }),
      ...buildSoundAlikeQuestions(["two", "to", "too"], {
        two: "I have ___ cats and a dog.",
        to: "We walked ___ the park.",
        too: "Can I come ___?",
      }),
      ...buildSoundAlikeQuestions(["there", "their", "they're"], {
        there: "Look over ___ by the tree!",
        their: "The children played in ___ garden.",
        "they're": "___ going to the zoo today.",
      }),
      ...buildSoundAlikeQuestions(["quiet", "quite"], {
        quiet: "Please be ___ in the library.",
        quite: "The film was ___ long.",
      }),
    ],
  },
  3: {
    skillId: "english.homophones-accept-to-mail",
    ask: "Which spelling fits the sentence?",
    hint: "These words sound alike. Think about what the sentence means.",
    questions: [
      ...buildSoundAlikeQuestions(["accept", "except"], {
        accept: "Please ___ this gift from me.",
        except: "Everyone came ___ Tom, who was ill.",
      }),
      ...buildSoundAlikeQuestions(["affect", "effect"], {
        affect: "Will the rain ___ our picnic?",
        effect: "The magic spell had a strange ___.",
      }),
      ...buildSoundAlikeQuestions(["ball", "bawl"], {
        ball: "Kick the ___ into the net.",
        bawl: "The tired baby began to ___ loudly.",
      }),
      ...buildSoundAlikeQuestions(["berry", "bury"], {
        berry: "The bird ate a juicy red ___.",
        bury: "The dog likes to ___ his bone.",
      }),
      ...buildSoundAlikeQuestions(["brake", "break"], {
        brake: "Pull the ___ to stop your bike.",
        break: "Be careful not to ___ the glass.",
      }),
      ...buildSoundAlikeQuestions(["fair", "fare"], {
        fair: "It is not ___ to cheat.",
        fare: "Dad paid the bus ___ for us.",
      }),
      ...buildSoundAlikeQuestions(["grate", "great"], {
        grate: "Please ___ the cheese for the pizza.",
        great: "We had a ___ time at the party.",
      }),
      ...buildSoundAlikeQuestions(["groan", "grown"], {
        groan: "The tired giant let out a ___.",
        grown: "My sunflower has ___ very tall.",
      }),
      ...buildSoundAlikeQuestions(["heel", "heal"], {
        heel: "My new shoe rubbed my ___.",
        heal: "The cut on my knee will soon ___.",
      }),
      ...buildSoundAlikeQuestions(["knot", "not"], {
        knot: "Tie a ___ in the rope.",
        not: "I am ___ hungry right now.",
      }),
      ...buildSoundAlikeQuestions(["mail", "male"], {
        mail: "The postman brought the ___.",
        male: "A ___ peacock has bright feathers.",
      }),
    ],
  },
  4: {
    skillId: "english.homophones-main-to-whose",
    ask: "Which spelling fits the sentence?",
    hint: "These words sound alike. Think about what the sentence means.",
    questions: [
      ...buildSoundAlikeQuestions(["main", "mane"], {
        main: "The ___ road runs through the town.",
        mane: "The horse shook its long ___.",
      }),
      ...buildSoundAlikeQuestions(["meat", "meet"], {
        meat: "The butcher sells ___ and sausages.",
        meet: "Let's ___ at the park at two.",
      }),
      ...buildSoundAlikeQuestions(["medal", "meddle"], {
        medal: "She won a gold ___ in the race.",
        meddle: "Please do not ___ with my things.",
      }),
      ...buildSoundAlikeQuestions(["missed", "mist"], {
        missed: "I ___ the bus this morning.",
        mist: "A grey ___ hung over the hills.",
      }),
      ...buildSoundAlikeQuestions(["peace", "piece"], {
        peace: "The cat slept in ___ and quiet.",
        piece: "Can I have a ___ of cake?",
      }),
      ...buildSoundAlikeQuestions(["plain", "plane"], {
        plain: "I like ___ crisps best.",
        plane: "The ___ flew high above the clouds.",
      }),
      ...buildSoundAlikeQuestions(["rain", "rein", "reign"], {
        rain: "Take an umbrella in case of ___.",
        rein: "Hold the ___ to steer the pony.",
        reign: "The queen had a long and happy ___.",
      }),
      ...buildSoundAlikeQuestions(["scene", "seen"], {
        scene: "The first ___ of the play is in a wood.",
        seen: "Have you ___ my pencil case?",
      }),
      ...buildSoundAlikeQuestions(["weather", "whether"], {
        weather: "The ___ is sunny and warm today.",
        whether: "I wonder ___ it will snow.",
      }),
      ...buildSoundAlikeQuestions(["whose", "who's"], {
        whose: "___ coat is this on the floor?",
        "who's": "___ coming to my party?",
      }),
    ],
  },
  5: {
    skillId: "english.homophones-advice-to-guessed",
    ask: "Which spelling fits the sentence?",
    hint: "These words sound alike. Think about what the sentence means.",
    questions: [
      ...buildSoundAlikeQuestions(["advice", "advise"], {
        advice: "Mum gave me good ___ about school.",
        advise: "I ___ you to wear a warm coat.",
      }),
      ...buildSoundAlikeQuestions(["aloud", "allowed"], {
        aloud: "Please read the poem ___.",
        allowed: "Dogs are not ___ in the shop.",
      }),
      ...buildSoundAlikeQuestions(["altar", "alter"], {
        altar: "Candles stood on the church ___.",
        alter: "The tailor will ___ my trousers.",
      }),
      ...buildSoundAlikeQuestions(["cereal", "serial"], {
        cereal: "I eat ___ with milk for breakfast.",
        serial: "We watched a TV ___ about spies.",
      }),
      ...buildSoundAlikeQuestions(["compliment", "complement"], {
        compliment: "She paid me a kind ___ on my hair.",
        complement: "The red scarf will ___ your coat.",
      }),
      ...buildSoundAlikeQuestions(["descent", "dissent"], {
        descent: "The plane began its ___ to land.",
        dissent: "The crowd shouted in ___ at the unfair rule.",
      }),
      ...buildSoundAlikeQuestions(["desert", "dessert"], {
        desert: "Camels can live in the hot ___.",
        dessert: "We had ice cream for ___.",
      }),
      ...buildSoundAlikeQuestions(["draft", "draught"], {
        draft: "Write a ___ of your story first.",
        draught: "A cold ___ blew under the door.",
      }),
      ...buildSoundAlikeQuestions(["farther", "father"], {
        farther: "Which town is ___ away, Leeds or York?",
        father: "My ___ cooked us pancakes.",
      }),
      ...buildSoundAlikeQuestions(["guessed", "guest"], {
        guessed: "I ___ the answer to the riddle.",
        guest: "Our ___ stayed for dinner.",
      }),
    ],
  },
  6: {
    skillId: "english.homophones-heard-to-wary",
    ask: "Which spelling fits the sentence?",
    hint: "These words sound alike. Think about what the sentence means.",
    questions: [
      ...buildSoundAlikeQuestions(["heard", "herd"], {
        heard: "I ___ a noise in the night.",
        herd: "A ___ of cows crossed the field.",
      }),
      ...buildSoundAlikeQuestions(["led", "lead"], {
        led: "The guide ___ us up the mountain.",
        lead: "Old water pipes were made of ___.",
      }),
      ...buildSoundAlikeQuestions(["morning", "mourning"], {
        morning: "I wake up at seven every ___.",
        mourning: "The town was in ___ after the king died.",
      }),
      ...buildSoundAlikeQuestions(["past", "passed"], {
        past: "We walked ___ the bakery.",
        passed: "She ___ her swimming test.",
      }),
      ...buildSoundAlikeQuestions(["precede", "proceed"], {
        precede: "A short film will ___ the main film.",
        proceed: "Please ___ calmly to the exit.",
      }),
      ...buildSoundAlikeQuestions(["principal", "principle"], {
        principal: "The ___ of the college gave a speech.",
        principle: "Fairness is an important ___.",
      }),
      ...buildSoundAlikeQuestions(["profit", "prophet"], {
        profit: "Our cake sale made a ___ of £20.",
        prophet: "The ___ said a great flood would come.",
      }),
      ...buildSoundAlikeQuestions(["stationary", "stationery"], {
        stationary: "The car stayed ___ at the red light.",
        stationery: "Pens and paper are kinds of ___.",
      }),
      ...buildSoundAlikeQuestions(["steal", "steel"], {
        steal: "The fox tried to ___ the eggs.",
        steel: "The bridge is made of strong ___.",
      }),
      ...buildSoundAlikeQuestions(["wary", "weary"], {
        wary: "The deer stayed ___, ready to run at any sound.",
        weary: "After the long hike we were ___ and sleepy.",
      }),
    ],
  },
};
