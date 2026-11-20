import {
  buildSentenceGapQuestion,
  type EnglishGameContent,
} from "./english-questions.js";

export const bridgeBuilder: EnglishGameContent = {
  1: {
    skillId: "english.joining-with-and",
    ask: "Which word joins the two parts?",
    hint: "The word and joins two ideas together.",
    questions: [
      buildSentenceGapQuestion("I have a cat ___ a dog.", "and", [
        "the",
        "is",
        "my",
      ]),
      buildSentenceGapQuestion("We ran ___ jumped in the park.", "and", [
        "the",
        "is",
        "a",
      ]),
      buildSentenceGapQuestion("Mum ___ Dad went to the shop.", "and", [
        "is",
        "on",
        "the",
      ]),
      buildSentenceGapQuestion("I like red ___ blue.", "and", [
        "the",
        "is",
        "a",
      ]),
      buildSentenceGapQuestion("The dog barked ___ the cat ran away.", "and", [
        "is",
        "on",
        "a",
      ]),
      buildSentenceGapQuestion("I ate an apple ___ a pear.", "and", [
        "is",
        "the",
        "my",
      ]),
      buildSentenceGapQuestion("Sam sat down ___ read a book.", "and", [
        "the",
        "is",
        "on",
      ]),
      buildSentenceGapQuestion("We sang ___ danced at the party.", "and", [
        "the",
        "is",
        "on",
      ]),
      buildSentenceGapQuestion("The sun came out ___ we went to play.", "and", [
        "the",
        "is",
        "on",
      ]),
      buildSentenceGapQuestion("Ben ___ Amy are best friends.", "and", [
        "is",
        "on",
        "the",
      ]),
      buildSentenceGapQuestion("I brushed my teeth ___ went to bed.", "and", [
        "the",
        "is",
        "on",
      ]),
      buildSentenceGapQuestion("The frog hopped ___ the duck swam.", "and", [
        "is",
        "a",
        "my",
      ]),
      buildSentenceGapQuestion("I washed my hands ___ ate my lunch.", "and", [
        "the",
        "is",
        "on",
      ]),
      buildSentenceGapQuestion("Cats ___ dogs can be pets.", "and", [
        "is",
        "on",
        "the",
      ]),
    ],
  },
  2: {
    skillId: "english.conjunctions",
    ask: "Which word joins the two ideas?",
    hint: "Read the whole sentence with each word. Which one makes sense?",
    questions: [
      buildSentenceGapQuestion("We ate fish ___ chips at the beach.", "and", [
        "but",
        "because",
        "if",
      ]),
      buildSentenceGapQuestion("Sam has a cat ___ a dog at home.", "and", [
        "but",
        "because",
        "that",
      ]),
      buildSentenceGapQuestion(
        "I wanted to play outside, ___ it was raining.",
        "but",
        ["or", "if", "that"],
      ),
      buildSentenceGapQuestion(
        "The bag was small, ___ it was very heavy.",
        "but",
        ["or", "because", "that"],
      ),
      buildSentenceGapQuestion("Would you like milk ___ juice?", "or", [
        "but",
        "because",
        "that",
      ]),
      buildSentenceGapQuestion("Shall we walk ___ take the bus?", "or", [
        "but",
        "because",
        "that",
      ]),
      buildSentenceGapQuestion("I put on my coat ___ it was cold.", "because", [
        "or",
        "but",
        "that",
      ]),
      buildSentenceGapQuestion(
        "The baby cried ___ she was hungry.",
        "because",
        ["or", "but", "that"],
      ),
      buildSentenceGapQuestion(
        "The owls wake up ___ the sun goes down.",
        "when",
        ["or", "but", "that"],
      ),
      buildSentenceGapQuestion("Dad laughs ___ he hears a joke.", "when", [
        "or",
        "but",
        "that",
      ]),
      buildSentenceGapQuestion(
        "You can have a sticker ___ you tidy up.",
        "if",
        ["or", "but", "that"],
      ),
      buildSentenceGapQuestion("I hope ___ it is sunny tomorrow.", "that", [
        "or",
        "but",
        "because",
      ]),
      buildSentenceGapQuestion("Mum said ___ we could go swimming.", "that", [
        "or",
        "but",
        "because",
      ]),
    ],
  },
  3: {
    skillId: "english.time-and-cause-conjunctions",
    ask: "Which word fits the sentence?",
    hint: "Think about when it happened, or why it happened.",
    questions: [
      buildSentenceGapQuestion("Wash your hands ___ you eat lunch.", "before", [
        "during",
        "because of",
        "or",
      ]),
      buildSentenceGapQuestion(
        "We had a picnic ___ the rain stopped.",
        "after",
        ["during", "because of", "so"],
      ),
      buildSentenceGapQuestion("Dad read a book ___ the baby slept.", "while", [
        "during",
        "because of",
        "or",
      ]),
      buildSentenceGapQuestion("Ella fell asleep ___ the film.", "during", [
        "while",
        "so",
        "because",
      ]),
      buildSentenceGapQuestion("Owls hunt for mice ___ the night.", "during", [
        "while",
        "because",
        "so",
      ]),
      buildSentenceGapQuestion(
        "The match was called off ___ the snow.",
        "because of",
        ["while", "so", "because"],
      ),
      buildSentenceGapQuestion(
        "We were late ___ the traffic jam.",
        "because of",
        ["when", "so", "while"],
      ),
      buildSentenceGapQuestion("I was cold ___ I put on a jumper.", "so", [
        "because of",
        "during",
        "or",
      ]),
      buildSentenceGapQuestion("It was sunny ___ we went to the beach.", "so", [
        "because of",
        "during",
        "but",
      ]),
      buildSentenceGapQuestion("Tom was happy ___ he won a prize.", "because", [
        "during",
        "because of",
        "so",
      ]),
      buildSentenceGapQuestion(
        "The plant died ___ nobody watered it.",
        "because",
        ["during", "because of", "so"],
      ),
      buildSentenceGapQuestion("I smile ___ I see my friends.", "when", [
        "during",
        "because of",
        "so",
      ]),
      buildSentenceGapQuestion(
        "Put your coat on ___ you go outside.",
        "before",
        ["during", "because of", "or"],
      ),
      buildSentenceGapQuestion(
        "Brush your teeth ___ you have eaten.",
        "after",
        ["during", "because of", "so"],
      ),
      buildSentenceGapQuestion(
        "Grandad hummed ___ he cooked dinner.",
        "while",
        ["during", "because of", "or"],
      ),
    ],
  },
  4: {
    skillId: "english.subordinating-conjunctions",
    ask: "Which word joins the two ideas?",
    hint: "Read the whole sentence with each word. Which one makes sense?",
    questions: [
      buildSentenceGapQuestion(
        "We played outside ___ it was freezing.",
        "although",
        ["during", "who", "whereas"],
      ),
      buildSentenceGapQuestion(
        "You can't go out ___ you finish your tea.",
        "unless",
        ["although", "during", "who"],
      ),
      buildSentenceGapQuestion(
        "Stir the soup ___ it starts to bubble.",
        "until",
        ["although", "during", "which"],
      ),
      buildSentenceGapQuestion("I have lived here ___ I was a baby.", "since", [
        "although",
        "during",
        "whose",
      ]),
      buildSentenceGapQuestion(
        "Ali likes peas, ___ his sister hates them.",
        "whereas",
        ["unless", "until", "during"],
      ),
      buildSentenceGapQuestion("We left early ___ it was getting dark.", "as", [
        "unless",
        "during",
        "whose",
      ]),
      buildSentenceGapQuestion(
        "I won't swim ___ the water is warm.",
        "unless",
        ["whereas", "during", "whose"],
      ),
      buildSentenceGapQuestion("Wait here ___ the bell rings.", "until", [
        "although",
        "during",
        "whose",
      ]),
      buildSentenceGapQuestion(
        "___ it was raining, we went for a walk.",
        "although",
        ["unless", "during", "whose"],
      ),
      buildSentenceGapQuestion("___ it is late, we should go home.", "since", [
        "during",
        "whose",
        "until",
      ]),
      buildSentenceGapQuestion(
        "Cats like to nap, ___ dogs like to play.",
        "whereas",
        ["unless", "until", "during"],
      ),
      buildSentenceGapQuestion(
        "Max ran fast ___ he was late for school.",
        "as",
        ["unless", "whereas", "during"],
      ),
      buildSentenceGapQuestion(
        "I've been happy ___ my puppy arrived.",
        "since",
        ["although", "during", "whose"],
      ),
      buildSentenceGapQuestion("Keep reading ___ you reach the end.", "until", [
        "although",
        "whereas",
        "during",
      ]),
    ],
  },
  5: {
    skillId: "english.relative-clauses",
    ask: "Which word starts the extra part?",
    hint: "Use who for people, which for things, where for places, when for times and whose for belonging.",
    questions: [
      buildSentenceGapQuestion("The girl ___ won the race was Mia.", "who", [
        "which",
        "where",
        "whose",
      ]),
      buildSentenceGapQuestion("This is the house ___ I was born.", "where", [
        "who",
        "whose",
        "which",
      ]),
      buildSentenceGapQuestion("The boy ___ dog barks lives here.", "whose", [
        "who",
        "which",
        "where",
      ]),
      buildSentenceGapQuestion("I like the cake ___ Gran baked.", "which", [
        "who",
        "where",
        "whose",
      ]),
      buildSentenceGapQuestion("I remember the day ___ we met.", "when", [
        "who",
        "whose",
        "which",
      ]),
      buildSentenceGapQuestion("The park ___ we play has swings.", "where", [
        "who",
        "whose",
        "when",
      ]),
      buildSentenceGapQuestion(
        "My aunt, ___ lives in Wales, is a vet.",
        "who",
        ["which", "where", "whose"],
      ),
      buildSentenceGapQuestion("Our car, ___ is red, is very old.", "which", [
        "who",
        "where",
        "whose",
      ]),
      buildSentenceGapQuestion("The man ___ hat blew off chased it.", "whose", [
        "who",
        "which",
        "when",
      ]),
      buildSentenceGapQuestion("Summer is the time ___ we go away.", "when", [
        "who",
        "whose",
        "which",
      ]),
      buildSentenceGapQuestion("Everything ___ she said was true.", "that", [
        "who",
        "where",
        "whose",
      ]),
      buildSentenceGapQuestion(
        "Here is the bike ___ I got for my birthday.",
        "that",
        ["who", "whose", "where"],
      ),
      buildSentenceGapQuestion(
        "We visited the beach ___ Dad grew up.",
        "where",
        ["who", "whose", "which"],
      ),
      buildSentenceGapQuestion("The teacher ___ helps me is kind.", "who", [
        "which",
        "whose",
        "where",
      ]),
      buildSentenceGapQuestion("The pupil ___ bag was lost was sad.", "whose", [
        "who",
        "where",
        "which",
      ]),
    ],
  },
  6: {
    skillId: "english.linking-adverbials",
    ask: "Which words link the two sentences?",
    hint: "Ask yourself how the second sentence links to the first: a result, a contrast, more detail or the same time?",
    questions: [
      buildSentenceGapQuestion(
        "It was raining. ___, we stayed inside.",
        "Therefore",
        ["However", "Nevertheless", "Furthermore"],
      ),
      buildSentenceGapQuestion(
        "The path was icy. ___, we walked carefully.",
        "As a result",
        ["However", "Nevertheless", "Furthermore"],
      ),
      buildSentenceGapQuestion(
        "I was tired. ___, I finished the race.",
        "Nevertheless",
        ["Therefore", "Consequently", "As a result"],
      ),
      buildSentenceGapQuestion(
        "Sam loves maths. ___, he finds spelling hard.",
        "However",
        ["Therefore", "Consequently", "Furthermore"],
      ),
      buildSentenceGapQuestion(
        "Mum cooked dinner. ___, Dad laid the table.",
        "Meanwhile",
        ["Nevertheless", "In conclusion", "Firstly"],
      ),
      buildSentenceGapQuestion(
        "Foxes are clever. ___, they are very fast.",
        "Furthermore",
        ["However", "Therefore", "Nevertheless"],
      ),
      buildSentenceGapQuestion(
        "He forgot his kit. ___, he could not play.",
        "Consequently",
        ["However", "Furthermore", "Nevertheless"],
      ),
      buildSentenceGapQuestion(
        "The tickets sold out. ___, many fans missed out.",
        "As a result",
        ["Nevertheless", "However", "Meanwhile"],
      ),
      buildSentenceGapQuestion(
        "It was cold outside. ___, the sun was shining.",
        "However",
        ["Therefore", "Consequently", "As a result"],
      ),
      buildSentenceGapQuestion(
        "The hall was noisy. ___, the baby slept on.",
        "Nevertheless",
        ["Therefore", "Consequently", "Furthermore"],
      ),
      buildSentenceGapQuestion(
        "The team trained hard. ___, they won the cup.",
        "Consequently",
        ["However", "Nevertheless", "Meanwhile"],
      ),
      buildSentenceGapQuestion(
        "Exercise keeps you fit. ___, it is fun.",
        "Furthermore",
        ["However", "Therefore", "Consequently"],
      ),
      buildSentenceGapQuestion(
        "The bus was late. ___, Jo walked to school.",
        "Therefore",
        ["However", "Furthermore", "Nevertheless"],
      ),
      buildSentenceGapQuestion(
        "The children slept. ___, the elves got to work.",
        "Meanwhile",
        ["Furthermore", "Nevertheless", "Firstly"],
      ),
    ],
  },
};
