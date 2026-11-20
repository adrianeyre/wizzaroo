import {
  gapMark,
  type EnglishPrompt,
  type WordClass,
  type WordLink,
} from "../../curriculum/english-questions.js";
import { describeFraction } from "../../curriculum/fractions.js";
import { formatNumber } from "../../curriculum/number-format.js";
import { describeShapeProperty } from "../../curriculum/shape-properties.js";
import type { Shape3d } from "../../curriculum/shapes-3d.js";
import {
  describeClockTime,
  type ClockQuestion,
} from "../../curriculum/telling-the-time.js";
import type { YearGroup } from "../../curriculum/skills.js";
import type { NumberStep } from "../../curriculum/one-more-one-less.js";
import type { MapPicture } from "../../curriculum/treasure-map.js";
import type { BuiltInQuestionGameType } from "../../curriculum/world-map.js";
import type { VoiceOverKey } from "../voice-over/voice-over.js";
import {
  describeAddition,
  describeMoreOrLess,
  describeNumberBond,
  describeOneMoreOneLess,
  describeTakingAway,
  findShownPart,
  type MissionQuestion,
  type QuestionPrompt,
} from "./mission.js";

interface MissionWords {
  title: string;
  instruction: string;
  instructionVoice: VoiceOverKey;
  hintVoice: VoiceOverKey;
  wellDoneVoice: VoiceOverKey;
}

const buildWords = (
  title: string,
  instruction: string,
  instructionVoice: VoiceOverKey,
  hintVoice: VoiceOverKey,
  wellDoneVoice: VoiceOverKey = "mission.well-done",
): MissionWords => ({
  title,
  instruction,
  instructionVoice,
  hintVoice,
  wellDoneVoice,
});

type WordsByYear = Record<YearGroup, MissionWords>;

const sameEveryYear = (words: MissionWords): WordsByYear => ({
  1: words,
  2: words,
  3: words,
  4: words,
  5: words,
  6: words,
});

const numberFacts = (title: string) =>
  buildWords(
    title,
    "Work out the missing number, then pop the bubble that shows it.",
    "maths.read-then-tap",
    "maths.have-another-go",
  );

const placeValue = buildWords(
  "Place value counters",
  "Count the counters in each column, then tap the number they make.",
  "maths.read-then-tap",
  "maths.have-another-go",
);

const moreOrLess = (title: string) =>
  buildWords(
    title,
    "Find the new number when the glowing counter is added or taken away.",
    "maths.read-then-tap",
    "maths.have-another-go",
  );

const polygons = (title: string) =>
  buildWords(
    title,
    "Read the clue, then tap the shape that matches it.",
    "maths.read-then-tap",
    "maths.have-another-go",
  );

const writtenSums = buildWords(
  "Treasure sums",
  "Add the two numbers, then tap the total.",
  "sums.how-many-altogether",
  "maths.have-another-go",
);

const writtenTakeAways = buildWords(
  "Treasure take-away",
  "Take the second number away from the first, then tap what is left.",
  "maths.read-then-tap",
  "maths.have-another-go",
);

const steps = (title: string) =>
  buildWords(
    title,
    "Find the rule, then tap the number that comes next.",
    "steps.what-comes-next",
    "maths.have-another-go",
  );

const fractions = (title: string) =>
  buildWords(
    title,
    "Read what to find, then tap the shape that shows it.",
    "maths.read-then-tap",
    "maths.have-another-go",
  );

const pictureWords = (title: string, instruction: string) =>
  buildWords(
    title,
    instruction,
    "maths.read-then-tap",
    "maths.have-another-go",
  );

const fairShares = (title: string) =>
  pictureWords(
    title,
    "Look at the groups on the plates, work it out, then tap your answer.",
  );

const treasureMap = (title: string) =>
  pictureWords(title, "Read the clue, look at the map, then tap your answer.");

const chartTower = (title: string) =>
  pictureWords(
    title,
    "Read the chart carefully, then tap the answer it shows.",
  );

