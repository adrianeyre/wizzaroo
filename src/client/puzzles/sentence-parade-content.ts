import type { YearGroup } from "../../curriculum/skills.js";

/**
 * One sentence for the parade. `sentence` is written with the Skill's key
 * part in [square brackets], which the finished sentence highlights. Any
 * other order of the very same wagons that also says what the prompt asks for
 * is listed in `alternatives`, marked up the same way, so the order checker
 * accepts it too.
 */
export interface ParadeSentenceData {
  prompt: string;
  sentence: string;
  alternatives?: readonly string[];
}

const yearOneSentences: readonly ParadeSentenceData[] = [
  {
    prompt: "Say the two things you like to eat: jam and cake.",
    sentence: "I like jam [and] cake.",
    alternatives: ["I like cake [and] jam."],
  },
  {
    prompt: "Say two things the clown can do: jump and skip.",
    sentence: "The clown can jump [and] skip.",
    alternatives: ["The clown can skip [and] jump."],
  },
  {
    prompt: "Say who feeds the seal: Tom and Meg.",
    sentence: "Tom [and] Meg feed the seal.",
    alternatives: ["Meg [and] Tom feed the seal."],
  },
  {
    prompt: "Say two things the seal does: it claps and it barks.",
    sentence: "The seal claps [and] barks.",
    alternatives: ["The seal barks [and] claps."],
  },
  {
    prompt: "Say what we did in the ring: we sang and we danced.",
    sentence: "We sang [and] danced in the ring.",
    alternatives: ["We danced [and] sang in the ring."],
  },
  {
    prompt: "Say what the lion is like: big and loud.",
    sentence: "The lion is big [and] loud.",
    alternatives: ["The lion is loud [and] big."],
  },
  {
    prompt: "Say the two things you had: a hat and a drum.",
    sentence: "I had a hat [and] a drum.",
    alternatives: ["I had a drum [and] a hat."],
  },
  {
    prompt: "Say the two colours of the tent: red and white.",
    sentence: "The tent is red [and] white.",
    alternatives: ["The tent is white [and] red."],
  },
  {
    prompt: "Say who sat down: Mum and Dad.",
    sentence: "Mum [and] Dad sat down.",
    alternatives: ["Dad [and] Mum sat down."],
  },
  {
    prompt: "Join two ideas: the horse ran, the dog barked.",
    sentence: "The horse ran [and] the dog barked.",
    alternatives: ["The dog barked [and] the horse ran."],
  },
  {
    prompt: "Say the two animals you can see: a bird and a cat.",
    sentence: "I can see a bird [and] a cat.",
    alternatives: ["I can see a cat [and] a bird."],
  },
  {
    prompt: "Say what the juggler has: balls and hoops.",
    sentence: "The juggler has balls [and] hoops.",
    alternatives: ["The juggler has hoops [and] balls."],
  },
  {
    prompt: "Say what we did at snack time: we ate buns and drank milk.",
    sentence: "We ate buns [and] drank milk.",
    alternatives: ["We drank milk [and] ate buns."],
  },
  {
    prompt: "Say what the elephant is like: grey and big.",
    sentence: "The elephant is grey [and] big.",
    alternatives: ["The elephant is big [and] grey."],
  },
  {
    prompt: "Say what you do to the music: clap your hands, stamp your feet.",
    sentence: "I clap my hands [and] stamp my feet.",
    alternatives: ["I stamp my feet [and] clap my hands."],
  },
  {
    prompt: "Join two ideas: the band played, we sang.",
    sentence: "The band played [and] we sang.",
  },
];

