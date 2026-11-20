import {
  buildPassageQuestion,
  type EnglishGameContent,
  type StoryPassage,
} from "./english-questions.js";

const pipAndThePuddle: StoryPassage = {
  title: "Pip and the Puddle",
  paragraphs: [
    "Pip the duck saw a big puddle. She ran to it and jumped in with a splash! Water went all over Frog. Frog laughed and jumped in too. Now they were both wet and happy.",
  ],
};

const theBigRedBox: StoryPassage = {
  title: "The Big Red Box",
  paragraphs: [
    "A big red box came for Sam. It had holes in the top. Something inside went scratch, scratch. Sam opened the lid very slowly. Two pointy ears popped out!",
  ],
};

const bensSandcastle: StoryPassage = {
  title: "Ben's Sandcastle",
  paragraphs: [
    "Ben made a tall sandcastle by the sea. He put a shell on the top. Then a big wave came closer and closer. Ben looked at the wave, and then at his castle.",
  ],
};

const tessHelpsOut: StoryPassage = {
  title: "Tess Helps Out",
  paragraphs: [
    "Gran dropped her bag. Apples rolled all over the path. Tess picked them up one by one and put them back in the bag. Gran gave Tess a big hug. “Thank you, kind girl,” she said.",
  ],
};

const theSnowFox: StoryPassage = {
  title: "The Snow Fox",
  paragraphs: [
    "Early one morning, Ava looked out of her window. Fresh snow covered the garden. In the middle sat a small white fox, sniffing the air. Ava called her brother, but by the time he came, the fox had gone. Only a line of tiny paw prints led to the gate.",
  ],
};

const sleepyHedgehog: StoryPassage = {
  title: "Sleepy Hedgehog",
  paragraphs: [
    "When leaves turn gold and the wind blows cold,",
    "Hedgehog finds a heap of hay.",
    "He curls up tight, from day to night,",
    "And sleeps the winter months away.",
  ],
};

const growingABean: StoryPassage = {
  title: "How to Grow a Bean",
  paragraphs: [
    "First, fill a pot with soil. Next, push a bean seed into the soil with your finger. Then water it a little every day. After about a week, a green shoot will poke up through the soil.",
  ],
};

const maxAndTheKite: StoryPassage = {
  title: "Max and the Kite",
  paragraphs: [
    "Max had a new kite. He ran across the field, but the kite would not fly. Then the wind began to blow hard. The kite shot up into the sky. Max held the string tightly and grinned.",
  ],
};

const theNewGirl: StoryPassage = {
  title: "The New Girl",
  paragraphs: [
    "Lena stood by the classroom door, holding her bag so tightly that her knuckles turned white. Everyone else was laughing and chatting. When Mr Hart asked who would show her around, Kofi's hand shot up. Lena's shoulders dropped, and for the first time that morning, she smiled.",
  ],
};

const theLastSlice: StoryPassage = {
  title: "The Last Slice",
  paragraphs: [
    "There was one slice of cake left on the plate. Josh looked at it, then at his little sister, Ruby. Ruby had dropped her own slice on the floor, and her lip was wobbling. Josh sighed, picked up the plate and slid it across the table to her.",
  ],
};

const stormClouds: StoryPassage = {
  title: "Storm Clouds",
  paragraphs: [
    "The sky over the campsite turned a deep purple. The birds stopped singing. Dad looked up, frowned, and began pulling the washing off the line. “Grab the chairs!” he called to Amira. A cold wind tugged at the tent.",
  ],
};

const hedgehogsInTheGarden: StoryPassage = {
  title: "Hedgehogs in the Garden",
  paragraphs: [
    "Hedgehogs are small, spiny mammals that come out at night. They snuffle through gardens looking for beetles, worms and slugs to eat.",
    "Sadly, there are fewer hedgehogs than there used to be. You can help by leaving a small gap under your fence, so they can travel between gardens, and by never using slug pellets.",
  ],
};

