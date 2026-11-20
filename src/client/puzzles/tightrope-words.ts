import type { YearGroup } from "../../curriculum/skills.js";
import { shuffle } from "./shuffle.js";

export type TightropePatternPlace = "start" | "end" | "letter-team";

export interface TightropeWord {
  word: string;
  clue: string;
  madeFrom?: string;
  pattern: string;
  place: TightropePatternPlace;
  rule: string;
}

export interface LetterRange {
  start: number;
  end: number;
}

const ending = (
  word: string,
  pattern: string,
  clue: string,
  rule: string,
  madeFrom?: string,
): TightropeWord => ({ word, clue, madeFrom, pattern, place: "end", rule });

const prefixed = (
  word: string,
  pattern: string,
  clue: string,
  rule: string,
  madeFrom: string,
): TightropeWord => ({ word, clue, madeFrom, pattern, place: "start", rule });

const letterTeam = (
  word: string,
  pattern: string,
  clue: string,
  rule: string,
): TightropeWord => ({ word, clue, pattern, place: "letter-team", rule });

const doubledRule =
  "After a short vowel at the end of a short word, f, l, s and z are doubled.";
const ckRule = "After a short vowel, the k sound at the end is spelled ck.";
const nkRule = "After n, the k sound is spelled k, so the word ends in nk.";
const tchRule = "After a short vowel, the ch sound is spelled tch.";

const yearOneWords: readonly TightropeWord[] = [
  letterTeam("off", "ff", "not on", doubledRule),
  letterTeam("puff", "ff", "a little blow of air or smoke", doubledRule),
  letterTeam(
    "cliff",
    "ff",
    "a high, steep wall of rock by the sea",
    doubledRule,
  ),
  letterTeam("sniff", "ff", "to smell with short, quick breaths", doubledRule),
  letterTeam("hill", "ll", "a small mountain", doubledRule),
  letterTeam("bell", "ll", "it rings ding-dong", doubledRule),
  letterTeam(
    "doll",
    "ll",
    "a toy that looks like a little person",
    doubledRule,
  ),
  letterTeam("shell", "ll", "a snail carries this on its back", doubledRule),
  letterTeam("kiss", "ss", "a little peck on the cheek", doubledRule),
  letterTeam("dress", "ss", "a girl might wear this to a party", doubledRule),
  letterTeam("grass", "ss", "green plants that grow in a field", doubledRule),
  letterTeam("mess", "ss", "an untidy muddle", doubledRule),
  letterTeam("buzz", "zz", "the sound a bee makes", doubledRule),
  letterTeam("fizz", "zz", "tiny bubbles in a drink", doubledRule),
  letterTeam("duck", "ck", "a bird that swims and quacks", ckRule),
  letterTeam("sock", "ck", "you wear it on your foot, inside a shoe", ckRule),
  letterTeam("clock", "ck", "it tells you the time", ckRule),
  letterTeam("back", "ck", "the opposite of front", ckRule),
  letterTeam("pink", "nk", "a colour made from red and white", nkRule),
  letterTeam("drink", "nk", "to swallow water or juice", nkRule),
  letterTeam("bank", "nk", "a place that keeps money safe", nkRule),
  letterTeam("think", "nk", "to use your brain", nkRule),
  letterTeam("catch", "tch", "to grab a ball out of the air", tchRule),
  letterTeam("witch", "tch", "she rides a broomstick in stories", tchRule),
  letterTeam("fetch", "tch", "to go and get something", tchRule),
  letterTeam("match", "tch", "a game of football", tchRule),
];

const fulRule = "-ful means full of, but it only ever has one l.";
const lessRule = "-less means without. Add it straight on to the root word.";
const nessRule =
  "-ness turns a describing word into a feeling or a thing. Add it straight on.";
const lyRule =
  "-ly makes a word that tells you how. Add it straight on to the root word.";
const yToIRule =
  "happy ends in a consonant then y, so the y changes to i before the ending.";