const missionWords: Record<BuiltInQuestionGameType, WordsByYear> = {
  "popping-bubbles": {
    1: buildWords(
      "Pop the bubbles",
      "Pop the bubble that makes ten with this number.",
      "bubbles.pop-the-bond",
      "bubbles.count-on",
      "bubbles.well-done",
    ),
    2: buildWords(
      "Pop the bubbles",
      "Pop the bubble that makes twenty with this number.",
      "maths.read-then-tap",
      "maths.have-another-go",
    ),
    3: numberFacts("Times table bubbles"),
    4: numberFacts("Times table bubbles"),
    5: numberFacts("Squares, cubes and tens"),
    6: numberFacts("Order of operations"),
  },
  "listen-and-pick": sameEveryYear(
    buildWords(
      "Listen and pick",
      "Listen to the sound, then tap the letters that make it.",
      "listen.pick-the-letters",
      "listen.listen-again",
    ),
  ),
  "alphabet-train": sameEveryYear(
    buildWords(
      "Alphabet train",
      "",
      "woods.alphabet-train",
      "woods.look-again",
    ),
  ),
  "word-lanterns": sameEveryYear(
    buildWords("Word lanterns", "", "woods.word-lanterns", "woods.look-again"),
  ),
  "one-or-many": sameEveryYear(
    buildWords("One or many?", "", "woods.one-or-many", "woods.look-again"),
  ),
  "word-workshop": sameEveryYear(
    buildWords("Word workshop", "", "woods.word-workshop", "woods.look-again"),
  ),
  "punctuation-stones": sameEveryYear(
    buildWords(
      "Punctuation stones",
      "",
      "woods.punctuation-stones",
      "woods.look-again",
    ),
  ),
  "suffix-potions": sameEveryYear(
    buildWords(
      "Suffix potions",
      "",
      "woods.suffix-potions",
      "woods.look-again",
    ),
  ),
  "word-squeeze": sameEveryYear(
    buildWords("Word squeeze", "", "woods.word-squeeze", "woods.look-again"),
  ),
  "sound-alikes": sameEveryYear(
    buildWords("Sound-alikes", "", "woods.sound-alikes", "woods.look-again"),
  ),
  "bridge-builder": sameEveryYear(
    buildWords(
      "Bridge builder",
      "",
      "woods.bridge-builder",
      "woods.look-again",
    ),
  ),
  "word-detectives": sameEveryYear(
    buildWords(
      "Word detectives",
      "",
      "woods.word-detectives",
      "woods.look-again",
    ),
  ),
  "story-scrolls": sameEveryYear(
    buildWords("Story scrolls", "", "maths.read-then-tap", "woods.look-again"),
  ),
  "story-builder": sameEveryYear(
    buildWords("Story builder", "", "maths.read-then-tap", "woods.look-again"),
  ),
  "geography-games": sameEveryYear(
    buildWords(
      "Geography games",
      "Look closely at the scene, then tap the right answer.",
      "music.look-and-tap",
      "music.look-again",
    ),
  ),
  "science-lab": sameEveryYear(
    buildWords(
      "Science lab",
      "Think like a scientist, then tap your answer.",
      "science.investigate",
      "science.think-again",
    ),
  ),
  "phonics-games": sameEveryYear(
    buildWords(
      "Phonics games",
      "Read the words in the cave, then tap your answer.",
      "phonics-games.read-then-tap",
      "phonics-games.look-again",
    ),
  ),
  "letter-match": sameEveryYear(
    buildWords(
      "Capital catch",
      "Tap the capital letter that matches the small letter.",
      "letters.find-the-capital",
      "letters.look-again",
    ),
  ),
  "fish-count": {
    1: buildWords(
      "Count the fish",
      "Count the fish, then tap the number.",
      "fish.how-many",
      "fish.count-again",
    ),
    2: buildWords(
      "Tens and ones",
      "Count the tens, then the ones, and tap how many.",
      "maths.read-then-tap",
      "maths.have-another-go",
    ),
    3: placeValue,
    4: placeValue,
    5: placeValue,
    6: placeValue,
  },
  "ten-frames": {
    1: buildWords(
      "One more, one less",
      "Count the counters, then find one more or one less.",
      "frames.find-the-number",
      "frames.count-again",
    ),
    2: buildWords(
      "Ten more, ten less",
      "Count the tens and ones, then find ten more or ten less.",
      "maths.read-then-tap",
      "maths.have-another-go",
    ),
    3: moreOrLess("10 or 100 more or less"),
    4: moreOrLess("1000 more or less"),
    5: moreOrLess("Powers of ten"),
    6: buildWords(
      "Below zero",
      "Read the thermometer, then find the new temperature.",
      "maths.read-then-tap",
      "maths.have-another-go",
    ),
  },
  "shape-hunt": {
    1: buildWords(
      "Shape hunt",
      "Tap the 3D shape that is named.",
      "shapes.find-the-shape",
      "shapes.look-again",
    ),
    2: buildWords(
      "Shape detective",
      "Read the clue, then tap the 3D shape that matches it.",
      "maths.read-then-tap",
      "maths.have-another-go",
    ),
    3: polygons("Right angle hunt"),
    4: polygons("Triangles and quadrilaterals"),
    5: polygons("Regular or irregular"),
    6: buildWords(
      "Nets",
      "Tap the 3D shape that this net folds up into.",
      "maths.read-then-tap",
      "maths.have-another-go",
    ),
  },
  "shell-sums": {
    1: buildWords(
      "Shell sums",
      "Count all the pearls, then tap how many altogether.",
      "sums.how-many-altogether",
      "maths.have-another-go",
    ),
    2: buildWords(
      "Shell sums",
      "Add the tens and ones, then tap the total.",
      "sums.how-many-altogether",
      "maths.have-another-go",
    ),
    3: writtenSums,
    4: writtenSums,
    5: writtenSums,
    6: writtenSums,
  },
  "crab-take-away": {
    1: buildWords(
      "Crab take-away",
      "Watch the crabs scuttle away, then tap how many are left.",
      "take-away.how-many-left",
      "maths.have-another-go",
    ),
    2: buildWords(
      "Crab take-away",
      "Take away, then tap how many are left.",
      "take-away.how-many-left",
      "maths.have-another-go",
    ),
    3: writtenTakeAways,
    4: writtenTakeAways,
    5: writtenTakeAways,
    6: writtenTakeAways,
  },
  "skip-count": {
    1: steps("Stepping stones"),
    2: steps("Stepping stones"),
    3: steps("Stepping stones"),
    4: steps("Stepping stones"),
    5: steps("Stepping stones"),
    6: steps("Number sequences"),
  },
  "coral-heights": {
    1: buildWords(
      "Tallest and shortest",
      "Look at the corals, then tap the one that is asked for.",
      "maths.read-then-tap",
      "maths.have-another-go",
    ),
    2: buildWords(
      "Measure the coral",
      "Read the ruler, then tap how tall the coral is.",
      "maths.read-then-tap",
      "maths.have-another-go",
    ),
    3: buildWords(
      "Millimetre measure",
      "Read the ruler in millimetres, then tap how tall the coral is.",
      "maths.read-then-tap",
      "maths.have-another-go",
    ),
    4: buildWords(
      "Perimeter",
      "Add up the lengths of all the sides, then tap the perimeter.",
      "maths.read-then-tap",
      "maths.have-another-go",
    ),
    5: buildWords(
      "Area",
      "Count the squares or multiply, then tap the area.",
      "maths.read-then-tap",
      "maths.have-another-go",
    ),
    6: buildWords(
      "Volume",
      "Count the cubes or multiply, then tap the volume.",
      "maths.read-then-tap",
      "maths.have-another-go",
    ),
  },
  "fraction-find": {
    1: fractions("Halves and quarters"),
    2: fractions("Thirds and quarters"),
    3: fractions("Fraction find"),
    4: fractions("Equivalent fractions"),
    5: fractions("Percentages"),
    6: fractions("Fractions as decimals"),
  },
  "ship-clock": {
    1: buildWords(
      "Ship's clock",
      "Read the clock, then tap the time.",
      "clock.what-time",
      "maths.have-another-go",
    ),
    2: buildWords(
      "Ship's clock",
      "Read the clock, then tap the time.",
      "clock.what-time",
      "maths.have-another-go",
    ),
    3: buildWords(
      "Ship's clock",
      "Read the Roman numeral clock to the minute, then tap the time.",
      "clock.what-time",
      "maths.have-another-go",
    ),
    4: buildWords(
      "Ship's clock",
      "Read the clock, then tap the 24-hour time.",
      "maths.read-then-tap",
      "maths.have-another-go",
    ),
    5: buildWords(
      "Ship's clock",
      "Read the clock, then work out the later time.",
      "maths.read-then-tap",
      "maths.have-another-go",
    ),
    6: buildWords(
      "Ship's clock",
      "Read the clock, then work out how long until the time shown.",
      "maths.read-then-tap",
      "maths.have-another-go",
    ),
  },
  "fair-shares": {
    ...sameEveryYear(fairShares("Fair shares")),
    2: fairShares("Times tables and sharing"),
    6: fairShares("Ratio and scale"),
  },
  "treasure-map": {
    ...sameEveryYear(treasureMap("Treasure map")),
    1: treasureMap("Turtle turns"),
    2: treasureMap("Clockwise turtle"),
    5: treasureMap("Mirror map"),
    6: treasureMap("Four-quadrant map"),
  },
  "chart-tower": {
    ...sameEveryYear(chartTower("Chart tower")),
    4: chartTower("Time graph tower"),
    5: chartTower("Ferry timetable"),
    6: chartTower("Pie charts and the mean"),
  },
  "history-quest": sameEveryYear(
    buildWords(
      "History quest",
      "Read the question, then tap the right answer.",
      "maths.read-then-tap",
      "science.think-again",
    ),
  ),
};