const theTortoiseWhoKeptGoing: StoryPassage = {
  title: "The Tortoise Who Kept Going",
  paragraphs: [
    "Every day, Tortoise tried to climb the steep hill to see the sea. Every day he slipped back down, and the rabbits laughed at him.",
    "Tortoise kept trying, one slow step at a time. At last, one bright morning, he reached the top. The sea sparkled below. The rabbits, who had never bothered to climb, had never seen it at all.",
  ],
};

const theLighthouseCat: StoryPassage = {
  title: "The Lighthouse Keeper's Cat",
  paragraphs: [
    "Every evening, Old Meg climbed the hundred steps of the lighthouse to light the great lamp. Her ginger cat, Flint, always padded up behind her.",
    "One stormy night, Meg slipped and hurt her ankle halfway up. Flint raced down to the village, yowling at every door until a fisherman followed him back. The lamp was lit just in time to guide the boats home.",
  ],
};

const theScienceFair: StoryPassage = {
  title: "The Science Fair",
  paragraphs: [
    "Priya had checked her volcano model three times. Now, as the judges came closer, she wiped her palms on her jeans and whispered her first line to herself. When the head judge finally smiled and pinned a gold ribbon to her stand, Priya let out a breath she hadn't realised she was holding.",
  ],
};

const redSquirrels: StoryPassage = {
  title: "Red Squirrels",
  paragraphs: [
    "Red squirrels are native to Britain. They are smaller than grey squirrels and have tufted ears. Today, most red squirrels live in Scotland. In my view, they are the most beautiful animals in the country, and everyone should visit a forest to see one.",
  ],
};

const theOldBridge: StoryPassage = {
  title: "The Old Bridge",
  paragraphs: [
    "Grandpa paused at the edge of the old stone bridge. He ran his hand along the mossy wall and stared down at the river for a long time. “Your grandma and I carved our names here,” he said quietly, “sixty years ago.” He didn't say anything else all the way home.",
  ],
};

const ourSchoolField: StoryPassage = {
  title: "Open Our Field!",
  paragraphs: [
    "Our school field is 100 metres long. Last year, it flooded twice in March. The field is the best place in the whole school, and it is unfair that we cannot use it in winter.",
  ],
};

const theNightTrain: StoryPassage = {
  title: "The Night Train",
  paragraphs: [
    "The night train rattled north through the dark. Inside, Zara pressed her forehead to the cold glass, watching the lights of towns flicker past like fireflies.",
    "By dawn, the towns had vanished. Mountains rose on either side, their peaks dusted with snow, and Zara realised she was further from home than she had ever been.",
  ],
};

const twoTextsAboutRain: StoryPassage = {
  title: "Two Texts About Rain",
  paragraphs: [
    "Text A: Rain is water that falls from clouds. When tiny droplets in a cloud join together and become too heavy, they fall to the ground.",
    "Text B: The rain came drumming on the roof, a thousand tiny fingers tapping, begging to be let in.",
  ],
};

const plasticInTheOcean: StoryPassage = {
  title: "Plastic in the Ocean",
  paragraphs: [
    "The problem: Every year, millions of tonnes of plastic end up in the ocean. Sea turtles can mistake floating bags for jellyfish, one of their favourite foods.",
    "What we can do: Carry a reusable bottle, say no to plastic straws and join a beach clean. Small actions, repeated by millions of people, make a big difference.",
  ],
};