const yearTwoWords: readonly TightropeWord[] = [
  ending("careful", "ful", "full of care", fulRule, "care + ful"),
  ending("hopeful", "ful", "full of hope", fulRule, "hope + ful"),
  ending("helpful", "ful", "always ready to help", fulRule, "help + ful"),
  ending("playful", "ful", "full of fun and games", fulRule, "play + ful"),
  ending("thankful", "ful", "full of thanks", fulRule, "thank + ful"),
  ending("colourful", "ful", "full of bright colours", fulRule, "colour + ful"),
  ending("careless", "less", "without care", lessRule, "care + less"),
  ending("hopeless", "less", "without any hope", lessRule, "hope + less"),
  ending(
    "fearless",
    "less",
    "without fear, very brave",
    lessRule,
    "fear + less",
  ),
  ending(
    "endless",
    "less",
    "going on and on without an end",
    lessRule,
    "end + less",
  ),
  ending("homeless", "less", "without a home", lessRule, "home + less"),
  ending("kindness", "ness", "being kind", nessRule, "kind + ness"),
  ending("sadness", "ness", "the feeling of being sad", nessRule, "sad + ness"),
  ending("darkness", "ness", "when there is no light", nessRule, "dark + ness"),
  ending("illness", "ness", "being poorly or ill", nessRule, "ill + ness"),
  ending(
    "fitness",
    "ness",
    "how fit and healthy you are",
    nessRule,
    "fit + ness",
  ),
  ending(
    "happiness",
    "ness",
    "the feeling of being happy",
    yToIRule,
    "happy + ness",
  ),
  ending("quickly", "ly", "in a quick way", lyRule, "quick + ly"),
  ending("slowly", "ly", "in a slow way", lyRule, "slow + ly"),
  ending("sadly", "ly", "in a sad way", lyRule, "sad + ly"),
  ending("badly", "ly", "in a bad way", lyRule, "bad + ly"),
  ending("kindly", "ly", "in a kind way", lyRule, "kind + ly"),
  ending("softly", "ly", "in a soft, gentle way", lyRule, "soft + ly"),
  ending("happily", "ly", "in a happy way", yToIRule, "happy + ly"),
];

const disRule =
  "dis- means not, or the opposite. The root word stays the same.";
const misRule = "mis- means wrongly or badly. The root word stays the same.";
const misspellRule =
  "mis- means wrongly. Add it to spell and you keep both s's: misspell.";
const reRule = "re- means again or back.";
const subRule = "sub- means under or below.";
const superRule = "super- means above, or more than.";
const antiRule = "anti- means against.";
const autoRule = "auto- means self or own.";

const yearThreeWords: readonly TightropeWord[] = [
  prefixed(
    "disagree",
    "dis",
    "to think something different from someone else",
    disRule,
    "dis + agree",
  ),
  prefixed(
    "dishonest",
    "dis",
    "not telling the truth",
    disRule,
    "dis + honest",
  ),
  prefixed("dislike", "dis", "to not like something", disRule, "dis + like"),
  prefixed("disappear", "dis", "to go out of sight", disRule, "dis + appear"),
  prefixed(
    "disobey",
    "dis",
    "to not do what you are told",
    disRule,
    "dis + obey",
  ),
  prefixed("misbehave", "mis", "to be naughty", misRule, "mis + behave"),
  prefixed(
    "misspell",
    "mis",
    "to get the letters of a word wrong",
    misspellRule,
    "mis + spell",
  ),
  prefixed("mislead", "mis", "to lead the wrong way", misRule, "mis + lead"),
  prefixed(
    "misplace",
    "mis",
    "to put something down and lose it",
    misRule,
    "mis + place",
  ),
  prefixed("redo", "re", "to do again", reRule, "re + do"),
  prefixed("reappear", "re", "to come back into sight", reRule, "re + appear"),
  prefixed("rebuild", "re", "to build again", reRule, "re + build"),
  prefixed("refill", "re", "to fill up again", reRule, "re + fill"),
  prefixed("replay", "re", "to play again", reRule, "re + play"),
  prefixed(
    "submarine",
    "sub",
    "a boat that travels under the sea",
    subRule,
    "sub + marine",
  ),
  prefixed(
    "subway",
    "sub",
    "a path that goes under a road",
    subRule,
    "sub + way",
  ),
  prefixed(
    "subheading",
    "sub",
    "a small title under a bigger title",
    subRule,
    "sub + heading",
  ),
  prefixed(
    "supermarket",
    "super",
    "a very big shop",
    superRule,
    "super + market",
  ),
  prefixed(
    "superhero",
    "super",
    "a hero with special powers",
    superRule,
    "super + hero",
  ),
  prefixed(
    "superstar",
    "super",
    "a very famous performer",
    superRule,
    "super + star",
  ),
  prefixed(
    "anticlockwise",
    "anti",
    "the opposite way to a clock's hands",
    antiRule,
    "anti + clockwise",
  ),
  prefixed(
    "antifreeze",
    "anti",
    "a liquid that stops water turning to ice",
    antiRule,
    "anti + freeze",
  ),
  prefixed(
    "antiseptic",
    "anti",
    "a cream that fights germs on a cut",
    antiRule,
    "anti + septic",
  ),
  prefixed(
    "autograph",
    "auto",
    "a famous person's signature",
    autoRule,
    "auto + graph",
  ),
  prefixed(
    "autopilot",
    "auto",
    "a computer that flies a plane by itself",
    autoRule,
    "auto + pilot",
  ),
  prefixed(
    "automobile",
    "auto",
    "another word for a car",
    autoRule,
    "auto + mobile",
  ),
];