export const findMissionWords = (
  gameType: BuiltInQuestionGameType,
  level: YearGroup,
): MissionWords => missionWords[gameType][level];

const shapePromptKeys: Record<Shape3d, VoiceOverKey> = {
  cube: "shapes.find-the-cube",
  cuboid: "shapes.find-the-cuboid",
  pyramid: "shapes.find-the-pyramid",
  sphere: "shapes.find-the-sphere",
  cylinder: "shapes.find-the-cylinder",
  cone: "shapes.find-the-cone",
};

const numberStepKeys: Partial<Record<NumberStep, VoiceOverKey>> = {
  "one-more": "frames.one-more",
  "one-less": "frames.one-less",
};

const fractionPromptKeys: Record<string, VoiceOverKey | undefined> = {
  "1/2": "fractions.find-one-half",
  "1/4": "fractions.find-one-quarter",
};

export const findSpokenPrompt = ({
  prompt,
}: MissionQuestion): VoiceOverKey | undefined => {
  switch (prompt.kind) {
    case "shape":
      return shapePromptKeys[prompt.shape];
    case "one-more-one-less":
      return numberStepKeys[prompt.oneMoreOneLess.step];
    case "height-extreme":
      return prompt.extreme === "tallest"
        ? "heights.find-the-tallest"
        : "heights.find-the-shortest";
    case "fraction":
      return prompt.fraction.askedAs === prompt.fraction.target
        ? fractionPromptKeys[prompt.fraction.target]
        : undefined;
    default:
      return undefined;
  }
};