const yearTwoSentences: readonly ParadeSentenceData[] = [
  {
    prompt: "Say why you were sad. It rained.",
    sentence: "I was sad [because] it rained.",
  },
  {
    prompt: "Give a choice of fruit: an apple or a pear.",
    sentence: "You can have an apple [or] a pear.",
    alternatives: ["You can have a pear [or] an apple."],
  },
  {
    prompt: "The clown fell over. Say that he was not hurt.",
    sentence: "The clown fell over [but] he was not hurt.",
  },
  {
    prompt: "Say when we clapped. The lion roared.",
    sentence: "We clapped [when] the lion roared.",
  },
  {
    prompt: "Say what might happen if it rains.",
    sentence: "You will get wet [if] it rains.",
  },
  {
    prompt: "Say what you hope about the show.",
    sentence: "I hope [that] the show is fun.",
  },
  {
    prompt: "The tent was full. Say that we still found a seat.",
    sentence: "The tent was full [but] we found a seat.",
  },
  {
    prompt: "Ask a question with a choice: a drink or a snack.",
    sentence: "Do you want a drink [or] a snack?",
    alternatives: ["Do you want a snack [or] a drink?"],
  },
  {
    prompt: "Say why the baby cried. She was hungry.",
    sentence: "The baby cried [because] she was hungry.",
  },
  {
    prompt: "Say when you smiled. You saw the ponies.",
    sentence: "I smiled [when] I saw the ponies.",
  },
  {
    prompt: "Kim sang. Join that to what the band did.",
    sentence: "Kim sang [and] the band played.",
  },
  {
    prompt: "Say something you know about tigers.",
    sentence: "I know [that] tigers have stripes.",
  },
  {
    prompt: "Tell someone to take a coat. Say when.",
    sentence: "Take a coat [if] it is cold.",
  },
  {
    prompt: "The acrobat was tired. Say that she did not stop.",
    sentence: "The acrobat was tired [but] she kept going.",
  },
  {
    prompt: "Say why we went inside. It was dark.",
    sentence: "We went inside [because] it was dark.",
  },
  {
    prompt: "Ask a question with a choice: pizza or pasta.",
    sentence: "Shall we have pizza [or] pasta?",
    alternatives: ["Shall we have pasta [or] pizza?"],
  },
];

const yearThreeSentences: readonly ParadeSentenceData[] = [
  {
    prompt: "First we had lunch. Then we went to the show.",
    sentence: "We had lunch [before] we went to the show.",
  },
  {
    prompt: "The parade ended. Then we ate ice cream.",
    sentence: "We ate ice cream [after] the parade.",
  },
  {
    prompt: "The clown juggled. At the same time, the band played.",
    sentence: "The clown juggled [while] the band played.",
    alternatives: ["The band played [while] the clown juggled."],
  },
  {
    prompt: "It was cold. Say what you did about it.",
    sentence: "It was cold [so] I wore a hat.",
  },
  {
    prompt: "The lion roared. Say why: it was hungry.",
    sentence: "The lion roared [because] it was hungry.",
  },
  {
    prompt: "The acrobat landed. Say when we cheered.",
    sentence: "We cheered [when] the acrobat landed.",
  },
  {
    prompt: "First I brushed my teeth. Then I went to bed.",
    sentence: "I brushed my teeth [before] I went to bed.",
  },
  {
    prompt: "Say that the show will start in a moment.",
    sentence: "[Soon] the show will start.",
  },
  {
    prompt: "There was a storm. Say when the seal slept.",
    sentence: "The seal slept [during] the storm.",
  },
  {
    prompt: "The lights went down. Say how long we waited.",
    sentence: "We waited [until] the lights went down.",
  },
  {
    prompt: "We watched the film. Say when Dad fell asleep.",
    sentence: "Dad fell asleep [while] we watched the film.",
  },
  {
    prompt: "The crowd gasped. Say why: the rope wobbled.",
    sentence: "The crowd gasped [because] the rope wobbled.",
  },
  {
    prompt: "Say what happened next in the show.",
    sentence: "[Then] the elephants marched in.",
  },
  {
    prompt: "I was late. Say what you did about it.",
    sentence: "I was late [so] I ran to school.",
  },
  {
    prompt: "First we eat lunch. Then we will play outside.",
    sentence: "We will play outside [after] we eat lunch.",
  },
  {
    prompt: "Feed the ponies first. Then the show starts.",
    sentence: "Feed the ponies [before] the show starts.",
  },
];