const ousRule = "-ous means full of, and it is spelled o-u-s.";
const tionRule = "If the root word ends in t or te, the ending is -tion.";
const sionRule = "If the root word ends in d or se, the ending is -sion.";
const ssionRule = "If the root word ends in ss or mit, the ending is -ssion.";
const cianRule =
  "If the root word ends in c or cs, the ending is -cian. It is for a person's job.";

const yearFourWords: readonly TightropeWord[] = [
  ending(
    "famous",
    "ous",
    "known by lots and lots of people",
    "Drop the e from fame before adding -ous.",
    "fame",
  ),
  ending("dangerous", "ous", "likely to hurt you", ousRule, "danger"),
  ending(
    "poisonous",
    "ous",
    "can make you very ill if you eat it",
    ousRule,
    "poison",
  ),
  ending("mountainous", "ous", "full of mountains", ousRule, "mountain"),
  ending(
    "humorous",
    "ous",
    "funny, making people laugh",
    "humour drops its last u before -ous.",
    "humour",
  ),
  ending(
    "various",
    "ous",
    "lots of different kinds",
    "vary changes its y to i before -ous.",
    "vary",
  ),
  ending(
    "courageous",
    "ous",
    "very brave",
    "Keep the e after g, so the g stays soft.",
    "courage",
  ),
  ending("enormous", "ous", "very, very big", ousRule),
  ending(
    "invention",
    "tion",
    "a new thing that someone has made up",
    tionRule,
    "invent",
  ),
  ending("action", "tion", "something that you do", tionRule, "act"),
  ending("completion", "tion", "the finish of a job", tionRule, "complete"),
  ending(
    "hesitation",
    "tion",
    "a pause before you do something",
    tionRule,
    "hesitate",
  ),
  ending(
    "injection",
    "tion",
    "medicine given through a needle",
    tionRule,
    "inject",
  ),
  ending("relation", "tion", "someone in your family", tionRule, "relate"),
  ending("expansion", "sion", "getting bigger", sionRule, "expand"),
  ending(
    "extension",
    "sion",
    "an extra part that makes something longer",
    sionRule,
    "extend",
  ),
  ending(
    "comprehension",
    "sion",
    "understanding what you read",
    sionRule,
    "comprehend",
  ),
  ending("confusion", "sion", "a muddle in your mind", sionRule, "confuse"),
  ending("division", "sion", "sharing into equal groups", sionRule, "divide"),
  ending(
    "tension",
    "sion",
    "being tight, stretched or worried",
    sionRule,
    "tense",
  ),
  ending("discussion", "ssion", "a talk about something", ssionRule, "discuss"),
  ending("expression", "ssion", "the look on your face", ssionRule, "express"),
  ending(
    "permission",
    "ssion",
    "being allowed to do something",
    ssionRule,
    "permit",
  ),
  ending("admission", "ssion", "the price to get in", ssionRule, "admit"),
  ending("magician", "cian", "a performer who does tricks", cianRule, "magic"),
  ending(
    "musician",
    "cian",
    "someone who plays an instrument",
    cianRule,
    "music",
  ),
  ending(
    "electrician",
    "cian",
    "someone who fixes wires and lights",
    cianRule,
    "electric",
  ),
  ending("optician", "cian", "someone who checks your eyes", cianRule, "optic"),
  ending(
    "politician",
    "cian",
    "someone who works in government",
    cianRule,
    "politics",
  ),
];