const describeMapHint = ({ kind }: MapPicture): string => {
  switch (kind) {
    case "turn":
      return "Not quite. Turn the turtle in your head one quarter turn at a time, then have another go.";
    case "shelf":
      return "Not quite. Find the thing named first, then look above, below or beside it.";
    case "grid":
      return "Not quite. Go across first, then up or down, counting the squares carefully.";
  }
};

export const describeHint = ({ prompt }: MissionQuestion): string => {
  switch (prompt.kind) {
    case "number-bond":
      return `Nearly! Count on from ${String(findShownPart(prompt.numberBond))} until you reach ${String(prompt.numberBond.sentence.operator === "+" ? prompt.numberBond.sentence.result : prompt.numberBond.sentence.left)}, then have another go.`;
    case "sound":
      return "Not quite. Listen to the sound again, then have another go.";
    case "count":
      return prompt.count > 20
        ? "Not quite. Count the tens first, then count on the ones."
        : "Not quite. Point to each fish as you count it, then have another go.";
    case "one-more-one-less":
      return prompt.oneMoreOneLess.step.startsWith("ten")
        ? "Nearly! Only the tens change. Count the tens again, then have another go."
        : `Nearly! Count the counters, then ${prompt.oneMoreOneLess.step === "one-more" ? "add one more" : "take one away"}.`;
    case "shape":
      return "Not quite. Look closely at each shape, then have another go.";
    case "shape-property":
      return "Not quite. Count the faces, edges or vertices carefully, then have another go.";
    case "capital-letter":
      return `Not quite. Say the name of the letter ${prompt.smallLetter}, then find its capital.`;
    case "addition":
      return "Nearly! Add the ones first, then the tens, then the bigger columns. Have another go.";
    case "taking-away":
      return "Nearly! Take away the ones first, exchanging if you need to. Have another go.";
    case "sequence":
      return "Not quite. Find how much each step changes by, then have another go.";
    case "height-extreme":
      return `Not quite. Compare the tops of the corals to find the ${prompt.extreme}.`;
    case "height-measure":
      return "Not quite. Find where the coral starts on the ruler, then count up to its top.";
    case "fraction":
      return "Not quite. Equal parts are all the same size. Count the parts and the shaded parts.";
    case "clock":
      return "Not quite. The short hand shows the hour and the long hand shows the minutes.";
    case "missing-number":
      return "Not quite. Work it out step by step, then have another go.";
    case "place-value":
      return "Not quite. Count each column of counters, then put the digits together.";
    case "more-or-less":
      return "Not quite. Only one column changes. Find it, then have another go.";
    case "temperature":
      return "Not quite. Count the degrees one at a time on the thermometer, remembering zero.";
    case "polygon-clue":
      return "Not quite. Check the sides and angles of each shape, then have another go.";
    case "net":
      return "Not quite. Imagine folding up the faces, then have another go.";
    case "phonics-word":
      return "Not quite. Read it again carefully, then have another go.";
    case "music":
      return "Not quite. Have another go.";
    case "computing":
      return (
        prompt.hint ??
        "Not quite. Look carefully at the scene, then have another go."
      );
    case "english":
    case "lab":
      return "Not quite. Read it again, think it through, then have another go.";
    case "geography":
      return "Not quite. Look closely at the scene, then have another go.";
    case "history":
      return `Not quite. ${prompt.hint}`;
    case "block-measure":
      return `Not quite. Check how you worked out the ${prompt.block.kind}, then have another go.`;
    case "fair-share":
      return "Not quite. Count each group carefully, or share them out one at a time, then have another go.";
    case "treasure-map":
      return describeMapHint(prompt.picture);
    case "chart":
      return "Not quite. Read the labels and the scale carefully, then have another go.";
  }
};

