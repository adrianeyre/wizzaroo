import { formatNumber } from "./number-format.js";

export const pictureQuestionDifficulties = [1, 2, 3] as const;
export type PictureQuestionDifficulty =
  (typeof pictureQuestionDifficulties)[number];

export interface PictureQuestion<Picture> {
  ask: string;
  picture: Picture;
  answer: string;
  slips: string[];
}

const listNumberSlips = (
  answer: number,
  candidates: readonly number[],
  unit = "",
): string[] =>
  [...new Set(candidates)]
    .filter((slip) => Number.isInteger(slip) && slip >= 0 && slip !== answer)
    .map((slip) => `${formatNumber(slip)}${unit}`);

export const buildNumberQuestion = <Picture>(
  ask: string,
  picture: Picture,
  answer: number,
  candidates: readonly number[],
  unit = "",
): PictureQuestion<Picture> => ({
  ask,
  picture,
  answer: `${formatNumber(answer)}${unit}`,
  slips: listNumberSlips(answer, candidates, unit),
});

export const buildWordQuestion = <Picture>(
  ask: string,
  picture: Picture,
  answer: string,
  candidates: readonly string[],
): PictureQuestion<Picture> => ({
  ask,
  picture,
  answer,
  slips: [...new Set(candidates)].filter((slip) => slip !== answer),
});