const ableRule = "-able usually follows a whole root word: depend, dependable.";
const ibleRule =
  "-ible usually follows a root that is not a whole word on its own: horr + ible.";
const ciousRule =
  "After a vowel, the shus sound is usually spelled -cious. A root ending in ce keeps its c.";
const tiousRule = "If the root word ends in -tion, the ending is -tious.";
const cialRule = "-cial usually comes after a vowel: special, official.";
const tialRule = "-tial usually comes after a consonant: partial, essential.";

const yearFiveWords: readonly TightropeWord[] = [
  ending(
    "adorable",
    "able",
    "so sweet that everyone loves it",
    "Drop the e from adore before adding -able.",
    "adore",
  ),
  ending(
    "dependable",
    "able",
    "you can always count on it",
    ableRule,
    "depend",
  ),
  ending("comfortable", "able", "cosy and relaxing", ableRule, "comfort"),
  ending(
    "reliable",
    "able",
    "you can trust it to work",
    "rely changes its y to i before -able.",
    "rely",
  ),
  ending(
    "noticeable",
    "able",
    "easy to spot",
    "Keep the e after c, so the c stays soft.",
    "notice",
  ),
  ending("enjoyable", "able", "fun to do", ableRule, "enjoy"),
  ending("possible", "ible", "it could happen", ibleRule),
  ending("horrible", "ible", "very nasty", ibleRule),
  ending("terrible", "ible", "very bad", ibleRule),
  ending("visible", "ible", "can be seen", ibleRule),
  ending("incredible", "ible", "too amazing to believe", ibleRule),
  ending("vicious", "cious", "fierce and cruel", ciousRule),
  ending("precious", "cious", "worth a great deal", ciousRule),
  ending("gracious", "cious", "kind and polite", ciousRule, "grace"),
  ending("spacious", "cious", "with lots of room inside", ciousRule, "space"),
  ending("delicious", "cious", "tastes really good", ciousRule),
  ending(
    "ambitious",
    "tious",
    "wanting to do really well",
    tiousRule,
    "ambition",
  ),
  ending("cautious", "tious", "careful to stay safe", tiousRule, "caution"),
  ending(
    "nutritious",
    "tious",
    "full of goodness to help you grow",
    tiousRule,
    "nutrition",
  ),
  ending(
    "official",
    "cial",
    "approved by the people in charge",
    cialRule,
    "office",
  ),
  ending("special", "cial", "different and better than usual", cialRule),
  ending("social", "cial", "liking to be with other people", cialRule),
  ending("facial", "cial", "to do with your face", cialRule, "face"),
  ending("artificial", "cial", "made by people, not by nature", cialRule),
  ending("partial", "tial", "not complete, only some of it", tialRule, "part"),
  ending("essential", "tial", "really needed", tialRule),
  ending("confidential", "tial", "secret, not to be shared", tialRule),
  ending("potential", "tial", "what you could become one day", tialRule),
];

const doubledFerRule =
  "-fer is still stressed when the ending is added, so the r is doubled.";
const singleFerRule =
  "The stress moves off -fer when the ending is added, so the r is not doubled.";
const antRule =
  "Use -ant or -ance when a related word ends in -ation: hesitation, hesitant.";
const softCRule =
  "-ent and -ence come straight after a soft c, as in innocent.";
const quRule = "-ent comes straight after qu, as in frequent.";
const confidentialRule =
  "The related word confidential has a clear e sound, so use -ent and -ence.";
const learnByHeartRule =
  "No rule helps with this one, so it is a word to learn by heart.";

