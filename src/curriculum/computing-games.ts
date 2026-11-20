import type { ComputingGame } from "./computing-scenes.js";
import { skills, type YearGroup } from "./skills.js";
import { yearOneComputingGames } from "./computing-year-1.js";
import { yearTwoComputingGames } from "./computing-year-2.js";
import { yearThreeComputingGames } from "./computing-year-3.js";
import { yearFourComputingGames } from "./computing-year-4.js";
import { yearFiveComputingGames } from "./computing-year-5.js";
import { yearSixComputingGames } from "./computing-year-6.js";

export const computingGames = [
  ...yearOneComputingGames,
  ...yearTwoComputingGames,
  ...yearThreeComputingGames,
  ...yearFourComputingGames,
  ...yearFiveComputingGames,
  ...yearSixComputingGames,
] as const;

export type ComputingGameType = (typeof computingGames)[number]["gameType"];

export const computingGameTypes: readonly ComputingGameType[] =
  computingGames.map(({ gameType }) => gameType);

export const isComputingGameType = (
  value: unknown,
): value is ComputingGameType =>
  computingGameTypes.some((gameType) => gameType === value);

export const findComputingGame = (
  gameType: ComputingGameType,
): ComputingGame<ComputingGameType> => {
  const game = computingGames.find(
    (candidate) => candidate.gameType === gameType,
  );
  if (game === undefined) {
    throw new Error(`There is no Computing game "${gameType}"`);
  }
  return game;
};

export const findComputingGameYear = (
  gameType: ComputingGameType,
): YearGroup | undefined => {
  const { skillId } = findComputingGame(gameType);
  return skills.find(({ id }) => id === skillId)?.yearGroup;
};
