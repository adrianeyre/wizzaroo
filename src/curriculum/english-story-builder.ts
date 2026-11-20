import {
  buildStoryPlanQuestion,
  gapMark,
  type EnglishGameContent,
} from "./english-questions.js";

const whatHappensFirst = "Which sentence comes first?";
const whatHappensNext = "Which sentence comes next?";
const whatHappensInTheMiddle = "Which sentence goes in the middle?";
const bestBeginning = "Which is the best beginning for this story?";
const bestMiddle = "Which is the best middle for this story?";
const bestEnding = "Which is the best ending for this story?";
const missingPlanPart = "Which part is missing from this story plan?";
const headingForParagraph = "Which heading fits this paragraph?";
const describesTheSetting = "Which sentence best describes the setting?";
const bestPrecis = "Which is the best short summary of this paragraph?";

export const storyBuilder: EnglishGameContent = {
  1: {
    skillId: "english.sequencing-sentences",
    ask: "Read the story stones in order, then pick the sentence for the empty stone.",
    hint: "Read the sentences in order. Which one makes the story make sense?",
    questions: [
      buildStoryPlanQuestion(
        whatHappensNext,
        ["Mia planted a seed.", "She watered it every day.", gapMark],
        "Soon a flower grew.",
        [
          "Mia bought a seed.",
          "Mia found a seed packet.",
          "Mia wanted a seed.",
        ],
      ),
      buildStoryPlanQuestion(
        whatHappensFirst,
        [gapMark, "Tom put on his coat.", "He went out to play in the snow."],
        "Tom saw snow outside.",
        ["Tom came home wet.", "Tom built a snowman.", "Tom had a warm bath."],
      ),
      buildStoryPlanQuestion(
        whatHappensInTheMiddle,
        ["The cat saw a mouse.", gapMark, "The mouse ran into its hole."],
        "The cat chased the mouse.",
        [
          "The cat went to sleep.",
          "The mouse was safe inside.",
          "The cat had a bath.",
        ],
      ),
      buildStoryPlanQuestion(
        whatHappensNext,
        ["Dad got out the bread.", "He spread jam on it.", gapMark],
        "Then he ate his sandwich.",
        [
          "First he went to the shop.",
          "He had no bread.",
          "He took the bread out of the bag.",
        ],
      ),
      buildStoryPlanQuestion(
        whatHappensFirst,
        [gapMark, "Sam blew out the candles.", "Everyone clapped and cheered."],
        "Mum brought in a birthday cake.",
        [
          "Sam ate the last slice.",
          "Sam said goodbye to his friends.",
          "Everyone went home.",
        ],
      ),
      buildStoryPlanQuestion(
        whatHappensInTheMiddle,
        ["It began to rain.", gapMark, "Lily stayed nice and dry."],
        "Lily opened her umbrella.",
        ["Lily went for a swim.", "The sun was hot.", "Lily got very wet."],
      ),
      buildStoryPlanQuestion(
        whatHappensNext,
        ["The hen laid an egg.", "The egg began to crack.", gapMark],
        "Out came a fluffy chick.",
        [
          "The hen found a nest.",
          "The egg was very new.",
          "The hen sat down to lay.",
        ],
      ),
      buildStoryPlanQuestion(
        whatHappensInTheMiddle,
        ["Ben found a lost dog.", gapMark, "The owner said thank you."],
        "He took it back to its owner.",
        [
          "He did not see the dog.",
          "The dog ran off into the woods.",
          "Ben went to buy some milk.",
        ],
      ),
      buildStoryPlanQuestion(
        whatHappensFirst,
        [
          gapMark,
          "She got out her bucket and spade.",
          "She built a sandcastle.",
        ],
        "Anna went to the beach.",
        [
          "Anna knocked the castle down.",
          "Anna went to bed.",
          "Anna put a flag on the castle.",
        ],
      ),
    ],
  },
  2: {
    skillId: "english.planning-a-narrative",
    ask: "Read the story plan, then pick the part that finishes it best.",
    hint: "A good story has a beginning, a middle and an end that follow on from each other.",
    questions: [
      buildStoryPlanQuestion(
        bestEnding,
        [
          "We went to the zoo on a sunny day.",
          "A cheeky monkey grabbed my hat.",
          gapMark,
        ],
        "The keeper got my hat back, and we all laughed.",
        [
          "We got in the car to go to the zoo.",
          "I put on my favourite hat.",
          "Monkeys live in hot forests.",
        ],
      ),
      buildStoryPlanQuestion(
        bestBeginning,
        [
          gapMark,
          "I fell off my bike and hurt my knee.",
          "Mum put on a plaster, and I tried again.",
        ],
        "On Saturday, I rode my new bike in the park.",
        [
          "My knee felt better the next day.",
          "Bikes have two wheels.",
          "I said thank you to Mum.",
        ],
      ),
      buildStoryPlanQuestion(
        bestMiddle,
        [
          "Our class planted sunflower seeds.",
          gapMark,
          "By summer, the sunflowers were taller than us!",
        ],
        "We watered them and watched them grow.",
        [
          "We forgot all about them.",
          "Sunflowers are yellow.",
          "We picked the sunflowers in the summer.",
        ],
      ),
      buildStoryPlanQuestion(
        bestEnding,
        [
          "It was my first day at a new school.",
          "I felt shy, but a girl called Ella asked me to play.",
          gapMark,
        ],
        "By home time, Ella and I were best friends.",
        [
          "I packed my bag for my first day.",
          "My school has a big hall.",
          "I felt shy at the door.",
        ],
      ),
      buildStoryPlanQuestion(
        missingPlanPart,
        ["Where we went", gapMark, "How it ended"],
        "What happened there",
        ["The title", "The date", "My favourite colour"],
      ),
      buildStoryPlanQuestion(
        bestBeginning,
        [
          gapMark,
          "We built a den out of blankets and chairs.",
          "Then Dad crawled in, and we read stories by torchlight.",
        ],
        "It was raining, so we stayed inside.",
        [
          "We tidied the blankets away.",
          "Dad switched off the torch.",
          "Dens can be made of sticks.",
        ],
      ),
      buildStoryPlanQuestion(
        bestMiddle,
        [
          "Grandma came to stay for the weekend.",
          gapMark,
          "We gave the cakes to our neighbours, and they loved them.",
        ],
        "We baked lots of cakes together.",
        [
          "Grandma went home on Sunday.",
          "We ate all the cakes ourselves.",
          "Grandma lives by the sea.",
        ],
      ),
      buildStoryPlanQuestion(
        bestEnding,
        [
          "My tooth was very wobbly.",
          "At lunch, it fell out into my sandwich!",
          gapMark,
        ],
        "That night, I put it under my pillow.",
        [
          "My tooth started to wobble.",
          "I had a cheese sandwich.",
          "Teeth help us to chew.",
        ],
      ),
      buildStoryPlanQuestion(
        missingPlanPart,
        ["Who is in the story", "Where it happens", gapMark],
        "What happens",
        [
          "How many pages it has",
          "The colour of the cover",
          "Who will read it",
        ],
      ),
    ],
  },
  3: {
    skillId: "english.paragraphs-and-headings",
    ask: "Read the page, then pick the heading or sentence that belongs.",
    hint: "A paragraph keeps to one idea, and its heading tells you what that idea is.",
    questions: [
      buildStoryPlanQuestion(
        headingForParagraph,
        [
          gapMark,
          "Owls hunt at night. They eat mice, voles and beetles, and they swallow small animals whole.",
        ],
        "What Owls Eat",
        ["Where Owls Nest", "How Owls Fly", "Baby Owls"],
      ),
      buildStoryPlanQuestion(
        "Which sentence belongs in this paragraph about where owls live?",
        [
          "Where Owls Live",
          "Barn owls nest in old barns and hollow trees.",
          gapMark,
        ],
        "Some owls even make their homes in church towers.",
        [
          "Owls swallow mice whole.",
          "Baby owls are called owlets.",
          "Owls have soft feathers for silent flight.",
        ],
      ),
      buildStoryPlanQuestion(
        headingForParagraph,
        [
          gapMark,
          "Mix the flour and butter, then add the sugar. Stir in the milk until you have a soft dough.",
        ],
        "Making the Dough",
        ["Eating Your Scones", "What You Need", "Cleaning Up"],
      ),
      buildStoryPlanQuestion(
        "Which sentence should start a new paragraph?",
        [
          "The Romans built straight roads across Britain. Some of these roads are still used today.",
          gapMark,
        ],
        "Roman soldiers wore armour and carried shields.",
        [
          "The roads helped soldiers march quickly.",
          "Many of the roads were paved with stone.",
          "Some roads ran for hundreds of miles.",
        ],
      ),
      buildStoryPlanQuestion(
        headingForParagraph,
        [
          gapMark,
          "Pack a sun hat, sun cream and plenty of water. Remember a towel and a spare set of clothes.",
        ],
        "What to Bring",
        ["How to Get There", "Opening Times", "Our Favourite Rides"],
      ),
      buildStoryPlanQuestion(
        "Which sentence belongs in this paragraph about the planets?",
        [
          "The Planets",
          "There are eight planets in our solar system.",
          gapMark,
        ],
        "Jupiter is the biggest planet of all.",
        [
          "The Moon goes round the Earth.",
          "Astronauts eat special food.",
          "Stars twinkle at night.",
        ],
      ),
      buildStoryPlanQuestion(
        "Which sub-heading fits this part of the leaflet?",
        [
          "Our Village Fair",
          gapMark,
          "There will be a cake stall, a dog show and a tug of war.",
        ],
        "Things to Do",
        ["How to Find Us", "Ticket Prices", "Who Organised It"],
      ),
      buildStoryPlanQuestion(
        "Which sentence belongs in this paragraph about keeping a rabbit healthy?",
        [
          "Keeping Your Rabbit Healthy",
          "Give your rabbit fresh hay and water every day.",
          gapMark,
        ],
        "Take it to the vet for a check-up once a year.",
        [
          "Rabbits come in many colours.",
          "Wild rabbits live in burrows.",
          "My cousin has two rabbits.",
        ],
      ),
      buildStoryPlanQuestion(
        headingForParagraph,
        [
          gapMark,
          "Volcanoes form where hot, melted rock pushes up through cracks in the Earth's crust.",
        ],
        "How Volcanoes Form",
        ["Famous Volcanoes", "Staying Safe", "Volcano Words"],
      ),
    ],
  },
  4: {
    skillId: "english.settings-characters-and-plot",
    ask: "Read the story so far, then pick the sentence that builds it best.",
    hint: "Choose the sentence that paints the clearest picture or moves the story on, with no mistakes.",
    questions: [
      buildStoryPlanQuestion(
        describesTheSetting,
        [gapMark, "Kai stepped carefully between the trees."],
        "Twisted trees creaked in the dark, misty forest.",
        ["Kai was ten years old.", "Kai liked football.", "It was a forest."],
      ),
      buildStoryPlanQuestion(
        "Which sentence best shows what the character is like?",
        ["Mrs Moss ran the village shop.", gapMark],
        "She always slipped an extra sweet into every child's paper bag.",
        [
          "The shop was on the corner.",
          "The shop sold bread and milk.",
          "Mrs Moss was a person.",
        ],
      ),
      buildStoryPlanQuestion(
        "Which event would best build up the problem in the plot?",
        [
          "The children found a map in the attic.",
          "It showed a cave on the cliffs.",
          gapMark,
        ],
        "When they reached the cave, the tide began to rush in.",
        [
          "They had cheese sandwiches for lunch.",
          "The attic was dusty.",
          "The map was drawn on paper.",
        ],
      ),
      buildStoryPlanQuestion(
        "Which sentence improves the first one?",
        ["The dog was big.", gapMark],
        "The enormous dog towered over the garden fence.",
        ["The dog was big and big.", "The dog were big.", "Dog big."],
      ),
      buildStoryPlanQuestion(
        describesTheSetting,
        [gapMark, "Ruby pulled her scarf tighter and hurried on."],
        "An icy wind whistled down the empty, frosty street.",
        [
          "Ruby had a red scarf.",
          "Ruby was going home.",
          "There was a street.",
        ],
      ),
      buildStoryPlanQuestion(
        "Which sentence best shows how the character feels?",
        ["Leo waited outside the head teacher's office.", gapMark],
        "His legs jiggled, and he chewed the end of his sleeve.",
        [
          "The office door was blue.",
          "Leo was in Year 4.",
          "The corridor had a clock.",
        ],
      ),
      buildStoryPlanQuestion(
        bestEnding,
        [
          "Mo's kite got stuck at the top of a tall tree.",
          "He tried to shake it down, but it would not move.",
          gapMark,
        ],
        "Then a gust of wind lifted it free, and it floated into his hands.",
        [
          "Mo got a kite for his birthday.",
          "Kites are made of fabric.",
          "Mo's kite was stuck in the tree.",
        ],
      ),
      buildStoryPlanQuestion(
        "Which sentence corrects the mistake in the first one?",
        ["The children was running to the gate.", gapMark],
        "The children were running to the gate.",
        [
          "The children is running to the gate.",
          "The childs was running to the gate.",
          "The children was runing to the gate.",
        ],
      ),
      buildStoryPlanQuestion(
        "Which sentence best introduces the character?",
        [gapMark, "Everyone in the village came to her when something broke."],
        "Nell was a clever inventor with oily fingers and a toolbox full of gadgets.",
        ["The village had a pond.", "Something was broken.", "It was Tuesday."],
      ),
    ],
  },
  5: {
    skillId: "english.writing-for-audience-and-purpose",
    ask: "Think about who will read it and why, then pick the words that suit.",
    hint: "Ask yourself who the reader is and what the writing is for. Formal writing needs formal words.",
    questions: [
      buildStoryPlanQuestion(
        "Which opening suits a letter to the head teacher?",
        [
          gapMark,
          "I am writing to ask whether our class could plant a vegetable garden.",
        ],
        "Dear Mrs Patel,",
        ["Hiya Mrs P!", "Yo, head teacher,", "Hey you,"],
      ),
      buildStoryPlanQuestion(
        "Which sentence best suits a poster that persuades people to come to the fair?",
        ["Summer Fair: Saturday at 2pm", gapMark],
        "Don't miss the most exciting afternoon of the year!",
        [
          "The fair might happen at some point.",
          "Fairs began hundreds of years ago.",
          "I went to a fair once, and it was okay.",
        ],
      ),
      buildStoryPlanQuestion(
        "Which sentence best suits a formal report?",
        [
          "Survey Report",
          "We asked 100 pupils how they travel to school.",
          gapMark,
        ],
        "The results show that 62 of the pupils walk to school each day.",
        [
          "Loads of kids walk, it's mad!",
          "Walking is boring, to be honest.",
          "I reckon most people walk, probably.",
        ],
      ),
      buildStoryPlanQuestion(
        "Which sentence best suits instructions for young children?",
        ["How to Plant a Seed", gapMark],
        "First, fill your pot with soil.",
        [
          "Initially, one should obtain an appropriate receptacle.",
          "Seeds are how many plants reproduce.",
          "I once planted a seed in my garden.",
        ],
      ),
      buildStoryPlanQuestion(
        "Which is the best opening for a ghost story?",
        [gapMark, "Somewhere upstairs, a door creaked open."],
        "The old house was silent, and the candle flickered in the draught.",
        [
          "Nobody has ever proved that ghosts are real.",
          "Dear Sir, I am writing to complain.",
          "To make pancakes, you will need eggs.",
        ],
      ),
      buildStoryPlanQuestion(
        "Which sentence suits a thank-you note to a friend?",
        ["Dear Sam,", gapMark],
        "Thank you so much for the brilliant book. I loved it!",
        [
          "We acknowledge receipt of your item.",
          "Buy this book now, while stocks last!",
          "The book has 200 pages and a blue cover.",
        ],
      ),
      buildStoryPlanQuestion(
        "Which closing suits a formal letter to the council?",
        ["We hope you will consider repairing the playground.", gapMark],
        "Yours sincerely,",
        ["See ya!", "Love and hugs,", "Bye for now!"],
      ),
      buildStoryPlanQuestion(
        "Which sentence best suits a newspaper report?",
        ["Local School Wins Award", gapMark],
        "Pupils at Oakfield Primary were given a national science award on Monday.",
        [
          "OMG, we won, it was amazing!",
          "Once upon a time, there was a school.",
          "Please vote for our school.",
        ],
      ),
      buildStoryPlanQuestion(
        "Which sentence suits a formal letter of complaint?",
        ["Dear Sir or Madam,", gapMark],
        "I wish to complain about the noise from the building site.",
        [
          "The noise is doing my head in!",
          "Oi, keep it down!",
          "Noise is a kind of sound.",
        ],
      ),
    ],
  },
  6: {
    skillId: "english.cohesion-across-paragraphs",
    ask: "Read the paragraphs, then pick the words that link the ideas best.",
    hint: "Linking words and phrases, like however, eventually or as well as, show how ideas connect.",
    questions: [
      buildStoryPlanQuestion(
        "Which sentence best links the next paragraph to the first?",
        [
          "Castles were built with thick stone walls to keep enemies out.",
          gapMark,
        ],
        "As well as strong walls, many castles had a deep moat.",
        [
          "Once upon a time, there was a moat.",
          "Moats are great fun.",
          "Next, mix in the eggs.",
        ],
      ),
      buildStoryPlanQuestion(
        "Which linking phrase best starts the next paragraph?",
        [
          "For hours, the explorers trudged through the burning desert.",
          gapMark,
        ],
        "Eventually, they spotted the shimmer of an oasis ahead.",
        [
          "Firstly, they spotted the shimmer of an oasis ahead.",
          "In conclusion, they spotted the shimmer of an oasis ahead.",
          "For example, they spotted the shimmer of an oasis ahead.",
        ],
      ),
      buildStoryPlanQuestion(
        "Which sentence avoids repeating the noun?",
        ["Amelia Earhart was a famous pilot.", gapMark],
        "She was the first woman to fly alone across the Atlantic.",
        [
          "Amelia Earhart was the first woman to fly alone across the Atlantic.",
          "It was the first woman to fly alone across the Atlantic.",
          "They was the first woman to fly alone across the Atlantic.",
        ],
      ),
      buildStoryPlanQuestion(
        bestPrecis,
        [
          "Bees visit flowers to collect nectar, which they turn into honey. As they move from flower to flower, pollen sticks to their bodies and is carried to other plants, helping them to make seeds.",
          gapMark,
        ],
        "Bees make honey from nectar and help plants make seeds by carrying pollen.",
        [
          "Bees are yellow and black, and they can sting.",
          "Flowers make honey for bees to eat.",
          "Pollen is sticky and makes people sneeze.",
        ],
      ),
      buildStoryPlanQuestion(
        "Which linking word best shows a contrast?",
        ["Many people think spiders are dangerous.", gapMark],
        "However, most spiders in Britain are completely harmless.",
        [
          "Furthermore, most spiders in Britain are completely harmless.",
          "As a result, most spiders in Britain are completely harmless.",
          "Meanwhile, most spiders in Britain are completely harmless.",
        ],
      ),
      buildStoryPlanQuestion(
        "Which sentence best links back to the first paragraph?",
        [
          "The storm raged all night, flattening fences and tearing tiles from roofs.",
          gapMark,
        ],
        "By morning, the damage it had caused was clear for all to see.",
        [
          "Rabbits are often brown.",
          "Once, there was a sunny beach.",
          "To begin with, buy a ticket.",
        ],
      ),
      buildStoryPlanQuestion(
        "Which sentence best ends this explanation?",
        [
          "First, water evaporates from seas and lakes.",
          "Then, it cools and forms clouds.",
          gapMark,
        ],
        "Finally, it falls back to the ground as rain, and the cycle begins again.",
        [
          "Firstly, water is wet.",
          "Before that, clouds are fluffy.",
          "On the other hand, rain is annoying.",
        ],
      ),
      buildStoryPlanQuestion(
        bestPrecis,
        [
          "The Great Fire of London began in a bakery on Pudding Lane in 1666. Strong winds spread the flames quickly through the wooden houses, and the fire burned for four days.",
          gapMark,
        ],
        "In 1666, a fire that began in a bakery spread quickly and burned London for four days.",
        [
          "Pudding Lane had many bakeries that sold puddings.",
          "London has always been built of stone.",
          "Wind is air that is moving.",
        ],
      ),
      buildStoryPlanQuestion(
        "Which phrase best links these paragraphs about a past event?",
        [
          "In 1953, Tenzing Norgay and Edmund Hillary set off up Mount Everest.",
          gapMark,
        ],
        "After weeks of climbing, they finally reached the summit.",
        [
          "In addition, they finally reached the summit.",
          "For instance, they finally reached the summit.",
          "Similarly, they finally reached the summit.",
        ],
      ),
    ],
  },
};