export const storyScrolls: EnglishGameContent = {
  1: {
    skillId: "english.understanding-what-i-read",
    ask: "Read the story on the scroll, then answer the question.",
    hint: "Look back at the story. What do the characters say and do?",
    questions: [
      buildPassageQuestion(
        pipAndThePuddle,
        "Who jumped in the puddle first?",
        "Pip",
        ["Frog", "Mum", "A fish"],
      ),
      buildPassageQuestion(
        pipAndThePuddle,
        "How did Frog feel when he got wet?",
        "Happy",
        ["Cross", "Sad", "Scared"],
      ),
      buildPassageQuestion(
        pipAndThePuddle,
        "Why is the story called Pip and the Puddle?",
        "It is about Pip jumping in a puddle",
        [
          "It is about a rainy day at school",
          "It is about Frog going to sleep",
          "It is about a duck who cannot swim",
        ],
      ),
      buildPassageQuestion(
        theBigRedBox,
        "What do you think is in the box?",
        "A pet",
        ["A cake", "A toy car", "Some books"],
      ),
      buildPassageQuestion(
        theBigRedBox,
        "Why did the box have holes in the top?",
        "So the animal inside could breathe",
        [
          "So Sam could see inside",
          "Because the box was old",
          "So the rain could get in",
        ],
      ),
      buildPassageQuestion(
        theBigRedBox,
        "How did Sam open the lid?",
        "Very slowly",
        ["Very fast", "With a hammer", "He did not open it"],
      ),
      buildPassageQuestion(
        bensSandcastle,
        "What do you think will happen next?",
        "The wave will knock the castle down",
        [
          "The castle will grow taller",
          "Ben will build a boat",
          "The shell will start to sing",
        ],
      ),
      buildPassageQuestion(
        bensSandcastle,
        "What did Ben put on top of his castle?",
        "A shell",
        ["A flag", "A stone", "A crab"],
      ),
      buildPassageQuestion(
        bensSandcastle,
        "How do you think Ben feels when he sees the wave?",
        "Worried",
        ["Sleepy", "Hungry", "Bored"],
      ),
      buildPassageQuestion(
        tessHelpsOut,
        "Why did Gran hug Tess?",
        "Tess helped her",
        ["Tess was crying", "It was Tess's birthday", "Tess ate an apple"],
      ),
      buildPassageQuestion(
        tessHelpsOut,
        "What fell out of Gran's bag?",
        "Apples",
        ["Eggs", "Keys", "Sweets"],
      ),
      buildPassageQuestion(
        tessHelpsOut,
        "Which word does Gran use about Tess?",
        "kind",
        ["silly", "quick", "tall"],
      ),
    ],
  },
  2: {
    skillId: "english.questions-about-a-text",
    ask: "Read the text on the scroll, then answer the question.",
    hint: "Find the part of the text the question is about, and read it again.",
    questions: [
      buildPassageQuestion(
        theSnowFox,
        "What did Ava see first when she looked outside?",
        "Fresh snow covering the garden",
        [
          "Her brother at the gate",
          "A line of paw prints",
          "A fox in her bedroom",
        ],
      ),
      buildPassageQuestion(
        theSnowFox,
        "What happened after Ava called her brother?",
        "The fox went away",
        ["The snow melted", "The fox came inside", "Ava went back to sleep"],
      ),
      buildPassageQuestion(
        theSnowFox,
        "How do we know the fox left the garden?",
        "Its paw prints led to the gate",
        [
          "Ava saw it jump the wall",
          "Her brother chased it away",
          "It left a note",
        ],
      ),
      buildPassageQuestion(
        theSnowFox,
        "Which question can you answer from this story?",
        "What colour was the fox?",
        [
          "What was the fox's name?",
          "How old was Ava?",
          "Where did the fox sleep?",
        ],
      ),
      buildPassageQuestion(
        sleepyHedgehog,
        "When does Hedgehog go to sleep?",
        "When the leaves turn gold",
        ["When the flowers come out", "When the sun is hot", "On his birthday"],
      ),
      buildPassageQuestion(
        sleepyHedgehog,
        "What does Hedgehog sleep in?",
        "A heap of hay",
        ["A bed of leaves", "A hole in a tree", "A cardboard box"],
      ),
      buildPassageQuestion(
        sleepyHedgehog,
        "How long does Hedgehog sleep for?",
        "All winter",
        ["One night", "One afternoon", "All summer"],
      ),
      buildPassageQuestion(
        growingABean,
        "What do you do after you fill the pot with soil?",
        "Push a bean seed into it",
        ["Water it every day", "Wait for a week", "Pick the beans"],
      ),
      buildPassageQuestion(
        growingABean,
        "How often should you water the bean?",
        "A little every day",
        ["Once a week", "A lot every hour", "Never"],
      ),
      buildPassageQuestion(
        growingABean,
        "What will you see after about a week?",
        "A green shoot",
        ["A red flower", "Ripe beans", "A tall tree"],
      ),
      buildPassageQuestion(
        maxAndTheKite,
        "Why did the kite fly in the end?",
        "The wind began to blow hard",
        ["Max threw it up high", "Max ran faster", "His dad helped him"],
      ),
      buildPassageQuestion(
        maxAndTheKite,
        "How did Max feel at the end?",
        "Pleased",
        ["Angry", "Frightened", "Tired"],
      ),
      buildPassageQuestion(
        maxAndTheKite,
        "What might happen if Max let go of the string?",
        "The kite would blow away",
        [
          "The kite would land in his hands",
          "The wind would stop",
          "Max would fly up too",
        ],
      ),
    ],
  },
  3: {
    skillId: "english.inference-and-prediction",
    ask: "Read the story on the scroll. Think about what the characters feel and why.",
    hint: "The writer doesn't always say it. Look at what the characters do, and think about why.",
    questions: [
      buildPassageQuestion(
        theNewGirl,
        "How did Lena feel at the start?",
        "Nervous",
        ["Excited", "Bored", "Angry"],
      ),
      buildPassageQuestion(
        theNewGirl,
        "Which detail shows how Lena felt at the start?",
        "She held her bag so tightly that her knuckles turned white",
        [
          "Everyone else was laughing",
          "Mr Hart asked a question",
          "Kofi put his hand up",
        ],
      ),
      buildPassageQuestion(
        theNewGirl,
        "Why did Lena smile at the end?",
        "She was relieved that someone wanted to help her",
        [
          "She remembered a funny joke",
          "She was going home early",
          "Mr Hart told her off",
        ],
      ),
      buildPassageQuestion(
        theNewGirl,
        "Why do you think Kofi put his hand up so quickly?",
        "He wanted to be kind to Lena",
        [
          "He wanted to leave the room",
          "He knew the answer to a sum",
          "He was cross with Lena",
        ],
      ),
      buildPassageQuestion(
        theLastSlice,
        "Why was Ruby's lip wobbling?",
        "She was about to cry about her dropped cake",
        ["She was laughing at Josh", "She was cold", "She didn't like cake"],
      ),
      buildPassageQuestion(
        theLastSlice,
        "Why do you think Josh sighed?",
        "He wanted the cake, but he chose to give it away",
        [
          "He was too full to eat anything",
          "He was bored of waiting",
          "He was annoyed with the plate",
        ],
      ),
      buildPassageQuestion(
        theLastSlice,
        "Which word best describes Josh?",
        "Generous",
        ["Greedy", "Lazy", "Rude"],
      ),
      buildPassageQuestion(
        stormClouds,
        "What do you predict will happen next?",
        "A storm will start",
        [
          "The sun will come out",
          "They will go swimming",
          "The birds will start singing",
        ],
      ),
      buildPassageQuestion(
        stormClouds,
        "Why did Dad take in the washing?",
        "He thought it was going to rain",
        [
          "He needed a towel to go swimming",
          "He wanted to wash it again",
          "Amira asked him to",
        ],
      ),
      buildPassageQuestion(
        stormClouds,
        "How do you think Dad was feeling?",
        "Worried",
        ["Relaxed", "Sleepy", "Silly"],
      ),
    ],
  },
  4: {
    skillId: "english.main-ideas-and-themes",
    ask: "Read both paragraphs on the scroll, then think about the big idea.",
    hint: "Think about what the whole text is mostly about, not just one detail.",
    questions: [
      buildPassageQuestion(
        hedgehogsInTheGarden,
        "What is the main idea of the second paragraph?",
        "How people can help hedgehogs",
        [
          "What hedgehogs eat",
          "When hedgehogs sleep",
          "Why hedgehogs have spines",
        ],
      ),
      buildPassageQuestion(
        hedgehogsInTheGarden,
        "Which sentence best sums up the whole text?",
        "Hedgehogs visit gardens at night, and they need our help.",
        [
          "Hedgehogs eat slugs, so slug pellets are good for them.",
          "Hedgehogs only live in big forests.",
          "Fences keep hedgehogs out of gardens.",
        ],
      ),
      buildPassageQuestion(
        hedgehogsInTheGarden,
        "What kind of text is this?",
        "An information text",
        ["A fairy tale", "A poem", "A diary entry"],
      ),
      buildPassageQuestion(
        theTortoiseWhoKeptGoing,
        "What is the theme of this story?",
        "If you keep trying, you can succeed",
        [
          "Rabbits are faster than tortoises",
          "Never go near the sea",
          "It is better to stay at the bottom",
        ],
      ),
      buildPassageQuestion(
        theTortoiseWhoKeptGoing,
        "Which sentence best summarises the story?",
        "A tortoise keeps trying until he reaches the top of the hill.",
        [
          "Some rabbits race a tortoise to the sea.",
          "A tortoise gives up and goes home.",
          "A rabbit teaches a tortoise to swim.",
        ],
      ),
      buildPassageQuestion(
        theTortoiseWhoKeptGoing,
        "What kind of story is this?",
        "A fable",
        ["A news report", "A recipe", "A letter"],
      ),
      buildPassageQuestion(
        theLighthouseCat,
        "What is the main idea of the second paragraph?",
        "Flint fetches help so the lamp can be lit",
        [
          "Meg climbs the steps every evening",
          "The fishermen have a party",
          "Flint catches a fish for his dinner",
        ],
      ),
      buildPassageQuestion(
        theLighthouseCat,
        "What is a theme of this story?",
        "Loyalty and friendship",
        ["Greed", "Being afraid of the dark", "Winning a race"],
      ),
      buildPassageQuestion(
        theLighthouseCat,
        "Which would be the best new title for this story?",
        "Flint Saves the Night",
        ["Meg Goes Shopping", "A Sunny Day", "The Fisherman's Lunch"],
      ),
      buildPassageQuestion(
        theLighthouseCat,
        "Which part tells us about Meg's everyday routine?",
        "The first paragraph",
        ["The second paragraph", "The title", "The last sentence"],
      ),
    ],
  },
  5: {
    skillId: "english.inference-with-evidence",
    ask: "Read the text on the scroll. Find the evidence that proves your answer.",
    hint: "Find the exact words in the text that prove it. A fact can be checked; an opinion is what someone thinks.",
    questions: [
      buildPassageQuestion(
        theScienceFair,
        "Which evidence best shows that Priya was nervous?",
        "She wiped her palms on her jeans",
        [
          "She had made a volcano model",
          "The judge pinned on a gold ribbon",
          "The judges came closer",
        ],
      ),
      buildPassageQuestion(
        theScienceFair,
        "What does “let out a breath she hadn't realised she was holding” suggest?",
        "She felt a rush of relief",
        [
          "She had a bad cold",
          "She was bored of waiting",
          "She was about to sing",
        ],
      ),
      buildPassageQuestion(
        theScienceFair,
        "Why had Priya checked her model three times?",
        "She badly wanted it to work for the judges",
        [
          "She had forgotten how to make it",
          "The judges told her to",
          "She wanted to take it home",
        ],
      ),
      buildPassageQuestion(
        redSquirrels,
        "Which sentence is an opinion?",
        "They are the most beautiful animals in the country.",
        [
          "Red squirrels are native to Britain.",
          "They have tufted ears.",
          "Most red squirrels live in Scotland.",
        ],
      ),
      buildPassageQuestion(
        redSquirrels,
        "Which sentence is a fact?",
        "Red squirrels are smaller than grey squirrels.",
        [
          "Everyone should visit a forest to see one.",
          "Red squirrels are the most beautiful animals.",
          "Grey squirrels are boring to watch.",
        ],
      ),
      buildPassageQuestion(
        redSquirrels,
        "Which words tell you the writer is giving an opinion?",
        "In my view",
        ["Today", "are native to", "smaller than"],
      ),
      buildPassageQuestion(
        theOldBridge,
        "How was Grandpa feeling on the way home?",
        "Thoughtful, remembering Grandma",
        ["Excited about dinner", "Angry with the river", "Bored of walking"],
      ),
      buildPassageQuestion(
        theOldBridge,
        "Which detail best shows that the bridge was special to Grandpa?",
        "He and Grandma had carved their names there",
        [
          "The bridge was made of stone",
          "The wall was mossy",
          "The river ran under the bridge",
        ],
      ),
      buildPassageQuestion(
        theOldBridge,
        "Why do you think Grandpa spoke quietly?",
        "The memory meant a lot to him",
        [
          "He had a sore throat",
          "He was cross with his grandchild",
          "He was telling a joke",
        ],
      ),
      buildPassageQuestion(
        ourSchoolField,
        "Which of these is a fact from the text?",
        "The field flooded twice in March last year.",
        [
          "The field is the best place in the school.",
          "It is unfair that the field is shut.",
          "Winter is the worst season.",
        ],
      ),
      buildPassageQuestion(
        ourSchoolField,
        "Which phrase shows the writer's opinion?",
        "it is unfair",
        ["100 metres long", "flooded twice", "in March"],
      ),
    ],
  },
  6: {
    skillId: "english.summarising-and-comparing-texts",
    ask: "Read the scroll closely. Think about how the writer builds meaning.",
    hint: "Look at the whole text: the words the writer chose, how it is organised, and what it is for.",
    questions: [
      buildPassageQuestion(
        theNightTrain,
        "Which sentence best summarises both paragraphs?",
        "Zara travels overnight by train, far away from home.",
        [
          "Zara catches fireflies in a town.",
          "Zara climbs a snowy mountain.",
          "Zara misses her train and walks home.",
        ],
      ),
      buildPassageQuestion(
        theNightTrain,
        "Why does the writer compare the lights to fireflies?",
        "To show they are small, glowing and quickly gone",
        [
          "To show there are insects on the train",
          "To show the towns are on fire",
          "To show Zara is scared of insects",
        ],
      ),
      buildPassageQuestion(
        theNightTrain,
        "How does the second paragraph change the feeling of the story?",
        "It moves from a cosy night to a sense of being far from home",
        [
          "It makes the story funnier",
          "It explains how trains work",
          "It shows Zara arriving home",
        ],
      ),
      buildPassageQuestion(
        theNightTrain,
        "Which word in the first paragraph helps you hear the train?",
        "rattled",
        ["pressed", "cold", "north"],
      ),
      buildPassageQuestion(
        twoTextsAboutRain,
        "How is Text B different from Text A?",
        "Text B uses figurative language to create a feeling",
        [
          "Text B explains the science of rain",
          "Text B gives instructions",
          "Text B has more facts",
        ],
      ),
      buildPassageQuestion(
        twoTextsAboutRain,
        "What is the main purpose of Text A?",
        "To explain how rain forms",
        [
          "To make the reader feel scared",
          "To tell a story about a roof",
          "To persuade people to stay inside",
        ],
      ),
      buildPassageQuestion(
        twoTextsAboutRain,
        "Which technique is used in “a thousand tiny fingers tapping”?",
        "Personification",
        ["A fact", "A question", "An instruction"],
      ),
      buildPassageQuestion(
        plasticInTheOcean,
        "Why has the writer split the text under two headings?",
        "To separate the problem from the solutions",
        [
          "To make the text look longer",
          "To tell two different stories",
          "To list the writer's favourite animals",
        ],
      ),
      buildPassageQuestion(
        plasticInTheOcean,
        "Which is the best summary of the text?",
        "Plastic harms sea life, but everyday actions can help.",
        [
          "Turtles love to eat jellyfish.",
          "Beach cleans are only for scientists.",
          "Plastic straws are a new invention.",
        ],
      ),
      buildPassageQuestion(
        plasticInTheOcean,
        "What is the effect of the final sentence?",
        "It encourages readers that they can make a difference",
        [
          "It tells readers the problem is solved",
          "It describes what turtles eat",
          "It warns readers to stay away from beaches",
        ],
      ),
    ],
  },
};
