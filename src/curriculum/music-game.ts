import type { ChoiceArt, MusicPrompt } from "./music-prompts.js";
import type { MusicClip } from "./music-theory.js";

export const musicDifficulties = [1, 2, 3] as const;
export type MusicDifficulty = (typeof musicDifficulties)[number];

export interface MusicQuestion {
  prompt: MusicPrompt;
  choices: string[];
  answer: string;
}

export type ChoiceLabelStyle = "inside" | "caption" | "hidden";
export type HintKind = "listen" | "look";

export interface MusicGame<GameTypeName extends string = string> {
  gameType: GameTypeName;
  title: string;
  skillId: string;
  instruction: string;
  hint: string;
  hintKind: HintKind;
  labelStyle: ChoiceLabelStyle;
  hasFixedChoiceOrder: boolean;
  activityDifficulties: readonly MusicDifficulty[];
  buildQuestion: (
    difficulty: MusicDifficulty,
    random: () => number,
  ) => MusicQuestion;
  findChoiceArt: (choice: string) => ChoiceArt;
  describeChoice: (choice: string) => string;
  findChoiceSound: (choice: string) => MusicClip | undefined;
}

type MusicGameDraft<GameTypeName extends string> = Omit<
  MusicGame<GameTypeName>,
  | "hasFixedChoiceOrder"
  | "activityDifficulties"
  | "describeChoice"
  | "findChoiceSound"
  | "findChoiceArt"
> &
  Partial<
    Pick<
      MusicGame<GameTypeName>,
      | "hasFixedChoiceOrder"
      | "activityDifficulties"
      | "describeChoice"
      | "findChoiceSound"
      | "findChoiceArt"
    >
  >;

const describePlainly = (choice: string) => choice;
const findNoSound = () => undefined;
const findPadArt = (): ChoiceArt => ({ kind: "pad" });

export const defineMusicGame = <GameTypeName extends string>(
  draft: MusicGameDraft<GameTypeName>,
): MusicGame<GameTypeName> => ({
  hasFixedChoiceOrder: false,
  activityDifficulties: musicDifficulties,
  describeChoice: describePlainly,
  findChoiceSound: findNoSound,
  findChoiceArt: findPadArt,
  ...draft,
});

export const pickOne = <Value>(
  values: readonly Value[],
  random: () => number,
): Value => {
  if (values.length === 0) {
    throw new RangeError("There is nothing to pick from");
  }
  return values[
    Math.min(values.length - 1, Math.floor(random() * values.length))
  ];
};

export const shuffleValues = <Value>(
  values: readonly Value[],
  random: () => number,
): Value[] => {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
};

export const largestChoiceCount = 4;

export const pickChoices = (
  answer: string,
  candidates: readonly string[],
  random: () => number,
  count = largestChoiceCount,
): string[] => {
  const uniqueCandidates = [...new Set(candidates)];
  if (!uniqueCandidates.includes(answer)) {
    throw new RangeError(`The answer "${answer}" isn't one of the choices`);
  }
  const distractors = new Set(
    shuffleValues(
      uniqueCandidates.filter((candidate) => candidate !== answer),
      random,
    ).slice(0, count - 1),
  );
  return uniqueCandidates.filter(
    (candidate) => candidate === answer || distractors.has(candidate),
  );
};

export const pickWholeNumber = (
  smallest: number,
  largest: number,
  random: () => number,
): number => smallest + Math.floor(random() * (largest - smallest + 1));

export const findChoiceCountFor = (difficulty: MusicDifficulty): number =>
  difficulty + 1;