const yearFourSentences: readonly ParadeSentenceData[] = [
  {
    prompt: "Move “after lunch” to the front: We went to the park after lunch.",
    sentence: "[After lunch,] we went to the park.",
  },
  {
    prompt:
      "Move “later that day” to the front: The circus came to town later that day.",
    sentence: "[Later that day,] the circus came to town.",
  },
  {
    prompt:
      "Move “in the big top” to the front: The clowns tumbled in the big top.",
    sentence: "[In the big top,] the clowns tumbled.",
  },
  {
    prompt:
      "Move “without a sound” to the front: The cat crept past without a sound.",
    sentence: "[Without a sound,] the cat crept past.",
  },
  {
    prompt: "Move “every morning” to the front: The seals swim every morning.",
    sentence: "[Every morning,] the seals swim in the pool.",
  },
  {
    prompt:
      "Move “with a loud roar” to the front: The lion leapt with a loud roar.",
    sentence: "[With a loud roar,] the lion leapt.",
  },
  {
    prompt:
      "Move “before the show” to the front: We bought popcorn before the show.",
    sentence: "[Before the show,] we bought some popcorn.",
  },
  {
    prompt:
      "Move “slowly” to the front: The tightrope walker stepped out slowly.",
    sentence: "[Slowly,] the tightrope walker stepped out.",
  },
  {
    prompt:
      "Move “last night” to the front: We watched the fireworks last night.",
    sentence: "[Last night,] we watched the fireworks.",
  },
  {
    prompt: "Mum said: Come here. Write it as speech.",
    sentence: "[“Come here,”] said Mum.",
    alternatives: ["[“Come here,”] Mum said."],
  },
  {
    prompt: "Sam asked: Can I have a go? Write it as speech.",
    sentence: "[“Can I have a go?”] asked Sam.",
    alternatives: ["[“Can I have a go?”] Sam asked."],
  },
  {
    prompt: "Dad shouted: What a great show! Write it as speech.",
    sentence: "[“What a great show!”] shouted Dad.",
    alternatives: ["[“What a great show!”] Dad shouted."],
  },
  {
    prompt:
      "The ringmaster said: Welcome to the circus! Start with who is speaking.",
    sentence: "The ringmaster said, [“Welcome to the circus!”]",
  },
  {
    prompt: "Mia whispered: The lion is asleep. Start with who is speaking.",
    sentence: "Mia whispered, [“The lion is asleep.”]",
  },
  {
    prompt: "Grandpa said: Let's go. Write it as speech.",
    sentence: "[“Let's go,”] said Grandpa.",
    alternatives: ["[“Let's go,”] Grandpa said."],
  },
  {
    prompt: "The clown asked: Where is my hat? Write it as speech.",
    sentence: "[“Where is my hat?”] asked the clown.",
    alternatives: ["[“Where is my hat?”] the clown asked."],
  },
];