const yearSixWords: readonly TightropeWord[] = [
  ending("preferred", "ferred", "liked better", doubledFerRule, "prefer"),
  ending(
    "referring",
    "ferring",
    "mentioning or talking about",
    doubledFerRule,
    "refer",
  ),
  ending(
    "transferred",
    "ferred",
    "moved from one place to another",
    doubledFerRule,
    "transfer",
  ),
  ending(
    "conferring",
    "ferring",
    "talking together to decide something",
    doubledFerRule,
    "confer",
  ),
  ending(
    "preference",
    "ference",
    "the one you like best",
    singleFerRule,
    "prefer",
  ),
  ending(
    "reference",
    "ference",
    "a book you look facts up in",
    singleFerRule,
    "refer",
  ),
  ending("conference", "ference", "a big meeting", singleFerRule, "confer"),
  ending(
    "referee",
    "feree",
    "the person who keeps a match fair",
    singleFerRule,
    "refer",
  ),
  ending("observant", "ant", "good at noticing things", antRule, "observe"),
  ending(
    "hesitant",
    "ant",
    "slow to act because you are unsure",
    antRule,
    "hesitate",
  ),
  ending(
    "tolerant",
    "ant",
    "happy to accept other people's ways",
    antRule,
    "tolerate",
  ),
  ending(
    "expectant",
    "ant",
    "waiting excitedly for something",
    antRule,
    "expect",
  ),
  ending(
    "tolerance",
    "ance",
    "putting up with something calmly",
    antRule,
    "tolerate",
  ),
  ending(
    "substance",
    "ance",
    "any kind of stuff or material",
    "The related word substantial has an a sound, so use -ance.",
  ),
  ending("innocent", "ent", "not guilty of doing wrong", softCRule),
  ending("innocence", "ence", "being free from blame", softCRule),
  ending("decent", "ent", "good, fair and polite", softCRule),
  ending("frequent", "ent", "happening often", quRule),
  ending("confident", "ent", "sure of yourself", confidentialRule, "confide"),
  ending(
    "confidence",
    "ence",
    "a feeling that you can do it",
    confidentialRule,
    "confide",
  ),
  ending(
    "obedient",
    "ent",
    "doing what you are told",
    learnByHeartRule,
    "obey",
  ),
  ending(
    "independent",
    "ent",
    "able to do things on your own",
    learnByHeartRule,
    "depend",
  ),
];

export const tightropeWordLists: Readonly<
  Record<YearGroup, readonly TightropeWord[]>
> = {
  1: yearOneWords,
  2: yearTwoWords,
  3: yearThreeWords,
  4: yearFourWords,
  5: yearFiveWords,
  6: yearSixWords,
};

export const tightropeWordCounts: Readonly<Record<YearGroup, number>> = {
  1: 6,
  2: 6,
  3: 8,
  4: 8,
  5: 8,
  6: 8,
};

export const splitLetters = (text: string): string[] => Array.from(text);

export const tightropeLetters: readonly string[] = splitLetters(
  "abcdefghijklmnopqrstuvwxyz",
);

export const pickTightropeWords = (
  yearGroup: YearGroup,
  random: () => number,
): TightropeWord[] =>
  shuffle(tightropeWordLists[yearGroup], random).slice(
    0,
    tightropeWordCounts[yearGroup],
  );

export const findPatternRange = ({
  word,
  pattern,
  place,
}: TightropeWord): LetterRange =>
  place === "start"
    ? { start: 0, end: pattern.length }
    : { start: word.length - pattern.length, end: word.length };

export const isInPattern = (range: LetterRange, index: number): boolean =>
  index >= range.start && index < range.end;

export const describePattern = ({ pattern, place }: TightropeWord): string => {
  switch (place) {
    case "start":
      return `${pattern}-`;
    case "end":
      return `-${pattern}`;
    case "letter-team":
      return pattern;
  }
};

export const isNextLetter = (
  word: string,
  filledCount: number,
  letter: string,
): boolean =>
  filledCount < word.length && word[filledCount] === letter.toLowerCase();

export const measureCrossing = (
  wordsDone: number,
  filledCount: number,
  wordLength: number,
  wordCount: number,
): number =>
  Math.min(
    1,
    (wordsDone + (wordLength === 0 ? 0 : filledCount / wordLength)) / wordCount,
  );
