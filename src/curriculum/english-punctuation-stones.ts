import {
  buildSentenceGapQuestion,
  type EnglishGameContent,
  type EnglishQuestion,
} from "./english-questions.js";

const endWith = (
  sentences: readonly string[],
  answer: string,
): EnglishQuestion[] =>
  sentences.map((sentence) =>
    buildSentenceGapQuestion(
      `${sentence}___`,
      answer,
      [".", "?", "!"].filter((mark) => mark !== answer),
    ),
  );

const markEach = (
  sentences: readonly string[],
  answer: string,
  slips: readonly string[],
): EnglishQuestion[] =>
  sentences.map((sentence) =>
    buildSentenceGapQuestion(sentence, answer, slips),
  );

export const punctuationStones: EnglishGameContent = {
  1: {
    skillId: "english.sentence-punctuation",
    ask: "Which mark ends the sentence?",
    hint: "Is it telling you something, asking something, or saying it loudly?",
    questions: [
      ...endWith(
        [
          "The cat sat on the mat",
          "We went to the park",
          "I can see a red bus",
          "My dog likes to run",
          "Mum made a cake for tea",
          "The owl sleeps in the day",
        ],
        ".",
      ),
      ...endWith(
        [
          "Where is my hat",
          "Can you swim",
          "What is your name",
          "Do you like apples",
          "Who is at the door",
          "Is it time for tea",
        ],
        "?",
      ),
      ...endWith(
        [
          "What a huge dog that is",
          "How fast you can run",
          "What a mess you made",
          "How tall that tree is",
          "What a funny hat you have",
          "What a lovely surprise",
        ],
        "!",
      ),
    ],
  },
  2: {
    skillId: "english.list-commas-and-sentence-types",
    ask: "Which mark goes in the gap?",
    hint: "Commas separate things in a list, and the end mark shows a statement, question or exclamation.",
    questions: [
      ...markEach(
        [
          "I packed a hat___ a coat and a scarf.",
          "We bought eggs___ milk and bread.",
          "I saw a cow___ a pig and a goat.",
          "She likes red___ blue and green.",
          "We need pens___ paper and glue.",
          "Tom has a cat___ a dog and a fish.",
        ],
        ",",
        [".", "?", "!"],
      ),
      ...markEach(
        [
          "We went to the beach___",
          "My brother is seven___",
          "Please close the door___",
          "Put your coat on the hook___",
        ],
        ".",
        [",", "?"],
      ),
      ...markEach(
        [
          "Where is my coat___",
          "When does the film start___",
          "Can I have a turn___",
        ],
        "?",
        [".", ",", "!"],
      ),
      ...markEach(
        [
          "What a big cake that is___",
          "How tall you have grown___",
          "What a funny clown he is___",
        ],
        "!",
        [",", "?"],
      ),
    ],
  },
  3: {
    skillId: "english.inverted-commas-for-speech",
    ask: "Which mark goes in the gap?",
    hint: "Speech marks go around the spoken words, with a comma or question mark before the closing one.",
    questions: [
      ...markEach(
        [
          "___Can I play?” asked Ben.",
          "___It is raining,” said Gran.",
          "___Look at the stars!” cried Zara.",
          "Ella whispered, ___Let’s hide.”",
        ],
        "“",
        ["”", ",", "."],
      ),
      ...markEach(
        ["“Is it lunch yet?___ asked Sam.", "“I love this song!___ sang Lily."],
        "”",
        ["“", ",", "."],
      ),
      ...markEach(
        [
          "“Come here___” said Dad.",
          "“I am hungry___” said Leo.",
          "“We won the match___” said Amir.",
        ],
        ",",
        [".", "?", "“"],
      ),
      ...markEach(
        [
          "“Where is my bag___” asked Mia.",
          "“Can we go now___” asked Ava.",
          "“What time is it___” asked Grandpa.",
        ],
        "?",
        [",", ".", "“"],
      ),
      buildSentenceGapQuestion("Mum said___ “Wash your hands.”", ",", [
        ".",
        "?",
        "”",
      ]),
      buildSentenceGapQuestion("Dad said, “Time for bed___”", ".", [
        ",",
        "?",
        "“",
      ]),
    ],
  },
  4: {
    skillId: "english.fronted-adverbial-commas-and-speech",
    ask: "Which mark goes in the gap?",
    hint: "Put a comma after a fronted adverbial, and keep speech punctuation inside the inverted commas.",
    questions: [
      ...markEach(
        [
          "Later that day___ we went home.",
          "After lunch___ we played football.",
          "Without a sound___ the cat crept in.",
          "As the sun set___ the owls woke up.",
          "In the morning___ I brush my teeth.",
          "Slowly and carefully___ she climbed down.",
          "Under the bridge___ a troll was snoring.",
          "Once upon a time___ there lived a king.",
          "Before the race___ Ali tied his laces.",
          "All of a sudden___ the lights went out.",
        ],
        ",",
        [".", "?", "!"],
      ),
      buildSentenceGapQuestion("“Pass the salt, please___” said Nan.", ",", [
        ".",
        "?",
        "“",
      ]),
      buildSentenceGapQuestion("“Are you ready___” asked the coach.", "?", [
        ",",
        ".",
        "“",
      ]),
      buildSentenceGapQuestion("“Did you see that___” asked Kai.", "?", [
        ",",
        ".",
        "“",
      ]),
      buildSentenceGapQuestion("The teacher said___ “Line up quietly.”", ",", [
        ".",
        "?",
        "”",
      ]),
    ],
  },
  5: {
    skillId: "english.parenthesis-and-clarifying-commas",
    ask: "Which mark goes in the gap?",
    hint: "Brackets, dashes and commas come in matching pairs around extra information.",
    questions: [
      ...markEach(
        [
          "My uncle ___who lives in Wales) is a farmer.",
          "Paris ___the capital of France) is busy.",
        ],
        "(",
        [",", "–", ")"],
      ),
      ...markEach(
        [
          "My uncle (who lives in Wales___ is a farmer.",
          "The film (which lasted three hours___ was great.",
        ],
        ")",
        ["(", ",", "–"],
      ),
      ...markEach(
        [
          "The cake – still warm___ smelt lovely.",
          "Mr Khan___ our new teacher – plays the drums.",
          "The lion – king of the jungle___ roared.",
          "Sam___ my best friend – is coming over.",
        ],
        "–",
        [",", "(", ")"],
      ),
      ...markEach(
        [
          "Our dog___ a big black poodle, loves walks.",
          "Our dog, a big black poodle___ loves walks.",
          "My gran, who is 80___ still swims every day.",
          "The car, which was red___ sped away.",
        ],
        ",",
        ["(", ")", "–"],
      ),
      ...markEach(
        ["Let’s eat___ Grandma!", "Most of the time___ travelling is fun."],
        ",",
        ["(", ")", ";"],
      ),
    ],
  },
  6: {
    skillId: "english.colons-semi-colons-and-hyphens",
    ask: "Which mark goes in the gap?",
    hint: "A colon introduces a list, a semi-colon joins two linked clauses and a hyphen joins words.",
    questions: [
      ...markEach(
        [
          "You will need___ eggs, flour and sugar.",
          "I packed three things___ a map, a torch and a coat.",
          "We saw lots of birds___ owls, robins and wrens.",
          "Bring the following___ a pen, a ruler and glue.",
        ],
        ":",
        [";", ",", "?"],
      ),
      ...markEach(
        [
          "It was raining___ we stayed indoors.",
          "The sun came out___ the snow began to melt.",
          "Mia loves maths___ her brother loves art.",
          "The film was long___ we all fell asleep.",
          "Some people like tea___ others prefer coffee.",
        ],
        ";",
        [",", "?", "!"],
      ),
      ...markEach(
        [
          "We saw a man___eating shark.",
          "She is a well___known author.",
          "It was a sugar___free cake.",
          "It was a last___minute change.",
          "Our cat is very bad___tempered.",
        ],
        "-",
        [",", ";", ":"],
      ),
    ],
  },
};