export const wordLinkPhrases: Record<WordLink, string> = {
  "rhymes-with": "Rhymes with",
  "opposite-of": "Opposite of",
  "same-family-as": "Same family as",
  "same-meaning-as": "Means the same as",
  "same-root-as": "Same root as",
  "formal-word-for": "Formal word for",
};

export const describeWordClass = (wordClass: WordClass): string =>
  wordClass === "capital letter"
    ? "word that needs a capital letter"
    : wordClass;

/**
 * When in the day a 12-hour clock's time falls, so a question asking for
 * its 24-hour time is never ambiguous: 12:55 before midday is "after
 * midnight", and 11 o'clock after midday is "at night", not "in the
 * afternoon".
 */
export const describePartOfDay = (
  isAfternoon: boolean,
  { hour }: Pick<ClockQuestion["time"], "hour">,
): string => {
  const hourOfDay = (hour % 12) + (isAfternoon ? 12 : 0);
  if (hourOfDay === 0) {
    return "after midnight";
  }
  if (hourOfDay < 12) {
    return "in the morning";
  }
  if (hourOfDay === 12) {
    return "after midday";
  }
  if (hourOfDay < 18) {
    return "in the afternoon";
  }
  return hourOfDay < 22 ? "in the evening" : "at night";
};

const sayGap = (text: string) => (text === gapMark ? "blank" : text);