const yearFiveSentences: readonly ParadeSentenceData[] = [
  {
    prompt: "The girl won the race. Add that she was very tall, using who.",
    sentence: "The girl[, who was very tall,] won the race.",
    alternatives: ["The girl[, who won the race,] was very tall."],
  },
  {
    prompt: "The cake was delicious. Add that Gran baked it, using which.",
    sentence: "The cake[, which Gran baked,] was delicious.",
  },
  {
    prompt: "The boy was sad. Add that his kite broke, using whose.",
    sentence: "The boy [whose kite broke] was sad.",
  },
  {
    prompt: "The clown made us laugh. Add that his nose was red, using whose.",
    sentence: "The clown[, whose nose was red,] made us laugh.",
  },
  {
    prompt: "We visited the castle. Add that it was very old, using which.",
    sentence: "We visited the castle[, which was very old].",
  },
  {
    prompt: "My aunt sent me a card. Add that she lives in Wales, using who.",
    sentence: "My aunt[, who lives in Wales,] sent me a card.",
    alternatives: ["My aunt[, who sent me a card,] lives in Wales."],
  },
  {
    prompt: "The ball went over the fence. Add that I kicked it, using which.",
    sentence: "The ball [which I kicked] went over the fence.",
  },
  {
    prompt: "The lion yawned. Add that its mane was golden, using whose.",
    sentence: "The lion[, whose mane was golden,] yawned.",
  },
  {
    prompt: "The elephant was called Rosie. Add that it led the parade.",
    sentence: "The elephant [which led the parade] was called Rosie.",
    alternatives: ["The elephant [which was called Rosie] led the parade."],
  },
  {
    prompt: "I have a friend. Add that her dad is a juggler, using whose.",
    sentence: "I have a friend [whose dad is a juggler].",
  },
  {
    prompt: "The tent blew down. Add that we put it up yesterday.",
    sentence: "The tent[, which we put up yesterday,] blew down.",
  },
  {
    prompt: "The acrobat won a medal. Add that she flew highest, using who.",
    sentence: "The acrobat [who flew highest] won a medal.",
    alternatives: ["The acrobat [who won a medal] flew highest."],
  },
  {
    prompt: "Mrs Patel gave us a flower. Add that her garden is full of roses.",
    sentence: "Mrs Patel[, whose garden is full of roses,] gave us a flower.",
  },
  {
    prompt: "We found a shell. Add that it was shaped like a star.",
    sentence: "We found a shell [which was shaped like a star].",
  },
  {
    prompt: "The man gave us a wave. Add that he sold popcorn, using who.",
    sentence: "The man [who sold popcorn] gave us a wave.",
    alternatives: ["The man [who gave us a wave] sold popcorn."],
  },
  {
    prompt: "The train whistled loudly. Add that it was painted gold.",
    sentence: "The train[, which was painted gold,] whistled loudly.",
    alternatives: ["The train[, which whistled loudly,] was painted gold."],
  },
];

const yearSixSentences: readonly ParadeSentenceData[] = [
  {
    prompt: "Rewrite in the passive: The dog chased the cat.",
    sentence: "The cat [was chased by] the dog.",
  },
  {
    prompt: "Rewrite in the passive: The clown threw the pie.",
    sentence: "The pie [was thrown by] the clown.",
  },
  {
    prompt: "Rewrite in the passive: Tom painted the fence.",
    sentence: "The fence [was painted by] Tom.",
  },
  {
    prompt: "Rewrite in the passive: The children built a sandcastle.",
    sentence: "A sandcastle [was built by] the children.",
  },
  {
    prompt: "Rewrite in the passive: The ringmaster opened the show.",
    sentence: "The show [was opened by] the ringmaster.",
  },
  {
    prompt: "Rewrite in the passive: A strong wind blew down the tent.",
    sentence: "The tent [was blown down by] a strong wind.",
  },
  {
    prompt: "Rewrite in the passive: The seal balanced the ball.",
    sentence: "The ball [was balanced by] the seal.",
  },
  {
    prompt: "Rewrite in the passive: Gran baked the bread.",
    sentence: "The bread [was baked by] Gran.",
  },
  {
    prompt: "Rewrite in the passive: The judges awarded the prize.",
    sentence: "The prize [was awarded by] the judges.",
  },
  {
    prompt: "Rewrite in the passive: The elephants are pulling the cart.",
    sentence: "The cart [is being pulled by] the elephants.",
  },
  {
    prompt:
      "Rewrite in the passive, without saying who did it: Someone has eaten the cake.",
    sentence: "The cake [has been eaten].",
  },
  {
    prompt: "Rewrite in the active: The window was broken by the ball.",
    sentence: "The ball [broke] the window.",
  },
  {
    prompt: "Rewrite in the active: The song was sung by the choir.",
    sentence: "The choir [sang] the song.",
  },
  {
    prompt: "Rewrite in the active: The map was drawn by Ella.",
    sentence: "Ella [drew] the map.",
  },
  {
    prompt: "Rewrite in the active: The horses were fed by the keeper.",
    sentence: "The keeper [fed] the horses.",
  },
  {
    prompt: "Rewrite in the active: The letter was written by Sam.",
    sentence: "Sam [wrote] the letter.",
  },
];

export const paradeSentencesByYear: Record<
  YearGroup,
  readonly ParadeSentenceData[]
> = {
  1: yearOneSentences,
  2: yearTwoSentences,
  3: yearThreeSentences,
  4: yearFourSentences,
  5: yearFiveSentences,
  6: yearSixSentences,
};
