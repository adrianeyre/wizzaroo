import { matchingAmountSkillByYear } from "../../curriculum/matching-amounts.js";
import { numberFactSkillByYear } from "../../curriculum/number-facts.js";
import type { YearGroup } from "../../curriculum/skills.js";
import { spellingSkillByYear } from "../../curriculum/spelling-words.js";
import type { PuzzleGameType } from "../../curriculum/world-map.js";

export const puzzleTitles: Record<PuzzleGameType, string> = {
  "word-search": "Word search",
  sudoku: "Sudoku",
  "mine-sweeper": "Mine sweeper",
  crossword: "Crossword",
  mahjong: "Mahjong",
  "number-pyramid": "Number pyramid",
  "number-trail": "Number trail",
  bingo: "Bingo",
  "clock-pairs": "Clock pairs",
  "tightrope-words": "Tightrope words",
  "ring-sort": "Ring sort",
  "sentence-parade": "Sentence parade",
};

type SkillByYear = Readonly<Record<YearGroup, string>>;

export const numberPyramidSkillByYear: SkillByYear = {
  1: "maths.add-within-20",
  2: "maths.add-two-digit",
  3: "maths.add-three-digit",
  4: "maths.add-four-digit",
  5: "maths.add-decimals",
  6: "maths.add-large-numbers",
};

export const numberTrailSkillByYear: SkillByYear = {
  1: "maths.count-in-steps",
  2: "maths.count-in-threes-and-tens",
  3: "maths.count-in-fours-eights-and-fifties",
  4: "maths.count-in-sixes-sevens-and-twenty-fives",
  5: "maths.count-in-powers-of-ten-and-tenths",
  6: "maths.linear-sequences",
};

export const bingoSkillByYear: SkillByYear = {
  1: "maths.subtract-within-20",
  2: "maths.times-tables-2-5-10",
  3: "maths.times-tables-3-4-8",
  4: "maths.times-tables-to-12",
  5: "maths.squares-cubes-and-powers-of-ten",
  6: "maths.percentages-of-amounts",
};

export const clockPairsSkillByYear: SkillByYear = {
  1: "maths.tell-the-time",
  2: "maths.time-to-five-minutes",
  3: "maths.time-to-the-minute",
  4: "maths.twenty-four-hour-clock",
  5: "maths.later-times",
  6: "maths.durations",
};

export const tightropeWordsSkillByYear: SkillByYear = {
  1: "english.spelling-ff-ll-ss-zz-ck-nk-tch",
  2: "english.suffixes-ful-less-ness-ly",
  3: "english.prefixes-dis-mis-re-sub-super-anti-auto",
  4: "english.suffixes-ous-tion-sion-cian",
  5: "english.suffixes-able-ible-cious-cial",
  6: "english.suffixes-fer-ant-ance-ent-ence",
};

export const ringSortSkillByYear: SkillByYear = {
  1: "english.plurals-s-es",
  2: "english.nouns-verbs-adjectives-adverbs",
  3: "english.a-or-an",
  4: "english.prefixes-in-il-im-ir-inter",
  5: "english.modal-verbs-and-relative-pronouns",
  6: "english.formal-vocabulary",
};

export const sentenceParadeSkillByYear: SkillByYear = {
  1: "english.joining-with-and",
  2: "english.conjunctions",
  3: "english.time-and-cause-conjunctions",
  4: "english.fronted-adverbial-commas-and-speech",
  5: "english.relative-clauses",
  6: "english.active-and-passive-voice",
};

export const findPuzzleSkillId = (
  gameType: PuzzleGameType,
  yearGroup: YearGroup,
): string => {
  switch (gameType) {
    case "word-search":
    case "crossword":
      return spellingSkillByYear[yearGroup];
    case "sudoku":
    case "mine-sweeper":
      return numberFactSkillByYear[yearGroup];
    case "mahjong":
      return matchingAmountSkillByYear[yearGroup];
    case "number-pyramid":
      return numberPyramidSkillByYear[yearGroup];
    case "number-trail":
      return numberTrailSkillByYear[yearGroup];
    case "bingo":
      return bingoSkillByYear[yearGroup];
    case "clock-pairs":
      return clockPairsSkillByYear[yearGroup];
    case "tightrope-words":
      return tightropeWordsSkillByYear[yearGroup];
    case "ring-sort":
      return ringSortSkillByYear[yearGroup];
    case "sentence-parade":
      return sentenceParadeSkillByYear[yearGroup];
  }
};
