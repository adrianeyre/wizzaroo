import { alphabetTrain } from "./english-alphabet-train.js";
import { bridgeBuilder } from "./english-bridge-builder.js";
import { oneOrMany } from "./english-one-or-many.js";
import { punctuationStones } from "./english-punctuation-stones.js";
import type {
  EnglishGameContent,
  EnglishGameYear,
} from "./english-questions.js";
import { soundAlikes } from "./english-sound-alikes.js";
import { storyBuilder } from "./english-story-builder.js";
import { storyScrolls } from "./english-story-scrolls.js";
import { suffixPotions } from "./english-suffix-potions.js";
import { wordDetectives } from "./english-word-detectives.js";
import { wordLanterns } from "./english-word-lanterns.js";
import { wordSqueeze } from "./english-word-squeeze.js";
import { wordWorkshop } from "./english-word-workshop.js";
import type { YearGroup } from "./skills.js";

export const englishRegionGameTypes = [
  "alphabet-train",
  "word-lanterns",
  "one-or-many",
  "word-workshop",
  "punctuation-stones",
  "suffix-potions",
  "word-squeeze",
  "sound-alikes",
  "bridge-builder",
  "word-detectives",
] as const;

export const englishExtraGameTypes = [
  "story-scrolls",
  "story-builder",
] as const;

export const englishGameTypes = [
  ...englishRegionGameTypes,
  ...englishExtraGameTypes,
] as const;

export type EnglishGameType = (typeof englishGameTypes)[number];

export const englishGames: Record<EnglishGameType, EnglishGameContent> = {
  "alphabet-train": alphabetTrain,
  "word-lanterns": wordLanterns,
  "one-or-many": oneOrMany,
  "word-workshop": wordWorkshop,
  "punctuation-stones": punctuationStones,
  "suffix-potions": suffixPotions,
  "word-squeeze": wordSqueeze,
  "sound-alikes": soundAlikes,
  "bridge-builder": bridgeBuilder,
  "word-detectives": wordDetectives,
  "story-scrolls": storyScrolls,
  "story-builder": storyBuilder,
};

export const isEnglishGameType = (value: unknown): value is EnglishGameType =>
  englishGameTypes.some((gameType) => gameType === value);

export const getEnglishGameYear = (
  gameType: EnglishGameType,
  yearGroup: YearGroup,
): EnglishGameYear => englishGames[gameType][yearGroup];