const describeEnglishAloud = (prompt: EnglishPrompt): string => {
  switch (prompt.kind) {
    case "sequence":
      return `${prompt.items.map(sayGap).join(", ")}.`;
    case "word-link":
      return `${wordLinkPhrases[prompt.link]} ${prompt.word}.`;
    case "clue":
      return prompt.clue;
    case "word-sum":
      return prompt.parts.join(" + ");
    case "sentence-gap":
      return `${prompt.before} blank ${prompt.after}`;
    case "word-class":
      return `Find the ${describeWordClass(prompt.wordClass)}. ${prompt.sentence}`;
    case "passage":
      return prompt.question;
    case "story-plan":
      return `${prompt.task} ${prompt.steps.map((step) => `${sayGap(step)}.`).join(" ")}`;
  }
};

const describeClockAloud = ({ ask, time }: ClockQuestion): string => {
  switch (ask.kind) {
    case "read":
      return "What time is it?";
    case "twenty-four-hour":
      return `It is ${describePartOfDay(ask.isAfternoon, time)}. What is the 24-hour time?`;
    case "later":
      return `It is ${describeClockTime(time)} ${describePartOfDay(ask.isAfternoon, time)}. What time will it be in ${String(ask.minutesLater)} minutes?`;
    case "until":
      return `How long from the clock until ${ask.untilTime}?`;
  }
};

const describePromptAloud = (
  prompt: Exclude<QuestionPrompt, { kind: "sound" }>,
): string => {
  switch (prompt.kind) {
    case "number-bond":
      return describeNumberBond(prompt);
    case "count":
      return "How many fish?";
    case "one-more-one-less":
      return describeOneMoreOneLess(prompt);
    case "shape":
      return `Find the ${prompt.shape}.`;
    case "capital-letter":
      return `Find the capital letter for ${prompt.smallLetter}.`;
    case "english":
      return describeEnglishAloud(prompt.english);
    case "music":
      return prompt.music.ask;
    case "lab":
      return prompt.station === "true-false"
        ? `True or false? ${prompt.ask}`
        : prompt.ask;
    case "history":
      return prompt.play === "sort"
        ? `Where does this go? ${prompt.ask}`
        : prompt.ask;
    case "computing":
    case "geography":
    case "phonics-word":
    case "fair-share":
    case "treasure-map":
    case "chart":
      return prompt.ask;
    case "polygon-clue":
      return prompt.clue;
    case "shape-property":
      return `Find the shape with ${describeShapeProperty(prompt)}.`;
    case "addition":
      return describeAddition(prompt);
    case "taking-away":
      return describeTakingAway(prompt);
    case "sequence":
      return `${prompt.sequence.shown.map(formatNumber).join(", ")}. What comes next?`;
    case "missing-number":
      return prompt.sentence;
    case "more-or-less":
      return describeMoreOrLess(prompt);
    case "height-extreme":
      return `Find the ${prompt.extreme} coral.`;
    case "height-measure":
      return Number.isInteger(prompt.measure.centimetres)
        ? "How tall is the coral?"
        : "How tall is the coral, in millimetres?";
    case "fraction":
      return `Find ${
        prompt.fraction.askedAs === prompt.fraction.target
          ? describeFraction(prompt.fraction.target)
          : prompt.fraction.askedAs
      }.`;
    case "clock":
      return describeClockAloud(prompt.clock);
    case "place-value":
      return "What number do the counters make?";
    case "temperature":
      return `It is ${formatNumber(prompt.temperature.start)}°C. It ${
        prompt.temperature.change > 0 ? "rises" : "falls"
      } by ${String(Math.abs(prompt.temperature.change))}°. What is it now?`;
    case "net":
      return "Which 3-D shape does this net make?";
    case "block-measure":
      return `What is the ${prompt.block.kind}?`;
  }
};

/**
 * The question a Mission shows, as words to read out loud for a Child. It
 * never reads out what the Child is being asked to read for themselves: a
 * Phonics word's letters, or a story they answer a question about.
 * Undefined for a sound, which the Child hears from its recording instead.
 */
export const describeQuestionAloud = ({
  prompt,
}: MissionQuestion): string | undefined =>
  prompt.kind === "sound" ? undefined : describePromptAloud(prompt);
